import { Inject, Service } from "typedi";
import { EventDispatcher, EventDispatcherInterface, } from "@/decorators/eventDispatcher";
import { candidateTable, experienceTable, projectTable } from "$/schema";

@Service()
export default class CandidateService {
    constructor(
        @Inject('logger') private logger,
        @Inject('db') private db,
        @EventDispatcher() private eventDispatcher: EventDispatcherInterface
    ) { }

    public async CreateCandidate(id, candidate) {
        this.logger.info("SVC CandidateService/CreateCandidate %s > %j", id, candidate);
        await Promise.all([
            this.db.insert(candidateTable).values({
                id: id,
                name: candidate.name,
                jobTitle: candidate.jobTitle,
                summaryProfile: candidate.summaryProfile,
                skills: candidate.skills,
                softSkills: candidate.softSkills,
            }),
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
        ])
    }
}