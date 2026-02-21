import { createClient } from '@/lib/supabase/server';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';
import type { Post } from '@/lib/types';
import { format } from 'date-fns';

export default async function PostsPage() {
    const supabase = await createClient();
    const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    const allPosts: Post[] = posts ?? [];

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">All Posts</h1>
                    <p className="text-gray-400 text-sm mt-1">{allPosts.length} post{allPosts.length !== 1 ? 's' : ''} total</p>
                </div>
                <Link href="/dashboard/generate" className="btn-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Post
                </Link>
            </div>

            {allPosts.length === 0 ? (
                <div className="glass rounded-2xl py-24 flex flex-col items-center text-center">
                    <div className="text-5xl mb-4">📭</div>
                    <h2 className="text-lg font-semibold text-white mb-2">No posts yet</h2>
                    <p className="text-gray-400 text-sm mb-6">Generate your first AI-powered LinkedIn post</p>
                    <Link href="/dashboard/generate" className="btn-primary">
                        Generate Post
                    </Link>
                </div>
            ) : (
                <div className="glass rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-800">
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Topic</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Published</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {allPosts.map((post) => (
                                <tr key={post.id} className="hover:bg-gray-900/40 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-white font-medium truncate max-w-xs">{post.topic}</div>
                                        {post.final_text && (
                                            <div className="text-gray-500 text-xs truncate max-w-xs mt-0.5">
                                                {post.final_text.slice(0, 80)}...
                                            </div>
                                        )}
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
