import * as vscode from 'vscode';
import * as path from 'path';

import { getProjectFilePath, loadProjects } from './pathUtil';
import { ProjectGroup, Project } from './interfaces';

export class ProjectsNodeProvider implements vscode.TreeDataProvider<Dependency> {

	private projects: ProjectGroup[] = [];
	private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined> = new vscode.EventEmitter<Dependency | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Dependency | undefined> = this._onDidChangeTreeData.event;

	constructor(private workspaceRoot: string) {
		const projectFilePath = getProjectFilePath();
		this.projects = loadProjects(projectFilePath);

		
	}

	refresh(): void {
		const projectFilePath = getProjectFilePath();
		this.projects = loadProjects(projectFilePath);

		this._onDidChangeTreeData.fire();
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
			const node = element.node as ProjectGroup;
			const nodes = node.nodes as ProjectGroup[];

			return Promise.resolve(nodes.map(this.toDep));
		}
			
		else {
			return Promise.resolve(this.projects.map(this.toDep));
		}
	}

	private toDep(node: Project | ProjectGroup) {

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
		public readonly node: Project | ProjectGroup,
		public readonly command?: vscode.Command
	) {
		super(node.title, node.hasOwnProperty('nodes') ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
	}

	get tooltip(): string {
		return `${this.label}-${this.node.title}`;
	}

	get description(): string {
		return this.node.description || '';
	}

	get icon(): string {
		let icon = 'project.svg';

		if (this.node.hasOwnProperty('nodes'))
			icon = 'folder.svg';

		if (this.node.hasOwnProperty('type'))
		{
			if ((this.node as ProjectGroup).type === 'remote')
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


