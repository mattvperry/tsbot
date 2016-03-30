import "reflect-metadata";
import * as log from "loglevel";
import { Kernel, IKernel, IKernelModule, IFactory } from "inversify";
import EventBus from "./core/eventBus";
import Brain from "./core/brain";
import Robot, { Configuration } from "./core/robot";
import Middleware, { Context } from "./core/middleware";
import ListenerBuilder from "./core/listenerBuilder";

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
        log.setLevel(process.env.HUBOT_LOG_LEVEL || process.env.TSBOT_LOG_LEVEL || "info");
        kernel.bind<Log>("Log").toValue(log).inSingletonScope();
        kernel.bind<EventBus>("EventBus").to(EventBus).inSingletonScope();
        kernel.bind<Configuration>("Configuration").toValue(configuration);
        kernel.bind<Robot>("Robot").to(Robot);
        kernel.bind<Brain>("Brain").to(Brain);
        kernel.bind<IFactory<Middleware<Context>>>("IFactory<Middleware>").toAutoFactory<Middleware<Context>>();
        kernel.bind<IFactory<ListenerBuilder>>("IFactory<ListenerBuilder>").toAutoFactory<ListenerBuilder>();
        return kernel;
    }
}