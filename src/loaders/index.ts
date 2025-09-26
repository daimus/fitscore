import { Hono } from "hono";
import { Variables } from "@/types/hono";
import { Container } from "typedi";
import Logger from "@/loaders/logger";
import hono from "@/loaders/hono";
import config from "@/config";

export default async (app: Hono<{ Variables: Variables }>) => {
    Container.set("logger", Logger);
    Logger.info("✅ Logger loaded!");
    hono(app);
    Logger.info("✅ Hono loaded!");
    Logger.info("✅ Server Running on Port %s", config.port);
}