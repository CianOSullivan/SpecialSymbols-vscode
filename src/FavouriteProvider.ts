import * as vscode from 'vscode';
import { StorageService } from './StorageService';
import { readFileSync } from 'fs';


/**
 * Create a new TreeView data provider for the favourites config
 */
export class FavouriteProvider implements vscode.TreeDataProvider<TreeItem> {
	data: TreeItem[];
	confFile: string;
	storageManager: StorageService;

	// Trigger update of TreeView when the data changes
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

	/**
	 * Create a new Favourites Provider
	 *
	 * @param f	the favourites config file location
	 * @param s	the storage service instance
	 */
	constructor(f: string, s: StorageService) {
		this.storageManager = s;
		this.confFile = f;
		this.data = this.readConfig();
	}

	/**
	 * Update the TreeView
	 */
	public refresh(): any {
		this.data = this.readConfig();
		this._onDidChangeTreeData.fire(undefined);
	}

	/**
	 * Get all children of the given node
	 *
	 * @param element	the item to get the children of
	 * @returns			the children of the current item
	 */
	getChildren(element?: TreeItem|undefined): vscode.ProviderResult<TreeItem[]> {
		if (!element) {
			return this.data;
		}

		return element.children;
	}

	/**
	 * Get an item from the tree
	 *
	 * @param element	the element to get
	 * @returns 		a TreeItem
	 */
	getTreeItem(element: TreeItem): vscode.TreeItem|Thenable<vscode.TreeItem> {
		return element;
	}

	/**
	 * Required by reveal()
	 *
	 * @param element
	 * @returns
	 */
	getParent(element: TreeItem): vscode.ProviderResult<TreeItem> {
		return element;
	}

	/**
	 * Add a note to the given item
	 *
	 * @param item	the item to add the note to
	 * @param value	the note to add
	 */
	public addNote(item: TreeItem, value: string) {
		let key = item.location + ":" + item.label;
		this.storageManager.setValue(key, value);
		this.storageManager.printKeys();
		//this.context.globalState.setKeysForSync([key]);
	}


	/**
	 * Read the config file and store it in this.data
	 *
	 * @returns	undefined
	 */
	private readConfig() : TreeItem[] {
		var tree: Array<TreeItem> = [];
		var obj;

		const fileJSON = readFileSync(this.confFile);
		// On install, the file is not ready yet
		// Not too happy with this but remains K.I.S.S for now
		if (fileJSON.length === 0) {
			return [];
		}

		obj = JSON.parse(fileJSON.toString());
		let item: TreeItem;

		for (var key in obj) {
			var toAdd: Array<TreeItem> = [];
			obj[key].forEach((element: string) => {
				item = new TreeItem(element, key);
				let note: string | undefined = this.storageManager.getValue(key + ":" + element);

				if (note) {
					item.setNote(note);
				}

				toAdd.push(item);
			});

			// Get only the filename from path
			var filename = key.split("/").pop();
			if (filename) {
				if (toAdd.length === 0) {
					continue;
				}
				item = new TreeItem(filename, key, toAdd);
				item.setNote(key); // Show the full filename on hover
				tree.push(item);
			}
			toAdd = [];
		}

		return tree;
	}

	/**
	 * Collapse all parent nodes in the tree
	 */
	public collapseTree() {
		vscode.commands.executeCommand("workbench.actions.treeView.favouriteBar.collapseAll");
	}
}


export class TreeItem extends vscode.TreeItem {
	children: TreeItem[] | undefined;	// The symbols in the document
	location: string | undefined;		// The file where the symbol is stored
	note: string | undefined;

	/**
	 * Create a new TreeItem
	 *
	 * @param label		the text the TreeItem will have
	 * @param location	where the symbol is stored
	 * @param children	the symbols in the current file (if parent node)
	 */
	constructor(
			label: string,
			location?:string|undefined,
			children?: TreeItem[]) {
		super(
			label,
			children === undefined ? vscode.TreeItemCollapsibleState.None :
									vscode.TreeItemCollapsibleState.Expanded);
		this.children = children;
		// Go to the symbol when clicked
		this.command = {
			command: 'favourite.goToSymbol',
			title: '',
			arguments: [this]
		};
		this.location = location;
		this.tooltip = undefined;
	}

	/**
	 * Add a note to the symbol
	 *
	 * @param n the note to add to the symbol
	 */
	public setNote(n: string) {
		this.tooltip = n;
	}
}
