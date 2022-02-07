import { Memento } from "vscode";

/**
 * Create a new storage service
 */
export class StorageService {
    constructor(private storage: Memento) { }

    /**
     * Get the key from storage
     *
     * @param key   the key to get from storage
     * @returns     the value at the key index from storage
     */
    public getValue<T>(key : string) : T | undefined {
        return this.storage.get<T>(key);
    }

    /**
     * Set the value at the key in storage
     *
     * @param key   the index to store the value at
     * @param value the value to set at the key index
     */
    public setValue<T>(key : string, value : T){
        this.storage.update(key, value);
    }

    /**
     * Debug function. Print the value at every index in storage
     */
    public printKeys() {
        this.storage.keys().forEach(element => {
            console.log(this.getValue(element));
        });
    }
}