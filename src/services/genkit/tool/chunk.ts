import { ai } from "../ai";
import { chunk as llmChunk } from 'llm-chunk';

const chunkingConfig = {
    minLength: 1000,
    maxLength: 2000,
    splitter: 'sentence',
    overlap: 100,
    delimiters: '',
} as any;

export const chunk = async (content: string) => {
    return await ai.run('chunk-it', async () => llmChunk(content, chunkingConfig));
}