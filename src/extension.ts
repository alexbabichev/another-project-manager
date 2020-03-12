'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';

import { ProjectsNodeProvider, Dependency } from './anotherProjectManager';
import { getProjectFilePath } from './pathUtil';

export function activate(context: vscode.ExtensionContext) {

	const anotherProjectManagerProvider = new ProjectsNodeProvider(vscode.workspace.rootPath);

	vscode.window.registerTreeDataProvider('anotherProjectManager', anotherProjectManagerProvider);
	
	vscode.commands.registerCommand('anotherProjectManager.refreshEntry', () => anotherProjectManagerProvider.refresh());
	
	vscode.commands.registerCommand('extension.open', (path: string) => {
		const uri = vscode.Uri.parse(path);
		return vscode.commands.executeCommand('vscode.openFolder', uri, false).then(
			value => ({}),  // done
			value => vscode.window.showInformationMessage("Could not open the project!")
		);
	});

	vscode.commands.registerCommand('anotherProjectManager.openNewWindow', (v: Dependency) => {
		const node = v.node as any;
		const uri = vscode.Uri.parse(node.path);
		return vscode.commands.executeCommand('vscode.openFolder', uri, true).then(
			value => ({}),  // done
			value => vscode.window.showInformationMessage("Could not open the project!")
		);
	});

	vscode.commands.registerCommand('anotherProjectManager.exitProjects', () => {
		const uri = vscode.Uri.parse(getProjectFilePath());
		return vscode.commands.executeCommand('vscode.open', uri).then(
			value => ({}),  // done
			value => vscode.window.showInformationMessage("Could not open the projects file!")
		);
	});

	fs.watchFile(getProjectFilePath(), { interval: 100 }, () => {
		anotherProjectManagerProvider.refresh();
	});
}