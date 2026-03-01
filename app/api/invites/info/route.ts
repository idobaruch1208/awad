import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Use service role style query - invites are readable by any authenticated user via RLS
    const { data: invite, error } = await supabase
        .from('invites')
        .select('project_id, expires_at')
        .eq('token', token)
        .single();

    if (error || !invite) {
        return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
    }

    if (new Date(invite.expires_at) < new Date()) {
        return NextResponse.json({ error: 'This invite link has expired' }, { status: 410 });
    }

    // Get project name
    const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', invite.project_id)
        .single();

    return NextResponse.json({
        project_name: project?.name ?? 'Unknown Project',
        project_id: invite.project_id,
    });
}
