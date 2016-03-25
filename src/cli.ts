/// <reference path="..\typings\main.d.ts" />

import * as argv from "yargs";
import * as fs from "mz/fs";
import * as path from "path";
import { loadBot } from "./index";

interface CommandLineArgs {
    adapter: string;
    disableHttpd: boolean;
    alias: string;
    name: string;
    require: string[];
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

async function loadOtherScripts(fileName: string, loader: (scripts: string[]) => void): Promise<void> {
    let scriptsFile = path.resolve(".", fileName);
    if (await fs.exists(scriptsFile)) {
        let data = await fs.readFile(scriptsFile);
        if (data.length > 0) {
            try {
                loader(data.toJSON());
            } catch (e) {
                console.error(`Error parsing JSON data from ${fileName}: ${e}`);
                process.exit(1);
            }
        }
    }
}

async function loadScripts(options: any, robot: any): Promise<void> {
    await loadOtherScripts("hubot-scripts.json", (scripts) => {
        let loadPath = path.resolve("node_modules", "hubot-scripts", "src", "scripts");
        robot.loadHubotScripts(loadPath, scripts);
    });
    
    await loadOtherScripts("external-scripts.json", robot.loadExternalScripts.bind(this));
    
    let scripts = options.scripts.concat([path.resolve(".", "scripts"), path.resolve(".", "src", "scripts")]);
    for (let scriptPath of scripts) {
        let scriptsPath = scriptPath[0] === "/" ? scriptPath : path.resolve(".", scriptPath);
        robot.load(scriptsPath);
    }
}

let options = parseArgs();
let robot = loadBot(undefined, options.adapter, !options.disableHttpd, options.name, options.alias);

if (options.configCheck) {
    loadScripts(options, robot)
        .then(() => console.log("OK"))
        .then(() => process.exit(0));    
} else {
    robot.adapter.once("connected", () => loadScripts(options, robot));
    robot.run();
}