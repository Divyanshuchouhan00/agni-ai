"use client";

import { useState } from 'react';
import { Settings, X, Key, Cpu, RotateCcw, Check, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

const GROQ_MODELS = [
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', badge: 'RECOMMENDED', badgeColor: 'emerald' },
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', badge: 'FAST', badgeColor: 'blue' },
    { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B 32K', badge: 'LONG CTX', badgeColor: 'purple' },
    { id: 'gemma2-9b-it', label: 'Gemma 2 9B', badge: 'LIGHTWEIGHT', badgeColor: 'amber' },
];

export default function SettingsModal({ onClose, settings, onSave, groqApiKey, apiKeyRuntime, onSaveGroqKey, onRemoveGroqKey }) {
    const [localSettings, setLocalSettings] = useState({ ...settings });
    const [apiKeyValue, setApiKeyValue] = useState(groqApiKey || '');
    const [settingsSaved, setSettingsSaved] = useState(false);
    const [keySaved, setKeySaved] = useState(false);
    const [showKey, setShowKey] = useState(false);

    const set = (k, v) => setLocalSettings((prev) => ({ ...prev, [k]: v }));

    const handleSave = () => {
        onSave(localSettings);
        setSettingsSaved(true);
        setTimeout(() => {
            setSettingsSaved(false);
            onClose();
        }, 800);
    };

    const handleSaveKey = () => {
        const saved = onSaveGroqKey(apiKeyValue);
        setKeySaved(saved);
        if (saved) {
            setTimeout(() => setKeySaved(false), 1200);
        }
    };

    const handleRemoveKey = () => {
        setApiKeyValue('');
        setKeySaved(false);
        onRemoveGroqKey();
    };

    const badgeColors = {
        emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    };

    const hasApiKey = apiKeyRuntime?.source === 'user' || !!groqApiKey?.trim();
    const inputIsEmpty = !apiKeyValue.trim() && !groqApiKey?.trim();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-[#0f1117] border border-[#1f2937] rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 fade-in duration-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2937] bg-[#0d1017]">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/20">
                            <Settings className="w-4 h-4 text-[#8b5cf6]" />
                        </div>
                        <h2 className="text-base font-bold text-white tracking-tight">AGNI Settings</h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8b5cf6]/15 text-[#8b5cf6] border border-[#8b5cf6]/30 uppercase tracking-wider">V5</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-[#6b7280] hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-7">
                    {!hasApiKey && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                            API key required. Add your Groq API key to enable AGNI execution.
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-[#6b7280] uppercase tracking-widest">
                            <Key className="w-3.5 h-3.5" />
                            <span>Groq API Key</span>
                            <a
                                href="https://console.groq.com/keys"
                                target="_blank"
                                rel="noreferrer"
                                className="ml-auto text-[#8b5cf6] hover:text-[#a78bfa] flex items-center gap-1 normal-case tracking-normal font-medium transition-colors"
                            >
                                Get free API key from Groq <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>

                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b5563]" />
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={apiKeyValue}
                                onChange={(e) => setApiKeyValue(e.target.value)}
                                placeholder="Enter your Groq API key"
                                className={clsx(
                                    'w-full bg-[#161b27] rounded-lg pl-10 pr-20 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-1 transition-all placeholder-[#4b5563]',
                                    inputIsEmpty
                                        ? 'border border-amber-500/50 focus:border-amber-400 focus:ring-amber-400'
                                        : 'border border-[#2d3748] focus:border-[#8b5cf6] focus:ring-[#8b5cf6]'
                                )}
                            />
                            <button
                                onClick={() => setShowKey((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#6b7280] hover:text-white transition-colors uppercase tracking-wide"
                            >
                                {showKey ? 'HIDE' : 'SHOW'}
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={handleSaveKey}
                                disabled={!apiKeyValue.trim()}
                                className={clsx(
                                    'flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold transition-all',
                                    keySaved
                                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                                        : 'border-[#8b5cf6]/30 bg-[#8b5cf6]/10 text-[#c4b5fd] hover:bg-[#8b5cf6]/15 disabled:opacity-40'
                                )}
                            >
                                {keySaved ? <><Check className="w-3.5 h-3.5" /> Saved</> : 'Save Key'}
                            </button>
                            <button
                                onClick={handleRemoveKey}
                                disabled={!groqApiKey && !apiKeyValue}
                                className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 transition-all hover:bg-red-500/15 disabled:opacity-40"
                            >
                                Remove Key
                            </button>
                            <span className={clsx(
                                'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                                hasApiKey
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                    : 'border-red-500/30 bg-red-500/10 text-red-300'
                            )}>
                                {hasApiKey ? 'Using your API key' : 'No API Key'}
                            </span>
                        </div>

                        <p className="text-[11px] text-[#4b5563]">Stored only in browser localStorage and sent as the `x-groq-key` request header when AGNI makes AI calls.</p>
                        <p className={clsx('text-[11px]', inputIsEmpty ? 'text-amber-300' : 'text-[#6b7280]')}>
                            Get free API key from Groq, then paste it here to unlock all AI features.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-[#6b7280] uppercase tracking-widest">
                            <Cpu className="w-3.5 h-3.5" />
                            <span>AI Model</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {GROQ_MODELS.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => set('model', m.id)}
                                    className={clsx(
                                        'flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all duration-200',
                                        localSettings.model === m.id
                                            ? 'border-[#8b5cf6] bg-[#8b5cf6]/10 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                                            : 'border-[#2d3748] bg-[#161b27] hover:border-[#4b5563]'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={clsx(
                                                'w-3.5 h-3.5 rounded-full border-2 transition-colors',
                                                localSettings.model === m.id ? 'border-[#8b5cf6] bg-[#8b5cf6]' : 'border-[#4b5563]'
                                            )}
                                        />
                                        <span className={clsx('text-sm font-medium', localSettings.model === m.id ? 'text-white' : 'text-[#9ca3af]')}>
                                            {m.label}
                                        </span>
                                    </div>
                                    <span className={clsx('text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider', badgeColors[m.badgeColor])}>
                                        {m.badge}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-[#1f2937] bg-[#0d1017]">
                    <button
                        onClick={() => set('model', 'llama-3.3-70b-versatile')}
                        className="flex items-center gap-1.5 text-[12px] text-[#6b7280] hover:text-white transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset to defaults
                    </button>
                    <button
                        onClick={handleSave}
                        className={clsx(
                            'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all duration-300',
                            settingsSaved
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-lg shadow-[#8b5cf6]/20'
                        )}
                    >
                        {settingsSaved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
