"use client";

import { useMcp } from '@/context/McpContext';
import { Play, Check, Copy, Download, Trash2, Loader2, AlertTriangle, Link2, Terminal, FileJson } from 'lucide-react';
import { useState, useCallback } from 'react';
import clsx from 'clsx';
import { useToast } from '@/context/ToastContext';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { humanizeErrorMessage } from '@/lib/humanizeError';

function detectContentType(text) {
    if (!text) return 'empty';
    const trimmed = text.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try { JSON.parse(trimmed); return 'json'; } catch {}
    }
    if (/#{1,4}\s|```|\*\*|__|\n-\s|\n\d+\.\s/.test(trimmed)) return 'markdown';
    return 'markdown';
}

function JsonViewer({ data }) {
    const [copied, setCopied] = useState(false);
    const str = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(str);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group rounded-xl overflow-hidden border border-[#2d3748] shadow-lg shadow-black/30">
            <div className="flex items-center justify-between px-4 py-2 bg-[#161b27] border-b border-[#2d3748]">
                <div className="flex items-center gap-2">
                    <FileJson className="w-3.5 h-3.5 text-[#6b7280]" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6b7280]">json</span>
                </div>
                <button
                    onClick={handleCopy}
                    className={clsx(
                        'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold tracking-wide transition-all duration-200 border',
                        copied
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-white/5 hover:bg-white/10 text-[#a0aec0] hover:text-white border-white/10'
                    )}
                >
                    {copied ? <><Check className="w-3 h-3" /> COPIED</> : <><Copy className="w-3 h-3" /> COPY</>}
                </button>
            </div>
            <pre className="p-5 text-[13px] font-mono text-[#7dd3fc] bg-[#0d1017] overflow-x-auto leading-relaxed whitespace-pre-wrap break-words" style={{ fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace' }}>
                {str}
            </pre>
        </div>
    );
}

function OutputContent({ content }) {
    const contentType = detectContentType(content);

    if (!content) {
        return (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#161b27] border border-[#2d3748] text-[#6b7280] text-sm">
                <Terminal className="w-4 h-4 shrink-0" />
                <span className="italic">Empty response</span>
            </div>
        );
    }

    if (contentType === 'json') {
        return <JsonViewer data={content} />;
    }

    return (
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6 shadow-sm">
            <MarkdownRenderer text={content} />
        </div>
    );
}

function ErrorCard({ error }) {
    const friendlyMessage = humanizeErrorMessage(error);
    const technicalMessage = error?.message || JSON.stringify(error, null, 2);

    return (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 bg-red-500/10 border-b border-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-red-400 font-bold text-sm tracking-wide">Tool Execution Failed</span>
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

function getLoadingLabel(toolName = '') {
    const normalized = toolName.toLowerCase();

    if (normalized.includes('analyze')) return 'Analyzing code...';
    if (normalized.includes('bug')) return 'Scanning for bugs...';
    if (normalized.includes('api')) return 'Generating API output...';
    if (normalized.includes('convert')) return 'Converting output...';
    if (normalized.includes('optimize')) return 'Optimizing output...';

    return 'Processing tool...';
}

function EmptyState() {
    return (
        <div className="flex h-full items-center justify-center py-20">
            <div className="text-center space-y-4 opacity-40">
                <div className="relative mx-auto w-16 h-16">
                    <div className="absolute inset-0 bg-[#8b5cf6]/20 rounded-full blur-xl" />
                    <Play className="w-16 h-16 relative" />
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-bold tracking-widest uppercase">Waiting for Execution</p>
                    <p className="text-[11px] text-[#6b7280]">Run the tool to see output here</p>
                </div>
            </div>
        </div>
    );
}

export default function ToolView({ tab }) {
    const { callTool: legacyCallTool, execute, updateTabState, updateTabResult, groqApiKey } = useMcp();
    const { addToast } = useToast();
    const [isExecuting, setIsExecuting] = useState(false);
    const [copied, setCopied] = useState(false);

    const tool = tab.data;
    const result = tab.result;
    const props = tool?.inputSchema?.properties || {};
    const reqs = tool?.inputSchema?.required || [];
    const inputs = tab.itemState?.inputs || Object.fromEntries(
        Object.entries(props).map(([key, schema]) => {
            if (schema.type === 'boolean') return [key, false];
            if (schema.type === 'array') return [key, []];
            return [key, ''];
        })
    );
    const hasApiKey = !!groqApiKey?.trim();

    const handleInputChange = (key, val) => {
        const newInputs = { ...inputs, [key]: val };
        updateTabState(tab.id, { inputs: newInputs });
    };

    const handleExecute = async () => {
        if (!tool?.name) return;
        if (!hasApiKey) {
            addToast('Add your API key to enable this tool.', 'error');
            return;
        }
        for (const req of reqs) {
            if (inputs[req] === undefined || inputs[req] === '') {
                addToast(`Validation: Missing required field '${req}'`, 'error');
                return;
            }
        }
        setIsExecuting(true);
        await (execute ? execute('tool', tool.name, inputs, tab.id) : legacyCallTool(tool.name, inputs, tab.id));
        setIsExecuting(false);
    };

    const copyFullResponse = useCallback(() => {
        if (!result) return;
        navigator.clipboard.writeText(JSON.stringify(result.error || result.result, null, 2));
        setCopied(true);
        addToast('Copied to clipboard', 'success');
        setTimeout(() => setCopied(false), 2000);
    }, [addToast, result]);

    const downloadJSON = () => {
        if (!result) return;
        const blob = new Blob([JSON.stringify(result.error || result.result, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tool.name}_execution_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('Blob downloaded successfully', 'success');
    };

    const clearOutput = () => {
        updateTabState(tab.id, { result: null });
        updateTabResult?.(tab.id, null);
        addToast('Output cleared', 'info');
    };

    const copyShareLink = () => {
        const payload = btoa(JSON.stringify({ tool: tool.name, inputs }));
        const link = `${window.location.origin}/?share=${payload}`;
        navigator.clipboard.writeText(link);
        addToast('Shareable session link copied!', 'success');
    };

    const extractTextContent = (resultObj) => {
        if (!resultObj) return null;
        const raw = resultObj?.content || resultObj;
        if (Array.isArray(raw)) {
            return raw.map(item => {
                if (item.type === 'text') return item.text;
                return JSON.stringify(item, null, 2);
            }).join('\n\n');
        }
        if (typeof raw === 'string') return raw;
        return JSON.stringify(raw, null, 2);
    };

    const textContent = result && !result.error ? extractTextContent(result.result) : null;
    const isJsonLike = textContent && detectContentType(textContent) === 'json';
    const executionDisabled = isExecuting || !hasApiKey;

    return (
        <div className="flex-1 grid grid-cols-2 overflow-hidden divide-x divide-[#1f2937] h-full">
            <div className="flex flex-col h-full bg-[#0f1117] overflow-hidden relative">
                <div className="px-4 py-3 bg-[#0d1017]/80 backdrop-blur-sm border-b border-[#1f2937] flex justify-between items-center text-xs font-semibold text-[#6b7280] tracking-widest shrink-0">
                    <span>EXECUTION PARAMETERS</span>
                    <div className="flex space-x-2 items-center">
                        <button
                            onClick={copyShareLink}
                            title="Copy Share Link"
                            className="p-1.5 hover:bg-white/5 rounded text-[#6b7280] hover:text-white transition-colors"
                        >
                            <Link2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleExecute}
                            disabled={executionDisabled}
                            title={!hasApiKey ? 'Add API key to enable' : 'Run Tool'}
                            className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-5 py-1.5 rounded-md flex items-center space-x-2 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-[#8b5cf6]/20 font-bold text-[11px] tracking-wide"
                        >
                            {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                            <span>{isExecuting ? 'Executing...' : 'Run Tool'}</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#0f1117]">
                    {!hasApiKey && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                            Add your API key to enable tool execution.
                        </div>
                    )}
                    {Object.keys(props).length === 0 ? (
                        <div className="text-center text-[#6b7280] italic opacity-60 mt-10 text-sm">
                            This tool does not require input arguments.
                        </div>
                    ) : (
                        Object.entries(props).map(([key, schema]) => {
                            const isRequired = reqs.includes(key);
                            return (
                                <div key={key} className="space-y-2">
                                    <label className="block text-[13px] font-bold text-white tracking-tight">
                                        {key}
                                        {isRequired && <span className="text-red-400 ml-1">*</span>}
                                        <span className="text-[10px] uppercase font-mono text-[#6b7280] ml-3 opacity-60">{schema.type}</span>
                                    </label>
                                    {schema.description && (
                                        <p className="text-[11px] text-[#6b7280] leading-relaxed">{schema.description}</p>
                                    )}

                                    {schema.enum ? (
                                        <select
                                            value={inputs[key] || ''}
                                            onChange={(e) => handleInputChange(key, e.target.value)}
                                            className="w-full bg-[#161b27] border border-[#2d3748] rounded-lg p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] transition-all"
                                        >
                                            <option value="" disabled>Select {key}...</option>
                                            {schema.enum.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    ) : schema.type === 'number' ? (
                                        <input
                                            type="number"
                                            value={inputs[key] || ''}
                                            onChange={(e) => handleInputChange(key, parseFloat(e.target.value))}
                                            className="w-full bg-[#161b27] border border-[#2d3748] rounded-lg p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] transition-all"
                                            placeholder={`Enter ${key}...`}
                                        />
                                    ) : schema.type === 'boolean' ? (
                                        <label className="flex items-center space-x-3 cursor-pointer">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={!!inputs[key]}
                                                    onChange={(e) => handleInputChange(key, e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-10 h-5 bg-[#2d3748] rounded-full peer-checked:bg-[#8b5cf6] transition-colors" />
                                                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow" />
                                            </div>
                                            <span className="text-xs text-[#a0aec0]">Boolean Flag</span>
                                        </label>
                                    ) : (
                                        <textarea
                                            value={inputs[key] || ''}
                                            onChange={(e) => handleInputChange(key, e.target.value)}
                                            className="w-full bg-[#161b27] border border-[#2d3748] rounded-xl p-4 text-[13px] font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] focus:border-[#8b5cf6] transition-all duration-300 min-h-[100px] resize-y shadow-inner placeholder-[#4b5563]"
                                            placeholder={`Enter ${key} value...`}
                                            spellCheck="false"
                                            style={{ fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace' }}
                                        />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="flex flex-col h-full bg-[#0d1017] overflow-hidden relative">
                <div className="px-4 py-3 bg-[#0d1017]/80 backdrop-blur-sm border-b border-[#1f2937] flex justify-between items-center text-xs font-semibold tracking-widest shrink-0 text-[#6b7280]">
                    <div className="flex items-center gap-3">
                        <span>OUTPUT PAYLOAD</span>
                        {result && !result.error && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                                {isJsonLike ? 'JSON' : 'MARKDOWN'}
                            </span>
                        )}
                    </div>
                    <div className="flex space-x-1.5 items-center">
                        {result?.timeMs !== undefined && (
                            <span className={clsx(
                                'font-mono font-bold bg-[#0f1117] px-2 py-0.5 rounded border mr-2 text-[11px]',
                                result.error ? 'text-red-400 border-red-500/20' : 'text-emerald-400 border-emerald-500/20'
                            )}>
                                {result.timeMs}ms
                            </span>
                        )}
                        <button onClick={downloadJSON} disabled={!result} className="hover:bg-white/5 p-1.5 rounded transition-colors disabled:opacity-30" title="Download JSON">
                            <Download className="w-4 h-4" />
                        </button>
                        <button onClick={copyFullResponse} disabled={!result} className="hover:bg-white/5 p-1.5 rounded transition-colors disabled:opacity-30" title="Copy Full Response">
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button onClick={clearOutput} disabled={!result} className="hover:bg-red-500/10 hover:text-red-400 p-1.5 rounded transition-colors disabled:opacity-30 ml-2" title="Clear Output">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                    {isExecuting && (
                        <div className="absolute inset-0 z-10 bg-[#0d1017]/70 backdrop-blur-md flex flex-col items-center justify-center text-[#8b5cf6] space-y-4 animate-in fade-in">
                            <div className="relative">
                                <div className="absolute inset-0 bg-[#8b5cf6]/30 blur-2xl rounded-full scale-150" />
                                <Loader2 className="w-8 h-8 animate-spin relative z-10" />
                            </div>
                            <span className="font-bold relative z-10 tracking-[0.25em] text-[10px] uppercase">{getLoadingLabel(tool?.name)}</span>
                        </div>
                    )}

                    <div className="p-6">
                        {result ? (
                            <div className="animate-in slide-in-from-bottom-2 fade-in duration-500 space-y-4">
                                {result.error ? (
                                    <ErrorCard error={result.error} />
                                ) : (
                                    <OutputContent content={textContent} />
                                )}
                            </div>
                        ) : (
                            <EmptyState />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
