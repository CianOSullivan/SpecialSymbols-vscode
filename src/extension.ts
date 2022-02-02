import * as vscode from 'vscode';
import { Uri } from 'vscode';
import { Favourite, TreeItem } from './Favourite';
import { existsSync, mkdirSync, writeFile, readFileSync } from 'fs';
import { LocalStorageService } from './LocalStorageService';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "secondext" is now active!');

	const storagePath: string = context.globalStorageUri.fsPath;
	const storageFile: string = Uri.joinPath(context.globalStorageUri, "favourites").path;
	checkPathExists(storagePath, storageFile);
	console.debug("Storage file: " + storageFile);

	const treeMaker = new Favourite(storageFile, context);


	vscode.commands.registerCommand('favourite.addEntry', (item: TreeItem) => {
		vscode.window.showInformationMessage('Successfully called add entry.');
		gotoSymbol(item);
	});

	vscode.commands.registerCommand('favourite.addNote', (item: TreeItem) => {
		vscode.window.showInformationMessage('Successfully called add note.');
		let options: vscode.InputBoxOptions = {
			prompt: "Enter symbol note: ",
			placeHolder: "Note"
		};

		vscode.window.showInputBox(options).then(value => {
			if (!value) {
				return;
			}
			treeMaker.addNote(item, value);
		});
	});


	//vscode.window.registerTreeDataProvider('favouriteBar', favouriteBar);
	vscode.window.createTreeView('favouriteBar', {
		treeDataProvider: treeMaker
	});

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('secondext.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		getSymbols(storageFile);

		vscode.window.showInformationMessage('Hello World from SecondExt!');
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

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
			console.error('Error: Could not retrieve sycmbols list.');
			console.error(err);
		 });
	}
}

function checkExists(activeEditor: vscode.TextEditor, symbols: vscode.DocumentSymbol[], path: string) {
	let cursorPos = activeEditor.selection.active;
	console.debug("Cursor Line: " + cursorPos.line);

	symbols.forEach(element => {
		console.debug(element);
		// If cursorPos on same line as function
		if (cursorPos.line === element.range.start.line) {
			addFavourite(activeEditor, element, path);
		} else {
			console.debug("Not the selected symbol");
		}
	});
}

function addFavourite(activeEditor: vscode.TextEditor, symbol: vscode.DocumentSymbol, path: string) {
	console.debug("Add favourite: " + symbol.name + " on line " + symbol.range.start.line);
	console.debug("Storing at: " + path);

	const fileJSON = readFileSync(path,'utf8');

	let obj = JSON.parse(fileJSON);
	let list = obj[activeEditor.document.fileName];
	if (!Array.isArray(list)) {
		list = [];
	}

	console.log("Adding: " + symbol.name);
	list.push(symbol.name);
	obj[activeEditor.document.fileName] = list;

	writeFile(path, JSON.stringify(obj), {flag: 'w'}, (err) => {
		if (err) {
			throw err;
		}

		// success case, the file was saved
		console.debug('Favourites file updated!');
	});}

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
		console.error('Error: Could not retrieve sycmbols list.');
		console.error(err);
	});
}