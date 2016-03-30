import Registrar from "./registrar";
import User from "./core/user";
import Brain from "./core/brain";
import Robot from "./core/robot";
import { Adapter } from "./core/adapter";
import Response from "./response/response";
import ListenerBuilder from "./listener/builder";
import { Message, TextMessage, EnterMessage, LeaveMessage, TopicMessage, CatchAllMessage, Envelope } from "./core/message";

export {
    User,
    Brain,
    Robot,
    Adapter,
    Response,
    ListenerBuilder,
    Message,
    TextMessage,
    EnterMessage,
    LeaveMessage,
    TopicMessage,
    CatchAllMessage,
    Envelope
};

export function loadBot(adapterPath: string, adapterName: string, enableHttpd: boolean, botName: string, botAlias: string): Robot {
    let kernel = Registrar.register({
        adapterPath: adapterPath,
        adapter: adapterName,
        disableHttpd: !enableHttpd,
        name: botName,
        alias: botAlias
    });
    return kernel.get<Robot>("Robot");
}