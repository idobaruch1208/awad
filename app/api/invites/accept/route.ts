import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await request.json();
    if (!token) {
        return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Lookup invite
    const { data: invite, error: invErr } = await supabase
        .from('invites')
        .select('project_id, expires_at')
        .eq('token', token)
        .single();

    if (invErr || !invite) {
        return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
        return NextResponse.json({ error: 'This invite link has expired' }, { status: 410 });
    }

    // Check if already a member
    const { data: existing } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', invite.project_id)
        .eq('user_id', user.id)
        .single();

    if (existing) {
        return NextResponse.json({ project_id: invite.project_id, already_member: true });
    }

    // Join the project
    const { error: joinErr } = await supabase
        .from('project_members')
        .insert({ project_id: invite.project_id, user_id: user.id, role: 'member' });

    if (joinErr) {
        console.error('[api/invites/accept] Error joining:', joinErr.message);
        return NextResponse.json({ error: 'Failed to join project' }, { status: 500 });
    }

    return NextResponse.json({ project_id: invite.project_id, joined: true });
}
