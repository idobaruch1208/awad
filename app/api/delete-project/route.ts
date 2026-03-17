import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function DELETE(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await request.json() as { projectId: string };
    if (!projectId) {
        return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    // Verify user is the owner
    const { data: membership } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

    if (!membership || membership.role !== 'owner') {
        return NextResponse.json({ error: 'Only project owners can delete a project' }, { status: 403 });
    }

    // Use service role key to bypass RLS for deletion
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete — CASCADE takes care of posts, profiles, members, invites
    const { error } = await supabaseAdmin
        .from('projects')
        .delete()
        .eq('id', projectId);

    if (error) {
        console.error('[delete-project] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
