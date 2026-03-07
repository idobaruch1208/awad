'use client';

import { useState } from 'react';
import type { PostStatus } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { statusConfig } from './StatusBadge';

export default function StatusSelector({ postId, initialStatus }: { postId: string; initialStatus: PostStatus }) {
    const [status, setStatus] = useState<PostStatus>(initialStatus);
    const [isUpdating, setIsUpdating] = useState(false);
    const router = useRouter();

    const handleStatusChange = async (newStatus: PostStatus) => {
        setIsUpdating(true);
        setStatus(newStatus); // optimistic update

        try {
            const res = await fetch('/api/update-post-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, status: newStatus }),
            });

            if (!res.ok) throw new Error('Failed to update status');

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
        </div>
    );
}
