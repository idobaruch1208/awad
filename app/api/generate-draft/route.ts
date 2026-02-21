import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { embed } from '@/lib/embed';
import { query } from '@/lib/vectordb';
import { withRetry } from '@/lib/retry';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function buildSystemPrompt(topic: string, approvedPosts: string[], styleLessons: string[]): string {
    const postsContext = approvedPosts.length > 0
        ? `\n\nHere are examples of previously approved AWAD LinkedIn posts (use these as style reference):\n${approvedPosts.map((p, i) => `--- Post ${i + 1} ---\n${p}`).join('\n\n')}`
        : '';

    const lessonsContext = styleLessons.length > 0
        ? `\n\nStyle guidelines learned from past edits:\n${styleLessons.join('\n')}`
        : '';

    return `You are a LinkedIn content writer for AWAD, an Israeli startup law firm and business advisory company. 
AWAD helps startup founders with legal and business challenges: incorporation, term sheets, fundraising, employment agreements, IP protection, and regulatory compliance.

Your task: Write a compelling, professional LinkedIn post about the following topic.

Brand Voice Guidelines:
- Authoritative yet approachable — you are the trusted legal advisor
- Practical and actionable — give real value in every post
- Confident but not arrogant
- Use concise paragraphs, not walls of text
- Include relevant emojis sparingly (1-3 max)
- End with a clear call-to-action or thought-provoking question
- Max 3,000 characters, ideally 800-1,200 characters
- Include 3-5 relevant hashtags at the end${postsContext}${lessonsContext}

Topic to write about: ${topic}

Write the complete LinkedIn post now. Return ONLY the post content, no preamble or explanation.`;
}

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { topic } = body as { topic: string };

    if (!topic?.trim()) {
        return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    try {
        // Step 1: Embed the topic
        const topicEmbedding = await embed(topic);

        // Step 2: Query Vector DB for context
        const [approvedPostsResults, styleLessonsResults] = await Promise.all([
            query(topicEmbedding, 'approved_posts', 3).catch(() => []),
            query(topicEmbedding, 'style_lessons', 2).catch(() => []),
        ]);

        const approvedPosts = approvedPostsResults.map((r) => r.text ?? '').filter(Boolean);
        const styleLessons = styleLessonsResults.map((r) => r.lesson ?? '').filter(Boolean);

        // Step 3 & 4: Generate post text + image concurrently
        const [postText, imageUrl] = await Promise.all([
            withRetry(async () => {
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
                const prompt = buildSystemPrompt(topic, approvedPosts, styleLessons);
                const result = await model.generateContent(prompt);
                return result.response.text().trim();
            }),
            generateImage(topic),
        ]);

        // Save initial draft to Supabase
        const { data: post, error: dbError } = await supabase
            .from('posts')
            .insert({
                user_id: user.id,
                topic,
                original_draft: postText,
                final_text: postText,
                image_url: imageUrl,
                status: 'Reviewing',
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({
            postId: post.id,
            postText,
            imageUrl,
            originalDraft: postText,
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
