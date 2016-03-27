import User from "./user";
import Brain from "./brain";
import Robot from "./robot";
import { Adapter } from "./adapter";
import Response from "./response";
import { Listener, TextListener } from "./listener";
import { Message, TextMessage, EnterMessage, LeaveMessage, TopicMessage, CatchAllMessage, Envelope } from "./message";

export {
    User,
    Brain,
    Robot,
    Adapter,
    Response,
    Listener,
    TextListener,
    Message,
    TextMessage,
    EnterMessage,
    LeaveMessage,
    TopicMessage,
    CatchAllMessage,
    Envelope
};

export function loadBot(adapterPath: string, adapterName: string, enableHttpd: boolean, botName: string, botAlias: string): Robot {
    return new Robot(adapterPath, adapterName, enableHttpd, botName, botAlias);
}