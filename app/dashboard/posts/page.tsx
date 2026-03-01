import { createClient } from '@/lib/supabase/server';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';
import type { Post, PostStatus } from '@/lib/types';
import { format } from 'date-fns';
import { getActiveProjectId } from '@/lib/project-context';
import { redirect } from 'next/navigation';

type FilterType = 'all' | 'published' | 'scheduled' | 'in-progress';

const FILTER_CONFIG: Record<FilterType, { label: string; title: string; statuses: PostStatus[] | null }> = {
    all: { label: 'All', title: 'All Posts', statuses: null },
    published: { label: 'Published', title: 'Published Posts', statuses: ['Published'] },
    scheduled: { label: 'Scheduled', title: 'Scheduled Posts', statuses: ['Scheduled'] },
    'in-progress': { label: 'In Progress', title: 'In Progress', statuses: ['Draft', 'Reviewing', 'Approved'] },
};

export default async function PostsPage({
    searchParams,
}: {
    searchParams: Promise<{ filter?: string }>;
}) {
    const projectId = await getActiveProjectId();
    if (!projectId) {
        redirect('/dashboard/projects');
    }

    const params = await searchParams;
    const activeFilter = (params.filter as FilterType) || 'all';
    const filterConfig = FILTER_CONFIG[activeFilter] ?? FILTER_CONFIG.all;

    const supabase = await createClient();

    // Build query with filter — scoped to active project
    let query = supabase
        .from('posts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    if (filterConfig.statuses) {
        query = query.in('status', filterConfig.statuses);
    }

    const { data: posts } = await query;
    const filteredPosts: Post[] = posts ?? [];

    return (
        <div className="p-4 sm:p-8 pt-16 md:pt-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">{filterConfig.title}</h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
                        {activeFilter !== 'all' ? ` · ${filterConfig.label}` : ' total'}
                    </p>
                </div>
                <Link href="/dashboard/generate" className="btn-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Post
                </Link>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 mb-6">
                {(Object.entries(FILTER_CONFIG) as [FilterType, typeof filterConfig][]).map(([key, config]) => (
                    <Link
                        key={key}
                        href={key === 'all' ? '/dashboard/posts' : `/dashboard/posts?filter=${key}`}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${activeFilter === key
                            ? 'bg-violet-600 text-white shadow-md shadow-violet-900/30'
                            : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 hover:text-gray-300 border border-gray-700/50'
                            }`}
                    >
                        {config.label}
                    </Link>
                ))}
            </div>

            {filteredPosts.length === 0 ? (
                <div className="glass rounded-2xl py-24 flex flex-col items-center text-center">
                    <div className="text-5xl mb-4">📭</div>
                    <h2 className="text-lg font-semibold text-white mb-2">
                        {activeFilter !== 'all' ? `No ${filterConfig.label.toLowerCase()} posts` : 'No posts yet'}
                    </h2>
                    <p className="text-gray-400 text-sm mb-6">
                        {activeFilter !== 'all'
                            ? 'Try a different filter or generate a new post'
                            : 'Generate your first AI-powered LinkedIn post'}
                    </p>
                    <div className="flex gap-3">
                        {activeFilter !== 'all' && (
                            <Link href="/dashboard/posts" className="btn-secondary">View All Posts</Link>
                        )}
                        <Link href="/dashboard/generate" className="btn-primary">
                            Generate Post
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="glass rounded-xl overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                        <thead>
                            <tr className="border-b border-gray-800">
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Topic</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Published</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {filteredPosts.map((post) => (
                                <tr key={post.id} className="hover:bg-gray-900/40 transition-colors group">
                                    <td className="px-6 py-4">
                                        <Link href={`/dashboard/posts/${post.id}`} className="block">
                                            <div className="text-white font-medium truncate max-w-xs group-hover:text-violet-300 transition-colors">{post.topic}</div>
                                            {post.final_text && (
                                                <div className="text-gray-500 text-xs truncate max-w-xs mt-0.5">
                                                    {post.final_text.slice(0, 80)}...
                                                </div>
                                            )}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={post.status} />
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 text-xs">
                                        {format(new Date(post.created_at), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 text-xs">
                                        {post.published_at
                                            ? format(new Date(post.published_at), 'MMM d, yyyy HH:mm')
                                            : post.status === 'Scheduled' && post.target_timestamp
                                                ? `⏰ ${format(new Date(post.target_timestamp), 'MMM d, HH:mm')}`
                                                : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
