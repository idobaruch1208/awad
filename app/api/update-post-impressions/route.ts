import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { postId, impressions } = await request.json() as {
            postId: string;
            impressions: number | null;
        };

        if (!postId) {
            return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
        }

        if (impressions !== null && (typeof impressions !== 'number' || impressions < 0)) {
            return NextResponse.json({ error: 'Impressions must be a non-negative number or null' }, { status: 400 });
        }

        const { error } = await supabase
            .from('posts')
            .update({ impressions })
            .eq('id', postId);

        if (error) {
            console.error('Error updating impressions:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('API Error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
