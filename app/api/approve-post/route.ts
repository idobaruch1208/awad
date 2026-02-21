import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { embed } from '@/lib/embed';
import { upsert } from '@/lib/vectordb';
import { withRetry } from '@/lib/retry';
import { diffWords } from 'diff';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { postId, originalDraft, finalText } = await request.json() as {
        postId: string;
        originalDraft: string;
        finalText: string;
    };

    if (!postId || !finalText) {
        return NextResponse.json({ error: 'postId and finalText are required' }, { status: 400 });
    }

    try {
        // Step 1: Compute diff between original and final
        const diff = diffWords(originalDraft ?? '', finalText);
        const diffSummary = diff
            .filter((part) => part.added || part.removed)
            .map((part) => `${part.added ? 'ADDED' : 'REMOVED'}: "${part.value.trim()}"`)
            .join('\n');

        // Step 2: Infer writing style rules via Gemini
        let styleLessons: string[] = [];
        if (diffSummary) {
            const rulesText = await withRetry(async () => {
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const prompt = `A user edited an AI-generated LinkedIn post for AWAD (a startup law firm). 
Based on the following diff, infer 1-3 concise writing style rules that should be followed in future posts.

Diff:
${diffSummary}

Return a JSON array of short rule strings. Example: ["Avoid passive voice", "Use bullet points for lists"]
Return ONLY the JSON array.`;
                const result = await model.generateContent(prompt);
                const text = result.response.text().trim();
                const match = text.match(/\[[\s\S]*\]/);
                return match ? JSON.parse(match[0]) as string[] : [];
            });
            styleLessons = rulesText;
        }

        // Step 3: Embed finalText + upsert to approved_posts
        const postEmbedding = await embed(finalText);
        await upsert(
            postId,
            postEmbedding,
            'approved_posts',
            { text: finalText.slice(0, 1000) }
        );

        // Step 4: Embed style lessons + upsert to style_lessons
        for (const lesson of styleLessons) {
            const lessonEmbedding = await embed(lesson);
            await upsert(
                `${postId}_lesson_${Date.now()}`,
                lessonEmbedding,
                'style_lessons',
                { lesson }
            );
        }

        // Step 5: Update Supabase post status to Approved
        const { error: dbError } = await supabase
            .from('posts')
            .update({ status: 'Approved', final_text: finalText })
            .eq('id', postId)
            .eq('user_id', user.id);

        if (dbError) throw dbError;

        return NextResponse.json({
            success: true,
            styleLessons,
        });
    } catch (error) {
        console.error('[approve-post] Error:', error);
        return NextResponse.json({ error: 'Failed to approve post' }, { status: 500 });
    }
}
