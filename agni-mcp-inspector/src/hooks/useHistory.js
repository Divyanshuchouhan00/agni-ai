import { useState, useEffect } from 'react';

const HISTORY_LIMIT = 15;

export function useHistory() {
    const [history, setHistory] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Load
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('mcp_history') || '[]');
            setHistory(saved);
        } catch (e) {
            console.error("Failed to load history", e);
        }
    }, []);
    
    // Save
    useEffect(() => {
        localStorage.setItem('mcp_history', JSON.stringify(history));
    }, [history]);
    
    const addHistory = (item) => {
        setHistory(prev => [item, ...prev].slice(0, HISTORY_LIMIT));
    };

    const removeHistoryItem = (id) => {
        setHistory(prev => prev.filter(item => item.id !== id));
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem('mcp_history');
    };
    
    const filteredHistory = history.filter(h => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const name = h.request.toolName || h.request.promptName || "";
        return name.toLowerCase().includes(q) || h.type.includes(q);
    });

    return {
        history,
        filteredHistory,
        addHistory,
        removeHistoryItem,
        clearHistory,
        historySearchQuery: searchQuery,
        setHistorySearchQuery: setSearchQuery,
    };
}
