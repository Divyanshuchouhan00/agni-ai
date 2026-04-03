"use client";

import { useMcp } from '@/context/McpContext';
import { TerminalSquare, MessageSquare, Database, History, Search, Star, ChevronDown, ChevronRight, Activity, Wrench, Code2, Link, FileText, Sparkles, BrainCircuit, Trash2, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import clsx from 'clsx';

function CollapsibleSection({ title, defaultOpen = true, children, icon: Icon, badgeCount }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    return (
        <div className="mb-4">
            <div 
                onClick={() => setIsOpen(!isOpen)} 
                className="flex items-center justify-between px-4 py-1.5 cursor-pointer group hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center space-x-2 text-[11px] font-bold text-text-muted group-hover:text-foreground tracking-widest uppercase mb-1 transition-colors">
                    {Icon && <Icon className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />}
                    <span>{title}</span>
                </div>
                <div className="flex items-center space-x-2">
                    {badgeCount !== undefined && badgeCount > 0 && <span className="bg-white/10 text-[9px] px-1.5 py-0.5 rounded font-mono">{badgeCount}</span>}
                    {isOpen ? <ChevronDown className="w-4 h-4 text-text-muted/50 group-hover:text-foreground/70" /> : <ChevronRight className="w-4 h-4 text-text-muted/50 group-hover:text-foreground/70" />}
                </div>
            </div>
            {isOpen && <div className="space-y-1 mt-1">{children}</div>}
        </div>
    );
}

export default function Sidebar() {
  const { 
      isConnected, 
      openTab,
      searchQuery,
      setSearchQuery,
      categories,
      favorites,
      toggleFavorite,
      filteredHistory,
      historySearchQuery,
      setHistorySearchQuery,
      removeHistoryItem,
      clearHistory
  } = useMcp();

  // Determine Icon by type
  const getIcon = (itemType, cat) => {
      if (itemType === 'prompt') return MessageSquare;
      if (itemType === 'resource') return Database;
      if (cat === 'Code') return Code2;
      if (cat === 'API') return Link;
      if (cat === 'Data') return FileText;
      if (cat === 'AI') return Sparkles;
      return TerminalSquare; // default tool
  };

  const getCatIcon = (name) => {
      if (name === 'Code') return Code2;
      if (name === 'API') return Link;
      if (name === 'Data') return FileText;
      if (name === 'AI') return Sparkles;
      if (name === 'Database') return Database;
      if (name === 'Prompts') return MessageSquare;
      if (name === 'Resources') return Database;
      return Wrench;
  };

  const renderItem = (item, catName) => {
      const isFav = favorites.includes(item.id);
      const TypeIcon = getIcon(item.itemType, catName);
      
      return (
        <div 
            key={item.id}
            onClick={() => openTab(item.itemType, item)}
            className="group flex flex-col mx-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/10 transition-all duration-200 border border-transparent hover:border-white/5"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                    <TypeIcon className="w-4 h-4 text-accent/80 group-hover:text-accent group-hover:scale-110 transition-all shrink-0" />
                    <span className="text-sm font-medium text-text-muted group-hover:text-foreground truncate transition-colors tracking-tight">
                        {item.name || item.uri}
                    </span>
                </div>
                {item.itemType !== 'history' && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                        <Star className={clsx("w-3.5 h-3.5 transition-colors", isFav ? "fill-yellow-500 text-yellow-500" : "text-text-muted hover:text-white")} />
                    </button>
                )}
            </div>
            {item.description && (
                <span className="text-[10px] text-text-muted/60 truncate mt-1 ml-6 pl-0.5 group-hover:text-text-muted/90">
                    {item.description}
                </span>
            )}
        </div>
      );
  };

  if (!isConnected) {
    return (
      <div className="w-72 bg-sidebar-bg/95 backdrop-blur-md flex flex-col flex-shrink-0 animate-in slide-in-from-left-4 border-r border-border-color shadow-2xl relative z-10">
        <div className="flex items-center space-x-3 px-5 py-4 border-b border-white/5">
           <Activity className="w-5 h-5 text-accent opacity-50" />
           <h2 className="text-sm font-bold text-text-muted tracking-widest uppercase">Explorer</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center text-text-muted opacity-50 text-balance leading-relaxed text-sm">
           Connect to a server to map its capabilities.
        </div>
      </div>
    );
  }

  // Fav Items
  const favItems = [];
  Object.values(categories).forEach(catArray => {
      catArray.forEach(item => {
          if (favorites.includes(item.id)) favItems.push({ ...item, origCat: item.category });
      });
  });

  return (
    <div className="w-[300px] bg-sidebar-bg/95 backdrop-blur-md flex flex-col flex-shrink-0 border-r border-border-color shadow-2xl relative z-10 transition-all">
      <div className="flex items-center space-x-3 px-5 py-4 border-b border-white/5 bg-black/20 shrink-0">
          <Activity className="w-5 h-5 text-accent" />
          <h2 className="text-sm font-bold text-foreground tracking-widest uppercase">Workspace</h2>
      </div>

      <div className="p-4 border-b border-white/5 shrink-0 bg-black/10">
          <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" />
              <input 
                 type="text" 
                 placeholder="Search tools..."
                 value={searchQuery}
                 onChange={(e) => {
                     setSearchQuery(e.target.value);
                     setHistorySearchQuery(e.target.value); // tie together for simple universal filtering
                 }}
                 className="w-full bg-black/20 border border-border-color rounded-lg pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all placeholder:text-text-muted/50 shadow-inner"
              />
          </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
         {favItems.length > 0 && !searchQuery && (
             <CollapsibleSection title="Favorites" icon={Star} badgeCount={favItems.length} defaultOpen={true}>
                 {favItems.map(item => renderItem(item, item.origCat || "Tools"))}
             </CollapsibleSection>
         )}

         {Object.entries(categories).map(([catName, items]) => {
             if (items.length === 0) return null;
             return (
                 <CollapsibleSection key={catName} title={catName} icon={getCatIcon(catName)} badgeCount={items.length} defaultOpen={!searchQuery}>
                     {items.map(item => renderItem(item, catName))}
                 </CollapsibleSection>
             );
         })}

         {/* Agent Mode Launch Button */}
        <div className="px-3 py-3 border-t border-white/5">
            <button
                onClick={() => openTab('agent', { id: 'agent-mode', name: 'AI Agent Mode', description: 'Autonomous multi-step AI pipeline' })}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-[#8b5cf6]/20 to-[#6366f1]/10 border border-[#8b5cf6]/30 hover:border-[#8b5cf6]/60 hover:from-[#8b5cf6]/30 hover:to-[#6366f1]/20 transition-all duration-300 group shadow-lg shadow-[#8b5cf6]/5 hover:shadow-[#8b5cf6]/15"
            >
                <div className="p-1.5 rounded-lg bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 group-hover:bg-[#8b5cf6]/30 transition-colors">
                    <BrainCircuit className="w-3.5 h-3.5 text-[#8b5cf6]" />
                </div>
                <div className="text-left">
                    <p className="text-xs font-bold text-[#a78bfa] tracking-wide">🧠 Agent Mode</p>
                    <p className="text-[10px] text-[#6b7280]">Autonomous AI pipeline</p>
                </div>
            </button>
        </div>

        <div className="border-t border-white/5 pt-4">
             <CollapsibleSection title="History Panel" icon={History} badgeCount={filteredHistory.length} defaultOpen={false}>
                 <div className="flex items-center justify-end px-2 pb-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            clearHistory();
                        }}
                        disabled={filteredHistory.length === 0}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
                    >
                        <Trash2 className="w-3 h-3" />
                        Clear All
                    </button>
                 </div>
                 {filteredHistory.map((item) => (
                    <div 
                        key={item.id} 
                        onClick={() => openTab('history', item)}
                        className="group flex flex-col mx-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/10 transition-all duration-200 border border-transparent hover:border-white/5"
                    >
                        <div className="flex items-center space-x-2">
                             <History className="w-3.5 h-3.5 text-text-muted group-hover:text-foreground shrink-0" />
                             <span className="text-[12px] font-mono text-text-muted group-hover:text-foreground truncate transition-colors flex-1">
                                 {item.request.toolName || item.request.promptName}
                             </span>
                             <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeHistoryItem(item.id);
                                }}
                                title="Delete history item"
                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                             >
                                <X className="w-3 h-3" />
                             </button>
                        </div>
                        <div className="flex justify-between items-center mt-1 ml-5">
                            <span className="text-[9px] uppercase tracking-wider bg-black/40 px-1.5 py-0.5 rounded text-text-muted">
                                {item.type}
                            </span>
                            <span className="text-[9px] text-text-muted/50">
                                {new Date(item.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                            </span>
                        </div>
                    </div>
                 ))}
             </CollapsibleSection>
         </div>
      </div>
    </div>
  );
}
