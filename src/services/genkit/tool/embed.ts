import { ai } from "../ai";
import { googleAI } from '@genkit-ai/google-genai';
import { Document } from 'genkit';

export const embed = async (content: string | Document) => {
    return await ai.embed({
        embedder: googleAI.embedder('text-embedding-004'),
        content: content,
    })
}