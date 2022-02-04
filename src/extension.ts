import * as vscode from 'vscode';
import { Uri } from 'vscode';
import { FavouriteProvider, TreeItem } from './FavouriteProvider';
import { existsSync, mkdirSync, writeFile, readFileSync } from 'fs';

let treeProvider: FavouriteProvider;

// Initialise extension and its commands
export function activate(context: vscode.ExtensionContext) {
	let disposable: vscode.Disposable;
	const storagePath: string = context.globalStorageUri.fsPath;
	const storageFile: string = Uri.joinPath(context.globalStorageUri, "favourites").path;
	checkPathExists(storagePath, storageFile);
	console.debug("Storage file: " + storageFile);

	treeProvider = new FavouriteProvider(storageFile, context);

	disposable = vscode.commands.registerCommand('favourite.goToSymbol', (item: TreeItem) => {
		gotoSymbol(item);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('favourite.addNote', (item: TreeItem) => {
		let options: vscode.InputBoxOptions = {
			prompt: "Enter symbol note: ",
			placeHolder: "Note"
		};

		vscode.window.showInputBox(options).then(value => {
			if (!value) {
				return;
			}
			treeProvider.addNote(item, value);
		});
	});
	context.subscriptions.push(disposable);

	vscode.window.createTreeView('favouriteBar', {
		treeDataProvider: treeProvider
	});

	disposable = vscode.commands.registerCommand('favourite.addSymbol', () => {
		getSymbols(storageFile);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('favourite.delSymbol', (item: TreeItem) => {
		delSymbol(item, storageFile);
	});
	context.subscriptions.push(disposable);
}


function getSymbols(path: string) {
	var activeEditor = vscode.window.activeTextEditor;

	if (activeEditor !== undefined) {
		vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", activeEditor.document.uri).then(
			(symbols) => {
				if (symbols !== undefined && Array.isArray(symbols) && activeEditor !== undefined) {
					checkExists(activeEditor, symbols, path);
				}
		})
		.then(undefined, err => {
			console.error('Error: Could not retrieve symbols list.');
			console.error(err);
		 });
	}
}


function checkExists(activeEditor: vscode.TextEditor, symbols: vscode.DocumentSymbol[], path: string) {
	let cursorPos = activeEditor.selection.active;

	symbols.forEach(element => {
		// If cursorPos on same line as function
		element.children.forEach(child => {
			if (cursorPos.line === child.range.start.line) {
				addFavourite(activeEditor, child, path);
				return;
			}
		});
		if (cursorPos.line === element.range.start.line) {
			addFavourite(activeEditor, element, path);
			return;
		}
	});
}


function addFavourite(activeEditor: vscode.TextEditor, symbol: vscode.DocumentSymbol, path: string) {
	const fileJSON = readFileSync(path,'utf8');

	let obj = JSON.parse(fileJSON);
	let list = obj[activeEditor.document.fileName];
	if (!Array.isArray(list)) {
		list = [];
	}

	console.log("Adding: " + symbol.name);
	obj[activeEditor.document.fileName] = list;

	// Check if symbol already in array
	if (list.indexOf(symbol.name) !== -1) {
		return;
	}

	list.push(symbol.name);

	writeFile(path, JSON.stringify(obj), {flag: 'w'}, (err) => {
		if (err) {
			throw err;
		}

		// success case, the file was saved
		console.debug('Favourites file updated!');
		treeProvider.refresh();
	});
}


function delSymbol(item: TreeItem, path: string) {
	let key: string;
	const fileJSON = readFileSync(path,'utf8');
	let obj = JSON.parse(fileJSON);

	if (typeof item.label === "string") {
		key = item.label;
	} else {
		console.debug("Could not delete symbol");
		return;
	}

	// It is a filename and all children need to be deleted
	if (item.children !== undefined) {
		delete obj[key];
	} else {
		// else it is a symbol inside a file and should be deleted
		if (item.location !== undefined) {
			let newList = removeItem(obj[item.location], key);
			obj[item.location] = newList;
		}
	}

	writeFile(path, JSON.stringify(obj), {flag: 'w'}, (err) => {
		if (err) {
			throw err;
		}

		// success case, the file was saved
		console.debug('Favourites file updated!');
		treeProvider.refresh();
	});
}


function checkPathExists(storagePath: string, storageFile: string) {
	if (!existsSync(storagePath)) {
		mkdirSync(storagePath, { recursive: true });
	}

	if (!existsSync(storageFile)) {
		console.debug("Creating" + storageFile);
		writeFile(storageFile, "{ }", {flag: 'a+'}, (err) => {
			if (err) {
				throw err;
			}

			// success case, the file was saved
			console.debug('Favourites file created!');
		});
	}
}

function removeItem<T>(arr: Array<T>, value: T): Array<T> {
	const index = arr.indexOf(value);
	if (index > -1) {
	  arr.splice(index, 1);
	}
	return arr;
  }


function gotoSymbol(item: TreeItem) {
	if (item.location === undefined) {
		return;
	}

	console.log("Going to symbol: " + item);
	let uri = Uri.file(item.location);

	vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", uri).then(
		(symbols) => {
			if (symbols !== undefined && Array.isArray(symbols)) {
				symbols.forEach(element => {
					if (element.name === item.label) {
						// Go to the file
						vscode.workspace.openTextDocument(uri).then(doc => {
							vscode.window.showTextDocument(doc).then(() => {
								// Go to the line
								let editor = vscode.window.activeTextEditor;
								if (editor !== undefined) {
									const position = editor.selection.active;
									let range = element.location.range;
									var newPosition = position.with(range.start, 0);
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
				});
			}
	}).then(undefined, err => {
		console.error('Error: Could not retrieve symbols from file.');
		vscode.window.showErrorMessage("Could not find symbol in this file.\n\nHas the file name changed?", { modal: true });
	});
}

// this method is called when your extension is deactivated
export function deactivate() {}