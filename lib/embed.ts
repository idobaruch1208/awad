import { GoogleGenerativeAI } from '@google/generative-ai';
import { withRetry } from './retry';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Generates a text embedding vector for the given input string.
 * Uses Gemini's text-embedding-004 model (768 dimensions).
 */
export async function embed(text: string): Promise<number[]> {
    return withRetry(async () => {
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        const result = await model.embedContent(text);
        return result.embedding.values;
    });
}
