import { GoogleGenerativeAI } from '@google/generative-ai';
import { withRetry } from './retry';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Generates a text embedding vector for the given input string.
 * Uses Gemini's gemini-embedding-001 model with 768 output dimensions
 * to match the Pinecone index configuration.
 */
export async function embed(text: string): Promise<number[]> {
    return withRetry(async () => {
        const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await model.embedContent({
            content: { parts: [{ text }], role: 'user' },
            outputDimensionality: 768,
        } as any);
        return result.embedding.values;
    });
}
