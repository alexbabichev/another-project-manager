import * as vscode from 'vscode';
import * as path from 'path';

import { getProjectFilePath, loadProjects, saveProjects } from './pathUtil';
import { ProjectNode } from './interfaces';

export class ProjectsNodeProvider implements vscode.TreeDataProvider<Dependency>, vscode.TreeDragAndDropController<Dependency> {

	private projects: ProjectNode[] = [];
	private dependencies: Dependency[] = [];

	private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined> = new vscode.EventEmitter<Dependency | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Dependency | undefined> = this._onDidChangeTreeData.event;

	constructor(context: vscode.ExtensionContext, private workspaceRoot: string) {
		const projectFilePath = getProjectFilePath();
		this.projects = loadProjects(projectFilePath);
		const view = vscode.window.createTreeView('anotherProjectManager', { treeDataProvider: this, showCollapseAll: true, canSelectMany: true, dragAndDropController: this });
		view.onDidExpandElement((e) =>
		{
			e.element.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
		 });
		view.onDidCollapseElement((e) =>
		{
			e.element.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
		});
		context.subscriptions.push(view);
		
	}
	
	dropMimeTypes: string[] = ['application/vnd.code.tree.anotherProjectManager'];
	dragMimeTypes: string[];

	/** TreeDragAndDropController */
	handleDrag?(source: Dependency[], treeDataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): void | Thenable<void> {
		treeDataTransfer.set('application/vnd.code.tree.anotherProjectManager', new vscode.DataTransferItem(source));
	}
	handleDrop?(target: Dependency | undefined, source: vscode.DataTransfer, token: vscode.CancellationToken): void | Thenable<void> {
		const transferItem = source.get('application/vnd.code.tree.anotherProjectManager');
		if (!transferItem) {
			return;
		}

		const treeItems: Dependency[] = transferItem.value;
		for(var t in treeItems)
		{
			if(treeItems[t] == target)
			{
				continue;
			}
			this.move(treeItems[t], target);
		}

		const projectFilePath = getProjectFilePath();
		saveProjects(projectFilePath, this.projects);

	}

	
	/** TreeDataProvider */

	getTreeItem(element: Dependency): vscode.TreeItem {
		return element;
	}

	getChildren(element?: Dependency): Thenable<Dependency[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return Promise.resolve([]);
		}

		if (element) {
			const node = element.node as ProjectNode;
			const nodes = node.nodes as ProjectNode[];

			return Promise.resolve(nodes.map(this.toDep.bind(this)));
		}
			
		else {
			return Promise.resolve(this.projects.map(this.toDep.bind(this)));
		}
	}

	refresh(): void {
		const projectFilePath = getProjectFilePath();
		this.projects = loadProjects(projectFilePath);

		this._onDidChangeTreeData.fire(null);
	}

	getParent(element: Dependency): vscode.ProviderResult<Dependency> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return Promise.resolve(null);
		}
		let node = element.node;
		let parent = this.findParent(node, this.projects);
		if(parent == undefined)
		{
			return Promise.resolve(null);
		}
		return Promise.reject(this.toDep(parent));
	}
	
	remove(element: Dependency)
	{
		this.removeElement(element);
		const projectFilePath = getProjectFilePath();
		saveProjects(projectFilePath, this.projects);
		this._onDidChangeTreeData.fire(null);
	}

	addGroup(name: string, parent?: Dependency)
	{
		let item = { "title": name, "type": "group", "nodes": [] } as ProjectNode;
		this.addItem(item, parent);
	}

	addProject(name: string, folder: vscode.Uri, parent?: Dependency)
	{
		let item = { "title": name, "type": "project", "path": folder.fsPath } as ProjectNode;
		this.addItem(item, parent);
	}

	addItem(item: ProjectNode, parent?: Dependency)
	{
		if(!parent)
		{
			this.projects.push(item);
		}
		else if (parent.node.hasOwnProperty("type") && parent.node.type == "group")
		{
			parent.node.nodes.push(item);
		}
		const projectFilePath = getProjectFilePath();
		saveProjects(projectFilePath, this.projects);
		this._onDidChangeTreeData.fire(parent);
	}
	
	rename(name: string, element: Dependency)
	{
		element.node.title = name;
		const projectFilePath = getProjectFilePath();
		saveProjects(projectFilePath, this.projects);
	}

	private move(element: Dependency, target: Dependency | undefined)
	{
		const node = element.node;
		
		if(target)
		{
			const targetNode = target.node;
			if(targetNode.type == "group" && (!target.collapsibleState || target.collapsibleState == vscode.TreeItemCollapsibleState.Expanded))
			{
				this.removeElement(element);
				targetNode.nodes.push(node);
			}
			else
			{
				let parent = this.findParent(targetNode, this.projects);
				let parentNodes = this.projects;

				if(parent && parent.type == "group")
				{
					parentNodes = parent.nodes;
				}

				let targetIdx = parentNodes.indexOf(targetNode);
				this.removeElement(element);
				if(targetIdx + 1 >= parentNodes.length)
				{
					parentNodes.push(node);
				}
				else
				{
					parentNodes.splice(targetIdx + 1, 0, node);
				}
			}
		}
		else
		{
			this.removeElement(element);
			this.projects.push(node);
		}
		this._onDidChangeTreeData.fire(null);
	}

	private removeElement(element: Dependency)
	{
		this.removeChild(element.node);
		const idx = this.dependencies.indexOf(element);
		if (idx > -1)
		{
			this.dependencies.splice(idx, 1);	
		}
	}

	private removeChild(node: ProjectNode, parent?: ProjectNode): boolean
	{
		let parentNodes = this.projects;
		if (parent)
		{
			if (parent.nodes == undefined)
			{
				return false;	
			}
			parentNodes = parent.nodes;	
		}

		for(var i in parentNodes)
		{
			if (parentNodes[i] == node)
			{
				parentNodes.splice(parseInt(i), 1);
				return true;
			}
			else if (this.removeChild(node, parentNodes[i]))
			{
				return true;
			}
		}
		return false;
	}

	private toDep(node: ProjectNode) {

		if (node.hasOwnProperty('path'))
		{
			const command = {
				command: 'extension.open',
				title: '',
				arguments: [node['path']]
			}
	
			return new Dependency(node, command);
		}

		let maybeExistingDep = this.dependencies.find(a => a.node == node);
		if (!maybeExistingDep)
		{
			maybeExistingDep = new Dependency(node);
			this.dependencies.push(maybeExistingDep);
		}
		return maybeExistingDep;

		
	}

	private findParent(child: ProjectNode, parents: ProjectNode[]): ProjectNode | undefined
	{
		for(var p in parents)
		{
			let parent = parents[p];
			if(parent.nodes)
			{
				if(parent.nodes.includes(child))
				{
					return parent;
				}
				let maybeParent = this.findParent(child, parent.nodes);
				if(maybeParent != undefined)
				{
					return maybeParent;
				}
			}
			
		}
		return undefined;
	}
}

export class Dependency extends vscode.TreeItem {


	constructor(
		public readonly node: ProjectNode,
		public readonly command?: vscode.Command
	) {
		super(node.title, node.hasOwnProperty('nodes') ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
		this.tooltip = `${this.label}-${this.node.title}`;
		this.description = this.node.description || '';


	}

	get icon(): string {


		if (this.node.hasOwnProperty('type'))
		{
			switch(this.node.type)
			{
				case "project":
					return 'project.svg';
				case "group":
					return 'folder.svg';
			}
		}
		
		return 'project.svg';
	}

	isGroup(): boolean
	{
		return this.node.hasOwnProperty('type') && this.node.type == "group";
	}
 
	iconPath = {
		light: path.join(__filename, '..', '..', 'resources', 'light', this.icon),
		dark: path.join(__filename, '..', '..', 'resources', 'dark', this.icon)
	};

	contextValue = this.node.hasOwnProperty('nodes') ? 'dependency' : 'project';

	
}


