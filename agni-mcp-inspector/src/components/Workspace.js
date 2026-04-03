"use client";

import { useEffect, useState } from 'react';
import { useMcp } from '@/context/McpContext';
import {
  TerminalSquare,
  History,
  Star,
  ArrowRight,
  BrainCircuit,
  Sparkles,
  Bug,
  GitBranch,
  Wand2,
} from 'lucide-react';
import TabsHeader from './TabsHeader';
import ToolView from './views/ToolView';
import PromptView from './views/PromptView';
import AgentView from './views/AgentView';
import clsx from 'clsx';

export default function Workspace() {
  const { isConnected, tabs, activeTabId, history, categories, openTab } = useMcp();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const ONBOARDING_KEY = 'agni_seen_onboarding';

  const quickStarts = [
    {
      title: 'Build REST API',
      description: 'Generate endpoints, models, and sample requests for a new service.',
      icon: Sparkles,
      accent: 'from-sky-500/20 to-cyan-500/10',
      border: 'border-sky-500/20 hover:border-sky-400/40',
      prompt: 'Build REST API for blog system with auth, CRUD endpoints, and sample curl commands',
    },
    {
      title: 'Analyze Code',
      description: 'Review existing code and surface architecture, quality, and improvement notes.',
      icon: BrainCircuit,
      accent: 'from-violet-500/20 to-fuchsia-500/10',
      border: 'border-violet-500/20 hover:border-violet-400/40',
      prompt: 'Analyze this codebase and explain architecture, risks, and suggested improvements',
    },
    {
      title: 'Design Architecture',
      description: 'Create a visual system design with layers, services, and data flow.',
      icon: GitBranch,
      accent: 'from-emerald-500/20 to-teal-500/10',
      border: 'border-emerald-500/20 hover:border-emerald-400/40',
      prompt: 'Design architecture for a real-time chat application with auth, APIs, storage, and realtime messaging',
    },
    {
      title: 'Fix Bugs',
      description: 'Inspect broken code, identify issues, and generate safe fixes quickly.',
      icon: Bug,
      accent: 'from-amber-500/20 to-orange-500/10',
      border: 'border-amber-500/20 hover:border-amber-400/40',
      prompt: 'Find and fix bugs in this code with a concise explanation and corrected implementation',
    },
  ];

  const launchQuickStart = (item) => {
    const token = Date.now().toString();
    openTab('agent', {
      id: `agent-quick-${token}`,
      name: item.title,
      description: item.description,
      preset: {
        token,
        problem: item.prompt,
        autoRun: true,
      },
    });
  };

  const launchOnboarding = (problem) => {
    const token = Date.now().toString();
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {}
    setShowOnboarding(false);
    openTab('agent', {
      id: `agent-onboarding-${token}`,
      name: 'Getting Started',
      description: 'First-time guided setup',
      preset: {
        token,
        problem,
        autoRun: false,
        autoFocus: true,
      },
    });
  };

  useEffect(() => {
    try {
      const seen = localStorage.getItem(ONBOARDING_KEY) === 'true';
      setShowOnboarding(!seen && history.length === 0);
    } catch {
      setShowOnboarding(history.length === 0);
    }
  }, [history.length]);

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col bg-background relative border-l border-white/5 z-20 overflow-hidden">
        <TabsHeader />
        <div className="flex-1 flex flex-col items-center justify-center text-text-muted space-y-6 animate-in fade-in duration-700 relative z-10 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent/5 via-background to-background">
          <div className="relative group cursor-default">
            <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full group-hover:bg-accent/40 transition-colors duration-700" />
            <TerminalSquare className="w-24 h-24 text-accent/50 relative z-10 group-hover:scale-105 transition-transform duration-500" />
          </div>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight drop-shadow-sm">AGNI V5 Platform</h2>
          <p className="max-w-md text-center text-[13px] opacity-70 leading-relaxed text-balance font-medium tracking-wide">
            The ultimate AI Developer OS. Connect a server to load tools, run autonomous agent pipelines, and build with real AI responses.
          </p>
        </div>
      </div>
    );
  }

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const renderContent = () => {
    if (!activeTab || activeTab.type === 'welcome') {
      const recentHistory = history.slice(0, 4);
      const aiTools = categories.AI || [];
      const dbTools = categories.Database || [];
      const recommended = [...aiTools, ...dbTools].slice(0, 3);

      return (
        <div className="flex-1 flex flex-col p-8 md:p-12 bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.12),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,_rgba(15,17,23,1),_rgba(10,12,18,1))] relative overflow-y-auto custom-scrollbar">
          <div className="relative z-10 max-w-6xl mx-auto w-full space-y-10">
            {showOnboarding && (
              <div className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(14,165,233,0.08))] p-6 md:p-8 shadow-2xl">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-300">First-Time Setup</p>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white">What do you want to do today?</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => launchOnboarding('Build REST API for blog system')}
                      className="rounded-2xl border border-sky-400/20 bg-black/20 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/40"
                    >
                      <div className="text-2xl">🚀</div>
                      <h3 className="mt-4 text-lg font-bold text-white">Build something</h3>
                      <p className="mt-2 text-sm text-slate-300">Start with a REST API or a fresh backend idea.</p>
                    </button>
                    <button
                      onClick={() => launchOnboarding('Analyze this code')}
                      className="rounded-2xl border border-violet-400/20 bg-black/20 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-violet-300/40"
                    >
                      <div className="text-2xl">🔍</div>
                      <h3 className="mt-4 text-lg font-bold text-white">Analyze something</h3>
                      <p className="mt-2 text-sm text-slate-300">Review structure, quality, and architecture quickly.</p>
                    </button>
                    <button
                      onClick={() => launchOnboarding('Find bugs in this code')}
                      className="rounded-2xl border border-amber-400/20 bg-black/20 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/40"
                    >
                      <div className="text-2xl">🧩</div>
                      <h3 className="mt-4 text-lg font-bold text-white">Fix something</h3>
                      <p className="mt-2 text-sm text-slate-300">Jump into debugging with a prefilled repair workflow.</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-[#cbd5e1]">
                <Wand2 className="w-3.5 h-3.5 text-accent" />
                Developer Workspace
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Welcome to AGNI</h1>
                <p className="text-lg text-text-muted max-w-2xl">Your AI Developer Assistant</p>
                <p className="text-[15px] font-medium text-text-muted/90 max-w-3xl text-balance">
                  Start from a guided workflow, inspect tools in the sidebar, or jump back into recent work without losing your place.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {quickStarts.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    onClick={() => launchQuickStart(item)}
                    className={clsx(
                      'group rounded-2xl border bg-gradient-to-br p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl',
                      item.accent,
                      item.border
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/40 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
                    </div>
                    <div className="mt-6 space-y-2">
                      <h3 className="text-lg font-bold text-white">{item.title}</h3>
                      <p className="text-sm leading-relaxed text-slate-300">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.9fr] gap-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-text-muted uppercase text-[11px] font-bold tracking-widest">
                  <History className="w-4 h-4" />
                  <span>Recent Sessions</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {recentHistory.length === 0 ? (
                    <div className="border border-white/5 rounded-2xl p-6 bg-black/10 flex items-center justify-center text-sm text-text-muted/50 italic h-32">
                      No sessions executed yet.
                    </div>
                  ) : recentHistory.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => openTab('history', item)}
                      className="group border border-border-color rounded-xl p-4 bg-panel-bg/60 backdrop-blur shadow-sm hover:shadow-md hover:border-accent/40 hover:bg-white/5 transition-all duration-300 cursor-pointer flex justify-between items-center"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-foreground truncate">{item.request.toolName || item.request.promptName}</span>
                        <span className="text-[11px] text-text-muted capitalize mt-1 tracking-wide">
                          {item.type} execution • {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="bg-black/30 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-4 h-4 text-accent" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-text-muted uppercase text-[11px] font-bold tracking-widest">
                  <Star className="w-4 h-4" />
                  <span>Recommended Tools</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {recommended.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => openTab(item.itemType, item)}
                      className="group border border-border-color rounded-xl p-4 bg-panel-bg/60 backdrop-blur shadow-sm hover:shadow-md hover:border-blue-500/40 hover:bg-white/5 transition-all duration-300 cursor-pointer flex justify-between items-center"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-500/10 w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                          <TerminalSquare className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex flex-col min-w-0 pr-4">
                          <span className="text-sm font-bold text-foreground truncate">{item.name}</span>
                          <span className="text-[11px] text-text-muted mt-1 tracking-wide truncate">{item.description || 'System Component'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const { type, data } = activeTab;

    if (type === 'tool') return <ToolView tab={activeTab} />;
    if (type === 'prompt') return <PromptView tab={activeTab} />;
    if (type === 'agent') return <AgentView tab={activeTab} />;
    if (type === 'resource') {
      return (
        <div className="flex-1 p-8 overflow-y-auto bg-sidebar-bg/30">
          <pre className="text-sm font-mono text-foreground bg-panel-bg p-8 rounded-2xl border border-border-color whitespace-pre-wrap shadow-inner">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      );
    }
    if (type === 'history') {
      return (
        <div className="flex-1 p-8 overflow-y-auto bg-sidebar-bg/30 font-mono text-sm space-y-6 custom-scrollbar">
          <h2 className="text-2xl tracking-tight font-extrabold font-sans text-foreground">Timeline Insight</h2>
          <p className="text-text-muted font-sans text-sm mb-8">Snapshot captured at: {new Date(data.timestamp).toLocaleString()}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 border-b border-border-color pb-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <h4 className="font-bold text-text-muted tracking-widest uppercase text-[10px]">Request Payload</h4>
              </div>
              <pre className="bg-[#0d1017] p-6 text-blue-200 rounded-xl shadow-inner border border-white/5 overflow-x-auto text-[12px] leading-relaxed">
                {JSON.stringify(data.request, null, 2)}
              </pre>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2 border-b border-border-color pb-2">
                <div className={clsx('w-2 h-2 rounded-full', data.response?.error ? 'bg-danger' : 'bg-success')} />
                <h4 className="font-bold text-text-muted tracking-widest uppercase text-[10px]">Response Payload ({data.timeMs}ms)</h4>
              </div>
              <pre className="bg-[#0d1017] p-6 text-blue-200 rounded-xl shadow-inner border border-white/5 overflow-x-auto text-[12px] leading-relaxed">
                {JSON.stringify(data.response, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 flex flex-col bg-background min-w-0 overflow-hidden relative border-l border-white/5 z-20 shadow-2xl">
      <TabsHeader />

      {activeTab && activeTab.type !== 'welcome' && (
        <div className="px-6 py-3 border-b border-white/5 bg-panel-bg shrink-0 shadow-[0_4px_10px_rgba(0,0,0,0.05)] relative z-30">
          <div className="flex items-center space-x-2.5 mb-1.5">
            <span className={clsx(
              'px-2 py-[2px] text-[10px] font-bold uppercase tracking-widest border rounded',
              activeTab.type === 'tool' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
              activeTab.type === 'prompt' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
              activeTab.type === 'agent' ? 'bg-[#8b5cf6]/10 border-[#8b5cf6]/20 text-[#8b5cf6]' :
              'bg-accent/10 border-accent/20 text-accent'
            )}>
              {activeTab.type} Context
            </span>
            <h2 className="text-[17px] font-extrabold text-foreground tracking-tight truncate">
              {activeTab.data?.name || activeTab.data?.uri || (activeTab.type === 'history' && 'Past Execution View')}
            </h2>
          </div>
          <p className="text-[12px] text-text-muted max-w-3xl truncate opacity-90">{activeTab.data?.description || 'History Snapshot Details'}</p>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col z-10 bg-background/50 relative">
        {renderContent()}
      </div>
    </div>
  );
}
