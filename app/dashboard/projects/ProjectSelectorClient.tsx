'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/lib/types';

export default function ProjectSelectorClient({
    owned,
    shared,
}: {
    owned: Project[];
    shared: Project[];
}) {
    const router = useRouter();
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState<string | null>(null);

    const selectProject = async (projectId: string) => {
        setLoading(projectId);
        await fetch('/api/set-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId }),
        });
        router.push('/dashboard');
    };

    const createProject = async () => {
        if (!newName.trim()) return;
        setLoading('creating');
        const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim() }),
        });
        const data = await res.json();
        if (data.id) {
            // Redirect to onboarding wizard for new projects
            router.push(`/dashboard/projects/onboarding?projectId=${data.id}`);
        }
    };

    const [deleting, setDeleting] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const deleteProject = async (projectId: string) => {
        setDeleting(projectId);
        try {
            const res = await fetch('/api/delete-project', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });
            if (res.ok) {
                router.refresh();
                window.location.reload();
            }
        } catch {
            console.error('Failed to delete project');
        } finally {
            setDeleting(null);
            setConfirmDelete(null);
        }
    };

    const ProjectCard = ({ project, badge, canDelete }: { project: Project; badge?: string; canDelete?: boolean }) => (
        <div className="glass rounded-xl p-5 text-left transition-all duration-200 hover:border-violet-600/50 hover:shadow-lg hover:shadow-violet-900/20 group w-full relative">
            {/* Delete button for owners */}
            {canDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(project.id); }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete project"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            )}

            {/* Confirmation dialog */}
            {confirmDelete === project.id ? (
                <div className="space-y-3">
                    <p className="text-sm text-red-300 font-medium">Delete &quot;{project.name}&quot;?</p>
                    <p className="text-xs text-gray-400">This will permanently delete all posts, settings, and data in this project.</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => deleteProject(project.id)}
                            disabled={deleting === project.id}
                            className="flex-1 py-2 text-xs font-medium rounded-lg bg-red-600/20 text-red-300 border border-red-600/40 hover:bg-red-600/30 transition-colors disabled:opacity-50"
                        >
                            {deleting === project.id ? 'Deleting...' : 'Yes, Delete'}
                        </button>
                        <button
                            onClick={() => setConfirmDelete(null)}
                            className="flex-1 py-2 text-xs font-medium rounded-lg bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => selectProject(project.id)}
                    disabled={loading !== null}
                    className="w-full text-left cursor-pointer disabled:opacity-50"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-lg font-semibold text-white group-hover:text-violet-300 transition-colors">
                            {project.name}
                        </div>
                        {badge && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-400 border border-violet-600/30">
                                {badge}
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-gray-500">
                        Created {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    {loading === project.id && (
                        <div className="mt-2 text-xs text-violet-400 animate-pulse">Opening...</div>
                    )}
                </button>
            )}
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-gray-950 to-blue-950/30" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 w-full max-w-2xl px-6">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 mb-6 shadow-lg shadow-violet-500/30">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold gradient-text">Select a Project</h1>
                    <p className="text-gray-400 mt-2 text-sm">Choose which project to work on</p>
                </div>

                {/* My Projects */}
                {owned.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-sm font-semibold text-gray-300 mb-3 px-1">My Projects</h2>
                        <div className="grid gap-3">
                            {owned.map(p => <ProjectCard key={p.id} project={p} badge="Owner" canDelete />)}
                        </div>
                    </div>
                )}

                {/* Shared with Me */}
                {shared.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-sm font-semibold text-gray-300 mb-3 px-1">Shared with Me</h2>
                        <div className="grid gap-3">
                            {shared.map(p => <ProjectCard key={p.id} project={p} badge="Member" />)}
                        </div>
                    </div>
                )}

                {/* Create New Project */}
                {!creating ? (
                    <button
                        onClick={() => setCreating(true)}
                        className="w-full glass rounded-xl p-5 text-center transition-all duration-200 hover:border-violet-600/30 cursor-pointer group"
                    >
                        <div className="text-lg font-semibold text-gray-400 group-hover:text-violet-300 transition-colors">
                            + Create New Project
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Start a new content workspace</div>
                    </button>
                ) : (
                    <div className="glass rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-gray-300 mb-3">New Project</h3>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Project name (e.g. AWAD, My Company)"
                                className="input-field flex-1"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && createProject()}
                            />
                            <button
                                onClick={createProject}
                                disabled={!newName.trim() || loading === 'creating'}
                                className="btn-primary px-6 disabled:opacity-50"
                            >
                                {loading === 'creating' ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                        <button
                            onClick={() => { setCreating(false); setNewName(''); }}
                            className="text-xs text-gray-500 hover:text-gray-400 mt-3 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                <p className="text-center text-xs text-gray-600 mt-8">
                    AWAD AI Content Engine — Internal Use Only
                </p>
            </div>
        </div>
    );
}
