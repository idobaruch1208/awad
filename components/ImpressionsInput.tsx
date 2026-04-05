'use client';

import { useState, useEffect, useRef } from 'react';

export default function ImpressionsInput({ postId, initialValue }: { postId: string; initialValue: number | null }) {
    const [value, setValue] = useState<string>(initialValue != null ? String(initialValue) : '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Sync if server data changes
    useEffect(() => {
        setValue(initialValue != null ? String(initialValue) : '');
    }, [initialValue]);

    const handleSave = async () => {
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

    return (
        <div className="flex justify-between items-center border-t border-gray-800 pt-3">
            <dt className="text-gray-500 flex items-center gap-1.5">
                <span className="text-xs">👁️</span>
                Impressions
            </dt>
            <dd className="flex items-center gap-2">
                <input
                    type="number"
                    min="0"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    disabled={saving}
                    placeholder="—"
                    className="w-20 text-right text-gray-300 font-mono text-xs bg-transparent border border-gray-700 rounded-md px-2 py-1 outline-none focus:border-violet-500/50 transition-colors placeholder-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                {saved && (
                    <span className="text-green-400 text-[10px]">✓</span>
                )}
            </dd>
        </div>
    );
}
