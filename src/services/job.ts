import Container, { Inject, Service } from "typedi";
import { EventDispatcher, EventDispatcherInterface, } from "@/decorators/eventDispatcher";
import Bull from "bull";
import { matchingTable } from "$/schema";
import { eq, inArray } from "drizzle-orm";

@Service()
export default class JobService {
    constructor(
        @Inject('logger') private logger,
        @Inject('db') private db,
        @EventDispatcher() private eventDispatcher: EventDispatcherInterface
    ) { }

    public async Evaluate() {
        this.logger.info("SVC JobService/Evaluate");
        const matchings = await this.db
            .select({
                id: matchingTable.id,
                jobId: matchingTable.jobId,
                candidateId: matchingTable.candidateId
            })
            .from(matchingTable)
            .where(eq(matchingTable.status, 'created'));
        const evaluateJob: Bull.Queue = Container.get('EvaluateJob');
        const jobs = await evaluateJob.addBulk(matchings.map(matching => {
            return {
                data: {
                    ...matching
                }
            }
        }));
        return await this.db
            .update(matchingTable)
            .set({
                status: 'queued'
            })
            .where(inArray(matchingTable.id, jobs.map(job => job.data.id)))
            .returning({
                id: matchingTable.id,
                status: matchingTable.status
            })
    }

    public async GetEvaluation(id: string) {
        this.logger.info("SVC JobService/Evaluate > %s", id);
        return await this.db.query.matchingTable.findFirst({
            columns: {
                id: true,
                status: true
            },
            with: {
                result: true
            },
            where: eq(matchingTable.id, id)
        })
    }
}