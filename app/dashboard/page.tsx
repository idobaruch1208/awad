import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import type { Post } from '@/lib/types';
import { getActiveProjectId } from '@/lib/project-context';
import { redirect } from 'next/navigation';
import KanbanBoard from './KanbanBoard';

interface Props {
    searchParams: Promise<{ view?: string }>;
}

export default async function DashboardHomePage({ searchParams }: Props) {
    const params = await searchParams;
    const view = params.view || 'kanban'; // 'list' or 'kanban'
    
    const projectId = await getActiveProjectId();
    if (!projectId) {
        redirect('/dashboard/projects');
    }

    const supabase = await createClient();

    // Check if onboarding is completed
    const { data: profile } = await supabase
        .from('project_profiles')
        .select('onboarding_completed')
        .eq('project_id', projectId)
        .single();

    const needsOnboarding = !profile || !profile.onboarding_completed;

    const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

    const allPosts: Post[] = posts ?? [];

    const stats = {
        total: allPosts.length,
        draft: allPosts.filter((p) => p.status === 'Draft').length,
        reviewing: allPosts.filter((p) => p.status === 'Reviewing').length,
        approved: allPosts.filter((p) => p.status === 'Approved').length,
        scheduled: allPosts.filter((p) => p.status === 'Scheduled').length,
        published: allPosts.filter((p) => p.status === 'Published').length,
    };

    const recentPosts = allPosts.slice(0, 5);
    const columns = ['Draft', 'Reviewing', 'Approved', 'Scheduled', 'Published'];

    return (
        <div className="p-4 sm:p-8 pt-16 md:pt-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-gray-400 text-sm mt-1">Generate and manage your LinkedIn content</p>
                </div>
                <Link href="/dashboard/generate" className="btn-primary flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Post
                </Link>
            </div>

            {/* Onboarding Nudge */}
            {needsOnboarding && (
                <Link
                    href={`/dashboard/projects/onboarding?projectId=${projectId}`}
                    className="mb-8 flex items-center gap-4 p-5 rounded-xl bg-gradient-to-r from-violet-950/60 to-indigo-950/60 border border-violet-700/40 hover:border-violet-500/60 transition-all duration-300 group"
                >
                    <div className="w-12 h-12 rounded-xl bg-violet-600/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <span className="text-2xl">✨</span>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-white group-hover:text-violet-200 transition-colors">
                            Complete your project setup
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Tell us about your brand and share past posts so the AI can match your unique voice and style.
                        </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-violet-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            )}

            {/* View Toggles */}
            <div className="flex items-center gap-2 mb-4 bg-gray-900/50 w-fit p-1 rounded-lg border border-gray-800">
                <Link href="?view=kanban" className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'kanban' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Kanban Board</Link>
                <Link href="?view=list" className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'list' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>List View</Link>
            </div>

            {/* Stats / Filters — Clickable Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                {[
                    { label: 'Draft', value: stats.draft, icon: '📝', color: 'text-gray-400', href: '/dashboard/posts?filter=Draft' },
                    { label: 'Reviewing', value: stats.reviewing, icon: '👀', color: 'text-amber-400', href: '/dashboard/posts?filter=Reviewing' },
                    { label: 'Approved', value: stats.approved, icon: '👍', color: 'text-blue-400', href: '/dashboard/posts?filter=Approved' },
                    { label: 'Scheduled', value: stats.scheduled, icon: '⏰', color: 'text-indigo-400', href: '/dashboard/posts?filter=Scheduled' },
                    { label: 'Published', value: stats.published, icon: '✅', color: 'text-green-400', href: '/dashboard/posts?filter=Published' },
                    { label: 'All', value: stats.total, icon: '📋', color: 'text-gray-200', href: '/dashboard/posts' },
                ].map((stat) => (
                    <Link
                        key={stat.label}
                        href={stat.href}
                        className="glass rounded-xl p-4 transition-all duration-200 hover:border-violet-600/50 hover:shadow-lg hover:shadow-violet-900/20 cursor-pointer group flex flex-col justify-between"
                    >
                        <div className="text-xl mb-1">{stat.icon}</div>
                        <div>
                            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                            <div className="text-[11px] font-medium text-gray-500 mt-0.5 group-hover:text-gray-400 transition-colors uppercase tracking-wider">{stat.label}</div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Content Display */}
            {view === 'kanban' ? (
                <KanbanBoard initialPosts={allPosts} columns={columns} />
            ) : (
                <div className="glass rounded-xl overflow-hidden border border-gray-800/80">
                    <div className="px-6 py-4 border-b border-gray-800/80 flex items-center justify-between bg-gray-900/20">
                        <h2 className="text-sm font-semibold text-white">Recent Posts</h2>
                        <Link href="/dashboard/posts" className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium">
                            View all →
                        </Link>
                    </div>
                    {recentPosts.length === 0 ? (
                        <div className="px-6 py-16 text-center bg-gray-900/10">
                            <div className="text-4xl mb-3">🚀</div>
                            <p className="text-gray-400 text-sm">No posts yet. Generate your first post!</p>
                            <Link href="/dashboard/generate" className="btn-primary mt-4 inline-flex">
                                Generate Post
                            </Link>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-800/80 bg-gray-900/10">
                            {recentPosts.map((post) => (
                                <li key={post.id} className="group hover:bg-gray-800/30 transition-colors">
                                    <Link
                                        href={`/dashboard/posts/${post.id}`}
                                        className="px-6 py-4 flex items-center justify-between gap-4 block"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-200 font-medium group-hover:text-white transition-colors truncate">{post.topic}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Created {new Date(post.created_at).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric', year: 'numeric',
                                                })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            {post.impressions != null && post.impressions > 0 && (
                                                <span className="flex items-center gap-1 text-xs text-blue-400/80" title={`${post.impressions.toLocaleString()} impressions`}>
                                                    <span className="text-[10px]">👁️</span>
                                                    <span className="font-medium">{post.impressions >= 1000 ? `${(post.impressions / 1000).toFixed(1)}k` : post.impressions}</span>
                                                </span>
                                            )}
                                            <StatusBadge status={post.status} />
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Quick Tips */}
            <div className="mt-8 p-5 rounded-xl bg-violet-900/10 border border-violet-800/30">
                <h3 className="text-sm font-semibold text-violet-300 mb-3 flex items-center gap-2">
                    <span className="text-lg">💡</span> How it works
                </h3>
                <ol className="text-xs text-gray-400 space-y-2 list-none pl-1">
                    <li className="flex items-start gap-2"><span className="text-violet-500 font-bold">1.</span> Click <span className="text-gray-300 font-medium">Generate Post</span> to start the AI pipeline</li>
                    <li className="flex items-start gap-2"><span className="text-violet-500 font-bold">2.</span> Pick or type a topic — AI retrieves relevant brand context</li>
                    <li className="flex items-start gap-2"><span className="text-violet-500 font-bold">3.</span> Review, refine, and approve your draft</li>
                    <li className="flex items-start gap-2"><span className="text-violet-500 font-bold">4.</span> Publish immediately or schedule for later</li>
                </ol>
            </div>
        </div>
    );
}
