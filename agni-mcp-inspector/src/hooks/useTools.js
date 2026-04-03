import { useState, useEffect, useMemo } from 'react';

export function useTools(rawTools, rawPrompts, rawResources) {
    const [favorites, setFavorites] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Load Favorites
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('mcp_favorites') || '[]');
            setFavorites(saved);
        } catch (e) {}
    }, []);

    // Save Favorites
    useEffect(() => {
        localStorage.setItem('mcp_favorites', JSON.stringify(favorites));
    }, [favorites]);

    const toggleFavorite = (id) => {
        setFavorites(prev => 
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    // Derived Categorized Tools
    const categories = useMemo(() => {
        const cats = {};
        
        const filterItem = (name) => {
            if (!searchQuery) return true;
            return name.toLowerCase().includes(searchQuery.toLowerCase());
        };

        // Standardize Tools into Categories
        rawTools.forEach(t => {
            if (!filterItem(t.name)) return;
            const cat = t.category || "Uncategorized Tools";
            if (!cats[cat]) cats[cat] = [];
            cats[cat].push({ ...t, itemType: 'tool', id: t.name });
        });

        // Prompts
        rawPrompts.forEach(p => {
             if (!filterItem(p.name)) return;
             if (!cats["Prompts"]) cats["Prompts"] = [];
             cats["Prompts"].push({ ...p, itemType: 'prompt', id: p.name });
        });

        // Resources
        rawResources.forEach(r => {
             if (!filterItem(r.name || r.uri)) return;
             if (!cats["Resources"]) cats["Resources"] = [];
             cats["Resources"].push({ ...r, itemType: 'resource', id: r.uri });
        });

        return cats;
    }, [rawTools, rawPrompts, rawResources, searchQuery]);

    return {
        searchQuery,
        setSearchQuery,
        categories,
        favorites,
        toggleFavorite
    };
}
