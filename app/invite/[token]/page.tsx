'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
    const router = useRouter();
    const [token, setToken] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'joining' | 'success' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        params.then(p => {
            setToken(p.token);
            // Lookup invite info
            fetch(`/api/invites/info?token=${p.token}`)
                .then(r => r.json())
                .then(data => {
                    if (data.error) {
                        setError(data.error);
                        setStatus('error');
                    } else {
                        setProjectName(data.project_name);
                        setStatus('ready');
                    }
                })
                .catch(() => {
                    setError('Failed to load invite');
                    setStatus('error');
                });
        });
    }, [params]);

    const handleJoin = async () => {
        setStatus('joining');
        const res = await fetch('/api/invites/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (data.error) {
            // If unauthorized, redirect to login with return URL
            if (res.status === 401) {
                window.location.href = `/login?next=${encodeURIComponent(`/invite/${token}`)}`;
                return;
            }
            setError(data.error);
            setStatus('error');
        } else {
            setStatus('success');
            // Set active project and redirect
            await fetch('/api/set-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: data.project_id }),
            });
            setTimeout(() => router.push('/dashboard'), 1500);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-gray-950 to-blue-950/30" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 w-full max-w-md px-6">
                <div className="glass rounded-2xl p-8 text-center">
                    {status === 'loading' && (
                        <>
                            <div className="text-4xl mb-4 animate-pulse">✉️</div>
                            <h2 className="text-lg font-semibold text-white mb-2">Loading invite...</h2>
                        </>
                    )}

                    {status === 'ready' && (
                        <>
                            <div className="text-4xl mb-4">🤝</div>
                            <h2 className="text-xl font-bold text-white mb-2">You&apos;re invited!</h2>
                            <p className="text-gray-400 text-sm mb-6">
                                You&apos;ve been invited to join the <strong className="text-violet-300">{projectName}</strong> project
                            </p>
                            <button onClick={handleJoin} className="btn-primary w-full justify-center py-3 text-base">
                                Join Project
                            </button>
                        </>
                    )}

                    {status === 'joining' && (
                        <>
                            <div className="text-4xl mb-4 animate-bounce">🚀</div>
                            <h2 className="text-lg font-semibold text-white mb-2">Joining project...</h2>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="text-4xl mb-4">🎉</div>
                            <h2 className="text-xl font-bold text-white mb-2">Welcome aboard!</h2>
                            <p className="text-gray-400 text-sm">Redirecting to your dashboard...</p>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="text-4xl mb-4">😕</div>
                            <h2 className="text-lg font-semibold text-white mb-2">Oops</h2>
                            <p className="text-red-400 text-sm mb-4">{error}</p>
                            <button
                                onClick={() => router.push('/dashboard/projects')}
                                className="btn-primary px-6"
                            >
                                Go to Projects
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
