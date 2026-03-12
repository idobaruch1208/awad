import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { withRetry } from '@/lib/retry';

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface OnboardingPayload {
    projectId: string;
    companyName: string;
    industry: string;
    targetAudience: string;
    contentGoals: string;
    brandVoice: string;
    examplePosts: { text: string; source?: string }[];
}

function buildAnalysisPrompt(payload: OnboardingPayload): string {
    const postsBlock = payload.examplePosts
        .map((p, i) => `--- Example Post ${i + 1} ${p.source ? `(${p.source})` : ''} ---\n${p.text}`)
        .join('\n\n');

    return `You are a content strategy analyst. A company is setting up their LinkedIn content engine and has provided the following information:

Company: ${payload.companyName}
Industry: ${payload.industry}
Target Audience: ${payload.targetAudience}
Content Goals: ${payload.contentGoals}
Brand Voice: ${payload.brandVoice}

They have also provided ${payload.examplePosts.length} example posts from their past content:

${postsBlock}

Analyze these posts deeply and return a JSON object with the following structure:
{
  "tone": "A 1-2 sentence description of the overall tone and voice",
  "themes": ["theme1", "theme2", "theme3", "theme4", "theme5"],
  "structure_patterns": ["pattern1", "pattern2", "pattern3"],
  "avg_length": "short/medium/long",
  "emoji_usage": "none/minimal/moderate/heavy",
  "hashtag_style": "Description of hashtag usage patterns",
  "call_to_action_style": "Description of how CTAs are used",
  "strengths": ["strength1", "strength2", "strength3"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
  "writing_rules": ["rule1", "rule2", "rule3", "rule4", "rule5"]
}

The "writing_rules" should be concrete, actionable directives that an AI writer should follow to match this brand's style. For example: "Always open with a bold statement or question", "Keep paragraphs to 2-3 lines max", "End every post with a thought-provoking question".

Return ONLY the JSON object, no other text.`;
}

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: OnboardingPayload;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { projectId, companyName, industry, targetAudience, contentGoals, brandVoice, examplePosts } = payload;

    if (!projectId) {
        return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!examplePosts || examplePosts.length < 2) {
        return NextResponse.json({ error: 'At least 2 example posts are required' }, { status: 400 });
    }

    if (examplePosts.length > 8) {
        return NextResponse.json({ error: 'Maximum 8 example posts allowed' }, { status: 400 });
    }

    // Verify user is an owner of this project
    const { data: membership } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

    if (!membership || membership.role !== 'owner') {
        return NextResponse.json({ error: 'Only project owners can configure onboarding' }, { status: 403 });
    }

    try {
        // Step 1: Run AI analysis on example posts
        let aiAnalysis: Record<string, unknown> | null = null;

        try {
            const prompt = buildAnalysisPrompt(payload);
            aiAnalysis = await withRetry(async () => {
                const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
                const result = await model.generateContent(prompt);
                const text = result.response.text().trim();
                const match = text.match(/\{[\s\S]*\}/);
                if (!match) throw new Error('Invalid JSON response from Gemini');
                return JSON.parse(match[0]);
            });
        } catch (analysisError) {
            console.warn('[onboarding] AI analysis failed, saving without analysis:', analysisError);
        }

        // Step 2: Upsert into project_profiles
        const profileData = {
            project_id: projectId,
            company_name: companyName?.trim() || null,
            industry: industry?.trim() || null,
            target_audience: targetAudience?.trim() || null,
            content_goals: contentGoals?.trim() || null,
            brand_voice: brandVoice?.trim() || null,
            example_posts: examplePosts.filter(p => p.text.trim().length > 0),
            ai_analysis: aiAnalysis,
            onboarding_completed: true,
        };

        // Check if profile exists
        const { data: existing } = await supabase
            .from('project_profiles')
            .select('id')
            .eq('project_id', projectId)
            .single();

        if (existing) {
            const { error: updateError } = await supabase
                .from('project_profiles')
                .update(profileData)
                .eq('project_id', projectId);

            if (updateError) {
                console.error('[onboarding] Update error:', updateError);
                return NextResponse.json({ error: `Failed to update profile: ${updateError.message}` }, { status: 500 });
            }
        } else {
            const { error: insertError } = await supabase
                .from('project_profiles')
                .insert(profileData);

            if (insertError) {
                console.error('[onboarding] Insert error:', insertError);
                return NextResponse.json({ error: `Failed to save profile: ${insertError.message}` }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            aiAnalysis,
        });
    } catch (error) {
        console.error('[onboarding] Unexpected error:', error);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
