import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { withRetry } from '@/lib/retry';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { sourceText, language } = body as { sourceText?: string; language?: string };

    if (!sourceText?.trim()) {
        return NextResponse.json({ error: 'Source text is required' }, { status: 400 });
    }

    try {
        const intents = await withRetry(async () => {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const langInstruction = language === 'he' ? 'Return the labels and descriptions in HEBREW (עברית).' : 'Return the labels and descriptions in ENGLISH.';

            const prompt = `A user pasted the following text into an AI content generator for a LinkedIn post:
---
${sourceText.slice(0, 1500)}${sourceText.length > 1500 ? '...' : ''}
---

Your task: Suggest exactly 4 distinct actions the user might want to take with this text to create a LinkedIn post for AWAD (a startup law firm & business advisory). Make the actions contextual to the text provided.
For example, if it's a legal update, suggest "Summarize the legal changes for founders". If it's a personal story, suggest "Make it more professional" or "Highlight the key takeaway".
If the text is very short, suggest ways to expand it.

Return a JSON array of exactly 4 objects. Each object must have these keys:
- "id": A short unique string (e.g., "summarize")
- "emoji": A single relevant emoji
- "label": A short, punchy action phrase (e.g., "Summarize legal changes")
- "description": A slightly longer description of what this action will do

${langInstruction}
Return ONLY the JSON array, no other text or explanation.`;

            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            const match = text.match(/\[[\s\S]*\]/);
            if (!match) throw new Error('Invalid JSON response');
            return JSON.parse(match[0]);
        });

        return NextResponse.json({ intents });
    } catch (error) {
        console.error('[generate-intents] Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate intents' },
            { status: 500 }
        );
    }
}
