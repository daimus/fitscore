import { Hono } from "hono";
import { Variables } from "@/types/hono";
import { Container } from "typedi";
import Logger from "@/loaders/logger";
import hono from "@/loaders/hono";
import config from "@/config";
import drizzle from "@/loaders/drizzle";
import job from "@/loaders/job";

export default async (app: Hono<{ Variables: Variables }>) => {
    Container.set("logger", Logger);
    Logger.info("✅ Logger loaded!");
    await drizzle();
    Logger.info("✅ Database connected!");
    job(app);
    Logger.info("✅ All Jobs loaded!");
    hono(app);
    Logger.info("✅ Hono loaded!");
    Logger.info("✅ Server Running on Port %s", config.port);
}