'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CopyButton from './CopyButton';
import type { PostStatus } from '@/lib/types';
import { useUndoRedo } from '@/hooks/useUndoRedo';

interface EditablePostContentProps {
    postId: string;
    initialText: string;
    status: PostStatus;
}

const EDITABLE_STATUSES: PostStatus[] = ['Draft', 'Reviewing', 'Approved'];

function detectLanguage(text: string): 'he' | 'en' {
    const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
    return hebrewChars / text.length > 0.15 ? 'he' : 'en';
}

export default function EditablePostContent({ postId, initialText, status }: EditablePostContentProps) {
    const {
        text,
        handleChange,
        snapshotBeforeAI,
        setTextDirect,
        undo,
        redo,
        handleKeyDown,
        canUndo,
        canRedo,
        resetWith,
    } = useUndoRedo(initialText);

    const [savedText, setSavedText] = useState(initialText);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [refineInstruction, setRefineInstruction] = useState('');
    const [refining, setRefining] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [useProModel, setUseProModel] = useState(false);

    const router = useRouter();

    const isEditable = EDITABLE_STATUSES.includes(status);
    const hasUnsavedChanges = text !== savedText;
    const charCount = text.length;

    const currentLang = detectLanguage(text);
    const targetLang = currentLang === 'he' ? 'English' : 'Hebrew (עברית)';

    // Sync if server data changes
    useEffect(() => {
        resetWith(initialText);
        setSavedText(initialText);
    }, [initialText, resetWith]);

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
            snapshotBeforeAI();
            const res = await fetch('/api/refine-draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentText: text, instruction: refineInstruction, useProModel }),
            });
            const data = await res.json() as { refinedText?: string; error?: string };
            if (data.refinedText) {
                setTextDirect(data.refinedText);
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
            snapshotBeforeAI();
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
                setTextDirect(data.refinedText);
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
                    <div className="flex items-center gap-2">
                        <button
                            onClick={undo}
                            disabled={!canUndo}
                            title="Undo (Ctrl+Z)"
                            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex items-center gap-1 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            Undo
                        </button>
                        <button
                            onClick={redo}
                            disabled={!canRedo}
                            title="Redo (Ctrl+Y)"
                            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex items-center gap-1 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Redo
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                            </svg>
                        </button>
                        <div className="h-4 w-px bg-gray-800 hidden sm:block"></div>
                        {text && <CopyButton text={text} />}
                        <span className="text-xs text-gray-500 font-mono">{charCount} characters</span>
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
                        onChange={(e) => handleChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        dir="auto"
                        className="w-full bg-transparent text-gray-200 text-sm leading-relaxed resize-none outline-none border border-gray-700 rounded-xl p-4 focus:border-violet-500/50 transition-colors min-h-[300px]" style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}
                        rows={16}
                    />
                ) : (
                    text ? (
                        <div dir="auto" className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
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
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-gray-300">✨ Refine with AI</label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <span className={`text-xs font-medium transition-colors ${useProModel ? 'text-amber-400' : 'text-gray-500'}`}>
                                    {useProModel ? '⚡ Deep Refine (Pro AI)' : 'Standard'}
                                </span>
                                <div
                                    onClick={() => setUseProModel(!useProModel)}
                                    className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                                        useProModel
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                            : 'bg-gray-700'
                                    }`}
                                >
                                    <div
                                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                                            useProModel ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                    />
                                </div>
                            </label>
                        </div>
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
                                className={`px-4 flex-shrink-0 self-end rounded-lg text-sm font-medium transition-all ${
                                    useProModel
                                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-900/20'
                                        : 'btn-secondary'
                                } disabled:opacity-50`}
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
                            <p className={`text-xs mt-2 animate-pulse ${useProModel ? 'text-amber-400' : 'text-violet-400'}`}>
                                {useProModel ? 'Pro AI is deeply refining your post...' : 'AI is refining your post...'}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
