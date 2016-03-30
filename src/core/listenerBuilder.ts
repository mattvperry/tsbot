import { inject } from "inversify";
import EventBus from "./eventbus";
import Listener, { Matcher, ListenerCallback } from "./listener";
import { TextMessage } from "./message";

/**
 * Class which can fluently build a listener
 */
@inject("Log", "EventBus")
export default class ListenerBuilder {
    /**
     * The matcher to use when building a listener
     */
    private _matcher: Matcher;

    /**
     * The callback to use when bulding a listener
     */
    private _callback: ListenerCallback;

    /**
     * The options to use when building a listener
     */
    private _options: any;

    /**
     * Does the matcher use regex?
     */
    private _regex: RegExp;

    /**
     * Initlializes a new instance of the <<ListenerBuilder>> class.
     * @param _logger A <<Log>> instance.
     * @param _eventBus A <<EventBus>> instance.
     */
    constructor(private _logger: Log, private _eventBus: EventBus) {
    }

    /**
     * Add a matcher to the builder
     * @param matcher <<Matcher>> to add
     * @returns this for chaining
     */
    public withMatcher(matcher: Matcher): this {
        this._matcher = matcher;
        return this;
    }

    /**
     * Add a simple text matcher to the builder
     * @param regex <<RegExp>> to match against
     * @returns this for chaining
     */
    public withRegex(regex: RegExp): this {
        this._regex = regex;
        return this.withMatcher((message) => {
            if (message instanceof TextMessage) {
                return message.match(regex);
            }
        });
    }

    /**
     * Add a callback to execute when listener is triggered
     * @param callback Function which is given a <<Response>>
     * @returns this for chaining
     */
    public withCallback(callback: ListenerCallback): this {
        this._callback = callback;
        return this;
    }

    /**
     * Additional options to add to the listener
     * @param options Property bag
     * @returns this for chaining
     */
    public withOptions(options: any): this {
        this._options = options;
        return this;
    }

    /**
     * Construct the final listener
     * @returns The constructed listener
     */
    public build(): Listener {
        let listener = new Listener(
            this._logger,
            this._eventBus,
            this._matcher,
            this._options,
            this._callback);
        listener.regex = this._regex;
        return listener;
    }
}