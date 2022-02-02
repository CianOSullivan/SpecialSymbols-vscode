import * as vscode from 'vscode';
import { accessSync, existsSync, mkdirSync, writeFile, readFile, readFileSync} from 'fs';
import { LocalStorageService } from './LocalStorageService';

export class Favourite implements vscode.TreeDataProvider<TreeItem> {
	data: TreeItem[];
	confFile: string;
	storageManager: LocalStorageService;
	context: vscode.ExtensionContext;

	constructor(f: string, c: vscode.ExtensionContext) {
		this.storageManager = new LocalStorageService(c.globalState);
		this.context = c;
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

	public addNote(item: TreeItem, value: string) {
		let key = item.location + ":" + item.label;
		this.storageManager.setValue(key, value);
		this.storageManager.printKeys();
		//this.context.globalState.setKeysForSync([key]);
	}

	private readConfig() : TreeItem[] {
		var tree: Array<TreeItem> = [];
		const fileJSON = readFileSync(this.confFile);
		const obj = JSON.parse(fileJSON.toString());

		for (var key in obj) {
			var toAdd: Array<TreeItem> = [];
			for (var arr in obj[key]) {
				let item: TreeItem = new TreeItem(obj[key][arr], key);
				console.log("Key: " + key);
				console.log("Obj: " + obj[key][arr]);
				let noteKey: string = key + ":" + obj[key][arr];
				console.log(noteKey);
				let note: string | undefined = this.storageManager.getValue(noteKey);
				if (note !== undefined) {
					console.log("Assigning note");
					item.setNote(note);
				}

				toAdd.push(item);

			}
			tree.push(new TreeItem(key, undefined, toAdd));
			toAdd = [];
		}

		return tree;
	}
}

export class TreeItem extends vscode.TreeItem {
	children: TreeItem[]|undefined;    //
	location: string|undefined;        // This is the file where the symbol is stored
	note: string|undefined;

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
		this.note = undefined;
	}

	public setNote(n: string) {
		this.tooltip = n;
	}
}
