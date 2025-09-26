import { Hono } from 'hono'
import loaders from "@/loaders";
import { Variables } from "@/types/hono";
import config from "@/config";

const app = new Hono<{ Variables: Variables }>()

loaders(app);

export default {
  port: config.port,
  fetch: app.fetch
}
