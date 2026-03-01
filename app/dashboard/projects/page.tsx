import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserProjects } from '@/lib/project-context';
import ProjectSelectorClient from './ProjectSelectorClient';

export default async function ProjectsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { owned, shared } = await getUserProjects();

    return <ProjectSelectorClient owned={owned} shared={shared} />;
}
