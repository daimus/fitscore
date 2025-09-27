import { Hono } from "hono";
import { Variables } from "@/types/hono";
import candidate from "@/routes/api/candidate";

export default (app: Hono<{ Variables: Variables }>) => {
	app.route('/api/v1/candidates', candidate)
}