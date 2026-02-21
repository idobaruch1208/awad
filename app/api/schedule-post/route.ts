import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { postId, targetTimestamp } = await request.json() as {
        postId: string;
        targetTimestamp: string;
    };

    if (!postId || !targetTimestamp) {
        return NextResponse.json({ error: 'postId and targetTimestamp are required' }, { status: 400 });
    }

    const { error } = await supabase
        .from('posts')
        .update({
            status: 'Scheduled',
            target_timestamp: targetTimestamp,
        })
        .eq('id', postId)
        .eq('user_id', user.id);

    if (error) {
        console.error('[schedule-post] DB error:', error);
        return NextResponse.json({ error: 'Failed to schedule post' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
