import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PostStatus } from '@/lib/types';

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { postId, status } = body;

        if (!postId || !status) {
            return NextResponse.json({ error: 'Missing postId or status' }, { status: 400 });
        }

        const allowedStatuses: PostStatus[] = ['Draft', 'Reviewing', 'Approved', 'Scheduled', 'Published'];
        if (!allowedStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const { error } = await supabase
            .from('posts')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', postId);

        if (error) {
            console.error('Error updating status:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('API Error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
