import * as vscode from 'vscode';
import * as path from 'path';

import { getProjectFilePath, loadProjects, saveProjects } from './pathUtil';
import { ProjectNode } from './interfaces';

export class ProjectsNodeProvider implements vscode.TreeDataProvider<Dependency> {

	private projects: ProjectNode[] = [];
	private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined> = new vscode.EventEmitter<Dependency | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Dependency | undefined> = this._onDidChangeTreeData.event;

	constructor(private workspaceRoot: string) {
		const projectFilePath = getProjectFilePath();
		this.projects = loadProjects(projectFilePath);

		
	}

	refresh(): void {
		const projectFilePath = getProjectFilePath();
		this.projects = loadProjects(projectFilePath);

		this._onDidChangeTreeData.fire(null);
	}

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

			return Promise.resolve(nodes.map(this.toDep));
		}
			
		else {
			return Promise.resolve(this.projects.map(this.toDep));
		}
	}

	remove(element: Dependency)
	{
		const node = element.node;
		for (var i in this.projects)
		{
			if (this.projects[i] == node)
			{
				this.projects.splice(parseInt(i), 1);
				break;
			}
			else if (this.removeChild(node, this.projects[i]))
			{
				break;
			}
		}
		const projectFilePath = getProjectFilePath();
		saveProjects(projectFilePath, this.projects);
	}

	addGroup(name: string, parent?: Dependency)
	{
		if (parent)
		{
			if (parent.node.hasOwnProperty("type"))
			{
				parent.node.nodes.push({ "title": name, "type": "local", "nodes": [] } as ProjectNode);
				const projectFilePath = getProjectFilePath();
				saveProjects(projectFilePath, this.projects);
			}
		}
	}

	addProject(name: string, folder: vscode.Uri, parent: Dependency)
	{
		if (parent.node.hasOwnProperty("type"))
		{
			parent.node.nodes.push({ "title": name, "path": folder.fsPath } as ProjectNode);
			const projectFilePath = getProjectFilePath();
			saveProjects(projectFilePath, this.projects);
		}
	}

	rename(name: string, element: Dependency)
	{
		element.node.title = name;
		const projectFilePath = getProjectFilePath();
		saveProjects(projectFilePath, this.projects);
	}

	private removeChild(node: ProjectNode, parent: ProjectNode): boolean
	{
		for (var i in parent.nodes)
		{
			if (parent.nodes[i] == node)
			{
				parent.nodes.splice(parseInt(i), 1);
				return true;
			}
			else if ('nodes' in parent.nodes[i] && this.removeChild(node, parent.nodes[i]))
			{
				return true;
			}
		}
		return false;
	}

	private toDep(node: ProjectNode) {

		if (!node.hasOwnProperty('path'))
			return new Dependency(node);

		const command = {
			command: 'extension.open',
			title: '',
			arguments: [node['path']]
		}

		return new Dependency(node, command);
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
		let icon = 'project.svg';

		if (this.node.hasOwnProperty('nodes'))
			icon = 'folder.svg';

		if (this.node.hasOwnProperty('type'))
		{
			if (this.node.type === 'remote')
				icon = 'vm-remote.svg';
			else 
				icon = 'vm-default.svg';
		}
			

		return icon;
	}
 
	iconPath = {
		light: path.join(__filename, '..', '..', 'resources', 'light', this.icon),
		dark: path.join(__filename, '..', '..', 'resources', 'dark', this.icon)
	};

	contextValue = this.node.hasOwnProperty('nodes') ? 'dependency' : 'project';
}


