'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPortal } from 'react-dom';

export default function PostActionsMenu({ postId }: { postId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [mounted, setMounted] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch('/api/delete-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId }),
            });
            
            if (res.ok) {
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete post');
            }
        } catch (e) {
            alert('Network error while deleting post');
        } finally {
            setIsDeleting(false);
            setShowConfirm(false);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    setIsOpen(!isOpen);
                }}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                aria-label="Post actions"
            >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
            </button>

            {isOpen && !showConfirm && (
                <div className="absolute right-0 mt-1 w-36 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    <Link
                        href={`/dashboard/posts/${postId}`}
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                        Edit
                    </Link>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            setShowConfirm(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            )}

            {showConfirm && mounted && createPortal(
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 cursor-default" 
                    onClick={(e) => { e.stopPropagation(); setShowConfirm(false); setIsOpen(false); }}
                >
                    <div 
                        className="glass rounded-xl p-6 max-w-sm w-full border border-red-900/30 shadow-2xl" 
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                           <span className="text-red-500">⚠️</span> Delete Post
                        </h3>
                        <p className="text-sm text-gray-300 mb-6">Are you sure you want to delete this post? This action cannot be undone.</p>
                        <div className="flex gap-3 justify-end">
                            <button 
                                onClick={() => { setShowConfirm(false); setIsOpen(false); }} 
                                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800/80 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700/50"
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(); }} 
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-red-900/20"
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Deleting...
                                    </>
                                ) : 'Yes, delete'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
