import { z } from 'genkit';
import { ai } from '@/services/genkit/ai';
import Logger from "@/loaders/logger";
import { PgDatabase } from 'drizzle-orm/pg-core';
import Container from 'typedi';
import { jobEmbeddingTable, rubricTable } from '$/schema';
import { eq, sql } from 'drizzle-orm';
import { embed } from '@/services/genkit/tool/embed';

const rubricRetreiver = ai.defineRetriever(
    {
        name: 'rubricRetreiver',
        configSchema: z.object({
            type: z.enum(['cv', 'project']),
            jobId: z.string().uuid(),
            k: z.number().default(5)
        }),
    },
    async (input, options) => {
        const db: PgDatabase<any> = Container.get("db");
        const rows = await db
            .select({
                id: rubricTable.id,
                parameter: rubricTable.parameter,
                description: rubricTable.description,
                similarity: sql<number>`1 - (${rubricTable.embedding} <=> ${jobEmbeddingTable.embedding})`
            })
            .from(rubricTable)
            .innerJoin(
                jobEmbeddingTable,
                sql`${jobEmbeddingTable.jobId} = ${options.jobId}`
            )
            .where(eq(rubricTable.type, options.type));

        const grouped = rows.reduce((acc, row) => {
            const current = acc[row.id];
            if (!current || row.similarity > current.similarity) {
                acc[row.id] = row;
            }
            return acc;
        }, {} as Record<string, typeof rows[number]>);

        const results = Object.values(grouped).sort((a, b) => b.similarity - a.similarity);

        Logger.info("FLOW scoringFlow > rubricRetreiver: %j | %j", options, results);
        const documents = results.slice(0, options.k).map(result => ({
            content: [{ text: `Parameter: ${result.parameter}\nDescription: ${result.description}` }],
            metadata: { id: result.id, similarity: result.similarity }
        }));
        return { documents };
    },
);

export const scoringFlow = ai.defineFlow(
    {
        name: 'scoringFlow',
        inputSchema: z.object({
            job: z.object({
                id: z.string().uuid().describe('Unique identifier for the job posting'),
                title: z.string().describe('The title of the job position'),
                intro: z.string().optional().nullable().describe('Introduction or overview of the job'),
                work: z.string().optional().nullable().describe('Description of the work responsibilities'),
                skills: z.string().optional().nullable().describe('Required skills for the job'),
                qualification: z.string().optional().nullable().describe('Required qualifications for the job'),
                culture: z.string().optional().nullable().describe('Company culture or values'),
                other: z.string().optional().nullable().describe('Any other relevant information about the job')
            }),
            candidate: z.any().describe('Candidate information including CV, skills, experiences, and projects'),
        }),
        outputSchema: z.object({
            result: z.object({
                cvFeedback: z.string().describe('Feedback on the candidate\'s CV evaluation'),
                projectFeedback: z.string().describe('Feedback on the candidate\'s projects evaluation'),
                overallSummary: z.string().describe('Overall summary of the candidate\'s fit for the job'),
                cvMatchRate: z.number().describe('Numerical match rate for the CV (0-100)'),
                projectScore: z.number().describe('Numerical score for the projects (0-10)')
            }),
            error: z.string().optional().nullable().describe('Error message if the scoring process fails')
        }),
    },
    async ({ job, candidate }) => {
        try {
            const [cvRubrics, projectRubrics] = await Promise.all([
                ai.retrieve({
                    retriever: rubricRetreiver,
                    query: '',
                    options: {
                        k: 4,
                        type: 'cv',
                        jobId: job.id
                    }
                }),
                ai.retrieve({
                    retriever: rubricRetreiver,
                    query: '',
                    options: {
                        k: 5,
                        type: 'project',
                        jobId: job.id
                    }
                })
            ]);

            Logger.info("FLOW scoringFlow: CV rubrics %j", cvRubrics.map(c => {
                return {
                    content: c.content,
                    metadata: c.metadata
                }
            }));
            Logger.info("FLOW scoringFlow: Project rubrics %j", projectRubrics.map(c => {
                return {
                    content: c.content,
                    metadata: c.metadata
                }
            }));

            const scoringResponse = await ai.generate({
                prompt: `
You are an expert in HR and recruitment. Your task is to evaluate a candidate's CV and projects based on the provided job requirements and scoring rubrics.

## Job Posting:
### ${job.title}

### Intro:
${job.intro}

### Responsibilities:
${job.work}

### Required Skills:
${job.skills}

### Qualification:
${job.qualification}

### Culture:
${job.culture}

### Other:
${job.other}

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

# CV Scoring Rubrics:
${cvRubrics.map(doc => doc.content[0].text).join('\n\n')}

# Project Scoring Rubrics:
${projectRubrics.map(doc => doc.content[0].text).join('\n\n')}`,
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