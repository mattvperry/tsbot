import * as scoped from "scoped-http-client";
import { IFactory } from "inversify";
import Robot from "../core/robot";
import Middleware, { Context } from "../middleware/middleware";
import { Message } from "../core/message";

export interface ResponseContext extends Context {
    strings: string[];
    method: string;
    plaintext: boolean;
}

/**
 * Responses are sent to matching listeners. Message know about the
 * content and user that made the original message, and how to reply
 * back to them.
 */
export default class Response {
    /**
     * Initializes a new instance of the <<Response>> class.
     * @param _middleware the response middleware stack
     * @param _makeHttpClient scoped http client factory
     * @param _message A <<Message>> instance.
     * @param match A match object from the successful regex match.
     */
    constructor(
        private _middleware: Middleware<ResponseContext>,
        private _makeHttpClient: IFactory<scoped.ScopedClient>,
        public message: Message,
        public match?: RegExpMatchArray) {
        if (!message) {
            throw new Error("Message parameter cannot be null or undefined.");
        }
    }

    /**
     * Posts a message back to the chat source
     * @param strings One or more strings to be posted. The order of these strings
     *  should be kept intact.
     */
    public send(...strings: string[]): Promise<void> {
        return this._runWithMiddleware("send", { plaintext: true }, ...strings);
    }

    /**
     * Posts an emote back to the chat source
     * @param strings One or more strings to be posted. The order of these strings
     *  should be kept intact.
     */
    public emote(...strings: string[]): Promise<void> {
        return this._runWithMiddleware("send", { plaintext: true }, ...strings);
    }

    /**
     * Posts a message mentioning the current user.
     * @param strings One or more strings to be posted. The order of these strings
     *  should be kept intact.
     */
    public reply(...strings: string[]): Promise<void> {
        return this._runWithMiddleware("send", { plaintext: true }, ...strings);
    }

    /**
     * Posts a topic changing message.
     * @param strings One or more strings to set as the topic of the
     *  room the bot is in.
     */
    public topic(...strings: string[]): Promise<void> {
        return this._runWithMiddleware("send", { plaintext: true }, ...strings);
    }

    /**
     * Posts a sound in the chat source.
     * @param strings One or more strings to be posted as sounds to play. The
     *  order of these strings should be kept intact.
     */
    public play(...strings: string[]): Promise<void> {
        return this._runWithMiddleware("send", { plaintext: true }, ...strings);
    }

    /**
     * Posts a message in an unlogged room.
     * @param strings One or more strings to be posted. The order of these strings
     *  should be kept intact.
     */
    public locked(...strings: string[]): Promise<void> {
        return this._runWithMiddleware("send", { plaintext: true }, ...strings);
    }

    /**
     * Picks a random item from the given items.
     * @param items An array of items.
     * @returns a random item.
     */
    public random<T>(items: T[]): T {
        return items[Math.floor(Math.random() * items.length)];
    }

    /**
     * Tell the message to stop dispatching to listeners
     */
    public finish(): void {
        this.message.finish();
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
     * Call with a m ethod for the given strings using response
     * middleware.
     */
    private async _runWithMiddleware(
        methodName: string,
        opts: { plaintext?: boolean },
        ...strings: string[]): Promise<void> {
        let context: ResponseContext = {
            response: this,
            strings: strings.slice(0),
            method: methodName,
            plaintext: opts.plaintext || false
        };

        let result = await this._middleware.execute(context);
        // this._robot.adapter[result.method](this.message.toEnvelope(), ...result.strings);
    }
}