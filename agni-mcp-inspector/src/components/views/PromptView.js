"use client";

import { useMcp } from '@/context/McpContext';
import { Play, Check, Copy, Loader2, AlertTriangle } from 'lucide-react';
import { useState, useCallback } from 'react';
import clsx from 'clsx';
import { useToast } from '@/context/ToastContext';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { humanizeErrorMessage } from '@/lib/humanizeError';

function ErrorCard({ error }) {
    const friendlyMessage = humanizeErrorMessage(error);
    const technicalMessage = error?.message || JSON.stringify(error, null, 2);

    return (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 bg-red-500/10 border-b border-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-red-400 font-bold text-sm tracking-wide">Execution Failed</span>
            </div>
            <div className="p-5 space-y-3">
                <p className="text-red-200 text-sm leading-relaxed">
                    {friendlyMessage}
                </p>
                {technicalMessage && technicalMessage !== friendlyMessage && (
                    <p className="text-red-300/70 text-xs font-mono leading-relaxed">
                        Technical details: {technicalMessage}
                    </p>
                )}
            </div>
        </div>
    );
}

function getPromptLoadingLabel(promptName = '') {
    const normalized = promptName.toLowerCase();

    if (normalized.includes('analyze')) return 'Analyzing code...';
    if (normalized.includes('architecture')) return 'Designing architecture...';

    return 'Generating AI response...';
}

export default function PromptView({ tab }) {
    const { execute, updateTabState, groqApiKey } = useMcp();
    const { addToast } = useToast();
    const [isExecuting, setIsExecuting] = useState(false);
    const [copied, setCopied] = useState(false);

    const prompt = tab.data;
    const result = tab.result;
    const inputs = tab.itemState?.inputs || Object.fromEntries(
        (prompt?.arguments || []).map((arg) => [arg.name, ''])
    );
    const hasApiKey = !!groqApiKey?.trim();

    const handleInputChange = (name, val) => {
        const newInputs = { ...inputs, [name]: val };
        updateTabState(tab.id, { inputs: newInputs });
    };

    const handleExecute = async () => {
        if (!prompt?.name) return;
        if (!hasApiKey) {
            addToast('Add your API key to enable this prompt.', 'error');
            return;
        }
        if (prompt.arguments) {
            for (const arg of prompt.arguments) {
                if (arg.required && (!inputs[arg.name] || inputs[arg.name].trim() === '')) {
                    addToast(`Validation Error: ${arg.name} is required.`, 'error');
                    return;
                }
            }
        }
        setIsExecuting(true);
        await execute('prompt', prompt.name, inputs, tab.id);
        setIsExecuting(false);
    };

    const copyToClipboard = useCallback(() => {
        if (!result) return;
        navigator.clipboard.writeText(JSON.stringify(result.error || result.result, null, 2));
        setCopied(true);
        addToast('Copied to clipboard', 'success');
        setTimeout(() => setCopied(false), 2000);
    }, [addToast, result]);

    const extractMessages = (resultObj) => {
        const raw = resultObj?.content || resultObj?.messages || [];
        return Array.isArray(raw) ? raw : [];
    };

    const executionDisabled = isExecuting || !hasApiKey;

    return (
        <div className="flex-1 grid grid-cols-2 overflow-hidden divide-x divide-[#1f2937] h-full">
            <div className="flex flex-col h-full bg-[#0f1117] overflow-hidden relative">
                <div className="px-4 py-3 bg-[#0d1017]/80 backdrop-blur-sm border-b border-[#1f2937] flex justify-between items-center text-xs font-semibold text-[#6b7280] tracking-widest shrink-0">
                    <span>PROMPT ENGINE</span>
                    <button
                        onClick={handleExecute}
                        disabled={executionDisabled}
                        title={!hasApiKey ? 'Add API key to enable' : 'Run Prompt'}
                        className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-5 py-1.5 rounded-md flex items-center space-x-2 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-[#8b5cf6]/20 font-bold text-[11px] tracking-wide"
                    >
                        {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>{isExecuting ? 'Running Analysis...' : 'Run Prompt'}</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#0f1117]">
                    {!hasApiKey && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                            Add your API key to enable prompt execution.
                        </div>
                    )}
                    {(!prompt?.arguments || prompt.arguments.length === 0) ? (
                        <div className="text-center text-[#6b7280] italic opacity-60 mt-10 text-sm">
                            No arguments required to run this prompt.
                        </div>
                    ) : (
                        prompt.arguments.map(arg => (
                            <div key={arg.name} className="space-y-2 relative">
                                <label className="block text-sm font-bold text-white">
                                    {arg.name}
                                    {arg.required && <span className="text-red-400 ml-1">*</span>}
                                </label>
                                {arg.description && (
                                    <p className="text-[11px] text-[#6b7280] uppercase tracking-wider">{arg.description}</p>
                                )}
                                <textarea
                                    value={inputs[arg.name] || ''}
                                    onChange={(e) => handleInputChange(arg.name, e.target.value)}
                                    className="w-full bg-[#161b27] border border-[#2d3748] rounded-xl p-4 text-[13px] font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] focus:border-[#8b5cf6] transition-all duration-300 min-h-[150px] resize-y shadow-inner placeholder-[#4b5563]"
                                    placeholder={`// Enter execution parameters for ${arg.name}...`}
                                    spellCheck="false"
                                    style={{ fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace' }}
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="flex flex-col h-full bg-[#0d1017] overflow-hidden relative">
                <div className="px-4 py-3 bg-[#0d1017]/80 backdrop-blur-sm border-b border-[#1f2937] flex justify-between items-center text-xs font-semibold text-[#6b7280] tracking-widest shrink-0">
                    <span>EXECUTION OUTPUT</span>
                    <div className="flex space-x-3 items-center">
                        {result?.timeMs !== undefined && (
                            <span className={clsx(
                                'font-mono font-bold bg-[#0f1117] px-2 py-0.5 rounded border text-[11px]',
                                result.error ? 'text-red-400 border-red-500/20' : 'text-emerald-400 border-emerald-500/20'
                            )}>
                                {result.timeMs}ms
                            </span>
                        )}
                        <button onClick={copyToClipboard} className="hover:text-white transition-colors p-1" title="Copy Raw Response">
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto w-full min-h-0 custom-scrollbar relative">
                    {isExecuting && (
                        <div className="absolute inset-0 z-10 bg-[#0d1017]/70 backdrop-blur-md flex flex-col items-center justify-center text-[#8b5cf6] space-y-4 animate-in fade-in">
                            <div className="relative">
                                <div className="absolute inset-0 bg-[#8b5cf6]/30 blur-2xl rounded-full scale-150" />
                                <Loader2 className="w-8 h-8 animate-spin relative z-10" />
                            </div>
                            <span className="font-bold relative z-10 tracking-[0.25em] text-[10px] uppercase">{getPromptLoadingLabel(prompt?.name)}</span>
                        </div>
                    )}

                    <div className="p-6">
                        {result ? (
                            result.error ? (
                                <ErrorCard error={result.error} />
                            ) : (
                                <div className="space-y-6">
                                    {extractMessages(result.result).map((msg, i) => {
                                        const text = msg.type === 'text'
                                            ? msg.text
                                            : (msg.content?.type === 'text' ? msg.content.text : JSON.stringify(msg.content || msg, null, 2));

                                        return (
                                            <div key={i} className="animate-in slide-in-from-bottom-2 fade-in duration-500">
                                                <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6 shadow-sm">
                                                    <MarkdownRenderer text={text} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ) : (
                            <div className="flex h-full items-center justify-center py-20">
                                <div className="text-center space-y-4 opacity-40">
                                    <div className="relative mx-auto w-16 h-16">
                                        <div className="absolute inset-0 bg-[#8b5cf6]/20 rounded-full blur-xl" />
                                        <Play className="w-16 h-16 relative" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold tracking-widest uppercase">Awaiting Prompts</p>
                                        <p className="text-[11px] text-[#6b7280]">Fill in the arguments and run</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
