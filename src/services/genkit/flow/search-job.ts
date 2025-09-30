import { z } from 'genkit';
import { ai } from '@/services/genkit/ai';
import Logger from "@/loaders/logger";
import { PgDatabase } from 'drizzle-orm/pg-core';
import Container from 'typedi';
import { jobEmbeddingTable, jobTable } from '$/schema';
import { inArray, sql } from 'drizzle-orm';
import { embed } from '@/services/genkit/tool/embed';

const getJobs = async (jobIds: string[]) => {
    const db: any = Container.get("db");
    const jobs = await db.select({
        id: jobTable.id,
        title: jobTable.title,
        intro: jobTable.intro,
        work: jobTable.work,
        skills: jobTable.skills,
        qualification: jobTable.qualification,
        culture: jobTable.culture,
        other: jobTable.other,
    }).from(jobTable).where(inArray(jobTable.id, jobIds));
    return jobs.map(job => `
- ${job.title} (ID: ${job.id})
Intro:
${job.intro}

Responsibilities:
${job.work}

Required Skills:
${job.skills}

Qualification:
${job.qualification}

Culture:
${job.culture}

Other:
${job.other}`)
}

const jobRetriever = ai.defineRetriever(
    {
        name: 'jobRetriever',
        configSchema: z.object({
            k: z.number().default(5),
            section: z.string()
        }),
    },
    async (input, options) => {
        const db: PgDatabase<any> = Container.get("db");
        const embedding = await embed(input);
        const embeddingString = `[${embedding[0].embedding.join(',')}]`;
        const results = await db.select({
            id: jobEmbeddingTable.id,
            jobId: jobEmbeddingTable.jobId,
            section: jobEmbeddingTable.section,
            content: jobEmbeddingTable.content,
            similarity: sql<number>`1 - (${jobEmbeddingTable.embedding} <=> ${embeddingString}::vector)`
        }).from(jobEmbeddingTable)
            .orderBy(sql`${jobEmbeddingTable.embedding} <-> ${embeddingString}::vector`)
            .limit(options.k)
        const documents = results.map(result => ({
            content: [{ text: result.content }],
            metadata: { id: result.id, jobId: result.jobId, similarity: result.similarity }
        }));
        return { documents };
    },
);

const jobsSchema = z.array(z.object({
    id: z.string().uuid().describe(''),
    title: z.string().describe('')
}))

export const searchJobFlow = ai.defineFlow(
    {
        name: 'searchJobFlow',
        inputSchema: z.object({
            candidate: z.any()
        }),
        outputSchema: z.object({
            jobs: jobsSchema.nullable(),
            error: z.string().optional().nullable()
        }),
    },
    async ({ candidate }) => {
        try {
            const candidateSections = [
                { section: 'title', content: candidate.jobTitle },
                { section: 'skills', content: candidate.skills.join(', ') },
                { section: 'skills', content: candidate.softSkills.join(', ') },
                { section: 'work', content: candidate.experiences.map(experience => `${experience.position} at ${experience.company} (${experience.startDate} - ${experience.endDate})\n${experience.description}`).join('\n') },
                { section: 'work', content: candidate.projects.map(project => `${project.position} at ${project.company} (${project.startDate} - ${project.endDate})\n${project.description}`).join('\n') }
            ];

            const matches = [];
            // Get all relevant job
            for (const section of candidateSections) {
                const docs = await ai.retrieve({
                    retriever: jobRetriever,
                    query: section.content,
                    options: {
                        k: 5,
                        section: section.section
                    }
                });
                matches.push(...docs.map(d => d.metadata))
            }

            // Calculate matches
            const weights: Record<string, number> = {
                title: 0.3,
                skills: 0.4,
                work: 0.2,
                project: 0.1,
            };

            const jobScores: Record<string, { score: number; count: number }> = {};
            for (const match of matches) {
                const weight = weights[match.section] ?? 0.1;
                if (!jobScores[match.jobId]) {
                    jobScores[match.jobId] = { score: 0, count: 0 };
                }
                jobScores[match.jobId].score += match.similarity * weight;
                jobScores[match.jobId].count++;
            }

            const calculatedMatches = Object.entries(jobScores)
                .map(([jobId, { score }]) => ({ jobId, score: score }))
                .sort((a, b) => b.score - a.score);
            Logger.info("FLOW searchJobFlow: calculatedMatches %j", calculatedMatches);

            // Remove irrelevant match
            const filteredMatches = calculatedMatches.filter(r => r.score > 0.5);
            Logger.info("FLOW searchJobFlow: filteredMatches %j", filteredMatches);

            // Get jobs detail
            const jobDocs = await getJobs(filteredMatches.map(m => m.jobId));

            const response = await ai.generate({
                prompt: `
Given the following candidate profile and the list of job postings, evaluate the relevance of each job to the candidate's skills, experience, and preferences. Rank the job postings from most suitable to least suitable.

## Candidate Information:
${candidate.jobTitle}

### Summary Profile:
${candidate.summaryProfile}

### Skills:
${candidate.skills.join(',')}

### Soft Skills:
${candidate.softSkills.join(',')}

### Experiences:
${candidate.experiences.map(experience => `- ${experience.position} at ${experience.company} (${experience.startDate} - ${experience.endDate})\n${experience.description}`).join('\n')}

### Projects:
${candidate.projects.map(project => `- ${project.position} at ${project.company} (${project.startDate} - ${project.endDate})\n${project.description}`).join('\n')}

## Job Postings:
${jobDocs}`,
                output: {
                    schema: jobsSchema
                }
            });

            return {
                jobs: response.output,
                error: null
            };

        } catch (error) {
            Logger.error("FLOW searchJobFlow: %s", error.message);
            return {
                jobs: null,
                error: error.message
            };
        }
    }
);
