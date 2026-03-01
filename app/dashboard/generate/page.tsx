'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────────────────────
type Stage = 'topic-select' | 'generating' | 'editing';

interface DraftData {
    postId: string;
    postText: string;
    imageUrl: string | null;
    originalDraft: string;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 4000);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all duration-300 ${type === 'success' ? 'bg-green-900 border border-green-700 text-green-200' : 'bg-red-900 border border-red-700 text-red-200'}`}>
            <span>{type === 'success' ? '✅' : '❌'}</span>
            {message}
            <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
    );
}

// ─── Topic Selection ──────────────────────────────────────────────────────────
function TopicSelectionStage({ onTopicConfirm }: { onTopicConfirm: (topic: string) => void }) {
    const [topics, setTopics] = useState<string[]>([]);
    const [loadingTopics, setLoadingTopics] = useState(true);
    const [customTopic, setCustomTopic] = useState('');
    const [selected, setSelected] = useState<string | null>(null);
    const [isRtl, setIsRtl] = useState(false);

    useEffect(() => {
        const lang = document.cookie.split('; ').find(c => c.startsWith('post_language='))?.split('=')[1] || 'en';
        setIsRtl(lang === 'he');
        fetch('/api/generate-topic-ideas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: lang }) })
            .then((r) => r.json())
            .then((d) => setTopics(d.topics ?? []))
            .catch(() => setTopics([]))
            .finally(() => setLoadingTopics(false));
    }, []);

    const handleConfirm = () => {
        const topic = customTopic.trim() || selected;
        if (topic) onTopicConfirm(topic);
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-1">What should we write about?</h1>
                <p className="text-gray-400 text-sm">Pick an AI suggestion or type your own topic / paste a URL.</p>
            </div>

            {/* AI Topic Chips */}
            <div className="mb-6">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">AI Suggestions</p>
                {loadingTopics ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="shimmer h-14 rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {topics.map((topic) => (
                            <button
                                key={topic}
                                onClick={() => { setSelected(topic); setCustomTopic(''); }}
                                dir={isRtl ? 'rtl' : 'ltr'}
                                className={`${isRtl ? 'text-right' : 'text-left'} px-4 py-3 rounded-xl border text-sm transition-all duration-200 ${selected === topic ? 'border-violet-500 bg-violet-600/20 text-violet-200' : 'border-gray-700 bg-gray-900/60 text-gray-300 hover:border-gray-500 hover:bg-gray-800/60'}`}
                            >
                                {topic}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Custom Input */}
            <div className="mb-8">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Or enter your own</p>
                <input
                    className="input-field"
                    placeholder="Paste a URL or type a custom topic..."
                    value={customTopic}
                    onChange={(e) => { setCustomTopic(e.target.value); setSelected(null); }}
                />
            </div>

            <button
                className="btn-primary w-full justify-center py-3.5 text-base"
                disabled={!selected && !customTopic.trim()}
                onClick={handleConfirm}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Post
            </button>
        </div>
    );
}

// ─── Generating Skeleton ──────────────────────────────────────────────────────
function GeneratingStage() {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-violet-900/40 border border-violet-700/50 text-violet-300 text-sm font-medium mb-4">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Building your post...
                </div>
                <p className="text-gray-400 text-sm">Retrieving brand context and generating your content</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass rounded-2xl p-6 space-y-3">
                    <div className="shimmer h-4 rounded w-1/3" />
                    <div className="shimmer h-4 rounded w-full" />
                    <div className="shimmer h-4 rounded w-5/6" />
                    <div className="shimmer h-4 rounded w-full" />
                    <div className="shimmer h-4 rounded w-4/5" />
                    <div className="shimmer h-4 rounded w-full" />
                    <div className="shimmer h-4 rounded w-2/3" />
                </div>
                <div className="glass rounded-2xl p-6">
                    <div className="shimmer h-full min-h-[250px] rounded-xl" />
                </div>
            </div>
        </div>
    );
}

// ─── Post Editor ──────────────────────────────────────────────────────────────
function PostEditorStage({
    draft,
    onToast,
}: {
    draft: DraftData;
    onToast: (msg: string, type: 'success' | 'error') => void;
}) {
    const router = useRouter();
    const [text, setText] = useState(draft.postText);
    const [imageUrl, setImageUrl] = useState(draft.imageUrl);
    const [refineInstruction, setRefineInstruction] = useState('');
    const [refining, setRefining] = useState(false);
    const [regeneratingImg, setRegeneratingImg] = useState(false);
    const [approving, setApproving] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [scheduling, setScheduling] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('10:00');
    const charCount = text.length;
    const charLimit = 3000;

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
            if (data.refinedText) { setText(data.refinedText); setRefineInstruction(''); }
            else onToast(data.error ?? 'Refinement failed', 'error');
        } catch { onToast('Network error', 'error'); }
        finally { setRefining(false); }
    };

    const handleRegenerateImage = async () => {
        setRegeneratingImg(true);
        try {
            const res = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: draft.postText.slice(0, 200) }),
            });
            const data = await res.json() as { imageUrl?: string };
            if (data.imageUrl) setImageUrl(data.imageUrl);
            else onToast('Image generation failed', 'error');
        } catch { onToast('Network error', 'error'); }
        finally { setRegeneratingImg(false); }
    };

    const [styleLessons, setStyleLessons] = useState<string[]>([]);

    const handleApprove = async () => {
        setApproving(true);
        try {
            const res = await fetch('/api/approve-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: draft.postId, originalDraft: draft.originalDraft, finalText: text }),
            });
            const data = await res.json() as { success?: boolean; styleLessons?: string[]; error?: string };
            if (data.success) {
                setStyleLessons(data.styleLessons ?? []);
                setShowPublishModal(true);
            }
            else onToast(data.error ?? 'Approval failed', 'error');
        } catch { onToast('Network error', 'error'); }
        finally { setApproving(false); }
    };

    const handlePublishNow = async () => {
        setPublishing(true);
        try {
            const res = await fetch('/api/publish-to-linkedin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: draft.postId }),
            });
            const data = await res.json() as { success?: boolean; error?: string };
            if (data.success) {
                onToast('Post published to LinkedIn! 🎉', 'success');
                setTimeout(() => router.push('/dashboard/posts'), 1500);
            } else {
                onToast(data.error ?? 'Publish failed', 'error');
                setShowPublishModal(false);
            }
        } catch { onToast('Network error', 'error'); }
        finally { setPublishing(false); }
    };

    const handleSchedule = async () => {
        if (!scheduleDate) { onToast('Please select a date', 'error'); return; }
        setScheduling(true);
        const targetTimestamp = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
        try {
            const res = await fetch('/api/schedule-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: draft.postId, targetTimestamp }),
            });
            const data = await res.json() as { success?: boolean; error?: string };
            if (data.success) {
                onToast(`Post scheduled for ${scheduleDate} at ${scheduleTime} ⏰`, 'success');
                setTimeout(() => router.push('/dashboard/posts'), 1500);
            } else onToast(data.error ?? 'Scheduling failed', 'error');
        } catch { onToast('Network error', 'error'); }
        finally { setScheduling(false); }
    };

    const handleSaveOnly = () => {
        onToast('Post saved as approved ✅', 'success');
        setTimeout(() => router.push('/dashboard/posts'), 1000);
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Review & Refine</h1>
                <button
                    onClick={handleApprove}
                    disabled={approving || charCount > charLimit}
                    className="btn-primary px-6 py-2.5"
                >
                    {approving ? (
                        <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Approving...</>
                    ) : '✓ Approve Post'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Text Editor */}
                <div className="space-y-4">
                    <div className="glass rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-gray-300">Post Content</label>
                            <span className={`text-xs font-mono ${charCount > charLimit ? 'text-red-400' : charCount > charLimit * 0.9 ? 'text-orange-400' : 'text-gray-500'}`}>
                                {charCount} / {charLimit}
                            </span>
                        </div>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            dir="auto"
                            className="input-field resize-none font-mono text-xs leading-relaxed"
                            rows={16}
                        />
                    </div>

                    {/* Refine with AI */}
                    <div className="glass rounded-2xl p-5">
                        <label className="text-sm font-medium text-gray-300 block mb-3">✨ Refine with AI</label>
                        <div className="flex gap-2">
                            <input
                                className="input-field flex-1"
                                placeholder='e.g. "Make it shorter", "Add more hashtags"'
                                value={refineInstruction}
                                onChange={(e) => setRefineInstruction(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                            />
                            <button
                                onClick={handleRefine}
                                disabled={refining || !refineInstruction.trim()}
                                className="btn-secondary px-4 flex-shrink-0"
                            >
                                {refining ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : 'Apply'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Image Panel */}
                <div className="glass rounded-2xl p-5 flex flex-col">
                    <label className="text-sm font-medium text-gray-300 block mb-3">Generated Image</label>
                    <div className="flex-1 rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center min-h-[300px] relative">
                        {regeneratingImg && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80 z-10 rounded-xl">
                                <svg className="w-8 h-8 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                        )}
                        {imageUrl ? (
                            <img src={imageUrl} alt="Generated post image" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-center text-gray-600">
                                <div className="text-4xl mb-2">🖼️</div>
                                <p className="text-xs">No image generated</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleRegenerateImage}
                        disabled={regeneratingImg}
                        className="btn-secondary mt-4 justify-center"
                    >
                        🔄 Regenerate Image
                    </button>
                </div>
            </div>

            {/* Publish Modal */}
            {showPublishModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-white mb-2">Post Approved! 🎉</h2>

                        {/* AI Learnings */}
                        {styleLessons.length > 0 && (
                            <div className="mb-6 rounded-xl bg-emerald-950/30 border border-emerald-800/50 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">🧠</span>
                                    <h3 className="text-sm font-semibold text-emerald-300">What I learned from your edits</h3>
                                </div>
                                <ul className="space-y-2">
                                    {styleLessons.map((lesson, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-emerald-200/80">
                                            <span className="text-emerald-400 mt-0.5 flex-shrink-0">→</span>
                                            {lesson}
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-xs text-emerald-600 mt-3">These insights will be applied to future posts</p>
                            </div>
                        )}

                        <p className="text-gray-400 text-sm mb-6">What would you like to do with this post?</p>

                        <div className="space-y-4">
                            <button
                                onClick={handlePublishNow}
                                disabled={publishing}
                                className="btn-primary w-full justify-center py-3.5 text-base"
                            >
                                {publishing ? 'Publishing...' : '🚀 Publish Now to LinkedIn'}
                            </button>

                            <div className="relative flex items-center gap-3">
                                <hr className="flex-1 border-gray-700" />
                                <span className="text-xs text-gray-500">or</span>
                                <hr className="flex-1 border-gray-700" />
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm font-medium text-gray-300">⏰ Schedule for Later</p>
                                <div className="flex gap-3">
                                    <input
                                        type="date"
                                        className="input-field flex-1"
                                        value={scheduleDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setScheduleDate(e.target.value)}
                                    />
                                    <input
                                        type="time"
                                        className="input-field w-28"
                                        value={scheduleTime}
                                        onChange={(e) => setScheduleTime(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleSchedule}
                                    disabled={scheduling || !scheduleDate}
                                    className="btn-secondary w-full justify-center py-3"
                                >
                                    {scheduling ? 'Scheduling...' : 'Schedule Post'}
                                </button>
                            </div>

                            <div className="relative flex items-center gap-3">
                                <hr className="flex-1 border-gray-700" />
                                <span className="text-xs text-gray-500">or</span>
                                <hr className="flex-1 border-gray-700" />
                            </div>

                            <button
                                onClick={handleSaveOnly}
                                className="btn-secondary w-full justify-center py-3"
                            >
                                💾 Save Without Publishing
                            </button>

                            <button
                                onClick={() => setShowPublishModal(false)}
                                className="w-full text-center text-xs text-gray-500 hover:text-gray-400 mt-2 py-1"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Generate Page ───────────────────────────────────────────────────────
export default function GeneratePage() {
    const [stage, setStage] = useState<Stage>('topic-select');
    const [draft, setDraft] = useState<DraftData | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleTopicConfirm = async (topic: string) => {
        setStage('generating');
        try {
            const projectId = document.cookie.split('; ').find(c => c.startsWith('active_project_id='))?.split('=')[1] || '';
            const lang = document.cookie.split('; ').find(c => c.startsWith('post_language='))?.split('=')[1] || 'en';
            const res = await fetch('/api/generate-draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, projectId, language: lang }),
            });
            const data = await res.json() as DraftData & { error?: string };
            if (data.error) {
                setToast({ message: data.error, type: 'error' });
                setStage('topic-select');
            } else {
                setDraft(data);
                setStage('editing');
            }
        } catch {
            setToast({ message: 'Failed to generate draft. Please try again.', type: 'error' });
            setStage('topic-select');
        }
    };

    return (
        <div className="p-4 sm:p-8 pt-16 md:pt-8 min-h-full">
            {stage === 'topic-select' && <TopicSelectionStage onTopicConfirm={handleTopicConfirm} />}
            {stage === 'generating' && <GeneratingStage />}
            {stage === 'editing' && draft && (
                <PostEditorStage draft={draft} onToast={(msg, type) => setToast({ message: msg, type })} />
            )}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
