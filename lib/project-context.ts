import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { Project } from '@/lib/types';

const ACTIVE_PROJECT_COOKIE = 'active_project_id';

/** Get the active project ID from the cookie */
export async function getActiveProjectId(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? null;
}

/** Set the active project ID cookie */
export async function setActiveProjectId(projectId: string) {
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_PROJECT_COOKIE, projectId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
    });
}

/** Get the active project, or null if not set / user not a member */
export async function getActiveProject(): Promise<Project | null> {
    const projectId = await getActiveProjectId();
    if (!projectId) return null;

    const supabase = await createClient();
    const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

    return data as Project | null;
}

/** Get all projects the user is a member of */
export async function getUserProjects(): Promise<{ owned: Project[]; shared: Project[] }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { owned: [], shared: [] };

    const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id, role')
        .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) return { owned: [], shared: [] };

    const projectIds = memberships.map(m => m.project_id);
    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('created_at', { ascending: true });

    const allProjects = (projects ?? []) as Project[];
    const ownerProjectIds = new Set(
        memberships.filter(m => m.role === 'owner').map(m => m.project_id)
    );

    return {
        owned: allProjects.filter(p => ownerProjectIds.has(p.id)),
        shared: allProjects.filter(p => !ownerProjectIds.has(p.id)),
    };
}
