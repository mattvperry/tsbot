/// <reference path="..\typings\main.d.ts" />

import * as argv from "yargs";
import * as fs from "mz/fs";
import * as path from "path";
import Registrar from "./registrar";
import Robot from "./core/robot";
import ScriptLoader from "./loaders/scriptLoader";
import { Configuration } from "./core/configuration";

interface CommandLineArgs extends Configuration {
    configCheck: boolean;
}

function parseArgs(): CommandLineArgs {
    return argv
    .usage("Usage: $0 [options]")
    .option("adapter", {
        string: true,
        alias: "a",
        default: process.env.HUBOT_ADAPTER || process.env.TSBOT_ADAPTER || "shell",
        desc: "The Adapter to use"
    })
    .options("disable-httpd", {
        boolean: true,
        alias: "d",
        default: process.env.HUBOT_HTTPD || process.env.TSBOT_HTTPD || false,
        desc: "Disable the HTTP server"
    })
    .options("alias", {
        string: true,
        alias: "l",
        default: process.env.HUBOT_ALIAS || process.env.TSBOT_ALIAS || false,
        desc: "Enable replacing the robot's name with alias"
    })
    .options("name", {
        string: true,
        alias: "n",
        default: process.env.HUBOT_NAME || process.env.TSBOT_NAME || "tsbot",
        desc: "The name of the robot in chat"
    })
    .options("require", {
        type: "array",
        alias: "r",
        default: process.env.HUBOT_SCRIPTS || process.env.TSBOT_SCRIPTS || [],
        desc: "Alternative scripts path"
    })
    .options("config-check", {
        boolean: true,
        alias: "t",
        default: false,
        desc: "Test tsbot's config to make sure it won't fail at startup"
    })
    .version(() => require("../package.json").version)
    .alias("version", "v")
    .help("help")
    .alias("help", "h")
    .argv;
}

let options = parseArgs();
let kernel = Registrar.register(options);
let robot = kernel.get<Robot>("Robot");
let loader = kernel.get<ScriptLoader>("ScriptLoader");

loader.getModules().then(async (mods) => {
    if (options.configCheck) {
        await robot.loadModules(...mods);
        console.log("OK");
        process.exit(0);
    } else {
        robot.adapter.once("connected", () => robot.loadModules(...mods));
        robot.run();
    }
});