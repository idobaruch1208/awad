import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { withRetry } from '@/lib/retry';

export const maxDuration = 60; // Prevent Vercel timeouts

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ProfileContext {
    companyName?: string;
    industry?: string;
    targetAudience?: string;
    contentGoals?: string;
    brandVoice?: string;
    writingRules?: string[];
}

function buildSystemPrompt(topic: string, prioritizedPosts: string, topPerformers: string, styleLessons: string[], language: string, profile?: ProfileContext): string {
    const postsContext = prioritizedPosts
        ? `\n\nHere are examples of past LinkedIn posts, prioritized by their success level:\n${prioritizedPosts}\n\nBefore generating new content, analyze the provided 'Published' posts. These represent the final, manually edited, and user-approved versions. You MUST internalize and mimic their specific tone, professional vocabulary, sentence structure, and formatting.\nPay close attention to the structural patterns in these published posts and apply them to all new generations. Do not output generic AI-sounding text; match the exact persona of the injected examples.`
        : '';

    const performanceContext = topPerformers
        ? `\n\n🏆 GOLD STANDARD — TOP-PERFORMING POSTS (ranked by actual LinkedIn impressions):\n${topPerformers}\n\nCRITICAL INSTRUCTION: The posts above received the highest real-world engagement. Carefully analyze their hook, sentence length, tone, formatting, and structure. Your newly generated post MUST heavily emulate the style and structure of these top-performing posts. They are your primary source of truth for what works.`
        : '';

    const lessonsContext = styleLessons.length > 0
        ? `\n\nStyle guidelines learned from past edits:\n${styleLessons.join('\n')}`
        : '';

    const langInstruction = language === 'he'
        ? '\n\nIMPORTANT: Write the ENTIRE post in Hebrew (עברית). The post content, hashtags, and call-to-action must all be in Hebrew. Use right-to-left text direction naturally.'
        : '\n\nWrite the post in English.';

    // Use project profile for branding if available, otherwise fall back to AWAD defaults
    const companyName = profile?.companyName || 'AWAD';
    const companyDesc = profile?.industry
        ? `${companyName} is a company in the ${profile.industry} industry.`
        : `${companyName} is an Israeli startup law firm and business advisory company.\nAWAD helps startup founders with legal and business challenges: incorporation, term sheets, fundraising, employment agreements, IP protection, and regulatory compliance.`;

    const audienceContext = profile?.targetAudience
        ? `\nTarget audience: ${profile.targetAudience}`
        : '';

    const goalsContext = profile?.contentGoals
        ? `\nContent goals: ${profile.contentGoals}`
        : '';

    const voiceContext = profile?.brandVoice
        ? `\nBrand voice: ${profile.brandVoice}`
        : '';

    const writingRulesContext = profile?.writingRules && profile.writingRules.length > 0
        ? `\n\nIMPORTANT — Specific writing rules derived from the brand's past content (follow these strictly):\n${profile.writingRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
        : '';

    return `You are a LinkedIn content writer for ${companyName}. 
${companyDesc}${audienceContext}${goalsContext}${voiceContext}

Your task: Write a compelling, professional LinkedIn post about the following topic.

Brand Voice Guidelines:
- Authoritative yet approachable — you are the trusted advisor
- Practical and actionable — give real value in every post
- Confident but not arrogant
- Use concise paragraphs, not walls of text
- Include relevant emojis sparingly (1-3 max)
- End with a clear call-to-action or thought-provoking question
- Max 3,000 characters, ideally 800-1,200 characters
- Include 3-5 relevant hashtags at the end${langInstruction}${postsContext}${performanceContext}${lessonsContext}${writingRulesContext}

Topic to write about: ${topic}

Write the complete LinkedIn post now. Return ONLY the post content, no preamble or explanation.`;
}

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { topic, projectId, language, intent, sourceText } = body as {
        topic: string;
        projectId?: string;
        language?: string;
        intent?: string;
        sourceText?: string;
    };

    if (!topic?.trim()) {
        return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    try {
        // Step 1: Fetch historical posts from DB prioritized by status
        let prioritizedPostsContext = '';
        let topPerformersContext = '';
        let styleLessons: string[] = [];
        let profileContext: ProfileContext | undefined;

        try {
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
                    profileContext = {
                        companyName: profile.company_name ?? undefined,
                        industry: profile.industry ?? undefined,
                        targetAudience: profile.target_audience ?? undefined,
                        contentGoals: profile.content_goals ?? undefined,
                        brandVoice: profile.brand_voice ?? undefined,
                        writingRules: (analysis?.writing_rules as string[]) ?? undefined,
                    };
                }
            }

            let postsQuery = supabase
                .from('posts')
                .select('status, final_text')
                .eq('user_id', user.id)
                .in('status', ['Published', 'Approved'])
                .order('created_at', { ascending: false })
                .limit(20);

            if (projectId) {
                postsQuery = postsQuery.eq('project_id', projectId);
            }

            const { data: dbPosts, error: postsError } = await postsQuery;

            // Fetch top-performing posts by impressions (Gold Standard)
            let topPerformersQuery = supabase
                .from('posts')
                .select('final_text, impressions, topic')
                .eq('user_id', user.id)
                .eq('status', 'Published')
                .not('impressions', 'is', null)
                .gt('impressions', 0)
                .order('impressions', { ascending: false })
                .limit(5);

            if (projectId) {
                topPerformersQuery = topPerformersQuery.eq('project_id', projectId);
            }

            const { data: topPosts } = await topPerformersQuery;

            if (topPosts && topPosts.length > 0) {
                topPerformersContext = topPosts
                    .map((p, i) => `--- [#${i + 1} — ${p.impressions!.toLocaleString()} impressions] ---\nTopic: ${p.topic}\n${p.final_text}`)
                    .join('\n\n');
            }

            if (!postsError && dbPosts && dbPosts.length > 0) {
                const published = dbPosts.filter(p => p.status === 'Published').map(p => p.final_text).filter(Boolean);
                const approved = dbPosts.filter(p => p.status === 'Approved').map(p => p.final_text).filter(Boolean);

                const allPrioritized = [
                    ...published.map((text, i) => `--- [Tier 1 - Published] Example ${i + 1} ---\n${text}`),
                    ...approved.map((text, i) => `--- [Tier 2 - Approved] Example ${i + 1} ---\n${text}`),
                ].slice(0, 5); // Take top 5 full posts to avoid context bloat

                if (allPrioritized.length > 0) {
                    prioritizedPostsContext = allPrioritized.join('\n\n');
                }
            }

            // Step 2: Extract learnings from post_learnings prioritized by post status
            let learningsQuery = supabase
                .from('post_learnings')
                .select(`
                    insight,
                    posts!inner(status)
                `)
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (projectId) {
                learningsQuery = learningsQuery.eq('project_id', projectId);
            }

            const { data: dbLearnings, error: learningsError } = await learningsQuery;

            if (!learningsError && dbLearnings && dbLearnings.length > 0) {
                const publishedLearnings = dbLearnings
                    // @ts-ignore - Supabase type inference for inner joined single records
                    .filter(l => l.posts.status === 'Published')
                    .map(l => l.insight);
                    
                const approvedLearnings = dbLearnings
                    // @ts-ignore
                    .filter(l => ['Approved', 'Scheduled'].includes(l.posts.status))
                    .map(l => l.insight);

                styleLessons = [
                    ...publishedLearnings.map(l => `[CRITICAL Rule from Published Post]: ${l}`),
                    ...approvedLearnings.map(l => `[Rule from Approved Draft]: ${l}`)
                ].slice(0, 10); // Limit context size
            }
        } catch (ragError) {
            console.warn('[generate-draft] Context unavailable, generating without context:', ragError);
        }

        // Step 3 & 4: Generate post text + image concurrently
        const [postText, imageUrl] = await Promise.all([
            withRetry(async () => {
                const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
                const basePrompt = buildSystemPrompt(
                    intent && sourceText ? intent : topic,
                    prioritizedPostsContext,
                    topPerformersContext,
                    styleLessons,
                    language || 'en',
                    profileContext
                );
                const finalPrompt = intent && sourceText
                    ? `${basePrompt}\n\nHere is the original content the user provided:\n---\n${sourceText}\n---\n\nUser's instruction: ${intent}\n\nBased on the original content and the user's instruction, write a LinkedIn post. Return ONLY the post content.`
                    : basePrompt;
                const result = await model.generateContent(finalPrompt);
                return result.response.text().trim();
            }),
            generateImage(topic),
        ]);

        // Generate a unique 4-digit tracking ID for LinkedIn cross-referencing
        const trackingId = String(Math.floor(1000 + Math.random() * 9000));
        const postTextWithTracking = `${postText}\n\n#${trackingId}`;

        // Save initial draft to Supabase
        const { data: post, error: dbError } = await supabase
            .from('posts')
            .insert({
                user_id: user.id,
                project_id: projectId || null,
                topic,
                original_draft: postTextWithTracking,
                final_text: postTextWithTracking,
                image_url: imageUrl,
                status: 'Reviewing',
                tracking_id: trackingId,
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({
            postId: post.id,
            postText: postTextWithTracking,
            imageUrl,
            originalDraft: postTextWithTracking,
        });
    } catch (error) {
        console.error('[generate-draft] Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate draft. Please try again.' },
            { status: 500 }
        );
    }
}

async function generateImage(topic: string): Promise<string | null> {
    try {
        const hfKey = process.env.HUGGINGFACE_API_KEY;
        if (!hfKey) return null;

        const prompt = `Professional LinkedIn image for a post about: ${topic}. Corporate, clean, modern design, blue and white color scheme, business professional style. No text overlay.`;

        const response = await fetch(
            'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${hfKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inputs: prompt }),
            }
        );

        if (!response.ok) return null;

        const blob = await response.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch {
        return null;
    }
}
