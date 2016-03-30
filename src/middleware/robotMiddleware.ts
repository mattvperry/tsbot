import { inject, IFactory } from "inversify";
import Middleware, { Context } from "./middleware";
import { ListenerContext } from "../listener/listener";
import { ResponseContext } from "../response/response";

/**
 * Set of middleware used by the robot
 */
@inject("IFactory<Middleware>")
export default class RobotMiddleware {
    /**
     * Listener middleware
     */
    public listener: Middleware<ListenerContext>;

    /**
     * Response middleware
     */
    public response: Middleware<ResponseContext>;

    /**
     * Receive middleware
     */
    public receive: Middleware<Context>;

    /**
     * Initializes a new instance of the <<RobotMiddleware>> class.
     * @param makeMiddleware <<Middleware>> factory
     */
    constructor(makeMiddleware: IFactory<Middleware<Context>>) {
        this.listener = makeMiddleware();
        this.response = makeMiddleware();
        this.receive = makeMiddleware();
    }
}