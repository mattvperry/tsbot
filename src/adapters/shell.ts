import * as readline from "readline";
import Robot from "../robot";
import { Adapter } from "../adapter";
import { Envelope, TextMessage } from "../message";

class Shell extends Adapter {
    private _cli: readline.ReadLine;

    public send(envelope: Envelope, ...strings: string[]): void {
        for (let s of strings) {
            console.log(s);
        }
    }

    public emote(envelope: Envelope, ...strings: string[]): void {
        for (let s of strings) {
            this.send(envelope, `* ${s}`);
        }
    }

    public reply(envelope: Envelope, ...strings: string[]): void {
        strings = strings.map((s) => `${envelope.user.name}: ${s}`);
        this.send(envelope, ...strings);
    }

    public run(): void {
        this._buildCli();
        this.emit("connected");
    }

    public close(): void {
        process.exit(0);
    }

    private _buildCli(): void {
        this._cli = readline.createInterface(process.stdin, process.stdout);
        this._cli.setPrompt(`${this._robot.name}> `);
        this._cli.prompt(true);

        this._cli.on("line", (line: string) => {
            let userId = "1";
            let userName = "Shell";
            let user = this._robot.brain.userForId(userId, { name: userName, room: "Shell" });
            this.receive(new TextMessage(user, line, "messageId"));
            this._cli.prompt(true);
        });

        this._cli.on("close", () => this._robot.shutdown());
    }
}

export function use(robot: Robot): Adapter {
    return new Shell(robot);
}