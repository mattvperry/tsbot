import * as path from "path";
import DynamicLoader from "./dynamicLoader";
import Robot from "./core/robot";
import { inject } from "inversify";
import { Adapter } from "../core/adapter";
import { Configuration } from "../core/configuration";

/**
 * Interface which is used to create an adapter
 */
export interface AdapterModule {
    use(robot: Robot): Adapter;
}

/**
 * Class which loads the configured adapter
 */
@inject("Configuration", "Log")
export default class AdapterLoader extends DynamicLoader<AdapterModule> {
    /**
     * Name of the adapter to load
     */
    private _name: string;

    /**
     * Path to the adapters
     */
    private _path: string;

    /**
     * Initializes a new instance of the <<AdapterLoader>> class.
     * @param config <<Configuration>> instance
     * @param _logger <<Logger>> instance
     */
    constructor(config: Configuration, _logger: Log) {
        super(_logger);
        this._name = config.adapter;
        this._path = config.adapterPath || path.join("..", "adapters");
    }

    /**
     * Loads the configured adapter
     * @returns function which activates adapter
     */
    public loadAdapter(): Promise<AdapterModule> {
        this._logger.debug(`Loading adapter ${this._name}`);
        try {
            let path: string;
            if (this._name === "shell") {
                path = `${this._path}/${this._name}`;
            } else if (this._path.match(/^(hu|ts)bot/)) {
                path = this._name;
            } else {
                path = `hubot-${this._name}`;
            }

            return this._load(path);
        } catch (e) {
            this._logger.error(`Cannot load adapter ${this._name} - ${e}`);
        }
    }
}