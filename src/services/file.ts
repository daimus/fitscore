import { Inject, Service } from "typedi";
import { EventDispatcher, EventDispatcherInterface, } from "@/decorators/eventDispatcher";
import config from "@/config";
import { HTTPException } from "hono/http-exception";
import { extractCvFlow, extractProjectFlow } from "./genkit/flow/extract-docs";

@Service()
export default class FileService {
    constructor(
        @Inject('logger') private logger,
        @Inject('db') private db,
        @EventDispatcher() private eventDispatcher: EventDispatcherInterface
    ) { }

    public async Upload(file: File, fileName: string) {
        this.logger.info("SVC FileService/Upload");
        if (file instanceof File) {
            const extension = file.name.split('.').pop() || '';
            const newName = `${fileName}.${extension}`;
            const filePath = `${config.file.uploadPath}/${newName}`

            await Bun.write(filePath, file);

            return {
                path: filePath
            }
        }
        throw new HTTPException(400, {
            message: 'Please select file to upload',
            cause: 'Payload is not a file'
        })
    }

    public async ExtractDocument(documents: Array<{ path: string }>) {
        this.logger.info("SVC FileService/ExtractDocument : %s", documents);
        const [candidate, projects] = await Promise.all([
            extractCvFlow({
                filePath: documents[0].path
            }),
            extractProjectFlow({
                filePath: documents[1].path
            }),
        ]);
        return {
            ...candidate.candidate,
            projects: projects.projects
        }
    }
}