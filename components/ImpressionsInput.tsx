'use client';

import { useState, useEffect, useRef } from 'react';
import type { PostStatus } from '@/lib/types';

interface ImpressionsInputProps {
    postId: string;
    initialValue: number | null;
    publishedAt: string | null;
    status: PostStatus;
    trackingId?: string | null;
}

function getDaysAgo(dateStr: string): number {
    const published = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ImpressionsInput({ postId, initialValue, publishedAt, status, trackingId }: ImpressionsInputProps) {
    const [value, setValue] = useState<string>(initialValue != null ? String(initialValue) : '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setValue(initialValue != null ? String(initialValue) : '');
    }, [initialValue]);

    // Only show for Published posts
    if (status !== 'Published') return null;

    const daysAgo = publishedAt ? getDaysAgo(publishedAt) : 0;
    const isUnlocked = daysAgo >= 7;

    const handleSave = async () => {
        if (!isUnlocked) return;
        const num = value.trim() === '' ? null : parseInt(value, 10);
        if (num !== null && (isNaN(num) || num < 0)) return;

        setSaving(true);
        try {
            const res = await fetch('/api/update-post-impressions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, impressions: num }),
            });
            if (res.ok) {
                setSaved(true);
                if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
                savedTimeoutRef.current = setTimeout(() => setSaved(false), 2000);
            }
        } catch (e) {
            console.error('Failed to save impressions:', e);
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
    };

    const daysRemaining = 7 - daysAgo;

    return (
        <>
            <div className="flex justify-between items-center border-t border-gray-800 pt-3">
                <dt className="text-gray-500 flex items-center gap-1.5">
                    <span className="text-xs">👁️</span>
                    Impressions
                </dt>
                <dd className="flex items-center gap-2">
                    {isUnlocked ? (
                        <>
                            <input
                                type="number"
                                min="0"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                onBlur={handleSave}
                                onKeyDown={handleKeyDown}
                                disabled={saving}
                                placeholder="Enter count"
                                className="w-24 text-right text-gray-300 font-mono text-xs bg-transparent border border-gray-700 rounded-md px-2 py-1 outline-none focus:border-violet-500/50 transition-colors placeholder-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            {saved && (
                                <span className="text-green-400 text-[10px]">✓</span>
                            )}
                        </>
                    ) : (
                        <span className="text-xs text-gray-600 italic">
                            Available in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                        </span>
                    )}
                </dd>
            </div>
            {/* Tracking ID helper */}
            {trackingId && isUnlocked && initialValue == null && (
                <div className="border-t border-gray-800 pt-2 mt-0">
                    <p className="text-[10px] text-gray-600 italic">
                        Find this post on LinkedIn by: <span className="text-gray-400 font-mono font-medium">#{trackingId}</span>
                    </p>
                </div>
            )}
        </>
    );
}
