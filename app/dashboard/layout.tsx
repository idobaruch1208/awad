import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getActiveProject, getActiveProjectId } from '@/lib/project-context';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Check for active project — if not set, redirect to project selector
    // But skip this check if already on the projects page
    const projectId = await getActiveProjectId();
    const project = projectId ? await getActiveProject() : null;

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            <Sidebar userEmail={user.email ?? ''} projectName={project?.name} />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
