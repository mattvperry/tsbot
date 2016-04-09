import * as express from "express";
import * as bodyParser from "body-parser";
import * as multer from "multer";
import * as basicAuth from "basic-auth-connect";
import { Server } from "http";
import { inject } from "inversify";
import { Configuration } from "./configuration";

/**
 * Class which manages the http router
 */
@inject("Configuration", "Log")
export default class RouterFactory {
    /**
     * Name of the robot
     */
    private _name: string;

    /**
     * Is the router enabled?
     */
    private _enabled: boolean;

    /**
     * HTTP Server
     */
    private _server: Server;

    /**
     * Initializes a new instance of the <<RouterFactory>> class.
     * @param config <<Configuration>> instance for the robot
     * @param _logger <<Log>> instance.
     */
    constructor(config: Configuration, private _logger: Log) {
        this._name = config.name;
        this._enabled = !config.disableHttpd;
    }

    /**
     * Decides which router to make and returns it
     * @retuns the router
     */
    public makeRouter(): express.Express {
        return this._enabled ? this._expressRouter() : this._nullRouter();
    }

    /**
     * Setup the Express server's defaults
     * @returns an express router
     */
    private _expressRouter(): express.Express {
        let user = process.env.EXPRESS_USER;
        let pass = process.env.EXPRESS_PASSWORD;
        let stat = process.env.EXPRESS_STATIC;
        let port = process.env.EXPRESS_PORT || process.env.PORT || 8080;
        let address = process.env.EXPRESS_BIND_ADDRESS || process.env.BIND_ADDRESS || "0.0.0.0";

        // Setup express middleware
        let app = express();
        app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.setHeader("X-Powered-By", `tsbot/${this._name}`);
            next();
        });
        if (user && pass) {
            app.use(basicAuth(user, pass));
        }
        if (stat) {
            app.use(express.static);
        }
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(multer({ limits: {
            fileSize: 100 * 1024 * 1024
        }}).any());

        try {
            this._server = app.listen(port, address);
        } catch (e) {
            this._logger.error(`Error trying to start HTTP server: ${e}\n${e.stack}`);
            process.exit(1);
        }

        return app;
    }

    /**
     * Setup an empty router object
     * @returns a null router which spits out warnings
     */
    private _nullRouter(): any {
        let msg = "A script has tried registering an HTTP route while the HTTP server is disabled with -d.";
        return {
            get: () => this._logger.warn(msg),
            post: () => this._logger.warn(msg),
            put: () => this._logger.warn(msg),
            delete: () => this._logger.warn(msg)
        };
    }
}