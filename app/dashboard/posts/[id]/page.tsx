import { createClient } from '@/lib/supabase/server';
import StatusSelector from '@/components/StatusSelector';
import EditablePostContent from '@/components/EditablePostContent';
import ImpressionsInput from '@/components/ImpressionsInput';
import Link from 'next/link';
import type { Post } from '@/lib/types';
import { format } from 'date-fns';
import { notFound } from 'next/navigation';

export default async function PostDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !post) {
        notFound();
    }

    const typedPost = post as Post;

    // Truncate topic if it's too long (e.g. pasted source text)
    const displayTopic = typedPost.topic.length > 120
        ? typedPost.topic.slice(0, 120) + '...'
        : typedPost.topic;

    return (
        <div className="p-4 sm:p-8 pt-16 md:pt-8 max-w-4xl mx-auto">
            {/* Back Navigation */}
            <Link
                href="/dashboard/posts"
                className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-400 transition-colors mb-6"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Posts
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-8">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-white mb-2" dir="auto">{displayTopic}</h1>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Created {format(new Date(typedPost.created_at), 'MMM d, yyyy · h:mm a')}</span>
                        {typedPost.updated_at !== typedPost.created_at && (
                            <span>· Updated {format(new Date(typedPost.updated_at), 'MMM d, yyyy · h:mm a')}</span>
                        )}
                    </div>
                </div>
                <StatusSelector postId={typedPost.id} initialStatus={typedPost.status} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Post Content — Main Area (editable for Draft/Reviewing/Approved) */}
                <div className="lg:col-span-2 space-y-6">
                    <EditablePostContent
                        postId={typedPost.id}
                        initialText={typedPost.final_text ?? ''}
                        status={typedPost.status}
                    />

                    {/* Original Draft (if different from final) */}
                    {typedPost.original_draft && typedPost.original_draft !== typedPost.final_text && (
                        <details className="glass rounded-2xl p-6 group">
                            <summary className="text-sm font-semibold text-gray-400 cursor-pointer hover:text-gray-300 transition-colors flex items-center gap-2">
                                <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                Original Draft
                            </summary>
                            <div className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap mt-4 pt-4 border-t border-gray-800">
                                {typedPost.original_draft}
                            </div>
                        </details>
                    )}
                </div>

                {/* Sidebar — Image & Metadata */}
                <div className="space-y-6">
                    {/* Image */}
                    {typedPost.image_url && (
                        <div className="glass rounded-2xl p-4">
                            <h3 className="text-sm font-semibold text-gray-300 mb-3">Image</h3>
                            <div className="rounded-xl overflow-hidden bg-gray-900">
                                <img
                                    src={typedPost.image_url}
                                    alt={`Image for: ${typedPost.topic}`}
                                    className="w-full h-auto object-cover"
                                />
                            </div>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="glass rounded-2xl p-5">
                        <h3 className="text-sm font-semibold text-gray-300 mb-4">Details</h3>
                        <dl className="space-y-3 text-xs">
                            <div className="flex justify-between items-center">
                                <dt className="text-gray-500">Status</dt>
                                <dd><StatusSelector postId={typedPost.id} initialStatus={typedPost.status} /></dd>
                            </div>
                            <div className="flex justify-between border-t border-gray-800 pt-3">
                                <dt className="text-gray-500">Created</dt>
                                <dd className="text-gray-300">{format(new Date(typedPost.created_at), 'MMM d, yyyy')}</dd>
                            </div>
                            {typedPost.published_at && (
                                <div className="flex justify-between border-t border-gray-800 pt-3">
                                    <dt className="text-gray-500">Published</dt>
                                    <dd className="text-gray-300">{format(new Date(typedPost.published_at), 'MMM d, yyyy · h:mm a')}</dd>
                                </div>
                            )}
                            {typedPost.status === 'Scheduled' && typedPost.target_timestamp && (
                                <div className="flex justify-between border-t border-gray-800 pt-3">
                                    <dt className="text-gray-500">Scheduled for</dt>
                                    <dd className="text-indigo-400">{format(new Date(typedPost.target_timestamp), 'MMM d, yyyy · h:mm a')}</dd>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-gray-800 pt-3">
                                <dt className="text-gray-500">Characters</dt>
                                <dd className="text-gray-300 font-mono">{typedPost.final_text?.length ?? 0}</dd>
                            </div>
                            {typedPost.linkedin_post_id && (
                                <div className="flex justify-between border-t border-gray-800 pt-3">
                                    <dt className="text-gray-500">LinkedIn ID</dt>
                                    <dd className="text-gray-300 font-mono text-[10px]">{typedPost.linkedin_post_id}</dd>
                                </div>
                            )}
                            <ImpressionsInput postId={typedPost.id} initialValue={typedPost.impressions ?? null} />
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
}
