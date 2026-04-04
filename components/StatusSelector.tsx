'use client';

import { useState, useEffect } from 'react';
import type { PostStatus } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { statusConfig } from './StatusBadge';

const LEARNING_STATUSES: PostStatus[] = ['Approved', 'Scheduled', 'Published'];

export default function StatusSelector({ postId, initialStatus }: { postId: string; initialStatus: PostStatus }) {
    const [status, setStatus] = useState<PostStatus>(initialStatus);
    const [isUpdating, setIsUpdating] = useState(false);
    const [learningInsights, setLearningInsights] = useState<string[] | null>(null);
    const [showInsights, setShowInsights] = useState(false);
    const router = useRouter();

    // Sync state if server data changes (e.g., from another selector via router.refresh)
    useEffect(() => {
        setStatus(initialStatus);
    }, [initialStatus]);

    // Auto-dismiss insights toast after 12 seconds
    useEffect(() => {
        if (showInsights) {
            const timer = setTimeout(() => setShowInsights(false), 12000);
            return () => clearTimeout(timer);
        }
    }, [showInsights]);

    const handleStatusChange = async (newStatus: PostStatus) => {
        setIsUpdating(true);
        setStatus(newStatus); // optimistic update
        setLearningInsights(null);
        setShowInsights(false);

        try {
            const res = await fetch('/api/update-post-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, status: newStatus }),
            });

            if (!res.ok) throw new Error('Failed to update status');

            const data = await res.json() as { success: boolean; learnings?: string[] | null };

            // Show learning insights if the AI extracted them
            if (data.learnings && data.learnings.length > 0) {
                setLearningInsights(data.learnings);
                setShowInsights(true);
            }

            router.refresh();
        } catch (error) {
            console.error('Status update failed:', error);
            setStatus(initialStatus); // revert on failure
        } finally {
            setIsUpdating(false);
        }
    };

    const config = statusConfig[status];

    return (
        <div className="relative inline-block group">
            <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as PostStatus)}
                disabled={isUpdating}
                className={`appearance-none outline-none cursor-pointer inline-flex items-center pl-2.5 pr-6 py-0.5 rounded-full text-xs font-medium ${config.className} ${isUpdating ? 'opacity-50' : 'hover:opacity-80 transition-opacity'}`}
                title="Change status"
            >
                <option value="Draft">Draft</option>
                <option value="Reviewing">Reviewing</option>
                <option value="Approved">Approved</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Published">Published</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5 opacity-60 group-hover:opacity-100">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {/* Learning Insights Toast */}
            {showInsights && learningInsights && learningInsights.length > 0 && (
                <div className="absolute top-full right-0 mt-3 w-80 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="glass rounded-xl border border-violet-500/30 p-4 shadow-2xl shadow-violet-900/20">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-violet-400 text-sm">🧠</span>
                                <h4 className="text-xs font-semibold text-violet-300">AI Learned from Your Edits</h4>
                            </div>
                            <button
                                onClick={() => setShowInsights(false)}
                                className="text-gray-500 hover:text-gray-300 transition-colors p-0.5"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <ul className="space-y-1.5">
                            {learningInsights.map((insight, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                                    <span className="text-violet-400 mt-0.5 flex-shrink-0">•</span>
                                    <span>{insight}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-[10px] text-gray-600 mt-2.5 border-t border-gray-800 pt-2">
                            These insights will be applied to future AI-generated posts.
                        </p>
                    </div>
                </div>
            )}

            {/* "Analyzing your edits..." loading indicator */}
            {isUpdating && LEARNING_STATUSES.includes(status) && (
                <div className="absolute top-full right-0 mt-3 w-64 z-50">
                    <div className="glass rounded-xl border border-gray-700/50 p-3 shadow-lg">
                        <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-xs text-gray-400">Analyzing your edits...</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
