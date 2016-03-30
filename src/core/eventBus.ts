/// <reference path="..\..\typings\main.d.ts" />

import { EventEmitter } from "events";
import Response from "../response/response";

/**
 * Share app-wide events with necessary classes through this bus.
 */
export default class EventBus extends EventEmitter {
    /**
     * Emit a standard error.
     */
    public emitError(err: Error, response: Response): void {
        this.emit("error", err, response);
    }
}