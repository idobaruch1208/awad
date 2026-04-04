'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

const MAX_HISTORY = 50;
const DEBOUNCE_MS = 500;

/**
 * A proper undo/redo hook that works like a word processor.
 * - Debounces rapid keystrokes into single snapshots
 * - Supports immediate snapshots (for AI actions)
 * - Maintains separate undo and redo stacks
 * - Supports Ctrl+Z / Ctrl+Y keyboard shortcuts
 */
export function useUndoRedo(initialValue: string) {
    const [text, setTextInternal] = useState(initialValue);

    // Use refs to avoid stale closures in the debounce timer
    const undoStackRef = useRef<string[]>([]);
    const redoStackRef = useRef<string[]>([]);
    const [undoLen, setUndoLen] = useState(0);
    const [redoLen, setRedoLen] = useState(0);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSnapshotRef = useRef<string>(initialValue);
    const textRef = useRef<string>(initialValue);

    // Keep textRef in sync
    const updateText = useCallback((newText: string) => {
        textRef.current = newText;
        setTextInternal(newText);
    }, []);

    // Push a snapshot to the undo stack immediately
    const pushSnapshot = useCallback((snapshot: string) => {
        // Don't push duplicates
        const stack = undoStackRef.current;
        if (stack.length > 0 && stack[stack.length - 1] === snapshot) return;
        if (snapshot === textRef.current) return;

        undoStackRef.current = [...stack.slice(-(MAX_HISTORY - 1)), snapshot];
        setUndoLen(undoStackRef.current.length);

        // Any new edit clears redo
        redoStackRef.current = [];
        setRedoLen(0);

        lastSnapshotRef.current = snapshot;
    }, []);

    // Flush any pending debounce
    const flushDebounce = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;

            // Push the last known state if it differs
            const currentSnapshot = lastSnapshotRef.current;
            const currentText = textRef.current;
            if (currentSnapshot !== currentText) {
                // The snapshot we want to save is what was there BEFORE this edit batch
                // but lastSnapshotRef tracks what we last pushed, so push the pending text
            }
        }
    }, []);

    /**
     * Called on every keystroke (textarea onChange).
     * Debounces: groups rapid typing into one undo step.
     */
    const handleChange = useCallback((newText: string) => {
        // On first change after a snapshot, immediately capture the "before" state
        if (!debounceTimerRef.current) {
            // This is the start of a new typing burst — snapshot current text
            const before = textRef.current;
            if (before !== lastSnapshotRef.current || undoStackRef.current.length === 0) {
                pushSnapshot(before);
            }
        } else {
            clearTimeout(debounceTimerRef.current);
        }

        updateText(newText);

        // Set a timer: if the user pauses for DEBOUNCE_MS, finalize this "burst"
        debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null;
            lastSnapshotRef.current = newText;
        }, DEBOUNCE_MS);
    }, [pushSnapshot, updateText]);

    /**
     * Called before an AI action (refine, translate) to immediately
     * snapshot the current state so undo restores the pre-AI text.
     */
    const snapshotBeforeAI = useCallback(() => {
        flushDebounce();
        pushSnapshot(textRef.current);
    }, [flushDebounce, pushSnapshot]);

    /**
     * Set text directly (e.g., after AI response) without pushing history.
     * Call snapshotBeforeAI() first!
     */
    const setTextDirect = useCallback((newText: string) => {
        updateText(newText);
        lastSnapshotRef.current = newText;
    }, [updateText]);

    const undo = useCallback(() => {
        const stack = undoStackRef.current;
        if (stack.length === 0) return;

        flushDebounce();

        const prev = stack[stack.length - 1];
        undoStackRef.current = stack.slice(0, -1);
        setUndoLen(undoStackRef.current.length);

        // Push current text to redo
        redoStackRef.current = [...redoStackRef.current.slice(-(MAX_HISTORY - 1)), textRef.current];
        setRedoLen(redoStackRef.current.length);

        updateText(prev);
        lastSnapshotRef.current = prev;
    }, [flushDebounce, updateText]);

    const redo = useCallback(() => {
        const stack = redoStackRef.current;
        if (stack.length === 0) return;

        flushDebounce();

        const next = stack[stack.length - 1];
        redoStackRef.current = stack.slice(0, -1);
        setRedoLen(redoStackRef.current.length);

        // Push current text to undo
        undoStackRef.current = [...undoStackRef.current.slice(-(MAX_HISTORY - 1)), textRef.current];
        setUndoLen(undoStackRef.current.length);

        updateText(next);
        lastSnapshotRef.current = next;
    }, [flushDebounce, updateText]);

    // Reset when initial value changes (e.g., server refresh)
    const resetWith = useCallback((newInitial: string) => {
        updateText(newInitial);
        undoStackRef.current = [];
        redoStackRef.current = [];
        setUndoLen(0);
        setRedoLen(0);
        lastSnapshotRef.current = newInitial;
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
    }, [updateText]);

    // Keyboard shortcut handler
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        } else if (
            ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
            ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
        ) {
            e.preventDefault();
            redo();
        }
    }, [undo, redo]);

    return {
        text,
        handleChange,
        snapshotBeforeAI,
        setTextDirect,
        undo,
        redo,
        handleKeyDown,
        canUndo: undoLen > 0,
        canRedo: redoLen > 0,
        resetWith,
    };
}
