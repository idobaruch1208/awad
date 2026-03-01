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

    try {
        // Step 1: Create the project (RLS INSERT policy checks owner_id = auth.uid())
        const { data: project, error: projErr } = await supabase
            .from('projects')
            .insert({ name: name.trim(), owner_id: user.id })
            .select('id')
            .single();

        if (projErr) {
            console.error('[api/projects] Error creating project:', projErr.message, projErr.details, projErr.hint);
            return NextResponse.json({ error: `Failed to create project: ${projErr.message}` }, { status: 500 });
        }

        // Step 2: Add creator as owner member (so RLS SELECT on projects works for them)
        const { error: memErr } = await supabase
            .from('project_members')
            .insert({ project_id: project.id, user_id: user.id, role: 'owner' });

        if (memErr) {
            console.error('[api/projects] Error adding member:', memErr.message, memErr.details, memErr.hint);
            // Project was created but membership failed — still return the project
            return NextResponse.json({ id: project.id, name: name.trim(), warning: 'Project created but membership setup incomplete' });
        }

        return NextResponse.json({ id: project.id, name: name.trim() });
    } catch (err) {
        console.error('[api/projects] Unexpected error:', err);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
