import { Hono } from "hono";
import { Variables } from "@/types/hono";
import Container from "typedi";
import JobService from "@/services/job";

const route = new Hono<{ Variables: Variables }>();

route.post('/evaluate',
    async (c, next) => {
        const jobServiceInstance = Container.get(JobService);
        const result = await jobServiceInstance.Evaluate();
        c.set('data', result);
        c.status(200);
        c.set('message', 'Job evaluation is running.')
        return c.r();
    });

export default route;