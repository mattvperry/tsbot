import { inject, IFactory } from "inversify";
import { ScopedClient } from "scoped-http-client";
import RobotMiddleware from "../middleware/robotMiddleware";
import { Message } from "../core/message"; 
import Response from "./response"; 

/**
 * Class which can fluently build a response
 */
@inject("RobotMiddleware", "IFactory<ScopedClient>")
export default class ResponseBuilder {
    /**
     * Message instance
     */
    private _message: Message;

    /**
     * RegExp match
     */
    private _match: RegExpMatchArray;

    /**
     * Initializes a new instance of the <<ResponseBuilder>> class.
     * @param _middleware the robot's middleware stacks
     * @param _makeHttpClient scoped http client factory
     */
    constructor(
        private _middleware: RobotMiddleware, 
        private _makeHttpClient: IFactory<ScopedClient>) {
    }

    /**
     * Set the message to use when building
     * @param message <<Message>> to use.
     * @returns this for chaining.
     */
    public withMessage(message: Message): this {
        this._message = message;
        return this;
    }

    /**
     * Set the match used when building
     * @param match <<RegExpMatchArray>> to use.
     * @returns this for chaining
     */
    public withMatch(match: RegExpMatchArray): this {
        this._match = match;
        return this;
    }

    /**
     * Build a concrete response
     * @returns A concrete <<Response>> instance.
     */
    public build(): Response {
        return new Response(
            this._middleware.response,
            this._makeHttpClient,
            this._message,
            this._match
        );
    }
}