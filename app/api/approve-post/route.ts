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
        // Step 1: Update DB status FIRST (fast, ensures post is saved)
        const { error: dbError } = await supabase
            .from('posts')
            .update({ status: 'Approved', final_text: finalText })
            .eq('id', postId);

        if (dbError) throw dbError;

        // Step 2: Compute diff between original and final
        const diff = diffWords(originalDraft ?? '', finalText);
        const diffSummary = diff
            .filter((part) => part.added || part.removed)
            .map((part) => `${part.added ? 'ADDED' : 'REMOVED'}: "${part.value.trim()}"`)
            .join('\n');

        // Step 3: Infer writing style rules via Gemini
        let styleLessons: string[] = [];
        if (diffSummary) {
            try {
                const rulesText = await withRetry(async () => {
                    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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
            } catch (e) {
                console.error('[approve-post] Style lessons failed (non-blocking):', e);
            }
        }

        // Step 4: Fire-and-forget: embeddings + vector upserts in background
        // Don't await — respond to client immediately
        (async () => {
            try {
                // Embed final text + all lessons in parallel
                const embedPromises = [
                    embed(finalText).then(async (vec) => {
                        await upsert(postId, vec, 'approved_posts', { text: finalText.slice(0, 1000) });
                    }),
                    ...styleLessons.map(async (lesson) => {
                        const vec = await embed(lesson);
                        await upsert(`${postId}_lesson_${Date.now()}_${Math.random().toString(36).slice(2)}`, vec, 'style_lessons', { lesson });
                    }),
                ];
                await Promise.all(embedPromises);
            } catch (e) {
                console.error('[approve-post] Background embedding failed:', e);
            }
        })();

        return NextResponse.json({
            success: true,
            styleLessons,
        });
    } catch (error) {
        console.error('[approve-post] Error:', error);
        return NextResponse.json({ error: 'Failed to approve post' }, { status: 500 });
    }
}
