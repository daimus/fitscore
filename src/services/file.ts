import { Inject, Service } from "typedi";
import { EventDispatcher, EventDispatcherInterface, } from "@/decorators/eventDispatcher";
import config from "@/config";
import { HTTPException } from "hono/http-exception";

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
}