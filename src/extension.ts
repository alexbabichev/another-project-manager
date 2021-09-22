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

	vscode.commands.registerCommand("anotherProjectManager.deleteEntry", async (v: Dependency) =>
	{
		const result = await vscode.window.showWarningMessage(`Really delete ${v.node.title}?`, "Yes, Delete", "No, Cancel");
		if (result == "Yes, Delete")
		{
			anotherProjectManagerProvider.remove(v);
		}
	});

	vscode.commands.registerCommand("anotherProjectManager.createProjectGroup", async (v: Dependency) =>
	{
		const result = await vscode.window.showInputBox({
			
			placeHolder: 'Name of new Group',
		});

		if (result != undefined)
		{
			anotherProjectManagerProvider.addGroup(result, v);
		}
	});

	vscode.commands.registerCommand("anotherProjectManager.createProject", async (v: Dependency) =>
	{
		const result = await vscode.window.showInputBox({
			
			placeHolder: 'Name of new project',
		});

		if (result == undefined)
		{
			return;
		}
		
		const folderpaths = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false, openLabel: "Select Folder", title: "Select Folder" });
		if (folderpaths == undefined)
		{
			return;
		}
		anotherProjectManagerProvider.addProject(result, folderpaths[0], v);

	});

	vscode.commands.registerCommand("anotherProjectManager.rename", async (v: Dependency) =>
	{
		const result = await vscode.window.showInputBox({
			value: v.node.title,
			placeHolder: 'Rename',
		});

		if (result == undefined)
		{
			return;
		}
		
		anotherProjectManagerProvider.rename(result, v);

	});

	fs.watchFile(getProjectFilePath(), { interval: 100 }, () => {
		anotherProjectManagerProvider.refresh();
	});
}