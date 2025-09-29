import { z, Document } from 'genkit';
import { ai } from '@/services/genkit/ai';
import Logger from "@/loaders/logger";
import { PgDatabase } from 'drizzle-orm/pg-core';
import Container from 'typedi';
import { jobTable } from '$/schema';
import { sql } from 'drizzle-orm';
import { embed } from '@/services/genkit/tool/embed';

const jobRetriever = ai.defineRetriever(
    {
        name: 'jobRetriever',
        configSchema: z.object({
            k: z.number().default(5)
        }),
    },
    async (input, options) => {
        const db: PgDatabase<any> = Container.get("db");
        const embedding = await embed(input);
        const embeddingString = `[${embedding[0].embedding.join(',')}]`;
        const results = await db.select({
            id: jobTable.id,
            title: jobTable.title,
            description: jobTable.description,
            distance: sql<number>`embedding <=> ${embeddingString}`
        }).from(jobTable)
            .orderBy(sql`${jobTable.embedding} <-> ${embeddingString}::vector`)
            .limit(options.k)
        const documents = results.map(result => ({
            content: [{ text: `Title: ${result.title}\nDescription: ${result.description}` }],
            metadata: { id: result.id, distance: result.distance }
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

            const docs = await ai.retrieve({
                retriever: jobRetriever,
                query: candidate.jobTitle,
                options: {
                    k: 5
                }
            });

            const response = await ai.generate({
                prompt: `
Given the following candidate profile and the list of job postings, evaluate the relevance of each job to the candidate’s skills, experience, and preferences. Rank the job postings from most suitable to least suitable.

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
${docs.map(doc => doc.content[0].text).join('\n\n')}`,
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