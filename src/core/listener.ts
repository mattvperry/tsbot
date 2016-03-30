import { inspect } from "util";
import { Message, TextMessage } from "./message";
import Middleware, { Context } from "./middleware";
import Robot from "./robot";
import Response from "./response";
import EventBus from "./eventBus";

export type Matcher = (message: Message) => any;
export type ListenerCallback = (response: Response) => void;

export interface ListenerContext extends Context {
    listener: Listener;
}

/**
 * Listeners receive every message from the chat source and decide
 * if they want to act on it.
 */
export default class Listener {
    /**
     * Regex used, if one was used
     */
    public regex: RegExp;

    /**
     * Initializes a new instance of the <<Listener>> class.
     * An identifier should be provided in the options paramter to uniquely
     * identify the listener (options.id).
     * @param _eventBus <<EventBus>> instance.
     * @param matcher A function that determines if this listener should trigger the
     *  callback
     * @param options An object of additional parameters keyed on extension name (optional).
     * @param callback A function that is triggered if the incoming message matches.
     */
    constructor(_logger: Log, _eventBus: EventBus, _matcher: Matcher, _callback: ListenerCallback)
    constructor(_logger: Log, _eventBus: EventBus, _matcher: Matcher, _options: any, _callback: ListenerCallback)
    constructor(
        private _logger: Log,
        private _eventBus: EventBus,
        private _matcher: Matcher,
        private _options: any,
        private _callback?: ListenerCallback) {
        if (!this._matcher) {
            throw new Error("Missing a matcher for Listener");
        }

        if (!this._callback) {
            this._callback = this._options;
            this._options = {};
        }

        if (!this._options.id) {
            this._options.id = null;
        }

        if (!this._callback || typeof this._callback !== "function") {
            throw new Error("Missing a callback for Listener");
        }
    }

    /**
     * Determines if the listener likes the content of the message. If
     * so, a <<Response>> built from the given <<Message>> is passed through
     * all registered middleware and potentially the <<Listener>> callback. Note
     * that middleware can intercept the message and prevent the callback from ever
     * being executed.
     * @param message A <<Message>> instance
     * @param middleware Optional <<Middleware>> object to execute before the <<Listener>> callback
     */
    public async call(message: Message, middleware?: Middleware<ListenerContext>): Promise<boolean> {
        if (!middleware) {
            // middleware = new Middleware<ListenerContext>();
        }

        let match = this._matcher(message);
        if (match) {
            if (this.regex) {
                this._logger.debug(
                    `Message '${message}' matched regex /${inspect(this.regex)}/; listener._options = ${inspect(this._options)}`);
            }

            let context = await middleware.execute({
                listener: this,
                response: new Response(message, match)
            });
            this._logger.debug(`Executing listener callback for Message '${message}'`);
            try {
                this._callback(context.response);
                return Promise.resolve(true);
            } catch (e) {
                this._eventBus.emit("error", e, context.response);
                return Promise.reject<boolean>(e);
            }
        } else {
            return Promise.resolve(false);
        }
    }
}