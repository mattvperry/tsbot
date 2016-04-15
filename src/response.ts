import * as scoped from "scoped-http-client";
import Robot from "./robot";
import { Context } from "./middleware";
import { Message, Envelope } from "./message";

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
     * Message envelope
     */
    private _envelope: Envelope;

    /**
     * Initializes a new instance of the <<Response>> class.
     * @param _robot A <<Robot>> instance.
     * @param _message A <<Message>> instance.
     * @param match A match object from the successful regex match.
     */
    constructor(private _robot: Robot, public message: Message, public match?: RegExpMatchArray) {
        this._envelope = this.message.toEnvelope();
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
        return this._runWithMiddleware("emote", { plaintext: true }, ...strings);
    }

    /**
     * Posts a message mentioning the current user.
     * @param strings One or more strings to be posted. The order of these strings
     *  should be kept intact.
     */
    public reply(...strings: string[]): Promise<void> {
        return this._runWithMiddleware("reply", { plaintext: true }, ...strings);
    }

    /**
     * Posts a topic changing message.
     * @param strings One or more strings to set as the topic of the
     *  room the bot is in.
     */
    public topic(...strings: string[]): Promise<void> {
        return this._runWithMiddleware("topic", { plaintext: true }, ...strings);
    }

    /**
     * Posts a sound in the chat source.
     * @param strings One or more strings to be posted as sounds to play. The
     *  order of these strings should be kept intact.
     */
    public play(...strings: string[]): Promise<void> {
        return this._runWithMiddleware("play", { plaintext: true }, ...strings);
    }

    /**
     * Posts a message in an unlogged room.
     * @param strings One or more strings to be posted. The order of these strings
     *  should be kept intact.
     */
    public locked(...strings: string[]): Promise<void> {
        return this._runWithMiddleware("locked", { plaintext: true }, ...strings);
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
        return this._robot.http(url, options);
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

        let result = await this._robot.middleware.response.execute(context);
        this._robot.adapter[context.method](this._envelope, ...result.strings);
    }
}