import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { diffWords } from 'diff';
import { withRetry } from '@/lib/retry';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Extracts and stores learnings based on the diff between the original AI draft
 * and the final text provided by the human edited version.
 * Returns the array of insights extracted, or null if nothing was learned.
 */
export async function processPostLearnings(postId: string): Promise<string[] | null> {
    if (!postId) return null;

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Fetch the post from DB
        const { data: post, error } = await supabase
            .from('posts')
            .select('original_draft, final_text, project_id, status')
            .eq('id', postId)
            .single();

        if (error || !post) {
            console.error('[learnings] Failed to fetch post:', error);
            return null;
        }

        const { original_draft, final_text, project_id } = post;

        if (!original_draft || !final_text || !project_id) {
            return null;
        }

        if (original_draft === final_text) {
            // No manual edits were made, so there's nothing new to learn.
            return null;
        }

        // 2. Compute the diff
        const diff = diffWords(original_draft, final_text);
        const diffSummary = diff
            .filter((part) => part.added || part.removed)
            .map((part) => `${part.added ? 'ADDED' : 'REMOVED'}: "${part.value.trim()}"`)
            .join('\n');

        if (!diffSummary) return null;

        // 3. Infer new writing style rules via Gemini
        const rulesText = await withRetry(async () => {
            const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
            const prompt = `A user manually edited an AI-generated LinkedIn post. 
Based on the following diff, infer 1-3 concise and specific "Improvement Insights" or writing style rules that the AI must follow in future posts. 
For example: "User shortened sentences", "Removed hashtags", or "Added a more professional tone".

Diff:
${diffSummary}

Return a JSON array of short, actionable insight strings.
Return ONLY the JSON array.`;
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            const match = text.match(/\[[\s\S]*\]/);
            return match ? JSON.parse(match[0]) as string[] : [];
        });

        const insights = rulesText as string[];

        // 4. Save insights to the post_learnings table
        if (insights.length > 0) {
            const rowsToInsert = insights.map((insight) => ({
                post_id: postId,
                project_id: project_id,
                insight,
            }));

            const { error: insertError } = await supabase
                .from('post_learnings')
                .insert(rowsToInsert);

            if (insertError) {
                console.error('[learnings] Failed to insert learnings:', insertError);
                return null;
            } else {
                console.log(`[learnings] Successfully stored ${insights.length} learnings for post ${postId}`);
                return insights;
            }
        }

        return null;
    } catch (e) {
        console.error('[learnings] Unhandled error during learning process:', e);
        return null;
    }
}
