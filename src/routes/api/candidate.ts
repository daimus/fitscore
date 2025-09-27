import { Hono } from "hono";
import { Variables } from "@/types/hono";
import { bodyLimit } from 'hono/body-limit'
import { HTTPException } from "hono/http-exception";
import config from "@/config";
import Container from "typedi";
import FileService from "@/services/file";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { catchZod } from "@/tools/validator";

const route = new Hono<{ Variables: Variables }>();

route.post('/upload',
    bodyLimit({
        maxSize: config.file.sizeLimit,
        onError: (c) => {
            throw new HTTPException(413, {
                message: 'File Too Large',
                cause: 'File Too Large'
            })
        },
    }),
    zValidator(
        'form',
        z.object({
            cv: z.instanceof(File).refine(file => config.file.acceptedMimeTypes.document.includes(file.type), {
                message: 'Invalid CV file type. Please upload PDF, TXT or DOC/DOCX.'
            }),
            projectReport: z.instanceof(File).refine(file => config.file.acceptedMimeTypes.document.includes(file.type), {
                message: 'Invalid Project Report file type. Please upload PDF, TXT or DOC/DOCX.'
            }),
        }), catchZod),
    async (c, next) => {
        const fileServiceInstance = Container.get(FileService);
        const { cv, projectReport } = c.req.valid('form');
        const requestId = c.get('requestId');
        const result = await Promise.all([
            fileServiceInstance.Upload(cv, `${requestId}_cv`),
            fileServiceInstance.Upload(projectReport, `${requestId}_project-report`)
        ]);
        // TODO: extract uploaded file
        c.set('data', result);
        c.status(200);
        c.set('message', 'Successfully upload docs')
        return c.r();
    });

export default route;