'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExamplePostSlot {
    text: string;
    source?: string;
}

interface BrandInfo {
    companyName: string;
    industry: string;
    targetAudience: string;
    contentGoals: string;
    brandVoice: string;
}

interface AiAnalysis {
    tone?: string;
    themes?: string[];
    structure_patterns?: string[];
    avg_length?: string;
    emoji_usage?: string;
    hashtag_style?: string;
    call_to_action_style?: string;
    strengths?: string[];
    recommendations?: string[];
    writing_rules?: string[];
}

type Step = 'brand' | 'posts' | 'review';

const STEPS: { key: Step; label: string; icon: string }[] = [
    { key: 'brand', label: 'About Your Brand', icon: '🏢' },
    { key: 'posts', label: 'Example Posts', icon: '📝' },
    { key: 'review', label: 'Review & Analyze', icon: '✨' },
];

const INDUSTRY_SUGGESTIONS = [
    'Startup Law', 'Legal Tech', 'SaaS', 'Fintech', 'E-commerce',
    'Health Tech', 'Cybersecurity', 'AI/ML', 'Real Estate', 'Marketing',
    'Consulting', 'Education', 'Other',
];

const GOAL_OPTIONS = [
    'Thought leadership', 'Lead generation', 'Brand awareness',
    'Community building', 'Product promotion', 'Recruitment',
];

const VOICE_OPTIONS = [
    { label: 'Professional & Authoritative', emoji: '👔' },
    { label: 'Casual & Friendly', emoji: '😊' },
    { label: 'Bold & Provocative', emoji: '🔥' },
    { label: 'Educational & Informative', emoji: '📚' },
    { label: 'Inspirational & Motivational', emoji: '💡' },
    { label: 'Data-Driven & Analytical', emoji: '📊' },
];

// ─── Step 1: Brand Info ──────────────────────────────────────────────────────

function BrandStep({
    info,
    onChange,
    onNext,
}: {
    info: BrandInfo;
    onChange: (field: keyof BrandInfo, value: string) => void;
    onNext: () => void;
}) {
    const canProceed = info.companyName.trim().length > 0;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="mb-2">
                <h2 className="text-xl font-bold text-white mb-1">Tell us about your brand</h2>
                <p className="text-gray-400 text-sm">This helps the AI tailor every post to your unique voice and audience.</p>
            </div>

            {/* Company Name */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Company / Brand Name <span className="text-red-400">*</span>
                </label>
                <input
                    className="input-field"
                    placeholder="e.g. AWAD, Acme Corp"
                    value={info.companyName}
                    onChange={(e) => onChange('companyName', e.target.value)}
                />
            </div>

            {/* Industry */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Industry</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {INDUSTRY_SUGGESTIONS.map((ind) => (
                        <button
                            key={ind}
                            type="button"
                            onClick={() => onChange('industry', ind)}
                            className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-200 ${
                                info.industry === ind
                                    ? 'border-violet-500 bg-violet-600/20 text-violet-200'
                                    : 'border-gray-700 bg-gray-900/60 text-gray-400 hover:border-gray-500'
                            }`}
                        >
                            {ind}
                        </button>
                    ))}
                </div>
                <input
                    className="input-field"
                    placeholder="Or type your own..."
                    value={info.industry}
                    onChange={(e) => onChange('industry', e.target.value)}
                />
            </div>

            {/* Target Audience */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Target Audience</label>
                <input
                    className="input-field"
                    placeholder="e.g. Startup founders, VCs, CTOs, developers"
                    value={info.targetAudience}
                    onChange={(e) => onChange('targetAudience', e.target.value)}
                />
            </div>

            {/* Content Goals */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Content Goals</label>
                <div className="flex flex-wrap gap-2">
                    {GOAL_OPTIONS.map((goal) => {
                        const isSelected = info.contentGoals.split(', ').includes(goal);
                        return (
                            <button
                                key={goal}
                                type="button"
                                onClick={() => {
                                    const goals = info.contentGoals.split(', ').filter(Boolean);
                                    const updated = isSelected
                                        ? goals.filter((g) => g !== goal)
                                        : [...goals, goal];
                                    onChange('contentGoals', updated.join(', '));
                                }}
                                className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-200 ${
                                    isSelected
                                        ? 'border-violet-500 bg-violet-600/20 text-violet-200'
                                        : 'border-gray-700 bg-gray-900/60 text-gray-400 hover:border-gray-500'
                                }`}
                            >
                                {goal}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Brand Voice */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Brand Voice / Tone</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {VOICE_OPTIONS.map((voice) => (
                        <button
                            key={voice.label}
                            type="button"
                            onClick={() => onChange('brandVoice', voice.label)}
                            className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-xl border transition-all duration-200 ${
                                info.brandVoice === voice.label
                                    ? 'border-violet-500 bg-violet-600/20 text-violet-200'
                                    : 'border-gray-700 bg-gray-900/60 text-gray-400 hover:border-gray-500'
                            }`}
                        >
                            <span className="text-lg">{voice.emoji}</span>
                            <span className="text-xs">{voice.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={onNext}
                disabled={!canProceed}
                className="btn-primary w-full justify-center py-3.5 text-base mt-4"
            >
                Next — Add Example Posts
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </div>
    );
}

// ─── Step 2: Example Posts ───────────────────────────────────────────────────

function ExamplePostsStep({
    posts,
    onPostsChange,
    onNext,
    onBack,
}: {
    posts: ExamplePostSlot[];
    onPostsChange: (posts: ExamplePostSlot[]) => void;
    onNext: () => void;
    onBack: () => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const filledCount = posts.filter((p) => p.text.trim().length > 0).length;
    const canProceed = filledCount >= 2;

    const updatePost = (index: number, text: string) => {
        const updated = [...posts];
        updated[index] = { ...updated[index], text };
        onPostsChange(updated);
    };

    const addSlot = () => {
        if (posts.length < 8) {
            onPostsChange([...posts, { text: '' }]);
        }
    };

    const removeSlot = (index: number) => {
        if (posts.length > 2) {
            onPostsChange(posts.filter((_, i) => i !== index));
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const text = await file.text();
        let parsedPosts: string[] = [];

        if (file.name.endsWith('.csv')) {
            // Try to parse CSV — assume posts are in rows (one per row)
            // Handle quoted multi-line posts
            parsedPosts = parseCSVPosts(text);
        } else {
            // Plain text: split by double newline or "---" separator
            parsedPosts = text
                .split(/\n{3,}|---+/)
                .map((p) => p.trim())
                .filter((p) => p.length > 20);
        }

        if (parsedPosts.length === 0) {
            alert('No posts found in the uploaded file. Please ensure posts are separated by blank lines or "---".');
            return;
        }

        // Take up to 8 posts
        const newPosts: ExamplePostSlot[] = parsedPosts.slice(0, 8).map((p) => ({
            text: p,
            source: file.name,
        }));

        // Pad to minimum 2
        while (newPosts.length < 2) {
            newPosts.push({ text: '' });
        }

        onPostsChange(newPosts);

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-400 transition-colors"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </button>

            <div className="mb-2">
                <h2 className="text-xl font-bold text-white mb-1">Share your past posts</h2>
                <p className="text-gray-400 text-sm">
                    Paste 2–8 LinkedIn posts you&apos;ve published before. The AI will analyze your writing style,
                    themes, and patterns to tailor future content.
                </p>
            </div>

            {/* File Upload */}
            <div className="glass rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-300">📁 Import from file</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Upload a .txt or .csv file with past posts (separated by blank lines or one per row)
                        </p>
                    </div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-secondary px-4 py-2 text-xs flex-shrink-0"
                    >
                        Choose File
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.csv"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                </div>
            </div>

            {/* Post Slots */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Posts ({filledCount}/8 filled)
                    </p>
                    {posts.length < 8 && (
                        <button
                            onClick={addSlot}
                            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                        >
                            + Add another post
                        </button>
                    )}
                </div>

                {posts.map((post, index) => (
                    <div key={index} className="glass rounded-xl p-4 relative group">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-gray-400">
                                Post {index + 1}
                                {post.source && (
                                    <span className="ml-2 text-violet-400/60">from {post.source}</span>
                                )}
                            </label>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-600">{post.text.length} chars</span>
                                {posts.length > 2 && (
                                    <button
                                        onClick={() => removeSlot(index)}
                                        className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                        <textarea
                            className="input-field resize-none text-sm leading-relaxed"
                            placeholder="Paste a LinkedIn post here..."
                            dir="auto"
                            rows={4}
                            value={post.text}
                            onChange={(e) => updatePost(index, e.target.value)}
                        />
                    </div>
                ))}
            </div>

            {/* Validation message */}
            {!canProceed && (
                <div className="text-xs text-amber-400/80 flex items-center gap-2 px-1">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Please add at least 2 example posts to continue
                </div>
            )}

            <button
                onClick={onNext}
                disabled={!canProceed}
                className="btn-primary w-full justify-center py-3.5 text-base"
            >
                Next — Review & Analyze
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </div>
    );
}

// ─── Step 3: Review & Submit ─────────────────────────────────────────────────

function ReviewStep({
    brandInfo,
    posts,
    projectId,
    onBack,
}: {
    brandInfo: BrandInfo;
    posts: ExamplePostSlot[];
    projectId: string;
    onBack: () => void;
}) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);

    const filledPosts = posts.filter((p) => p.text.trim().length > 0);

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/projects/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    companyName: brandInfo.companyName,
                    industry: brandInfo.industry,
                    targetAudience: brandInfo.targetAudience,
                    contentGoals: brandInfo.contentGoals,
                    brandVoice: brandInfo.brandVoice,
                    examplePosts: filledPosts.map((p) => ({ text: p.text, source: p.source })),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong');
                return;
            }

            if (data.aiAnalysis) {
                setAnalysis(data.aiAnalysis);
            }

            // Set this project as active
            await fetch('/api/set-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const goToDashboard = () => {
        router.push('/dashboard');
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <button
                onClick={onBack}
                disabled={submitting}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-400 transition-colors disabled:opacity-50"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </button>

            {!analysis ? (
                <>
                    <div className="mb-2">
                        <h2 className="text-xl font-bold text-white mb-1">Review & Launch AI Analysis</h2>
                        <p className="text-gray-400 text-sm">
                            Everything looks good? Hit the button below to save your profile and let the AI analyze your writing style.
                        </p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="glass rounded-xl p-4">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Brand</p>
                            <p className="text-white font-semibold">{brandInfo.companyName}</p>
                            {brandInfo.industry && <p className="text-sm text-gray-400 mt-1">{brandInfo.industry}</p>}
                        </div>
                        <div className="glass rounded-xl p-4">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Audience</p>
                            <p className="text-sm text-gray-300">{brandInfo.targetAudience || 'Not specified'}</p>
                        </div>
                        <div className="glass rounded-xl p-4">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Goals</p>
                            <p className="text-sm text-gray-300">{brandInfo.contentGoals || 'Not specified'}</p>
                        </div>
                        <div className="glass rounded-xl p-4">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Voice</p>
                            <p className="text-sm text-gray-300">{brandInfo.brandVoice || 'Not specified'}</p>
                        </div>
                    </div>

                    <div className="glass rounded-xl p-4">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                            Example Posts ({filledPosts.length})
                        </p>
                        <div className="space-y-2">
                            {filledPosts.map((post, i) => (
                                <div key={i} className="text-sm text-gray-400 truncate" dir="auto">
                                    <span className="text-gray-600 mr-2">#{i + 1}</span>
                                    {post.text.slice(0, 120)}...
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/50 text-red-300 text-sm">
                            ❌ {error}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="btn-primary w-full justify-center py-3.5 text-base"
                    >
                        {submitting ? (
                            <>
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Analyzing your style...
                            </>
                        ) : (
                            <>
                                ✨ Save & Analyze with AI
                            </>
                        )}
                    </button>
                </>
            ) : (
                /* ─── AI Analysis Results ──────────────────────────────── */
                <>
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 mb-4 shadow-lg shadow-emerald-500/30">
                            <span className="text-3xl">🧠</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-1">AI Analysis Complete!</h2>
                        <p className="text-gray-400 text-sm">Here&apos;s what we learned about your content style</p>
                    </div>

                    {/* Tone */}
                    {analysis.tone && (
                        <div className="glass rounded-xl p-5">
                            <p className="text-xs font-medium text-violet-400 uppercase tracking-wider mb-2">Overall Tone</p>
                            <p className="text-gray-200 text-sm leading-relaxed">{analysis.tone}</p>
                        </div>
                    )}

                    {/* Themes */}
                    {analysis.themes && analysis.themes.length > 0 && (
                        <div className="glass rounded-xl p-5">
                            <p className="text-xs font-medium text-violet-400 uppercase tracking-wider mb-3">Key Themes</p>
                            <div className="flex flex-wrap gap-2">
                                {analysis.themes.map((theme, i) => (
                                    <span key={i} className="px-3 py-1.5 text-xs rounded-full bg-violet-600/20 text-violet-300 border border-violet-600/30">
                                        {theme}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Writing Rules */}
                    {analysis.writing_rules && analysis.writing_rules.length > 0 && (
                        <div className="glass rounded-xl p-5">
                            <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-3">Writing Rules Detected</p>
                            <ul className="space-y-2">
                                {analysis.writing_rules.map((rule, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                        <span className="text-emerald-400 mt-0.5 flex-shrink-0">→</span>
                                        {rule}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Strengths & Recommendations */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {analysis.strengths && analysis.strengths.length > 0 && (
                            <div className="glass rounded-xl p-5">
                                <p className="text-xs font-medium text-green-400 uppercase tracking-wider mb-3">💪 Strengths</p>
                                <ul className="space-y-1.5">
                                    {analysis.strengths.map((s, i) => (
                                        <li key={i} className="text-sm text-gray-300">• {s}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {analysis.recommendations && analysis.recommendations.length > 0 && (
                            <div className="glass rounded-xl p-5">
                                <p className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-3">💡 Recommendations</p>
                                <ul className="space-y-1.5">
                                    {analysis.recommendations.map((r, i) => (
                                        <li key={i} className="text-sm text-gray-300">• {r}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        {analysis.avg_length && (
                            <div className="glass rounded-xl p-4 text-center">
                                <p className="text-xs text-gray-500 mb-1">Length</p>
                                <p className="text-sm font-medium text-gray-200 capitalize">{analysis.avg_length}</p>
                            </div>
                        )}
                        {analysis.emoji_usage && (
                            <div className="glass rounded-xl p-4 text-center">
                                <p className="text-xs text-gray-500 mb-1">Emojis</p>
                                <p className="text-sm font-medium text-gray-200 capitalize">{analysis.emoji_usage}</p>
                            </div>
                        )}
                        {analysis.hashtag_style && (
                            <div className="glass rounded-xl p-4 text-center">
                                <p className="text-xs text-gray-500 mb-1">Hashtags</p>
                                <p className="text-sm font-medium text-gray-200 capitalize">{analysis.hashtag_style.slice(0, 30)}</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={goToDashboard}
                        className="btn-primary w-full justify-center py-3.5 text-base"
                    >
                        🚀 Start Creating Content
                    </button>
                </>
            )}
        </div>
    );
}

// ─── CSV Parser ──────────────────────────────────────────────────────────────

function parseCSVPosts(csvText: string): string[] {
    const lines = csvText.split('\n');
    const posts: string[] = [];
    let currentPost = '';
    let insideQuotes = false;

    for (const line of lines) {
        const quoteCount = (line.match(/"/g) || []).length;

        if (insideQuotes) {
            currentPost += '\n' + line;
            if (quoteCount % 2 === 1) {
                insideQuotes = false;
                posts.push(currentPost.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
                currentPost = '';
            }
        } else if (quoteCount >= 1 && quoteCount % 2 === 1) {
            // Opening quote without closing
            currentPost = line;
            insideQuotes = true;
        } else {
            // Simple unquoted line or fully quoted line
            const clean = line.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
            if (clean.length > 20) {
                posts.push(clean);
            }
        }
    }

    return posts;
}

// ─── Progress Bar ────────────────────────────────────────────────────────────

function ProgressBar({ currentStep }: { currentStep: Step }) {
    const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

    return (
        <div className="flex items-center gap-2 mb-8">
            {STEPS.map((step, i) => {
                const isActive = i === stepIndex;
                const isCompleted = i < stepIndex;

                return (
                    <div key={step.key} className="flex items-center gap-2 flex-1">
                        <div
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-300 flex-1 ${
                                isActive
                                    ? 'bg-violet-600/20 border border-violet-500/50 text-violet-300'
                                    : isCompleted
                                      ? 'bg-emerald-950/30 border border-emerald-700/30 text-emerald-400'
                                      : 'bg-gray-900/40 border border-gray-800 text-gray-600'
                            }`}
                        >
                            <span>{isCompleted ? '✓' : step.icon}</span>
                            <span className="hidden sm:inline">{step.label}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`w-6 h-px flex-shrink-0 ${isCompleted ? 'bg-emerald-700' : 'bg-gray-800'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

export default function OnboardingWizard({ projectId, projectName }: { projectId: string; projectName: string }) {
    const [step, setStep] = useState<Step>('brand');
    const [brandInfo, setBrandInfo] = useState<BrandInfo>({
        companyName: projectName || '',
        industry: '',
        targetAudience: '',
        contentGoals: '',
        brandVoice: '',
    });
    const [examplePosts, setExamplePosts] = useState<ExamplePostSlot[]>([
        { text: '' },
        { text: '' },
    ]);

    const updateBrand = useCallback((field: keyof BrandInfo, value: string) => {
        setBrandInfo((prev) => ({ ...prev, [field]: value }));
    }, []);

    return (
        <div className="min-h-screen flex items-start justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-gray-950 to-blue-950/30" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 w-full max-w-2xl px-6 py-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 mb-4 shadow-lg shadow-violet-500/30">
                        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold gradient-text">Set Up {projectName || 'Your Project'}</h1>
                    <p className="text-gray-500 text-sm mt-1">A few quick steps to personalize your AI content engine</p>
                </div>

                <ProgressBar currentStep={step} />

                {/* Steps */}
                {step === 'brand' && (
                    <BrandStep
                        info={brandInfo}
                        onChange={updateBrand}
                        onNext={() => setStep('posts')}
                    />
                )}

                {step === 'posts' && (
                    <ExamplePostsStep
                        posts={examplePosts}
                        onPostsChange={setExamplePosts}
                        onNext={() => setStep('review')}
                        onBack={() => setStep('brand')}
                    />
                )}

                {step === 'review' && (
                    <ReviewStep
                        brandInfo={brandInfo}
                        posts={examplePosts}
                        projectId={projectId}
                        onBack={() => setStep('posts')}
                    />
                )}

                <p className="text-center text-xs text-gray-600 mt-8">
                    AWAD AI Content Engine — Internal Use Only
                </p>
            </div>
        </div>
    );
}
