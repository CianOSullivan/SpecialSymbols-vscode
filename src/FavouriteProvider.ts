import * as vscode from 'vscode';
import { readFileSync} from 'fs';
import { StorageService } from './StorageService';


/**
 * Create a new TreeView data provider for the favourites config
 */
export class FavouriteProvider implements vscode.TreeDataProvider<TreeItem> {
	data: TreeItem[];
	confFile: string;
	storageManager: StorageService;
	context: vscode.ExtensionContext;

	// Trigger update of TreeView when the data changes
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

	/**
	 * Create a new Favourites Provider
	 *
	 * @param f	the favourites config file location
	 * @param c the extension context
	 */
	constructor(f: string, c: vscode.ExtensionContext) {
		this.storageManager = new StorageService(c.globalState);
		this.context = c;
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
		const fileJSON = readFileSync(this.confFile);
		const obj = JSON.parse(fileJSON.toString());
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
				item = new TreeItem(filename, key, toAdd);
				item.setNote(key); // Show the full filename on hover
				tree.push(item);
			}
			toAdd = [];
		}

		return tree;
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

	/**
	 * Set the item to be collapesed in the treeview
	 */
	public setCollapsed() {
		this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
	}
}
