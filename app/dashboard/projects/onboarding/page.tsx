import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import OnboardingWizard from './OnboardingWizard';

interface Props {
    searchParams: Promise<{ projectId?: string }>;
}

export default async function OnboardingPage({ searchParams }: Props) {
    const params = await searchParams;
    const projectId = params.projectId;

    if (!projectId) {
        redirect('/dashboard/projects');
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Verify membership
    const { data: membership } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

    if (!membership) {
        redirect('/dashboard/projects');
    }

    // Get project name
    const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

    return (
        <OnboardingWizard
            projectId={projectId}
            projectName={project?.name ?? 'Your Project'}
        />
    );
}
