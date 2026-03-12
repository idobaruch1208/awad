'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CopyButton from './CopyButton';
import type { PostStatus } from '@/lib/types';

interface EditablePostContentProps {
    postId: string;
    initialText: string;
    status: PostStatus;
}

const EDITABLE_STATUSES: PostStatus[] = ['Draft', 'Reviewing', 'Approved'];

function detectLanguage(text: string): 'he' | 'en' {
    // Simple heuristic: if more than 30% of chars are Hebrew, it's Hebrew
    const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
    return hebrewChars / text.length > 0.15 ? 'he' : 'en';
}

export default function EditablePostContent({ postId, initialText, status }: EditablePostContentProps) {
    const [text, setText] = useState(initialText);
    const [savedText, setSavedText] = useState(initialText);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [refineInstruction, setRefineInstruction] = useState('');
    const [refining, setRefining] = useState(false);
    const [translating, setTranslating] = useState(false);
    const router = useRouter();

    const isEditable = EDITABLE_STATUSES.includes(status);
    const hasUnsavedChanges = text !== savedText;
    const charCount = text.length;

    const currentLang = detectLanguage(text);
    const targetLang = currentLang === 'he' ? 'English' : 'Hebrew (עברית)';

    // Sync if server data changes
    useEffect(() => {
        setText(initialText);
        setSavedText(initialText);
    }, [initialText]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/update-post-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, finalText: text }),
            });
            if (!res.ok) throw new Error('Failed to save');
            setSavedText(text);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            router.refresh();
        } catch (error) {
            console.error('Save failed:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleRefine = async () => {
        if (!refineInstruction.trim()) return;
        setRefining(true);
        try {
            const res = await fetch('/api/refine-draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentText: text, instruction: refineInstruction }),
            });
            const data = await res.json() as { refinedText?: string; error?: string };
            if (data.refinedText) {
                setText(data.refinedText);
                setRefineInstruction('');
            }
        } catch (error) {
            console.error('Refine failed:', error);
        } finally {
            setRefining(false);
        }
    };

    const handleTranslate = async () => {
        if (!text.trim()) return;
        setTranslating(true);
        const targetCode = currentLang === 'he' ? 'English' : 'Hebrew';
        try {
            const res = await fetch('/api/refine-draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentText: text,
                    instruction: `Translate this entire post to ${targetCode}. Keep the exact same structure, formatting, emojis, and hashtags but translate all the text content. Do not change the meaning or tone. Return ONLY the translated post.`,
                }),
            });
            const data = await res.json() as { refinedText?: string; error?: string };
            if (data.refinedText) {
                setText(data.refinedText);
            }
        } catch (error) {
            console.error('Translation failed:', error);
        } finally {
            setTranslating(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Post Content Card */}
            <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-300">Post Content</h2>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 font-mono">{charCount} characters</span>
                        {text && <CopyButton text={text} />}
                        {isEditable && hasUnsavedChanges && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors focus:outline-none disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Saving...
                                    </>
                                ) : 'Save'}
                            </button>
                        )}
                        {saved && (
                            <span className="text-xs text-green-400 font-medium">✓ Saved</span>
                        )}
                    </div>
                </div>

                {isEditable ? (
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        dir="auto"
                        className="w-full bg-transparent text-gray-200 text-sm leading-relaxed resize-none outline-none border border-gray-700 rounded-xl p-4 focus:border-violet-500/50 transition-colors min-h-[300px]"
                        rows={16}
                    />
                ) : (
                    text ? (
                        <div dir="auto" className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                            {text}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm italic">No content yet</p>
                    )
                )}
            </div>

            {/* Action buttons — only for editable statuses */}
            {isEditable && text && (
                <div className="space-y-4">
                    {/* Translate Button */}
                    <button
                        onClick={handleTranslate}
                        disabled={translating || !text.trim()}
                        className="w-full glass rounded-2xl p-4 flex items-center justify-center gap-2 text-sm font-medium text-gray-300 hover:text-violet-300 hover:border-violet-600/30 transition-all disabled:opacity-50 cursor-pointer"
                    >
                        {translating ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Translating...
                            </>
                        ) : (
                            <>
                                🔄 Translate to {targetLang}
                            </>
                        )}
                    </button>

                    {/* Refine with AI */}
                    <div className="glass rounded-2xl p-5">
                        <label className="text-sm font-medium text-gray-300 block mb-3">✨ Refine with AI</label>
                        <div className="flex gap-2">
                            <textarea
                                className="input-field flex-1 resize-none overflow-hidden"
                                placeholder='e.g. "Make it shorter", "Add more hashtags", "Change the tone"'
                                value={refineInstruction}
                                rows={1}
                                onChange={(e) => {
                                    setRefineInstruction(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (refineInstruction.trim()) handleRefine();
                                    }
                                }}
                            />
                            <button
                                onClick={handleRefine}
                                disabled={refining || !refineInstruction.trim()}
                                className="btn-secondary px-4 flex-shrink-0 self-end"
                            >
                                {refining ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : 'Apply'}
                            </button>
                        </div>
                        {refining && (
                            <p className="text-xs text-violet-400 mt-2 animate-pulse">AI is refining your post...</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
