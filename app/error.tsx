'use client';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center p-8">
            <div className="glass rounded-2xl p-10 max-w-md w-full text-center">
                <div className="text-5xl mb-4">⚠️</div>
                <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
                <p className="text-gray-400 text-sm mb-6">
                    {error.message || 'An unexpected error occurred. Please try again.'}
                </p>
                <button onClick={reset} className="btn-primary">
                    Try again
                </button>
            </div>
        </div>
    );
}
