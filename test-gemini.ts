import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function test() {
    try {
        const prompt = `You are a content strategist. Your job is to suggest 4 NEW LinkedIn post topics.
generate exactly 4 compelling topic suggestions.

Return a JSON array of strings with exactly 4 topic strings. Example format:
["Topic 1 here", "Topic 2 here", "Topic 3 here", "Topic 4 here"]

Return ONLY the JSON array, no other text.`;
        
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.0-flash',
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT' as any, threshold: 'BLOCK_NONE' as any },
                { category: 'HARM_CATEGORY_HATE_SPEECH' as any, threshold: 'BLOCK_NONE' as any },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any, threshold: 'BLOCK_NONE' as any },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any, threshold: 'BLOCK_NONE' as any },
            ]
        });
        
        const result = await model.generateContent(prompt);
        console.log("Success:", result.response.text());
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
