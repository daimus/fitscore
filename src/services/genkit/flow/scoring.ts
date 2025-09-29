import { z } from 'genkit';
import { ai } from '@/services/genkit/ai';
import Logger from "@/loaders/logger";
import { PgDatabase } from 'drizzle-orm/pg-core';
import Container from 'typedi';
import { rubricTable } from '$/schema';
import { eq, sql } from 'drizzle-orm';
import { embed } from '@/services/genkit/tool/embed';

const rubricRetreiver = ai.defineRetriever(
    {
        name: 'rubricRetreiver',
        configSchema: z.object({
            type: z.enum(['cv', 'project']),
            k: z.number().default(5)
        }),
    },
    async (input, options) => {
        const db: PgDatabase<any> = Container.get("db");
        const embedding = await embed(input);
        const embeddingString = `[${embedding[0].embedding.join(',')}]`;
        const results = await db.select({
            id: rubricTable.id,
            parameter: rubricTable.parameter,
            description: rubricTable.description,
            distance: sql<number>`embedding <=> ${embeddingString}`
        }).from(rubricTable)
            .where(eq(rubricTable.type, options.type))
            .orderBy(sql`${rubricTable.embedding} <-> ${embeddingString}::vector`)
            .limit(options.k);
        Logger.info("FLOW scoringFlow > rubricRetreiver: %j | %j", options, results);
        const documents = results.map(result => ({
            content: [{ text: `Parameter: ${result.parameter}\nDescription: ${result.description}` }],
            metadata: { id: result.id, distance: result.distance }
        }));
        return { documents };
    },
);

export const scoringFlow = ai.defineFlow(
    {
        name: 'scoringFlow',
        inputSchema: z.object({
            job: z.object({
                id: z.string().uuid().describe(''),
                title: z.string().describe(''),
                description: z.string().describe('')
            }),
            candidate: z.any(),
        }),
        outputSchema: z.object({
            result: z.object({
                cvFeedback: z.string().describe(''),
                projectFeedback: z.string().describe(''),
                overallSummary: z.string().describe(''),
                cvMatchRate: z.number().describe(''),
                projectScore: z.number().describe('')
            }),
            error: z.string().optional().nullable()
        }),
    },
    async ({ job, candidate }) => {
        try {
            const keywordResponse = await ai.generate({
                prompt: `
You are an expert in HR and recruitment. Based on the following job posting, generate relevant keywords that can be used to search for evaluation rubrics for assessing candidate CVs and projects.

## Job Posting:
Title: ${job.title}
Description: ${job.description}

## Instructions:
- Analyze the job title and description to identify key skills, responsibilities, qualifications, and industry-specific terms.
- Generate keywords for CV evaluation that focus on candidate experience, skills, education, and achievements relevant to the job.
- Generate keywords for project evaluation that focus on technical skills, project types, technologies, and outcomes demonstrated in past projects.
- Keywords should be comma-separated lists.
- Ensure keywords are specific, relevant, and optimized for searching evaluation rubrics or scoring criteria.
- Limit each list to 5-10 keywords to keep it focused.

Output the keywords in the following format:
- keywordCv: [comma-separated keywords for CV]
- keywordProject: [comma-separated keywords for projects]
`,
                output: {
                    schema: z.object({
                        keywordCv: z.string(),
                        keywordProject: z.string()
                    })
                }
            });

            Logger.info("FLOW scoringFlow > keyword response %j", keywordResponse.output);

            const [cvRubrics, perojectRubrics] = await Promise.all([
                ai.retrieve({
                    retriever: rubricRetreiver,
                    query: keywordResponse.output.keywordCv,
                    options: {
                        k: 5,
                        type: 'cv'
                    }
                }),
                ai.retrieve({
                    retriever: rubricRetreiver,
                    query: keywordResponse.output.keywordProject,
                    options: {
                        k: 5,
                        type: 'project'
                    }
                })
            ]);

            const scoringResponse = await ai.generate({
                prompt: `
You are an expert in HR and recruitment. Your task is to evaluate a candidate's CV and projects based on the provided job requirements and scoring rubrics.

## Job Posting:
Title: ${job.title}
Description: ${job.description}

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

## Instructions:
1. Evaluate the candidate's CV based on the CV Scoring Rubrics. For each rubric parameter, assess how well the candidate's experience, skills, education, etc., match the description. Assign a score from 1 to 5 for each rubric (1 being poor match, 5 being excellent match).
2. Provide concise feedback on the CV (3-5 sentences), covering strengths, gaps, and recommendations for improvement.
3. Similarly, evaluate the candidate's projects based on the Project Scoring Rubrics, assigning scores from 1 to 5 for each.
4. Provide concise feedback on the projects (3-5 sentences), covering strengths, gaps, and recommendations.
5. Provide a concise overall summary of the candidate's fit for the job (3-5 sentences), combining CV and project evaluations.

Output in JSON format with the following fields:
- cvFeedback: string
- projectFeedback: string
- overallSummary: string
- cvScore: array of numbers (one for each CV rubric)
- projectScore: array of numbers (one for each project rubric)

# CV Scoring Rubrics:
${cvRubrics.map(doc => doc.content[0].text).join('\n\n')}

# Project Scoring Rubrics:
${perojectRubrics.map(doc => doc.content[0].text).join('\n\n')}`,
                output: {
                    schema: z.object({
                        cvFeedback: z.string().describe(''),
                        projectFeedback: z.string().describe(''),
                        overallSummary: z.string().describe(''),
                        cvScore: z.array(z.number().min(1).max(5)),
                        projectScore: z.array(z.number().min(1).max(5))
                    })
                }
            });

            Logger.info("FLOW scoringFlow > scoring response %j", scoringResponse.output);

            let cvMatchRate = 0;
            const cvScoreWeight = [40, 25, 20, 15].map((weight, i) => {
                cvMatchRate += (scoringResponse.output.cvScore?.[i] || 0) * weight / 100;
            });
            cvMatchRate = cvMatchRate * 20;

            let projectScore = 0;
            const projectScoreWeight = [30, 25, 20, 15, 10].map((weight, i) => {
                projectScore += (scoringResponse.output.projectScore?.[i] || 0) * weight / 100;
            });
            projectScore = projectScore * 2;

            Logger.info("FLOW scoringFlow > scoring cv: %s | scoring project: %s", cvMatchRate, projectScore);

            return {
                result: {
                    cvFeedback: scoringResponse.output.cvFeedback,
                    projectFeedback: scoringResponse.output.cvFeedback,
                    overallSummary: scoringResponse.output.cvFeedback,
                    cvMatchRate: cvMatchRate,
                    projectScore: projectScore
                },
                error: null
            }

        } catch (error) {
            Logger.error("FLOW scoringFlow: %s", error.message);
            return {
                jobs: null,
                error: error.message
            };
        }
    }
);