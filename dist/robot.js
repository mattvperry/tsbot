/// <reference path="..\typings\main.d.ts" />
"use strict";
const events_1 = require("events");
/**
 * Robots receive message from a chat source and dispatch them to
 * matching listeners
 */
class Robot extends events_1.EventEmitter {
    /**
     * Initializes a new instance of the <<Robot>> class.
     * @param _adapterPath  Path to the adapter script
     * @param _adapterName  Name of the adapter to use
     * @param httpd         Flag for enabling the HTTP server
     * @param _name         Name of this robot instance
     * @param _alias        Alias for this robot instance
     */
    constructor(_adapterPath, _adapterName, httpd, _name = "tsbot", _alias = false) {
        super();
        this._adapterPath = _adapterPath;
        this._adapterName = _adapterName;
        this._name = _name;
        this._alias = _alias;
        process.on("uncaughtException", (err) => { this.emit("error", err); });
    }
    /**
     * Adds a custom listener with the provided matcher, options and callback
     */
    listen(matcher, options, callback) {
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Robot;

//# sourceMappingURL=../maps/robot.js.map
