import { Inject, Service } from "typedi";
import { EventDispatcher, EventDispatcherInterface, } from "@/decorators/eventDispatcher";
import { candidateTable, experienceTable, projectTable } from "$/schema";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

@Service()
export default class CandidateService {
    constructor(
        @Inject('logger') private logger,
        @Inject('db') private db,
        @EventDispatcher() private eventDispatcher: EventDispatcherInterface
    ) { }

    public async GetCandidate(id: string) {
        this.logger.info("SVC CandidateService/GetCandidate %s", id);
        return await this.db.query.candidateTable.findFirst({
            where: eq(candidateTable.id, id),
            with: {
                experiences: true,
                projects: true
            }
        });
    }

    public async CreateCandidate(id, candidate) {
        this.logger.info("SVC CandidateService/CreateCandidate %s > %j", id, candidate);
        const [[result]] = await Promise.all([
            this.db.insert(candidateTable).values({
                id: id,
                name: candidate.name,
                jobTitle: candidate.jobTitle,
                summaryProfile: candidate.summaryProfile,
                skills: candidate.skills,
                softSkills: candidate.softSkills,
            }).returning({ id: candidateTable.id }),
            this.db.insert(experienceTable).values(candidate.experiences.map(experience => {
                return {
                    candidateId: id,
                    ...experience
                }
            })),
            this.db.insert(projectTable).values(candidate.projects.map(project => {
                return {
                    candidateId: id,
                    ...project
                }
            })),
        ]);
        if (result?.id) {
            return await this.GetCandidate(result.id);
        }
        throw new HTTPException(500, {
            message: "Failed to create candidate."
        })
    }
}