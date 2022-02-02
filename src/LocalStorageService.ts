'use strict';

import { Memento } from "vscode";

export class LocalStorageService {

    constructor(private storage: Memento) { }

    public getValue<T>(key : string) : T | undefined {
        console.log("Getting: " + key);
        return this.storage.get<T>(key);
    }

    public setValue<T>(key : string, value : T){
		console.log("Adding " + value + " at " + key);
        this.storage.update(key, value);
    }

    public printKeys() {
        this.storage.keys().forEach(element => {
            console.log(this.getValue(element));
        });
    }
}