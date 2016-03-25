import Robot from "./robot";

export { Robot };

export function loadBot(adapterPath: string, adapterName: string, enableHttpd: boolean, botName: string, botAlias: string): Robot {
    return new Robot(adapterPath, adapterName, enableHttpd, name, botAlias);
}