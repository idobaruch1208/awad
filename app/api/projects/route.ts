import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    // Create project
    const { data: project, error: projErr } = await supabase
        .from('projects')
        .insert({ name: name.trim(), owner_id: user.id })
        .select('id')
        .single();

    if (projErr) {
        console.error('[api/projects] Error creating project:', projErr.message);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }

    // Add creator as owner member
    const { error: memErr } = await supabase
        .from('project_members')
        .insert({ project_id: project.id, user_id: user.id, role: 'owner' });

    if (memErr) {
        console.error('[api/projects] Error adding member:', memErr.message);
    }

    return NextResponse.json({ id: project.id, name: name.trim() });
}
