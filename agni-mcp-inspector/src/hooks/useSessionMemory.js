"use client";

import { useState, useCallback } from 'react';

const MEMORY_KEY = 'agni_session_memory';
const MAX_ENTRIES = 10;

/**
 * useSessionMemory — persists last N tool inputs/outputs in sessionStorage.
 * Used by ToolView to auto-populate the "code" field from previous runs.
 */
export function useSessionMemory() {
    const readMemory = () => {
        try {
            return JSON.parse(sessionStorage.getItem(MEMORY_KEY) || '[]');
        } catch {
            return [];
        }
    };

    const pushMemory = useCallback((toolName, args, resultText) => {
        const entries = readMemory();
        const entry = {
            toolName,
            timestamp: Date.now(),
            // Only store the most useful context fields
            code: args.code || args.source || args.sql || null,
            prompt: args.prompt || null,
            result: resultText ? resultText.slice(0, 500) : null, // cap size
        };
        const next = [entry, ...entries].slice(0, MAX_ENTRIES);
        try {
            sessionStorage.setItem(MEMORY_KEY, JSON.stringify(next));
        } catch { /* storage full — ignore */ }
    }, []);

    /**
     * Returns the most recent code context from any previous code tool run.
     * Skips tools that don't produce code (emails, uuids, etc.)
     */
    const getLastCodeContext = useCallback((currentToolName) => {
        const codeTools = ['analyze_code', 'optimize_code', 'find_bugs', 'convert_code', 'generate_code', 'run_sql_query', 'optimize_query'];
        const entries = readMemory();
        const match = entries.find(e =>
            e.code &&
            e.toolName !== currentToolName &&
            codeTools.includes(e.toolName)
        );
        return match ? { code: match.code, from: match.toolName } : null;
    }, []);

    const clearMemory = useCallback(() => {
        sessionStorage.removeItem(MEMORY_KEY);
    }, []);

    return { pushMemory, getLastCodeContext, clearMemory, readMemory };
}
