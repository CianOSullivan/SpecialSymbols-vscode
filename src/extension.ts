import * as vscode from 'vscode';
import { Uri } from 'vscode';
import { FavouriteProvider, TreeItem } from './FavouriteProvider';
import { existsSync, mkdirSync, writeFile, readFileSync } from 'fs';

let treeProvider: FavouriteProvider;


// Initialise extension and its commands
export function activate(context: vscode.ExtensionContext) {
	let disposable: vscode.Disposable;
	let tree: vscode.TreeView<TreeItem>;
	const storagePath: string = context.globalStorageUri.fsPath;
	const storageFile: string = Uri.joinPath(context.globalStorageUri, "favourites").path;

	const promise = new Promise((resolve) => {
		resolve(checkPathExists(storagePath, storageFile));
	});

	promise.then(res => {
		// Create the TreeView
		treeProvider = new FavouriteProvider(storageFile, context);
		tree = vscode.window.createTreeView('favouriteBar', {
			treeDataProvider: treeProvider
		});
	}).catch(err => {
		console.log(err);
		return;
	});



	disposable = vscode.commands.registerCommand('favourite.goToSymbol', (item: TreeItem) => {
		gotoSymbol(item);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('favourite.addNote', (item: TreeItem) => {
		addNoteInput(item);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('favourite.addSymbol', () => {
		getSymbols(storageFile);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('favourite.delSymbol', (item: TreeItem) => {
		delSymbol(item, storageFile);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('favourite.collapseAll', () => {
		treeProvider.data.forEach(element => {
			element.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
			console.log("Collapse: " + element.label);
			tree.reveal(element, {select: false, focus: false, expand: true});
			treeProvider.refresh();
		});
	});

	context.subscriptions.push(disposable);
}

/**
 * Add a note to the given item
 *
 * @param item The item to add the note to
 */
function addNoteInput(item: TreeItem) {
	// Edit if note already exists
	let options: vscode.InputBoxOptions = {
		prompt: "Enter symbol note: ",
		placeHolder: "Note",
		value: (item.tooltip ? item.tooltip.toString() : undefined) // Think this could be condensed
	};

	vscode.window.showInputBox(options).then(value => {
		if (!value) {
			return;
		}
		treeProvider.addNote(item, value);
	});
}

/**
 * Get all symbols from active document and add favourite if symobl matches
 *
 * @param path	the path to the favourites config file
 */
function getSymbols(path: string) {
	var activeEditor = vscode.window.activeTextEditor;

	if (activeEditor) {
		vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", activeEditor.document.uri).then(
			(symbols) => {
				if (symbols && Array.isArray(symbols) && activeEditor) {
					addIfExists(activeEditor, symbols, path);
				}
		})
		.then(undefined, err => {
			console.error('Error: Could not retrieve symbols list.');
			console.error(err);
		 });
	}
}

/**
 * Add the symbol if there is one on the current line
 *
 * @param activeEditor	the current editor instance
 * @param symbols 		the symbols in the current file
 * @param path 			the path to the favourites config
 */
function addIfExists(activeEditor: vscode.TextEditor, symbols: vscode.DocumentSymbol[], path: string) {
	let cursorPos = activeEditor.selection.active;

	// Add symbol if cursorPos on same line as a symbol
	symbols.forEach(element => {
		element.children.forEach(child => {
			if (cursorPos.line === child.range.start.line) {
				addFavourite(activeEditor.document.fileName, child, path);
				return;
			}
		});
		if (cursorPos.line === element.range.start.line) {
			addFavourite(activeEditor.document.fileName, element, path);
			return;
		}
	});
}

/**
 * Add the selected symbol to favourites
 *
 * @param filename	the file to index the symbol under
 * @param symbol	the symbol to add to favourites
 * @param path		the path to the favourites config file
 * @returns			undefined
 */
function addFavourite(filename: string, symbol: vscode.DocumentSymbol, path: string) {
	const promise = new Promise<string>((resolve) => {
		const fileJSON = readFileSync(path,'utf8');
		resolve(fileJSON);
	});

	promise.then(fileJSON => {
		// Create the TreeView

		let obj = JSON.parse(fileJSON);
		let list = obj[filename];
		if (!Array.isArray(list)) {
			list = [];
		}

		obj[filename] = list;

		// Check if symbol already in array
		if (list.indexOf(symbol.name) !== -1) {
			return;
		}

		list.push(symbol.name);

		writeFile(path, JSON.stringify(obj), {flag: 'w'}, (err) => {
			if (err) {
				throw err;
			}

			treeProvider.refresh();
		});
	}).catch(err => {
		console.log(err);
		return;
	});

}

/**
 * Delete the given symbol from the favourites
 *
 * @param item	the item to delete
 * @param path 	the path to the config file
 * @returns 	undefined
 */
function delSymbol(item: TreeItem, path: string) {
	let key: string;
	const fileJSON = readFileSync(path,'utf8');
	let obj = JSON.parse(fileJSON);

	if (typeof item.location === "string") {
		key = item.location;
	} else {
		console.debug("Could not delete symbol");
		return;
	}

	// Delete file and all symbols, otherwise only delete symbol
	if (item.children) {
		delete obj[key];
	} else {
		if (item.label) {
			let newList = removeItem(obj[key], item.label);
			obj[item.location] = newList;
		}
	}

	writeFile(path, JSON.stringify(obj), {flag: 'w'}, (err) => {
		if (err) {
			throw err;
		}

		treeProvider.refresh();
	});
}

/**
 * Create the file at the given path and create the directory if it does not
 * exist already
 *
 * @param storagePath	the path to create the file at
 * @param storageFile	the file to create at the path
 */
function checkPathExists(storagePath: string, storageFile: string) {
	if (!existsSync(storagePath)) {
		mkdirSync(storagePath, { recursive: true });
	}

	if (!existsSync(storageFile)) {
		console.debug("Creating" + storageFile);
		writeFile(storageFile, "{ }", {flag: 'a+'}, (err) => {
			if (err) {
				return false;
			}
		});
	}
	return true;
}

/**
 * Remove the given value from the given array
 *
 * @param arr    the array to remove the value from
 * @param value  the value to remove from the array
 * @returns      the new array without the value
 */
function removeItem<T>(arr: Array<T>, value: T): Array<T> {
	const index = arr.indexOf(value);
	if (index > -1) {
		arr.splice(index, 1);
	}
	return arr;
}

/**
 * Go to the symbol if it exists
 *
 * @param item	the node to go to
 * @returns 	undefined
 */
function gotoSymbol(item: TreeItem) {
	console.log(item.location);
	if (item.location === undefined) {
		return;
	}

	let uri = Uri.file(item.location);

	// Go straight to file if it is a parent node
	if (uri.toString().endsWith(item.location)) {
		vscode.workspace.openTextDocument(uri).then(doc => {
			vscode.window.showTextDocument(doc);
		});
	}

	vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", uri).then(
		(symbols) => {
			if (symbols && Array.isArray(symbols)) {
				symbols.forEach(element => {
					element.children.forEach((child: vscode.SymbolInformation) => {
						if (child.name === item.label) {
							goToExistSymbol(child, uri);
						}
					});

					if (element.name === item.label) {
						goToExistSymbol(element, uri);
					}
				});
			}
	}).then(undefined, err => {
		console.error('Error: Could not retrieve symbols from file.');
		vscode.window.showErrorMessage("Could not find symbol in this file.\n\nHas the file name changed?", { modal: true });
	});
}


/**
 * Go to the symbol that does exist in the uri
 *
 * @param element	the symbol to go to in the uri
 * @param uri 		the document uri
 */
function goToExistSymbol(element: vscode.SymbolInformation, uri: Uri) {
	console.log("Element name: " + element.name);
	// Go to the file
	vscode.workspace.openTextDocument(uri).then(doc => {
		vscode.window.showTextDocument(doc).then(() => {
			// Go to the line
			let editor = vscode.window.activeTextEditor;
			if (editor) {
				const position = editor.selection.active;
				let range = element.location.range;
				var newPosition = position.with(range.start.line, 0);
				console.log("Moving to ");
				console.log(newPosition);

				var newSelection = new vscode.Selection(newPosition, newPosition);
				editor.selection = newSelection;
				editor.revealRange(newSelection);
			}
			return;
		});
	});
}

// this method is called when your extension is deactivated
export function deactivate() {}