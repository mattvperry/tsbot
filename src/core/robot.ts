/// <reference path="..\..\typings\main.d.ts" />

import * as fs from "mz/fs";
import * as path from "path";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as multer from "multer";
import * as basicAuth from "basic-auth-connect";
import * as scoped from "scoped-http-client";
import * as message from "./message";
import { Server } from "http";
import { inject, IFactory } from "inversify";
import { Adapter } from "./adapter";
import { Context, MiddlewareFunc } from "../middleware/middleware";
import Brain from "./brain";
import EventBus from "./eventBus";
import RobotMiddleware from "../middleware/robotMiddleware";
import ResponseBuilder from "../response/builder";
import ListenerBuilder from "../listener/builder";
import Response, { ResponseContext } from "../response/response";
import Listener, { ListenerContext, Matcher, ListenerCallback } from "../listener/listener";

let DOCUMENTATION_SECTIONS = [
    "description",
    "dependencies",
    "configuration",
    "commands",
    "notes",
    "author",
    "authors",
    "examples",
    "tags",
    "urls"
];

/**
 * Interface for initial configuration of a robot
 */
export interface Configuration {
    adapterPath?: string;
    adapter: string;
    disableHttpd: boolean;
    alias: string;
    name: string;
}

/**
 * Robots receive message from a chat source and dispatch them to
 * matching listeners
 */
@inject("Configuration", "RobotMiddleware", "Brain", 
        "Log", "HttpOptions", "EventBus", "IFactory<ScopedClient>", 
        "IFactory<ResponseBuilder>", "IFactory<ListenerBuilder>")
export default class Robot {
    /**
     * Robot's name
     */
    public name: string;

    /**
     * Robot's alias
     */
    public alias: string;

    /**
     * Adapter instance
     */
    public adapter: Adapter;

    /**
     * Adapter instance name
     */
    public adapterName: string;

    /**
     * HTTP Router
     */
    public router: express.Express;

    /**
     * Path to adapter
     */
    private _adapterPath: string;

    /**
     * HTTP Server
     */
    private _server: Server;

    /**
     * Uncaught exception handler
     */
    private _onUncaughtException: Function;

    /**
     * Robot listeners
     */
    private _listeners: Listener[] = [];

    /**
     * List of commands
     */
    private _commands: string[] = [];

    /**
     * Initializes a new instance of the <<Robot>> class.
     */
    constructor(
        config: Configuration,
        public middleware: RobotMiddleware,
        public brain: Brain,
        public logger: Log,
        public globalHttpOptions: scoped.Options,
        private _eventBus: EventBus,
        private _makeHttpClient: IFactory<scoped.ScopedClient>,
        private _responseBuilder: IFactory<ResponseBuilder>,
        private _listenerBuilder: IFactory<ListenerBuilder>) {
        // Configuration slurp
        this.adapterName = config.adapter;
        this.name = config.name || "tsbot";
        this.alias = config.alias || null;
        this._adapterPath = config.adapterPath || path.join("..", "adapters");

        if (config.disableHttpd) {
            this._setupNullRouter();
        } else {
            this._setupExpress();
        }

        this._loadAdapter(this.adapterName);

        this._onUncaughtException = (err) => this.emit("error", err);
        process.on("uncaughtException", this._onUncaughtException);
    }

    /**
     * Adds a custom listener with the provided matcher, options and callback
     * @param matcher A function that determines whether to call the callback.
     *  Expected to return a truthy value if the callback should be executed.
     * @param options An object of additional parameters keyed on extension name
     *  (optional)
     * @param callback A function that is called with a <<Response>> object if the
     *  matcher function returns true.
     */
    public listen(matcher: Matcher, callback: ListenerCallback): void;
    public listen(matcher: Matcher, options: any, callback: ListenerCallback): void;
    public listen(matcher: Matcher, options: any, callback?: ListenerCallback): void {
        this._listeners.push(this._listenerBuilder()
            .withMatcher(matcher)
            .withOptions(options)
            .withCallback(callback)
            .build());
    }

    /**
     * Adds a <<Listener>> that attempts to match incoming messages based on a
     * Regex.
     * @param matcher A function that determines whether to call the callback.
     *  Expected to return a truthy value if the callback should be executed.
     * @param options An object of additional parameters keyed on extension name
     *  (optional)
     * @param callback A function that is called with a <<Response>> object if the
     *  matcher function returns true.
     */
    public hear(regex: RegExp, callback: ListenerCallback): void;
    public hear(regex: RegExp, options: any, callback: ListenerCallback): void
    public hear(regex: RegExp, options: any, callback?: ListenerCallback): void {
        this._listeners.push(this._listenerBuilder()
            .withRegex(regex)
            .withOptions(options)
            .withCallback(callback)
            .build());
    }

    /**
     * Adds a <<Listener>> that attempts to match incoming messages directed
     * at the robot based on a Regex. All regexes treat patterns like they begin
     * with a '^'.
     * @param matcher A function that determines whether to call the callback.
     *  Expected to return a truthy value if the callback should be executed.
     * @param options An object of additional parameters keyed on extension name
     *  (optional)
     * @param callback A function that is called with a <<Response>> object if the
     *  matcher function returns true.
     */
    public respond(regex: RegExp, callback: ListenerCallback): void;
    public respond(regex: RegExp, options: any, callback: ListenerCallback): void;
    public respond(regex: RegExp, options: any, callback?: ListenerCallback): void {
        this.hear(this._respondPattern(regex), options, callback);
    }

    /**
     * Adds a <<Listener>> that triggers when anyone enters the room.
     * @param options An object of additional parameters keyed on extension name
     *  (optional)
     * @param callback A function that is called with a Response object.
     */
    public enter(callback: ListenerCallback): void;
    public enter(options: any, callback: ListenerCallback): void;
    public enter(options: any, callback?: ListenerCallback): void {
        this.listen((msg) => msg instanceof message.EnterMessage, options, callback);
    }

    /**
     * Adds a <<Listener>> that triggers when anyone leaves the room.
     * @param options An object of additional parameters keyed on extension name
     *  (optional)
     * @param callback A function that is called with a Response object.
     */
    public leave(callback: ListenerCallback): void;
    public leave(options: any, callback: ListenerCallback): void;
    public leave(options: any, callback?: ListenerCallback): void {
        this.listen((msg) => msg instanceof message.LeaveMessage, options, callback);
    }

    /**
     * Adds a <<Listener>> that triggers when anyone changes the topic.
     * @param options An object of additional parameters keyed on extension name
     *  (optional)
     * @param callback A function that is called with a Response object.
     */
    public topic(callback: ListenerCallback): void;
    public topic(options: any, callback: ListenerCallback): void;
    public topic(options: any, callback?: ListenerCallback): void {
        this.listen((msg) => msg instanceof message.TopicMessage, options, callback);
    }

    /**
     * Adds a <<Listener>> that triggers when no other text matchers match.
     * @param options An object of additional parameters keyed on extension name
     *  (optional)
     * @param callback A function that is called with a Response object.
     */
    public catchAll(callback: ListenerCallback): void;
    public catchAll(options: any, callback: ListenerCallback): void;
    public catchAll(options: any, callback?: ListenerCallback): void {
        if (!callback) {
            callback = options;
            options = {};
        }

        this.listen(
            (msg) => msg instanceof message.CatchAllMessage,
            options,
            (msg) => {
                msg.message = (<message.CatchAllMessage>msg.message).message;
                callback(msg);
            }
        )
    }

    /**
     * Adds an error handler when an uncaught exception or user emitted
     * error event occurs.
     * @params callback A function that is called with the error object.
     */
    public error(callback: Function): void {
        this.on("error", callback);
    }

    /**
     * Registers new middleware for execution after matching but before
     * Listener callbacks
     * @param middleware A generic pipeline component function that can either
     *  continue the pipeline or interuppt it. The function is called with
     *  (context, next, done), the middleware should call the "next" function
     *  with "done" as an optional argument. If not, the middleware should call
     *  the "done" function with no arguments. Middleware may wrap the "done" function
     *  in order to execute logic after the final callback has been executed.
     */
    public listenerMiddleware(middleware: MiddlewareFunc<ListenerContext>): void {
        this.middleware.listener.register(middleware);
    }

    /**
     * Registers new middleware for execution as a response to any message is being
     * sent.
     * @param middleware A generic pipeline component function that can either
     *  continue the pipeline or interuppt it. The function is called with
     *  (context, next, done), the middleware should call the "next" function
     *  with "done" as an optional argument. If not, the middleware should call
     *  the "done" function with no arguments. Middleware may wrap the "done" function
     *  in order to execute logic after the final callback has been executed.
     */
    public responseMiddleware(middleware: MiddlewareFunc<ResponseContext>): void {
        this.middleware.response.register(middleware);
    }

    /**
     * Registers new middleware for execution before matching
     * @param middleware A generic pipeline component function that can either
     *  continue the pipeline or interuppt it. The function is called with
     *  (context, next, done), the middleware should call the "next" function
     *  with "done" as an optional argument. If not, the middleware should call
     *  the "done" function with no arguments. Middleware may wrap the "done" function
     *  in order to execute logic after the final callback has been executed.
     */
    public receiveMiddleware(middleware: MiddlewareFunc<Context>): void {
        this.middleware.receive.register(middleware);
    }

    /**
     * Passes the given message to any interested Listeners after running
     * receive middleware
     * @param message A message instance. Listeners can flag this message as "done"
     *  to prevent further execution
     * @returns Promise which resolves when processing is complete.
     */
    public async receive(message: message.Message): Promise<void> {
        let context = await this.middleware.receive.execute({
            response: this._responseBuilder().withMessage(message).build()
        });
        return this._processListeners(context);
    }

    /**
     * Loads a file in path.
     * @param filePath A string path on the filesystem.
     * @param fileName A string filename in path on the filesystem.
     */
    public async loadFile(filePath: string, fileName: string): Promise<void> {
        let ext = path.extname(fileName);
        let full = path.join(filePath, path.basename(fileName, ext));
        if (require.extensions[ext]) {
            try {
                let script = require(full);
                if (typeof script === "function") {
                    script(this);
                    await this._parseHelp(path.join(filePath, fileName));
                } else {
                    this.logger.warn(`Expected ${full} to assign a function to module.exports, got ${typeof script}`);
                }
            } catch(e) {
                this.logger.error(`Unable to load ${full}: ${e.stack}`);
                process.exit(1);
            }
        }
    }

    /**
     * Loads every script in the given path.
     * @param filePath A string path on the filesystem.
     */
    public async load(filePath: string): Promise<void> {
        this.logger.debug(`Loading scripts from ${filePath}`);
        if (await fs.exists(filePath)) {
            let files = await fs.readdir(filePath);
            for (let file of files.sort()) {
                await this.loadFile(filePath, file);
            }
        }
    }

    /**
     * Load script specified in the `hubot-scripts.json` file.
     * @param filePath A string path to the hubot-scripts files.
     * @param scripts An array of scripts to load.
     */
    public async loadHubotScripts(filePath: string, scripts: string[]): Promise<void> {
        this.logger.debug(`Loading hubot-scripts from ${filePath}`);
        for (let script of scripts) {
            await this.loadFile(filePath, script);
        }
    }

    /**
     * Load scripts from packages specified in the `external-scripts.json` file.
     * @param packages An array of packages containing hubot scripts to load.
     */
    public loadExternalScripts(packages: string[]|Object): Promise<void> {
        this.logger.debug("Loading external-scripts from npm packages");
        try {
            if (packages instanceof Array) {
                for (let pkg of packages) {
                    require(pkg)(this);
                }
            } else {
                Object.keys(packages).map((k) => {
                    return { name: k, scripts: packages[k] };
                }).forEach((pkg) => require(pkg.name)(this, pkg.scripts));
            }
            return Promise.resolve();
        } catch (e) {
            this.logger.error(`Error loading scripts from npm package - ${e.stack}`);
            return Promise.reject(e);
        }
    }

    /**
     * A helper send function which delegates to the adapter's send
     * function.
     * @param envelope A object with message, room, and user details
     * @param strings One or more strings for each message to send.
     */
    public send(envelope: message.Envelope, ...strings: string[]): void {
        this.adapter.send(envelope, ...strings);
    }

    /**
     * A helper reply function which delegates to the adapter's reply
     * function.
     * @param envelope A object with message, room, and user details
     * @param strings One or more strings for each message to send.
     */
    public reply(envelope: message.Envelope, ...strings: string[]): void {
        this.adapter.reply(envelope, ...strings);
    }

    /**
     * A helper send function to message a romm that the robot is in.
     * function.
     * @param room String designating the room to message.
     * @param strings One or more strings for each message to send.
     */
    public messageRoom(room: string, ...strings: string[]): void {
        this.adapter.send({ room: room }, ...strings);
    }

    /**
     * Kick off the event loop for the adapter.
     */
    public run(): void {
        this.emit("running");
        this.adapter.run();
    }

    /**
     * Gracefully shutdown the robot process.
     */
    public shutdown(): void {
        process.removeListener("uncaughtException", this._onUncaughtException);
        this.adapter.close();
        this.brain.close();
    }

    /**
     * Help commands for running scripts.
     * @returns An Array of help commands for running scripts.
     */
    public helpCommands(): string[] {
        return this._commands.sort();
    }

    /**
     * Wrapper around the event bus for ease of use.
     * @param event Event name to handle
     * @param listener Callback to execute on event
     * @returns this
     */
    public on(event: string, listener: Function): this {
        this._eventBus.on(event, listener);
        return this;
    }

    /**
     * Wrapper around the event bus for ease of use.
     * @param event Event to emit
     * @param args Variadic args to pass to event handler.
     */
    public emit(event: string, ...args: any[]): void {
        this._eventBus.emit(event, ...args);
    }

    /**
     * Creates a scoped http client with chainable methods for
     * modifying the request. This doesn't actually make a request
     * though. Once your request is assembled, you can call `get()`/`post()`
     * etc to send the request.
     * @param url String URL to access
     * @param options Optional options to pass on to the client
     * @returns a <<ScopedClient>> instance.
     */
    public http(url: string, options?: scoped.Options): scoped.ScopedClient {
        return this._makeHttpClient().scope(url, options);
    }

    /**
     * Setup the Express server's defaults
     */
    private _setupExpress(): void {
        let user = process.env.EXPRESS_USER;
        let pass = process.env.EXPRESS_PASSWORD;
        let stat = process.env.EXPRESS_STATIC;
        let port = process.env.EXPRESS_PORT || process.env.PORT || 8080;
        let address = process.env.EXPRESS_BIND_ADDRESS || process.env.BIND_ADDRESS || "0.0.0.0";

        // Setup express middleware
        let app = express();
        app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.setHeader("X-Powered-By", `tsbot/${this.name}`);
            next();
        });
        if (user && pass) {
            app.use(basicAuth(user, pass));
        }
        if (stat) {
            app.use(express.static);
        }
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(multer({ limits: {
            fileSize: 100 * 1024 * 1024
        }}).any());

        try {
            this._server = app.listen(port, address);
            this.router = app;
        } catch (e) {
            this.logger.error(`Error trying to start HTTP server: ${e}\n${e.stack}`);
            process.exit(1);
        }
    }

    /**
     * Setup an empty router object
     */
    private _setupNullRouter(): void {
        let msg = `A script has tried registering an HTTP route while the HTTP server is disabled with -d.`;
        this.router = <any>{
            get: () => this.logger.warn(msg),
            post: () => this.logger.warn(msg),
            put: () => this.logger.warn(msg),
            delete: () => this.logger.warn(msg)
        };
    }

    /**
     * Load the adapter tsbot is going to use.
     * @param adapterName A string of the adapter name to use.
     */
    private _loadAdapter(adapterName: string): void {
        this.logger.debug(`Loading adapter ${adapterName}`);
        try {
            let path: string;
            if (adapterName === "shell") {
                path = `${this._adapterPath}/${adapterName}`;
            } else {
                path = `hubot-${adapterName}`;
            }
            this.adapter = require(path).use(this);
        } catch (e) {
            this.logger.error(`Cannot load adapter ${adapterName} - ${e}`);
            process.exit(1);
        }
    }

    /**
     * Load help info from a loaded script.
     * @param filePath A string path to the file on disk.
     */
    private async _parseHelp(filePath: string): Promise<void> {
        this.logger.debug(`Parsing help for ${filePath}`);
        let lines = (await fs.readFile(filePath, "utf-8")).split("\n");
        let firstNonComment = lines
            .findIndex((line) => line[0] !== "#" && line.substr(0, 2) !== "//");
        let docComments = lines
            .slice(0, firstNonComment)
            .map((line) => line.replace(/^(#|\/\/)/, "").trim())
            .filter((line) => line.length > 0 && line.toLowerCase() !== "none");

        let scriptDoc = {};
        let currentSection: string = null;
        for (let doc of docComments) {
            let nextSection = doc.toLowerCase().replace(":", "");
            if (DOCUMENTATION_SECTIONS.indexOf(nextSection) !== -1) {
                currentSection = nextSection;
                scriptDoc[currentSection] = [];
            } else if (currentSection !== null) {
                scriptDoc[currentSection].push(doc);
                if (currentSection === "commands") {
                    this._commands.push(doc);
                }
            }
        }
    }

    /**
     * Passes the given message to any interested Listeners.
     * @param context Context for receive middleware
     * @returns Promise which resolves when processing is complete.
     */
    private async _processListeners(context: Context): Promise<void> {
        let handled: boolean = false;
        for (let listener of this._listeners) {
            let matched = await listener.call(context.response.message, this.middleware.listener);
            handled = handled || matched;
            if (context.response.message.done) {
                break;
            }
        }

        if (!(context.response.message instanceof message.CatchAllMessage) && !handled) {
            this.logger.debug("No listeners executed; falling back to catch-all");
            await this.receive(new message.CatchAllMessage(context.response.message));
        }
    }

    /**
     * Build a regular expression that matches messages addressed
     * directly to the robot
     * @param regex A RegExp for the message part that follows the robot's name/alias
     * @returns RegExp
     */
    private _respondPattern(regex: RegExp): RegExp {
        let re = regex.toString().split("/");
        re.shift();
        let modifiers = re.pop();

        if (re[0] && re[0][0] === "^") {
            this.logger.warn("Anchors don't work well with respond, perhaps you want to use 'hear'");
            this.logger.warn(`The regex in question was ${regex.toString()}`);
        }

        let pattern = re.join("/");
        let name = this.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        let newRegex: RegExp;
        if (this.alias) {
            let alias = this.alias.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            let [a, b] = name.length > alias.length ? [name, alias] : [alias, name];
            newRegex = new RegExp(
                `^\\s*[@]?(?:${a}[:,]?|${b}[:,]?)\\s*(?:${pattern})`,
                modifiers
            );
        } else {
            newRegex = new RegExp(
                `^\\s*[@]?${name}[:,]?\\s*(?:${pattern})`,
                modifiers
            )
        }
        return newRegex;
    }
}