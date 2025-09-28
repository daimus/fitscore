import { Hono } from "hono";
import { etag } from 'hono/etag'
import { requestId } from 'hono/request-id'
import { Variables } from "@/types/hono";
import Logger from "@/loaders/logger";
import { HTTPException } from "hono/http-exception";
import { isEmpty } from "@/tools/validator";
import { cors } from 'hono/cors';
import routes from "@/routes";


export default (app: Hono<{ Variables: Variables }>) => {
    app.use('*', etag());
    app.use('*', requestId());
    app.use('*', cors());
    app.use(async (c, next) => {
        const requestId = c.get('requestId');
        Logger.info("%s - %s", c.req.method, c.req.path);
        c.r = () => {
            const data = c.get('data');
            const page = c.get('page');
            let message = c.get('message') || undefined;
            if (isEmpty(data) && !isEmpty(c.req.param()) && [200, 404].includes(c.res.status)) {
                message = message || "Page Not Found"
                c.status(404);
            }
            return c.json({
                data: data,
                page: page,
                meta: {
                    requestId: requestId,
                    message: message,
                    timestamp: Date.now(),
                    path: c.req.path
                }
            })
        }
        await next()
    })

    routes(app);

    // Health Check
    app.get('/', (c) => c.text('ok'));
    // Error Not Found Handler
    app.notFound((c) => {
        const requestId = c.get('requestId');
        Logger.info("%s - %s", c.req.method, c.req.path);
        return c.json({
            meta: {
                requestId: requestId,
                message: "Page Not Found",
                timestamp: Date.now(),
                path: c.req.path
            }
        }, 404)
    })
    // Error Handler
    app.onError((err: HTTPException, c) => {
        const requestId = c.get('requestId');
        Logger.error("%s - %s", c.req.method, c.req.path);
        Logger.error("ERROR %s", err.message);
        return c.json({
            meta: {
                requestId: requestId,
                message: err.message,
                timestamp: Date.now(),
                path: c.req.path
            }
        }, err.status === undefined ? 500 : err.status)
    })
};