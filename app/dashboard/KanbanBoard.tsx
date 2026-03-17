'use client';

import { useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import type { Post } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function KanbanBoard({ initialPosts, columns }: { initialPosts: Post[], columns: string[] }) {
    const [posts, setPosts] = useState(initialPosts);
    const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);
    const router = useRouter();

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedPostId(id);
        e.dataTransfer.effectAllowed = 'move';
        // Add a small delay for styling the dragged element original location
        setTimeout(() => {
            const el = document.getElementById(`post-${id}`);
            if (el) el.classList.add('opacity-40', 'scale-95');
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent, id: string) => {
        setDraggedPostId(null);
        setDragOverCol(null);
        const el = document.getElementById(`post-${id}`);
        if (el) el.classList.remove('opacity-40', 'scale-95');
    };

    const handleDragOver = (e: React.DragEvent, col: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverCol !== col) {
            setDragOverCol(col);
        }
    };

    const handleDragLeave = (e: React.DragEvent, col: string) => {
        if (dragOverCol === col) {
            setDragOverCol(null);
        }
    };

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        setDragOverCol(null);
        if (!draggedPostId) return;

        const postToMove = posts.find(p => p.id === draggedPostId);
        if (!postToMove || postToMove.status === newStatus) {
            setDraggedPostId(null);
            return;
        }

        // Optimistic update
        setPosts(prev => prev.map(p => p.id === draggedPostId ? { ...p, status: newStatus as Post['status'] } : p));
        setDraggedPostId(null);

        try {
            const res = await fetch('/api/update-post-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: draggedPostId, status: newStatus }),
            });
            if (!res.ok) {
                throw new Error('Failed to update status via API');
            }
            router.refresh(); // Refresh Next.js server components state
        } catch {
            // Revert optimistic update on error
            setPosts(initialPosts);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pb-4 w-full">
            {columns.map(col => {
                const colPosts = posts.filter(p => p.status === col);
                const isDragOver = dragOverCol === col;
                return (
                    <div 
                        key={col} 
                        className={`flex flex-col bg-gray-900/20 border rounded-xl overflow-hidden transition-colors duration-200 h-[calc(100vh-400px)] min-h-[400px] ${isDragOver ? 'border-violet-500/80 bg-violet-900/10 shadow-lg shadow-violet-900/20' : 'border-gray-800/60'}`}
                        onDragOver={(e) => handleDragOver(e, col)}
                        onDragLeave={(e) => handleDragLeave(e, col)}
                        onDrop={(e) => handleDrop(e, col)}
                    >
                        <div className={`px-4 py-3 border-b flex items-center justify-between transition-colors ${isDragOver ? 'border-violet-500/50 bg-violet-900/20' : 'border-gray-800/60 bg-gray-900/40'}`}>
                            <h3 className="text-sm font-semibold text-gray-300 truncate pr-2">{col}</h3>
                            <span className="text-xs text-gray-500 bg-gray-950 px-2 py-0.5 rounded-full border border-gray-800 flex-shrink-0">{colPosts.length}</span>
                        </div>
                        <div className="p-3 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent flex-1">
                            {colPosts.map(post => (
                                <div
                                    id={`post-${post.id}`}
                                    key={post.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, post.id)}
                                    onDragEnd={(e) => handleDragEnd(e, post.id)}
                                    className="block glass rounded-lg transition-all cursor-[grab] active:cursor-[grabbing] border border-gray-800/80 hover:border-violet-500/40 hover:shadow-md hover:shadow-violet-900/10 transform origin-top relative group"
                                >
                                    <Link href={`/dashboard/posts/${post.id}`} draggable={false} className="block p-4 w-full h-full">
                                        <p className="text-sm text-gray-200 font-medium leading-relaxed line-clamp-3 mb-3 group-hover:text-white transition-colors select-none">
                                            {post.topic}
                                        </p>
                                        <div className="flex items-center justify-between text-[11px] text-gray-500 select-none">
                                            <span>{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                            <StatusBadge status={post.status} />
                                        </div>
                                    </Link>
                                </div>
                            ))}
                            {colPosts.length === 0 && (
                                <div className={`h-24 flex items-center justify-center text-xs border border-dashed rounded-lg pointer-events-none transition-colors ${isDragOver ? 'border-violet-500/60 text-violet-300 bg-violet-500/10' : 'border-gray-800/50 text-gray-600'}`}>
                                    Drop here
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
