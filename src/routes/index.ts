import { Hono } from "hono";
import { Variables } from "@/types/hono";
import candidate from "@/routes/api/candidate";
import job from "@/routes/api/job";

export default (app: Hono<{ Variables: Variables }>) => {
	app.route('/api/v1/candidates', candidate);
	app.route('/api/v1/jobs', job);
}