/// <reference path="..\typings\main.d.ts" />
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const argv = require("yargs");
const fs = require("mz/fs");
const path = require("path");
const _1 = require("./");
function parseArgs() {
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
function loadOtherScripts(fileName, loader) {
    return __awaiter(this, void 0, Promise, function* () {
        let scriptsFile = path.resolve(".", fileName);
        if (yield fs.exists(scriptsFile)) {
            let data = yield fs.readFile(scriptsFile);
            if (data.length > 0) {
                try {
                    loader(data.toJSON());
                }
                catch (e) {
                    console.error(`Error parsing JSON data from ${fileName}: ${e}`);
                    process.exit(1);
                }
            }
        }
    });
}
function loadScripts(options, robot) {
    return __awaiter(this, void 0, Promise, function* () {
        yield loadOtherScripts("hubot-scripts.json", (scripts) => {
            let loadPath = path.resolve("node_modules", "hubot-scripts", "src", "scripts");
            robot.loadHubotScripts(loadPath, scripts);
        });
        yield loadOtherScripts("external-scripts.json", robot.loadExternalScripts.bind(this));
        let scripts = options.scripts.concat([path.resolve(".", "scripts"), path.resolve(".", "src", "scripts")]);
        for (let scriptPath of scripts) {
            let scriptsPath = scriptPath[0] === "/" ? scriptPath : path.resolve(".", scriptPath);
            robot.load(scriptsPath);
        }
    });
}
let options = parseArgs();
let robot = _1.loadBot(undefined, options.adapter, !options.disableHttpd, options.name, options.alias);
if (options.configCheck) {
    loadScripts(options, robot)
        .then(() => console.log("OK"))
        .then(() => process.exit(0));
}
else {
    robot.adapter.once("connected", () => loadScripts(options, robot));
    robot.run();
}

//# sourceMappingURL=../maps/cli.js.map
