'use client';

import { useState } from 'react';

export default function TeamSection({
    projectId,
    members,
}: {
    projectId: string;
    members: { email: string; role: string; joined_at: string }[];
}) {
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const generateInvite = async () => {
        setLoading(true);
        const res = await fetch(`/api/projects/${projectId}/invite`, {
            method: 'POST',
        });
        const data = await res.json();
        if (data.url) {
            setInviteUrl(data.url);
        }
        setLoading(false);
    };

    const copyToClipboard = async () => {
        if (inviteUrl) {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="glass rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-900/60 border border-violet-700 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-sm font-semibold text-white">Team Members</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
                </div>
            </div>

            {/* Members list */}
            <div className="space-y-2 mb-4">
                {members.map((m, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-900/50 border border-gray-800">
                        <div>
                            <div className="text-sm text-white">{m.email}</div>
                            <div className="text-xs text-gray-500">
                                Joined {new Date(m.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.role === 'owner'
                                ? 'bg-violet-600/20 text-violet-400 border border-violet-600/30'
                                : 'bg-gray-700/30 text-gray-400 border border-gray-600/30'
                            }`}>
                            {m.role}
                        </span>
                    </div>
                ))}
            </div>

            {/* Generate invite */}
            {!inviteUrl ? (
                <button
                    onClick={generateInvite}
                    disabled={loading}
                    className="btn-primary text-sm px-4 py-2 w-full justify-center"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Generating...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Generate Invite Link
                        </>
                    )}
                </button>
            ) : (
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            readOnly
                            value={inviteUrl}
                            className="input-field flex-1 text-xs font-mono"
                        />
                        <button
                            onClick={copyToClipboard}
                            className="btn-primary px-4 text-sm flex-shrink-0"
                        >
                            {copied ? '✓ Copied!' : 'Copy'}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">This link expires in 7 days. Share it with your team member.</p>
                    <button
                        onClick={() => setInviteUrl(null)}
                        className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                    >
                        Generate new link
                    </button>
                </div>
            )}
        </div>
    );
}
