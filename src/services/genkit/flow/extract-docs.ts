import { z } from 'genkit';
import { ai } from '@/services/genkit/ai';
import pdf from 'pdf-parse';
import fs from 'fs';
import Logger from "@/loaders/logger";

const candidateSchema = z.object({
    name: z.string().describe('The full name of the candidate'),
    jobTitle: z.string().describe('The current or most recent job title of the candidate'),
    summaryProfile: z.string().describe('A brief summary of the candidate\'s professional profile'),
    skills: z.array(z.string()).describe('List of technical skills possessed by the candidate'),
    softSkills: z.array(z.string()).describe('List of soft skills possessed by the candidate'),
    experiences: z.array(z.object({
        dateStart: z.date().describe('Start date of the work experience'),
        dateEnd: z.date().describe('End date of the work experience'),
        company: z.string().describe('Name of the company where the experience was gained'),
        position: z.string().describe('Job position held during this experience'),
        description: z.string().describe('Description of responsibilities and achievements in this role'),
    })).describe('List of professional work experiences')
});

const projectSchema = z.array(z.object({
    name: z.string().describe('Name of the project'),
    company: z.string().describe('Company or organization associated with the project'),
    dateStart: z.date().describe('Start date of the project'),
    dateEnd: z.date().describe('End date of the project'),
    position: z.string().describe('Role or position held in the project'),
    description: z.string().describe('Description of the project, including technologies used and outcomes'),
    skills: z.array(z.string()).describe('List of technical skills possessed by the candidate'),
})).describe('List of notable projects completed by the candidate')

export const extractCvFlow = ai.defineFlow(
    {
        name: 'extractCvFlow',
        inputSchema: z.object({
            filePath: z.string().describe('')
        }),
        outputSchema: z.object({
            candidate: candidateSchema.optional().nullable(),
            error: z.string().optional().nullable()
        }),
    },
    async ({ filePath }) => {
        try {
            let dataBuffer = fs.readFileSync(filePath);
            const { text } = await pdf(dataBuffer);
            const response = await ai.generate({
                prompt: `Extract the following CV text into the candidate schema. Provide accurate and complete information based on the content:\n\n${text}`,
                output: {
                    schema: candidateSchema
                }
            });

            return {
                candidate: response.output,
                error: null
            };
        } catch (error) {
            Logger.error("FLOW extractCvFlow: %s", error.message);
            return {
                candidate: null,
                error: error.message
            };
        }
    }
);

export const extractProjectFlow = ai.defineFlow(
    {
        name: 'extractProjectFlow',
        inputSchema: z.object({
            filePath: z.string().describe('')
        }),
        outputSchema: z.object({
            projects: projectSchema.optional().nullable(),
            error: z.string().optional().nullable()
        }),
    },
    async ({ filePath }) => {
        try {
            let dataBuffer = fs.readFileSync(filePath);
            const { text } = await pdf(dataBuffer);
            const response = await ai.generate({
                prompt: `Extract the following Project Report text into the project schema. Provide accurate and complete information based on the content:\n\n${text}`,
                output: {
                    schema: projectSchema
                }
            });

            return {
                projects: response.output,
                error: null
            };
        } catch (error) {
            Logger.error("FLOW extractProjectFlow: %s", error.message);
            return {
                projects: null,
                error: error.message
            };
        }
    }
);