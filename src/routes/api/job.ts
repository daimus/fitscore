import { Hono } from "hono";
import { Variables } from "@/types/hono";
import Container from "typedi";
import JobService from "@/services/job";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { catchZod } from "@/tools/validator";

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

route.get('/result/:id',
    zValidator(
        'param',
        z.object({
            id: z.string().uuid()
        }), catchZod),
    async (c, next) => {
        const jobServiceInstance = Container.get(JobService);
        const result = await jobServiceInstance.GetEvaluation(c.req.valid('param').id);
        c.set('data', result);
        c.status(200);
        c.set('message', 'Successfully get matching evaluation.')
        return c.r();
    });

export default route;