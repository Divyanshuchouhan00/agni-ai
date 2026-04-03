"use client";

import { useState, useCallback } from 'react';

const STORE_KEY = 'agni_projects';
const MAX_PROJECTS = 20;

function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
    catch { return []; }
}
function writeStore(projects) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(projects)); }
    catch { /* storage full */ }
}

/**
 * useProjectStore — lightweight localStorage project registry.
 * Stores up to 20 projects with code, language, endpoints, outputs.
 */
export function useProjectStore() {
    const [projects, setProjects] = useState(() => readStore());

    const refresh = useCallback(() => {
        const all = readStore();
        setProjects(all);
        return all;
    }, []);

    const saveProject = useCallback(({ name, code, language, endpoints = [], outputs = {}, timestamp }) => {
        const existing = readStore();
        const id = `proj_${Date.now()}`;
        const entry = {
            id,
            name: name || `Project ${existing.length + 1}`,
            code: code || '',
            language: language || 'node',
            endpoints,
            outputs, // { stdout, stderr, exitCode }
            timestamp: timestamp || new Date().toISOString(),
        };
        const updated = [entry, ...existing].slice(0, MAX_PROJECTS);
        writeStore(updated);
        setProjects(updated);
        return id;
    }, []);

    const updateProject = useCallback((id, patch) => {
        const existing = readStore();
        const updated = existing.map(p => p.id === id ? { ...p, ...patch } : p);
        writeStore(updated);
        setProjects(updated);
    }, []);

    const deleteProject = useCallback((id) => {
        const existing = readStore();
        const updated = existing.filter(p => p.id !== id);
        writeStore(updated);
        setProjects(updated);
    }, []);

    const clearAll = useCallback(() => {
        writeStore([]);
        setProjects([]);
    }, []);

    return { projects, saveProject, updateProject, deleteProject, clearAll, refresh };
}
