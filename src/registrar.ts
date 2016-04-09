import "reflect-metadata";
import * as scoped from "scoped-http-client";
import * as log from "loglevel";
import EventBus from "./core/eventBus";
import Brain from "./core/brain";
import Robot from "./core/robot";
import RouterFactory from "./core/routerFactory";
import AdapterLoader from "./loaders/adapterLoader";
import ScriptLoader from "./loaders/scriptLoader";
import RobotMiddleware from "./middleware/robotMiddleware";
import ListenerBuilder from "./listener/builder";
import ResponseBuilder from "./response/builder";
import Middleware, { Context } from "./middleware/middleware";
import { Configuration } from "./core/configuration";
import { Kernel, IKernel, IKernelModule, IFactory, IContext } from "inversify";

/**
 * Inversion of control container registration.
 */
export default class Registrar {
    /**
     * Register all classes with IoC container.
     * @param configuration A configuration instance with config for the robot.
     * @returns a new IoC kernel.
     */
    public static register(configuration: Configuration): IKernel {
        let kernel = new Kernel();

        // Core
        log.setLevel(process.env.HUBOT_LOG_LEVEL || process.env.TSBOT_LOG_LEVEL || "info");
        kernel.bind<Log>("Log").toValue(log).inSingletonScope();
        kernel.bind<EventBus>("EventBus").to(EventBus).inSingletonScope();
        kernel.bind<Configuration>("Configuration").toValue(configuration);
        kernel.bind<Robot>("Robot").to(Robot);
        kernel.bind<Brain>("Brain").to(Brain);

        // Dynamic loaders
        kernel.bind<AdapterLoader>("AdapterLoader").to(AdapterLoader);
        kernel.bind<ScriptLoader>("ScriptLoader").to(ScriptLoader);

        // Middleware
        kernel.bind<RobotMiddleware>("RobotMiddleware").to(RobotMiddleware);
        kernel.bind<Middleware<Context>>("Middleware").to(Middleware);
        kernel.bind<IFactory<Middleware<Context>>>("IFactory<Middleware>").toAutoFactory<Middleware<Context>>();

        // Listener
        kernel.bind<ListenerBuilder>("ListenerBuilder").to(ListenerBuilder);
        kernel.bind<IFactory<ListenerBuilder>>("IFactory<ListenerBuilder>").toAutoFactory<ListenerBuilder>();

        // Response
        kernel.bind<ResponseBuilder>("ResponseBuilder").to(ResponseBuilder);
        kernel.bind<IFactory<ResponseBuilder>>("IFactory<ResponseBuilder>").toAutoFactory<ResponseBuilder>();

        // Http
        kernel.bind<RouterFactory>("RouterFactory").to(RouterFactory).inSingletonScope();
        kernel.bind<scoped.Options>("HttpOptions").toValue({}).inSingletonScope();
        kernel.bind<IFactory<scoped.ScopedClient>>("IFactory<ScopedClient>").toFactory((context: IContext) => {
            return () => {
                let options = context.kernel.get<scoped.Options>("HttpOptions");
                return scoped.create(options).header("User-Agent", `tsbot`);
            };
        });

        return kernel;
    }
}