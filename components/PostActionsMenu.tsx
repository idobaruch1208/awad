'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PostActionsMenu({ postId }: { postId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
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

            {showConfirm && (
                <div className="absolute right-0 mt-1 w-64 bg-gray-900 border border-red-900/50 rounded-lg shadow-2xl z-50 p-4">
                    <p className="text-sm text-gray-300 mb-4">Are you sure you want to delete this post?</p>
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => {
                                setShowConfirm(false);
                                setIsOpen(false);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-gray-800 rounded-md transition-colors"
                            disabled={isDeleting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-md transition-colors disabled:opacity-50"
                        >
                            {isDeleting ? 'Deleting...' : 'Yes, delete'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
