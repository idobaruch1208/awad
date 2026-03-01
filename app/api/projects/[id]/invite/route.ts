import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a member of this project
    const { data: membership } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

    if (!membership) {
        return NextResponse.json({ error: 'Not a member of this project' }, { status: 403 });
    }

    // Create invite
    const { data: invite, error } = await supabase
        .from('invites')
        .insert({ project_id: projectId, created_by: user.id })
        .select('token')
        .single();

    if (error) {
        console.error('[api/projects/invite] Error:', error.message);
        return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
    }

    const baseUrl = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';
    const inviteUrl = `${baseUrl}/invite/${invite.token}`;

    return NextResponse.json({ token: invite.token, url: inviteUrl });
}
