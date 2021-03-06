import { inspect } from "util";
import { Message, TextMessage } from "./message";
import Middleware, { Context } from "./middleware";
import Robot from "./robot";
import Response from "./response";

export type Matcher = (message: Message) => any;
export type ListenerCallback = (response: Response) => void;

export interface ListenerContext extends Context {
    listener: Listener;
}

/**
 * Listeners receive every message from the chat source and decide
 * if they want to act on it.
 */
export class Listener {
    /**
     * Regex used, if one was used
     */
    public regex: RegExp;

    /**
     * Initializes a new instance of the <<Listener>> class.
     * An identifier should be provided in the options paramter to uniquely
     * identify the listener (options.id).
     * @param robot A robot instance
     * @param matcher A function that determines if this listener should trigger the
     *  callback
     * @param options An object of additional parameters keyed on extension name (optional).
     * @param callback A function that is triggered if the incoming message matches.
     */
    constructor(_robot: Robot, _matcher: Matcher, _callback: ListenerCallback)
    constructor(_robot: Robot, _matcher: Matcher, _options: any, _callback: ListenerCallback)
    constructor(
        private _robot: Robot,
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
            middleware = new Middleware<ListenerContext>(this._robot);
        }

        let match = this._matcher(message);
        if (match) {
            if (this.regex) {
                this._robot.logger.debug(
                    `Message '${message}' matched regex /${inspect(this.regex)}/; listener._options = ${inspect(this._options)}`);
            }

            let context = await middleware.execute({
                listener: this,
                response: new Response(this._robot, message, match)
            });
            this._robot.logger.debug(`Executing listener callback for Message '${message}'`);
            try {
                this._callback(context.response);
            } catch (e) {
                this._robot.emit("error", e, context.response);
            }
            return Promise.resolve(true);
        } else {
            return Promise.resolve(false);
        }
    }
}

/**
 * TextListeners receive every message from the chat source and decided if they
 * want to act on it.
 */
export class TextListener extends Listener {
    /**
     * Initializes a new instance of the <<TextListener>> class.
     * @param robot A robot instance
     * @param matcher A function that determines if this listener should trigger the
     *  callback
     * @param options An object of additional parameters keyed on extension name (optional).
     * @param callback A function that is triggered if the incoming message matches.
     */
    constructor(robot: Robot, regex: RegExp, options: any, callback?: ListenerCallback) {
        let matcher: Matcher = (message) => {
            if (message instanceof TextMessage) {
                return message.match(regex);
            }
        };
        super(robot, matcher, options, callback);
        this.regex = regex;
    }
}