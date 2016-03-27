import Robot from "./robot";
import Response from "./response";
import { Listener } from "./listener";

export type MiddlewareFunc = (context: Context, next: (done: Function) => void, done: Function) => void;
export type CompleteFunc = (context: Context, done: Function) => void;

export interface Context {
    response: Response;
    listener?: Listener;
    strings?: string[];
    method?: string;
    plaintext?: boolean;
}

/**
 * Middleware handler
 */
export default class Middleware {
    /**
     * Middleware stack
     */
    private _stack: MiddlewareFunc[] = [];

    /**
     * Initializes a new instance of the <<Middleware>> class.
     * @params _robot A <<robot>> instance.
     */
    constructor(private _robot: Robot) {
    }

    /**
     * Execute all middleware in order and call "next" with the latest
     * "done" callback if last middleware calls through. If all middleware is
     * compliant, "done" should be called with no arguments when the entire
     * round trip is complete.
     * 
     * @param context context object that is passed through the middleware stack.
     *  When handling errors, this is assumed to have a "response" property.
     */
    public async execute(context: Context): Promise<Context> {
        let done: Function = () => {};
        try {
            for (let mw of this._stack) {
                done = await this._middlewareExecAsync(mw, context, done);
                if (!done) {
                    break;
                }
            }
        } catch (e) {
            done();
            throw e;
        }

        return Promise.resolve(context);
    }

    /**
     * Registers a new middleware
     * @param middleware A generic pipeline component function that can either
     *  continue the pipeline or interupt it. The function is called with
     *  (context, next, done), the middleware should call the "next" function
     *  with "done" as an optional argument. If not, the middleware should call
     *  the "done" function with no arguments. Middleware may wrap the "done" function
     *  in order to execute logic after the final callback has been executed.
     */
    public register(middleware: MiddlewareFunc): void {
        if (middleware.length !== 3) {
            throw new Error(
                `Incorrect number of arguments for middleware callback (expected 3, got ${middleware.length})`);
        }
        this._stack.push(middleware);
    }

    /**
     * Turn a middleware function into a promise.
     */
    private _middlewareExecAsync(
        middleware: MiddlewareFunc,
        context: Context,
        done: Function): Promise<Function> {
        return new Promise<Function>((resolve, reject) => {
            let nextCalled = false;
            let nextFunc = (newDoneFunc: Function = done) => {
                nextCalled = true;
                resolve(newDoneFunc);
            };
            try {
                middleware.call(undefined, context, nextFunc, done);
                // If "next" wasn't called, assume "done" was called. This
                // is a valid assumption if the middleware is well formed.
                if (!nextCalled) {
                    resolve(null);
                }
            } catch (e) {
                // Maintaining the existing error interface (Response object)
                this._robot.emit("error", e, context.response);
                reject(e);
            }
        });
    }
}