import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import type { Post } from '@/lib/types';

export default async function DashboardHomePage() {
    const supabase = await createClient();

    const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    const allPosts: Post[] = posts ?? [];

    const stats = {
        total: allPosts.length,
        published: allPosts.filter((p) => p.status === 'Published').length,
        scheduled: allPosts.filter((p) => p.status === 'Scheduled').length,
        draft: allPosts.filter((p) => p.status === 'Draft' || p.status === 'Reviewing' || p.status === 'Approved').length,
    };

    const recentPosts = allPosts.slice(0, 5);

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-gray-400 text-sm mt-1">Generate and manage your LinkedIn content</p>
                </div>
                <Link href="/dashboard/generate" className="btn-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Post
                </Link>
            </div>

            {/* Stats — Clickable Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Total Posts', value: stats.total, icon: '📄', color: 'text-gray-300', href: '/dashboard/posts' },
                    { label: 'Published', value: stats.published, icon: '✅', color: 'text-green-400', href: '/dashboard/posts?filter=published' },
                    { label: 'Scheduled', value: stats.scheduled, icon: '⏰', color: 'text-indigo-400', href: '/dashboard/posts?filter=scheduled' },
                    { label: 'In Progress', value: stats.draft, icon: '✍️', color: 'text-orange-400', href: '/dashboard/posts?filter=in-progress' },
                ].map((stat) => (
                    <Link
                        key={stat.label}
                        href={stat.href}
                        className="glass rounded-xl p-5 transition-all duration-200 hover:scale-[1.03] hover:border-violet-600/50 hover:shadow-lg hover:shadow-violet-900/20 cursor-pointer group"
                    >
                        <div className="text-2xl mb-2">{stat.icon}</div>
                        <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-xs text-gray-500 mt-1 group-hover:text-gray-400 transition-colors">{stat.label}</div>
                    </Link>
                ))}
            </div>

            {/* Recent Posts */}
            <div className="glass rounded-xl">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">Recent Posts</h2>
                    <Link href="/dashboard/posts" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                        View all →
                    </Link>
                </div>
                {recentPosts.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <div className="text-4xl mb-3">🚀</div>
                        <p className="text-gray-400 text-sm">No posts yet. Generate your first post!</p>
                        <Link href="/dashboard/generate" className="btn-primary mt-4 inline-flex">
                            Generate Post
                        </Link>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-800">
                        {recentPosts.map((post) => (
                            <li key={post.id}>
                                <Link
                                    href={`/dashboard/posts/${post.id}`}
                                    className="px-6 py-4 hover:bg-gray-900/40 transition-colors flex items-center justify-between gap-4"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate">{post.topic}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {new Date(post.created_at).toLocaleDateString('en-US', {
                                                month: 'short', day: 'numeric', year: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                    <StatusBadge status={post.status} />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Quick Tips */}
            <div className="mt-6 p-5 rounded-xl bg-violet-950/30 border border-violet-800/30">
                <h3 className="text-sm font-semibold text-violet-300 mb-2">💡 How it works</h3>
                <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Click <strong className="text-gray-300">Generate Post</strong> to start the AI pipeline</li>
                    <li>Pick or type a topic — AI retrieves relevant brand context</li>
                    <li>Review, refine, and approve your draft</li>
                    <li>Publish immediately or schedule for later</li>
                </ol>
            </div>
        </div>
    );
}
