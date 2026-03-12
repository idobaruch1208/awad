import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { postId, finalText } = await request.json() as { postId: string; finalText: string };

        if (!postId || typeof finalText !== 'string') {
            return NextResponse.json({ error: 'Missing postId or finalText' }, { status: 400 });
        }

        const { error } = await supabase
            .from('posts')
            .update({ final_text: finalText, updated_at: new Date().toISOString() })
            .eq('id', postId);

        if (error) {
            console.error('Error updating post text:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('API Error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
