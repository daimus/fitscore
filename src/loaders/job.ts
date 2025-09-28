import { Hono } from "hono";
import { Variables } from "@/types/hono";
import { HonoAdapter } from "@bull-board/hono";
import { createBullBoard } from "@bull-board/api"
import { serveStatic } from "@hono/node-server/serve-static";
import * as Path from "path";
import node_modules from "node_modules-path";
import { BullAdapter } from "@bull-board/api/bullAdapter"
import evaluateJob from "@/jobs/evaluate-job";
import extractDocumentJob from "@/jobs/extract-document-job";

export default async function (app: Hono<{ Variables: Variables }>) {
    const serverAdapter = new HonoAdapter(serveStatic);
    createBullBoard({
        queues: [
            new BullAdapter(evaluateJob()),
            new BullAdapter(extractDocumentJob())
        ],
        serverAdapter: serverAdapter,
        options: {
            uiBasePath: Path.resolve(node_modules(), '@bull-board/ui')
        }
    });

    const basePath = '/tools/bull-board'
    serverAdapter.setBasePath(basePath);
    app.route(basePath, serverAdapter.registerPlugin());
}