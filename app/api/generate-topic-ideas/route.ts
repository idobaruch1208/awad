import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { withRetry } from '@/lib/retry';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function buildTopicsPrompt(language: string): string {
    if (language === 'he') {
        return `You are a content strategist for AWAD, an Israeli startup law firm and business advisory company.
Generate exactly 4 compelling LinkedIn post topics in HEBREW (עברית) that AWAD's audience (startup founders, entrepreneurs, investors) would find valuable.
Topics should relate to: startup law, fundraising, term sheets, employment contracts, IP protection, tech regulation, Israeli startup ecosystem, business incorporation.

Return a JSON array of strings with exactly 4 topic strings in Hebrew. Example format:
["נושא 1 כאן", "נושא 2 כאן", "נושא 3 כאן", "נושא 4 כאן"]

Return ONLY the JSON array, no other text.`;
    }

    return `You are a content strategist for AWAD, an Israeli startup law firm and business advisory company.
Generate exactly 4 compelling LinkedIn post topics that AWAD's audience (startup founders, entrepreneurs, investors) would find valuable.
Topics should relate to: startup law, fundraising, term sheets, employment contracts, IP protection, tech regulation, Israeli startup ecosystem, business incorporation.

Return a JSON array of strings with exactly 4 topic strings. Example format:
["Topic 1 here", "Topic 2 here", "Topic 3 here", "Topic 4 here"]

Return ONLY the JSON array, no other text.`;
}

export async function POST(request: NextRequest) {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const language = (body as { language?: string }).language || 'en';

    try {
        const topics = await withRetry(async () => {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent(buildTopicsPrompt(language));
            const text = result.response.text().trim();
            // Extract JSON array from response
            const match = text.match(/\[[\s\S]*\]/);
            if (!match) throw new Error('Invalid JSON response from Gemini');
            return JSON.parse(match[0]) as string[];
        });

        return NextResponse.json({ topics });
    } catch (error) {
        console.error('[generate-topic-ideas] Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate topic ideas. Please try again.' },
            { status: 500 }
        );
    }
}
