"use client";

import { useMcp } from '@/context/McpContext';
import { X, LayoutDashboard, Wrench, MessageSquare, FileText, History } from 'lucide-react';
import clsx from 'clsx';

export default function TabsHeader() {
  const { tabs, activeTabId, setActiveTabId, closeTab } = useMcp();

  const getIcon = (type) => {
      switch (type) {
          case 'welcome': return LayoutDashboard;
          case 'tool': return Wrench;
          case 'prompt': return MessageSquare;
          case 'resource': return FileText;
          case 'history': return History;
          default: return Wrench;
      }
  };

  return (
    <div className="flex bg-sidebar-bg/80 backdrop-blur-md border-b border-border-color overflow-x-auto overflow-y-hidden h-10 shrink-0 custom-scrollbar z-10 sticky top-0">
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        const Icon = getIcon(tab.type);
        const label = tab.data?.name || tab.data?.uri || (tab.type === 'history' ? `History: ${tab.data.request.toolName || tab.data.request.promptName}` : 'Welcome');
        
        return (
          <div 
             key={tab.id}
             onClick={() => setActiveTabId(tab.id)}
             className={clsx(
                 "group flex items-center h-full px-3 py-1 min-w-[120px] max-w-[200px] border-r border-border-color cursor-pointer transition-all duration-200 select-none relative",
                 isActive ? "bg-panel-bg text-foreground shadow-[inset_0_2px_0_var(--accent)]" : "bg-transparent text-text-muted hover:bg-panel-bg/50 hover:text-foreground"
             )}
          >
             <Icon className={clsx("w-3.5 h-3.5 mr-2 shrink-0", isActive ? "text-accent" : "opacity-60")} />
             <span className="text-xs truncate font-medium flex-1">{label}</span>
             
             {tabs.length > 1 && (
                 <button 
                     onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                     className={clsx(
                         "ml-2 shrink-0 p-0.5 rounded-sm transition-opacity hover:bg-foreground/10",
                         isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                     )}
                 >
                     <X className="w-3.5 h-3.5" />
                 </button>
             )}
          </div>
        );
      })}
    </div>
  );
}
