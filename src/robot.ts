/// <reference path="..\typings\main.d.ts" />

import * as fs from "mz/fs";
import * as path from "path";
import { EventEmitter } from "events";

/**
 * Robots receive message from a chat source and dispatch them to
 * matching listeners
 */
export default class Robot extends EventEmitter {
    /**
     * Initializes a new instance of the <<Robot>> class.
     * @param _adapterPath  Path to the adapter script
     * @param _adapterName  Name of the adapter to use
     * @param httpd         Flag for enabling the HTTP server
     * @param _name         Name of this robot instance
     * @param _alias        Alias for this robot instance
     */
    constructor(
        private _adapterPath: string, 
        private _adapterName: string, 
        httpd: boolean, 
        private _name: string = "tsbot", 
        private _alias: string|boolean = false) {
        super();
        
        process.on("uncaughtException", (err: any) => { this.emit("error", err) });        
    }
    
    /**
     * Adds a custom listener with the provided matcher, options and callback
     */
    public listen(matcher: any, options: any, callback: Function): void {
        
    }
}