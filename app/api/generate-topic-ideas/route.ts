import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { withRetry } from '@/lib/retry';

export const maxDuration = 60; // Prevent Vercel timeouts

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function buildTopicsPrompt(language: string, prioritizedTopics: string): string {
    const inspirationContext = prioritizedTopics
        ? `\n\nHere are some past topics the user wrote about, prioritized by their success level:\n${prioritizedTopics}\n\nBefore generating new suggestions, analyze the provided historical posts. Treat the 'Published' posts as your absolute baseline for success—mimic their tone, formatting, and structure heavily. Treat the 'Approved' posts as secondary good examples. Base your new suggestions strictly on the patterns found in these prioritized tiers. Generate 4 NEW topics that are highly relevant to this specific niche, building upon or complementing these themes without repeating the exact same titles.`
        : '';

    if (language === 'he') {
        return `You are a content strategist for AWAD, an Israeli startup law firm and business advisory company.
Generate exactly 4 compelling LinkedIn post topics in HEBREW (עברית) that AWAD's audience (startup founders, entrepreneurs, investors) would find valuable.
Topics should relate to: startup law, fundraising, term sheets, employment contracts, IP protection, tech regulation, Israeli startup ecosystem, business incorporation.${inspirationContext}

Return a JSON array of strings with exactly 4 topic strings in Hebrew. Example format:
["נושא 1 כאן", "נושא 2 כאן", "נושא 3 כאן", "נושא 4 כאן"]

Return ONLY the JSON array, no other text.`;
    }

    return `You are a content strategist for AWAD, an Israeli startup law firm and business advisory company.
Generate exactly 4 compelling LinkedIn post topics that AWAD's audience (startup founders, entrepreneurs, investors) would find valuable.
Topics should relate to: startup law, fundraising, term sheets, employment contracts, IP protection, tech regulation, Israeli startup ecosystem, business incorporation.${inspirationContext}

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
    const projectId = (body as { projectId?: string }).projectId;

    try {
        let prioritizedTopicsContext = '';
        let query = supabase
            .from('posts')
            .select('topic, status')
            .eq('user_id', user.id)
            .in('status', ['Published', 'Approved'])
            .order('created_at', { ascending: false })
            .limit(20);

        if (projectId) {
            query = query.eq('project_id', projectId);
        }

        const { data: pastPosts } = await query;
        if (pastPosts && pastPosts.length > 0) {
            // Priority 1: Published, Priority 2: Approved
            const published = pastPosts.filter(p => p.status === 'Published').map(p => p.topic).filter(Boolean);
            const approved = pastPosts.filter(p => p.status === 'Approved').map(p => p.topic).filter(Boolean);

            const allPrioritized = [
                ...published.map(t => `[Tier 1 - Published] ${t}`),
                ...approved.map(t => `[Tier 2 - Approved] ${t}`),
            ].slice(0, 10); // Take top 10

            if (allPrioritized.length > 0) {
                prioritizedTopicsContext = allPrioritized.join('\n');
            }
        }

        const topics = await withRetry(async () => {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent(buildTopicsPrompt(language, prioritizedTopicsContext));
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
