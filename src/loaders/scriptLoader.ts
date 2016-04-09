import * as path from "path";
import * as fs from "mz/fs";
import Robot from "../core/robot";
import DynamicLoader from "./dynamicLoader";
import { inject } from "inversify";
import { Configuration } from "./core/configuration";

/**
 * Interface representing a robot module
 */
export interface RobotModule {
    (robot: Robot): void;
}

/**
 * Default loader of scripts in a typical setup
 */
@inject("Configuration", "Log")
export default class ScriptLoader extends DynamicLoader<RobotModule> {
    /**
     * Search paths for scripts
     */
    private _searchPaths: string[];

    /**
     * Initializes a new instance of the <<ScriptLoader>> class.
     * @param config <<Configuration>> instance
     * @param logger <<Log>> instance
     */
    constructor(config: Configuration, logger: Log) {
        super(logger);
        this._searchPaths = config.require.concat([
            path.resolve(".", "scripts"),
            path.resolve(".", "src", "scripts")
        ]);
    }

    /**
     * Get all robot modules from the standard locations
     */
    public async getModules(): Promise<RobotModule[]> {
        let getHubotScripts = async () => {
            let hubotScripts = await this._readJSON("hubot-scripts.json");
            let hubotScriptsPath = path.resolve("node_modules", "hubot-scripts", "src", "scripts");
            return Promise.all(hubotScripts.map(s => this._loadFile(path.join(hubotScriptsPath, s))));
        };

        let getExternalPackages = async () => {
            let externalPackages = await this._readJSON("external-scripts.json");
            return Promise.all(externalPackages.map(p => this._load(p)));
        };

        let getLocalPackages = async (): Promise<RobotModule[]> => {
            let mods = await Promise.all(this._searchPaths.map(p => this._loadDir(p)));
            return [].concat(...mods);
        }

        let mods = await Promise.all([getHubotScripts(), getExternalPackages(), getLocalPackages()]);
        return [].concat(...mods);
    }

    /**
     * Read the given file as a json array
     * @param fileName file to read
     * @returns string array
     */
    private async _readJSON(fileName: string): Promise<string[]> {
        let file = path.resolve(".", fileName);
        if (await fs.exists(file)) {
            let data = await fs.readFile(file);
            if (data.length > 0) {
                return Promise.resolve(JSON.parse(data.toString()));
            }
        } else {
            return Promise.resolve([]);
        }
    }
}