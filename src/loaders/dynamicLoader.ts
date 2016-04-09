import * as path from "path";
import * as fs from "mz/fs";

/**
 * Base class for dynamically loading files
 */
export default class DynamicLoader<T> {
    /**
     * Initializes a new instance of the <<DynamicLoader>> class.
     */
    constructor(protected _logger: Log) {
    }

    /**
     * Load the given package or filename
     * @param identifier package or filename to load
     */
    protected _load(identifier: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            try {
                resolve(require(identifier));
            } catch (e) {
                this._logger.error(`Unable to load ${identifier}: ${e.stack}`);
                reject(e);
            }
        });
    }

    /**
     * Load a file only if the file extension is supported
     * @param filePath file to load
     */
    protected _loadFile(filePath: string): Promise<T> {
        let ext = path.extname(filePath);
        if (require.extensions[ext]) {
            return this._load(filePath);
        }
    }

    /**
     * Load all files in a given directory
     * @param dir directory to load from
     */
    protected async _loadDir(dir: string): Promise<T[]> {
        this._logger.debug(`Loading scripts from ${dir}`);
        if (await fs.exists(dir)) {
            let files = await fs.readdir(dir);
            return Promise.all(files.map((f) => this._loadFile(path.join(dir, f))));
        } else {
            return Promise.resolve([]);
        }
    }
}