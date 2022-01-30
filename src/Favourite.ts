import * as vscode from 'vscode';
import { accessSync, existsSync, mkdirSync, writeFile, readFile, readFileSync} from 'fs';

export class Favourite implements vscode.TreeDataProvider<TreeItem> {
	data: TreeItem[];
	confFile: string;

	constructor(f: string) {
		this.confFile = f;
		this.data = this.readConfig();
	}

	getChildren(element?: TreeItem|undefined): vscode.ProviderResult<TreeItem[]> {
		if (element === undefined) {
		  return this.data;
		}

		return element.children;
	  }

	getTreeItem(element: TreeItem): vscode.TreeItem|Thenable<vscode.TreeItem> {
		return element;
	}
	
	private readConfig() : TreeItem[] {
		var tree: Array<TreeItem> = [];
		const fileJSON = readFileSync(this.confFile);
		const obj = JSON.parse(fileJSON.toString());

		for (var key in obj) {
			var toAdd: Array<TreeItem> = [];
			for (var arr in obj[key]) {
				toAdd.push(new TreeItem(obj[key][arr], key));
			}
			tree.push(new TreeItem(key, undefined, toAdd));
			toAdd = [];
		}

		return tree;
	}
}

export class TreeItem extends vscode.TreeItem {
	children: TreeItem[]|undefined;
	location: string|undefined;

	constructor(label: string, location?:string|undefined, children?: TreeItem[]) {
		super(
			label,
			children === undefined ? vscode.TreeItemCollapsibleState.None :
									vscode.TreeItemCollapsibleState.Expanded);
		this.children = children;
		this.command = {
			command: 'favourite.addEntry',
			title: '',
			arguments: [this]
		};
		this.location = location;
	}
  }
  