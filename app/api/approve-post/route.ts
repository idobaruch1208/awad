import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { withRetry } from '@/lib/retry';
import { processPostLearnings } from '@/lib/learnings';

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

        // Step 2: Trigger learning pipeline in the background
        processPostLearnings(postId).catch(console.error);

        return NextResponse.json({
            success: true,
            styleLessons: [], // Returning empty since the client doesn't explicitly need them anymore, or we can remove it, but keep for type safety
        });
    } catch (error) {
        console.error('[approve-post] Error:', error);
        return NextResponse.json({ error: 'Failed to approve post' }, { status: 500 });
    }
}
