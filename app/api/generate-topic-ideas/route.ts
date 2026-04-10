import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { withRetry } from '@/lib/retry';

export const maxDuration = 60; // Prevent Vercel timeouts

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ProfileCtx {
    companyName?: string;
    industry?: string;
    targetAudience?: string;
    contentGoals?: string;
    brandVoice?: string;
    writingRules?: string[];
}

function buildTopicsPrompt(language: string, prioritizedPosts: string, profile?: ProfileCtx): string {
    const hasHistory = prioritizedPosts.length > 0;

    const historyBlock = hasHistory
        ? `
=== CRITICAL: HISTORICAL POST ANALYSIS ===

Below are the user's past posts, labeled by tier. You MUST analyze these before generating anything.

${prioritizedPosts}

=== END HISTORICAL POSTS ===

INSTRUCTIONS FOR USING THE ABOVE:
1. Analyze the provided history to understand the trajectory and themes of the content.
2. The suggestions must act as the logical next steps or complementary angles to the previously Published posts.
3. Strictly avoid duplicating past topics. Do NOT suggest generic topics.
4. Tier 1 (Published) posts carry the absolute most weight — prioritize their logic and progression.
`
        : '';

    // Build company context from profile or use defaults
    const companyName = profile?.companyName || 'AWAD';
    const defaultContext = `The company is ${companyName}, an Israeli startup law firm. Topics should relate to: startup law, fundraising, term sheets, employment contracts, IP protection, tech regulation, Israeli startup ecosystem.`;
    const profileContext = profile?.industry
        ? `The company is ${companyName} in the ${profile.industry} industry.${profile.targetAudience ? ` Target audience: ${profile.targetAudience}.` : ''}${profile.contentGoals ? ` Content goals: ${profile.contentGoals}.` : ''}${profile.brandVoice ? ` Brand voice: ${profile.brandVoice}.` : ''} Generate topics that resonate with this audience and serve these goals.`
        : null;

    const companyContext = profileContext || defaultContext;

    const writingRulesBlock = profile?.writingRules && profile.writingRules.length > 0
        ? `\n\nKeep these brand writing rules in mind when suggesting topics:\n${profile.writingRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
        : '';

    if (language === 'he') {
        return `You are a content strategist. Your job is to suggest 4 NEW LinkedIn post topics in HEBREW (עברית).
${historyBlock}
${hasHistory ? 'Based strictly on the themes and patterns in the historical posts above,' : companyContext} generate exactly 4 compelling topic suggestions.${writingRulesBlock}

Return a JSON array of strings with exactly 4 topic strings in Hebrew. Example format:
["נושא 1 כאן", "נושא 2 כאן", "נושא 3 כאן", "נושא 4 כאן"]

Return ONLY the JSON array, no other text.`;
    }

    return `You are a content strategist. Your job is to suggest 4 NEW LinkedIn post topics.
${historyBlock}
${hasHistory ? 'Based strictly on the themes and patterns in the historical posts above,' : companyContext} generate exactly 4 compelling topic suggestions.${writingRulesBlock}

Return a JSON array of strings with exactly 4 topic strings. Example format:
["Topic 1 here", "Topic 2 here", "Topic 3 here", "Topic 4 here"]

Return ONLY the JSON array, no other text.`;
}

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const language = (body as { language?: string }).language || 'en';
    const projectId = (body as { projectId?: string }).projectId;

    console.log('[generate-topic-ideas] user_id:', user.id, 'projectId:', projectId, 'language:', language);

    try {
        let prioritizedPostsContext = '';
        let profileCtx: ProfileCtx | undefined;

        // Fetch project profile if available
        if (projectId) {
            const { data: profile } = await supabase
                .from('project_profiles')
                .select('company_name, industry, target_audience, content_goals, brand_voice, ai_analysis')
                .eq('project_id', projectId)
                .eq('onboarding_completed', true)
                .single();

            if (profile) {
                const analysis = profile.ai_analysis as Record<string, unknown> | null;
                profileCtx = {
                    companyName: profile.company_name ?? undefined,
                    industry: profile.industry ?? undefined,
                    targetAudience: profile.target_audience ?? undefined,
                    contentGoals: profile.content_goals ?? undefined,
                    brandVoice: profile.brand_voice ?? undefined,
                    writingRules: (analysis?.writing_rules as string[]) ?? undefined,
                };
            }
        }

        // Fetch Published + Approved posts — select full content for context
        let postsQuery = supabase
            .from('posts')
            .select('topic, status, final_text')
            .eq('user_id', user.id)
            .in('status', ['Published', 'Approved'])
            .order('created_at', { ascending: false })
            .limit(20);

        if (projectId) {
            postsQuery = postsQuery.eq('project_id', projectId);
        }

        const { data: pastPosts, error: postsError } = await postsQuery;

        console.log('[generate-topic-ideas] DB query result:', {
            error: postsError?.message ?? null,
            count: pastPosts?.length ?? 0,
            statuses: pastPosts?.map(p => p.status) ?? [],
            topics: pastPosts?.map(p => p.topic?.slice(0, 50)) ?? [],
        });

        if (pastPosts && pastPosts.length > 0) {
            const published = pastPosts.filter(p => p.status === 'Published');
            const approved = pastPosts.filter(p => p.status === 'Approved');

            console.log('[generate-topic-ideas] Published:', published.length, 'Approved:', approved.length);

            // Include FULL post content (truncated to 800 chars) so the AI truly understands the style/topics
            const allPrioritized = [
                ...published.map((p, i) => `[Tier 1 - Published Post ${i + 1}]\nTitle: ${p.topic}\nContent:\n${(p.final_text ?? '').slice(0, 800)}`),
                ...approved.map((p, i) => `[Tier 2 - Approved Post ${i + 1}]\nTitle: ${p.topic}\nContent:\n${(p.final_text ?? '').slice(0, 800)}`),
            ].slice(0, 5); // Top 5 full posts to keep context manageable

            if (allPrioritized.length > 0) {
                prioritizedPostsContext = allPrioritized.join('\n\n---\n\n');
            }
        }

        console.log('[generate-topic-ideas] Context length:', prioritizedPostsContext.length, 'chars');

        const prompt = buildTopicsPrompt(language, prioritizedPostsContext, profileCtx);
        console.log('[generate-topic-ideas] Final prompt length:', prompt.length, 'chars');

        const topics = await withRetry(async () => {
            const model = genAI.getGenerativeModel({ 
                model: 'gemini-flash-latest',
                // Disable safety filters that commonly block content generation contexts
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT' as any, threshold: 'BLOCK_NONE' as any },
                    { category: 'HARM_CATEGORY_HATE_SPEECH' as any, threshold: 'BLOCK_NONE' as any },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any, threshold: 'BLOCK_NONE' as any },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any, threshold: 'BLOCK_NONE' as any },
                ]
            });
            
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            console.log('[generate-topic-ideas] LLM Raw Text:', text.slice(0, 100) + '...');
            
            // Extract the first JSON array found in the text
            const firstBracket = text.indexOf('[');
            const lastBracket = text.lastIndexOf(']');
            
            if (firstBracket === -1 || lastBracket === -1 || lastBracket < firstBracket) {
                console.error('[generate-topic-ideas] LLM failed to output an array:', text);
                throw new Error('AI failed to format its response as a list.');
            }
            
            const jsonStr = text.substring(firstBracket, lastBracket + 1);
            try {
                const parsed = JSON.parse(jsonStr);
                if (!Array.isArray(parsed)) throw new Error('Not an array');
                return parsed as string[];
            } catch (e) {
                console.error('[generate-topic-ideas] JSON parse failed on:', jsonStr);
                throw new Error('Invalid JSON structure returned by AI.');
            }
        });

        console.log('[generate-topic-ideas] Generated topics:', topics);

        return NextResponse.json({ topics });
    } catch (error: any) {
        console.error('[generate-topic-ideas] Error:', error);

        const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota');
        const errorMsg = isRateLimit 
            ? 'AI Rate limit exceeded (Free Tier). Please wait 60 seconds and try again.'
            : `Failed to generate topic ideas: ${error?.message || 'Unknown error'}`;

        return NextResponse.json(
            { error: errorMsg },
            { status: isRateLimit ? 429 : 500 }
        );
    }
}
