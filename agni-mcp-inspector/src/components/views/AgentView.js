"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMcp } from '@/context/McpContext';
import { useToast } from '@/context/ToastContext';
import {
    BrainCircuit, Play, Square, Copy, Check, ChevronRight, Loader2,
    AlertTriangle, Sparkles, Download, ChevronDown, ChevronUp,
    FileText, Code2, Globe, Terminal, Zap, ClipboardCopy,
    Save, Rocket, RefreshCw
} from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import clsx from 'clsx';
import DeployPanel    from '@/components/panels/DeployPanel';
import { useProjectStore } from '@/hooks/useProjectStore';
import { humanizeErrorMessage } from '@/lib/humanizeError';

// ─── Output Modes ──────────────────────────────────────────────────────────────
const OUTPUT_MODES = [
    { id: 'summary',   label: 'Summary',   icon: FileText, desc: '5–6 line overview' },
    { id: 'developer', label: 'Code',      icon: Code2,    desc: 'Code blocks only' },
    { id: 'full',      label: 'Full',      icon: Sparkles, desc: 'Complete output'  },
];

// ─── Output Tabs ───────────────────────────────────────────────────────────────
const OUTPUT_TABS = [
    { id: 'output',  label: 'Output',  icon: FileText   },
    { id: 'code',    label: 'Code',    icon: Code2      },
    { id: 'api',     label: 'API',     icon: Globe      },
    { id: 'logs',    label: 'Logs',    icon: Terminal   },
];

const QUICK_PROMPTS = [
    { label: 'Build API', value: 'Build REST API for blog system' },
    { label: 'Debug Code', value: 'Find and fix bugs in this code with a short explanation' },
    { label: 'Design System', value: 'Design architecture for a real-time chat application' },
];

/** Get the last fenced code block from text */
function extractFirstCode(text) {
    if (!text) return '';
    const m = text.match(/```(?:\w+)?\n([\s\S]+?)```/);
    return m ? m[1].trim() : text.trim();
}

function getApiSourceText(text) {
    const extracted = extractFirstCode(text);
    return extracted || text || '';
}

/** Guess language for execution */
function guessLanguage(code) {
    if (!code) return 'node';
    if (/require\s*\(\s*['"]express['"]\s*\)/i.test(code)) return 'node';
    if (/^\s*(from\s+flask\b|import\s+flask\b|def\s+\w+|print\s*\()/m.test(code)) return 'python';
    return 'node';
}

// ─── Content Parsers ──────────────────────────────────────────────────────────

/** Extract fenced code blocks from markdown text */
function extractCodeBlocks(text) {
    const blocks = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        blocks.push({ lang: match[1] || 'text', code: match[2].trim() });
    }
    return blocks;
}

/**
 * Parse structured API endpoints from any backend text.
 * Handles: Flask, Express, FastAPI, generic path strings, curl.
 * Returns: Array of { method, path, source }
 */
function parseApiEndpoints(text) {
    const found = [];
    const seen  = new Set();

    const add = (method, path, source) => {
        const key = `${method}:${path}`;
        if (!seen.has(key)) {
            seen.add(key);
            found.push({ method: method.toUpperCase(), path, source });
        }
    };

    const lines = text.split('\n');

    for (const line of lines) {
        const stripped = line.trim();

        // 1. Flask: @app.route("/path", methods=["GET","POST"])
        const flaskRouteMatch = stripped.match(/@(?:app|bp|blueprint)\.[rR]oute\(['"]([^'"]+)['"](?:.*?methods\s*=\s*\[([^\]]+)\])?/);
        if (flaskRouteMatch) {
            const path   = flaskRouteMatch[1];
            const rawMethods = flaskRouteMatch[2];
            if (rawMethods) {
                const methods = rawMethods.match(/['"]([A-Z]+)['"]/g)?.map(m => m.replace(/['"`]/g, '')) || ['GET'];
                methods.forEach(m => add(m, path, 'Flask'));
            } else {
                add('GET', path, 'Flask');
            }
            continue;
        }

        // 2. FastAPI / Express decorator style: @app.get("/path") @app.post("/path")
        const decoratorMatch = stripped.match(/@(?:app|router)\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/);
        if (decoratorMatch) {
            add(decoratorMatch[1], decoratorMatch[2], 'FastAPI');
            continue;
        }

        // 3. Express: app.get('/path', ...) router.post('/path', ...)
        const expressMatch = stripped.match(/(?:app|router)\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/);
        if (expressMatch) {
            add(expressMatch[1], expressMatch[2], 'Express');
            continue;
        }

        // 4. curl: curl -X POST https://host/path OR curl https://host/path
        const curlMatch = stripped.match(/curl\s+(?:-X\s+(\w+)\s+)?(?:https?:\/\/[^\s\/]+)?(\/[^\s'"]+)/);
        if (curlMatch) {
            const method = curlMatch[1] || 'GET';
            const path   = curlMatch[2].split('?')[0].replace(/['"`]$/, '');
            add(method, path, 'curl');
            continue;
        }

        // 5. Generic: strings starting with /api/ /login /register etc (but not markdown image/link syntax)
        const genericMatch = stripped.match(/(?<![\[\("'`])(\/(?:api|v\d|auth|login|register|user|token|refresh|logout|admin|health|status)[\w\-\/]*)/);
        if (genericMatch) {
            add('GET', genericMatch[1].split('?')[0], 'Generic');
        }
    }

    // Fallback: if nothing found, look for any bare /path strings
    if (found.length === 0) {
        const fallbackRegex = /(?<![\[\(])(\/[a-z][\w\-\/]{1,60})/g;
        let m;
        while ((m = fallbackRegex.exec(text)) !== null) {
            const key = `GET:${m[1]}`;
            if (!seen.has(key)) {
                seen.add(key);
                found.push({ method: 'GET', path: m[1], source: 'Fallback' });
            }
            if (found.length >= 20) break;
        }
    }

    return found;
}

/** Legacy thin wrapper kept for compatibility */
function extractApiContent(text) {
    return parseApiEndpoints(text);
}

/** Generate a short 5-6 line summary from the markdown */
function generateSummary(text) {
    // Extract the first ### heading and its following bullet points
    const lines = text.split('\n').filter(l => l.trim());
    const summaryLines = [];
    let inCodeBlock = false;
    let count = 0;

    for (const line of lines) {
        if (line.startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
        if (inCodeBlock) continue;
        // Only prose lines — headings and bullet points
        if (line.startsWith('###') || line.startsWith('##') || line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line)) {
            summaryLines.push(line);
            count++;
            if (count >= 8) break;
        }
    }
    return summaryLines.length > 0
        ? summaryLines.join('\n')
        : text.split('\n').filter(l => !l.startsWith('```') && l.trim()).slice(0, 6).join('\n');
}

/** Highlight important security/endpoint sections */
function extractHighlights(text) {
    const sections = [];
    const sectionRegex = /^###\s*(.+)$/gm;
    const parts = text.split(sectionRegex);

    for (let i = 1; i < parts.length; i += 2) {
        const title = parts[i];
        const content = parts[i + 1] || '';
        const isHighlighted = /security|endpoint|auth|jwt|token|final|code|output/i.test(title);
        if (isHighlighted) {
            sections.push(`### ${title}\n${content.trim()}`);
        }
    }
    return sections.length > 0 ? sections.join('\n\n---\n\n') : text;
}

function getLoadingMessage(stepStatuses) {
    if (stepStatuses.analyze === 'running') return 'Analyzing code...';
    if (stepStatuses.bugs === 'running') return 'Finding bugs...';
    if (stepStatuses.generate === 'running') return 'Generating API...';
    if (stepStatuses.optimize === 'running') return 'Optimizing output...';
    if (stepStatuses.convert === 'running') return 'Converting output...';
    return 'Thinking through the best output...';
}

// ─── Agent Pipeline ────────────────────────────────────────────────────────────
const buildPipeline = (problem, code, targetLang) => [
    {
        id: 'analyze', label: 'Analyze Code', toolName: 'analyze_code', icon: '🔍',
        getArgs: (ctx) => ({ code: ctx.code || problem, language: 'js' }),
        condition: (ctx) => !!ctx.code,
        skipLabel: 'No code provided — skipping analysis',
    },
    {
        id: 'bugs', label: 'Find Bugs', toolName: 'find_bugs', icon: '🐛',
        getArgs: (ctx) => ({ source: ctx.code || problem }),
        condition: (ctx) => !!ctx.code,
        skipLabel: 'No code provided — skipping bug scan',
    },
    {
        id: 'generate', label: 'Generate Solution', toolName: 'generate_code', icon: '⚡',
        getArgs: (ctx) => ({ prompt: problem + (ctx.code ? `\n\nExisting code:\n${ctx.code}` : '') }),
        condition: () => true,
    },
    {
        id: 'optimize', label: 'Optimize Output', toolName: 'optimize_code', icon: '🚀',
        getArgs: (ctx) => ({ code: ctx.generatedCode || ctx.code || problem }),
        condition: () => true,
    },
    ...(targetLang ? [{
        id: 'convert', label: `Convert to ${targetLang}`, toolName: 'convert_code', icon: '🔄',
        getArgs: (ctx) => ({ code: ctx.optimizedCode || ctx.generatedCode || ctx.code || problem, targetLang }),
        condition: () => !!targetLang,
    }] : []),
];

// ─── Sub-components ────────────────────────────────────────────────────────────
function LogLine({ entry }) {
    return (
        <div className="flex items-start gap-3 text-[12px] font-mono">
            <span className="text-[#374151] select-none shrink-0">
                {new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className={clsx('shrink-0', {
                'text-[#7c3aed]':  entry.type === 'step',
                'text-emerald-400': entry.type === 'success',
                'text-red-400':    entry.type === 'error',
                'text-[#4b5563]':  entry.type === 'info',
                'text-yellow-400': entry.type === 'skip',
                'text-[#60a5fa]':  entry.type === 'system',
            })}>
                {entry.type === 'step' && '▶'}{entry.type === 'success' && '✓'}
                {entry.type === 'error' && '✗'}{entry.type === 'info' && '·'}
                {entry.type === 'skip' && '⏭'}{entry.type === 'system' && '◆'}
            </span>
            <span className={clsx('leading-relaxed break-words', {
                'text-white':      entry.type === 'step' || entry.type === 'success',
                'text-red-300':    entry.type === 'error',
                'text-[#6b7280]':  entry.type === 'info' || entry.type === 'skip',
                'text-[#93c5fd]':  entry.type === 'system',
            })}>{entry.message}</span>
        </div>
    );
}

function StepBadge({ step, status }) {
    return (
        <div className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-300 shrink-0', {
            'bg-[#161b27] border-[#2d3748] text-[#4b5563]':             status === 'pending',
            'bg-[#7c3aed]/10 border-[#7c3aed]/40 text-[#a78bfa] animate-pulse': status === 'running',
            'bg-emerald-500/10 border-emerald-500/30 text-emerald-400': status === 'done',
            'bg-red-500/10 border-red-500/30 text-red-400':             status === 'error',
            'bg-[#1f2937] border-[#2d3748] text-[#374151]':             status === 'skipped',
        })}>
            <span>{step.icon}</span>
            <span className="hidden sm:inline">{step.label}</span>
            {status === 'running'  && <Loader2 className="w-3 h-3 animate-spin" />}
            {status === 'done'     && <Check className="w-3 h-3" />}
            {status === 'error'    && <AlertTriangle className="w-3 h-3" />}
        </div>
    );
}

// ─── Code Block Tab Content ────────────────────────────────────────────────────
function CodeTab({ text, onCopy, copied }) {
    const blocks = extractCodeBlocks(text);
    if (!blocks.length) return (
        <div className="flex items-center justify-center h-full text-[#4b5563] text-sm">
            No code blocks found in output.
        </div>
    );
    return (
        <div className="space-y-4 p-6">
            {blocks.map((b, i) => (
                <div key={i} className="rounded-xl overflow-hidden border border-[#1f2937]">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#0d1117] border-b border-[#1f2937]">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">{b.lang || 'code'}</span>
                        <button
                            onClick={() => { navigator.clipboard.writeText(b.code); onCopy(); }}
                            className="text-[10px] text-[#6b7280] hover:text-white flex items-center gap-1"
                        >
                            {copied ? <><Check className="w-3 h-3 text-emerald-400"/>COPIED</> : <><Copy className="w-3 h-3"/>COPY</>}
                        </button>
                    </div>
                    <pre className="p-4 text-[12px] font-mono text-[#e2e8f0] bg-[#080c10] overflow-x-auto leading-relaxed">
                        <code>{b.code}</code>
                    </pre>
                </div>
            ))}
        </div>
    );
}

// ─── Method Badge Colors ───────────────────────────────────────────────────────
const METHOD_STYLES = {
    GET:    'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    POST:   'bg-blue-500/15   border-blue-500/30   text-blue-400',
    PUT:    'bg-amber-500/15  border-amber-500/30  text-amber-400',
    DELETE: 'bg-red-500/15    border-red-500/30    text-red-400',
    PATCH:  'bg-purple-500/15 border-purple-500/30 text-purple-400',
};
const SOURCE_STYLES = {
    Flask:    'text-orange-400  bg-orange-500/10  border-orange-500/20',
    FastAPI:  'text-teal-400    bg-teal-500/10    border-teal-500/20',
    Express:  'text-yellow-400  bg-yellow-500/10  border-yellow-500/20',
    curl:     'text-[#93c5fd]   bg-blue-900/20    border-blue-500/20',
    Generic:  'text-[#9ca3af]   bg-white/5        border-white/10',
    Fallback: 'text-[#6b7280]   bg-white/3        border-white/5',
};

// ─── Single Endpoint Card ──────────────────────────────────────────────────────
function EndpointCard({ ep, baseUrl }) {
    const [copiedEndpoint, setCopiedEndpoint] = useState(false);
    const [copiedCurl, setCopiedCurl]         = useState(false);

    const methodStyle = METHOD_STYLES[ep.method] || METHOD_STYLES.GET;
    const sourceStyle = SOURCE_STYLES[ep.source] || SOURCE_STYLES.Generic;

    const targetBase = baseUrl || 'http://localhost:5000';
    const curlCmd = `curl -X ${ep.method} ${targetBase}${ep.path}${
        ['POST','PUT','PATCH'].includes(ep.method)
            ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '{}'`
            : ''
    }`;

    const copyEndpoint = async () => {
        await navigator.clipboard.writeText(`${ep.method} ${ep.path}`);
        setCopiedEndpoint(true);
        setTimeout(() => setCopiedEndpoint(false), 2000);
    };

    const copyCurl = async () => {
        await navigator.clipboard.writeText(curlCmd);
        setCopiedCurl(true);
        setTimeout(() => setCopiedCurl(false), 2000);
    };

    return (
        <div className="group border border-[#1f2937] hover:border-[#2d3748] rounded-xl bg-[#111827] hover:bg-[#141a24] transition-all duration-200 overflow-hidden">
            {/* Card Header */}
            <div className="flex items-center gap-3 px-4 py-3">
                {/* Method Badge */}
                <span className={clsx(
                    'shrink-0 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-widest border',
                    methodStyle
                )}>
                    {ep.method}
                </span>

                {/* Path */}
                <code className="flex-1 text-[13px] font-mono font-bold text-white tracking-tight truncate">
                    {ep.path}
                </code>

                {/* Source chip */}
                <span className={clsx(
                    'hidden sm:inline-block shrink-0 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border',
                    sourceStyle
                )}>
                    {ep.source}
                </span>

                {/* Copy endpoint */}
                <button
                    onClick={copyEndpoint}
                    title="Copy endpoint"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/5 text-[#6b7280] hover:text-white"
                >
                    {copiedEndpoint
                        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                        : <ClipboardCopy className="w-3.5 h-3.5" />}
                </button>
            </div>

            {/* Curl stretchable row */}
            <div className="border-t border-[#1f2937] px-4 py-2.5 flex items-center justify-between gap-3 bg-[#0d1017]/60">
                <code className="text-[11px] font-mono text-[#4b5563] truncate flex-1">
                    curl -X {ep.method} ...{ep.path}
                </code>
                <button
                    onClick={copyCurl}
                    title="Generate & copy curl command"
                    className={clsx(
                        'shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold border transition-all duration-200',
                        copiedCurl
                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                            : 'bg-[#1f2937] border-[#2d3748] text-[#6b7280] hover:text-white hover:bg-[#2d3748]'
                    )}
                >
                    <Zap className="w-3 h-3" />
                    {copiedCurl ? 'Copied!' : 'curl'}
                </button>
            </div>
        </div>
    );
}

// ─── API Tab ───────────────────────────────────────────────────────────────────
function ApiTab({ finalOutput, liveServerUrl }) {
    if (!finalOutput) {
        return (
            <div className="flex items-center justify-center h-48 text-[#4b5563] text-sm">
                Run the agent first.
            </div>
        );
    }

    const endpoints = parseApiEndpoints(getApiSourceText(finalOutput));

    return (
        <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <Globe className="w-4 h-4 text-[#60a5fa]" />
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-white tracking-tight">API Endpoints</p>
                        <p className="text-[10px] text-[#6b7280]">
                            {liveServerUrl ? `Live server: ${liveServerUrl}` : 'Extracted from agent output'}
                        </p>
                    </div>
                </div>
                <span className="text-[10px] font-mono text-[#4b5563] bg-[#161b27] px-2 py-1 rounded border border-[#2d3748]">
                    {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Cards */}
            {endpoints.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-40">
                    <Globe className="w-10 h-10 text-[#6b7280]" />
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#6b7280]">
                        No API endpoints detected
                    </p>
                    <p className="text-[10px] text-[#4b5563] text-center max-w-xs">
                        Include backend code (Flask, Express, FastAPI) or URL patterns in your input.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {endpoints.map((ep, i) => <EndpointCard key={i} ep={ep} baseUrl={liveServerUrl} />)}
                </div>
            )}

            {/* Method Legend */}
            {endpoints.length > 0 && (
                <div className="flex items-center gap-3 pt-2 flex-wrap">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#4b5563]">Legend:</span>
                    {Object.entries(METHOD_STYLES).map(([m, s]) => (
                        <span key={m} className={clsx('text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border', s)}>
                            {m}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main AgentView ────────────────────────────────────────────────────────────
export default function AgentView() {
    const { execute, tabs, activeTabId, updateTabState, groqApiKey } = useMcp();
    const { addToast } = useToast();
    const { saveProject } = useProjectStore();

    // Inputs
    const [problem, setProblem]       = useState('');
    const [code, setCode]             = useState('');
    const [targetLang, setTargetLang] = useState('');

    // Execution state
    const [isRunning, setIsRunning]     = useState(false);
    const [isDone, setIsDone]           = useState(false);
    const [logs, setLogs]               = useState([]);
    const [stepStatuses, setStepStatus] = useState({});
    const [finalOutput, setFinalOutput] = useState('');
    const [elapsedMs, setElapsedMs]     = useState(null);

    // Output UI state
    const [outputMode, setOutputMode]     = useState('summary');
    const [activeTab, setActiveTab]       = useState('output');
    const [showMore, setShowMore]         = useState(false);
    const [logsExpanded, setLogsExpanded] = useState(false);
    const [copiedCode, setCopiedCode]     = useState(false);
    const [copiedOut, setCopiedOut]       = useState(false);

    const [showDeploy, setShowDeploy]       = useState(false);
    const [isSaving, setIsSaving]           = useState(false);
    const [isExporting, setIsExporting]     = useState(false);

    const logsEndRef   = useRef(null);
    const abortedRef   = useRef(false);
    const startTimeRef = useRef(null);
    const lastPresetTokenRef = useRef(null);
    const problemInputRef = useRef(null);

    const activeAgentTab = tabs.find((tab) => tab.id === activeTabId);
    const preset = activeAgentTab?.data?.preset;

    useEffect(() => {
        if (logsExpanded) logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs, logsExpanded]);

    const pushLog = useCallback((type, msg) => setLogs(p => [...p, { type, message: msg, ts: Date.now() }]), []);
    const setStep = useCallback((id, status) => setStepStatus(p => ({ ...p, [id]: status })), []);

    const reset = useCallback(() => {
        setLogs([]); setStepStatus({}); setFinalOutput(''); setIsDone(false);
        setElapsedMs(null); setShowMore(false); setActiveTab('output');
        abortedRef.current = false;
    }, []);

    // ── Run pipeline ─────────────────────────────────────────────────────────
    const handleRun = useCallback(async (override = {}) => {
        const nextProblem = typeof override.problem === 'string' ? override.problem : problem;
        const nextCode = typeof override.code === 'string' ? override.code : code;
        const nextTargetLang = typeof override.targetLang === 'string' ? override.targetLang : targetLang;

        if (!nextProblem.trim()) { addToast('Describe your goal first.', 'error'); return; }
        if (!groqApiKey?.trim()) { addToast('Add your API key to enable AGNI.', 'error'); return; }
        reset(); setIsRunning(true); abortedRef.current = false;
        startTimeRef.current = Date.now();
        const pipeline = buildPipeline(nextProblem, nextCode, nextTargetLang);
        pushLog('system', `Agent initialized — ${pipeline.length} steps`);
        pushLog('system', `Goal: "${nextProblem.slice(0, 70)}${nextProblem.length > 70 ? '...' : ''}"`);
        pipeline.forEach(s => setStep(s.id, 'pending'));

        const ctx = { code: nextCode, generatedCode: null, optimizedCode: null };
        let lastOutput = ''; let tokenEst = 0;

        for (const step of pipeline) {
            if (abortedRef.current) break;
            if (!step.condition(ctx)) { setStep(step.id, 'skipped'); pushLog('skip', step.skipLabel || `Skipping ${step.label}`); continue; }

            setStep(step.id, 'running');
            pushLog('step', `${step.icon} ${step.label} (${step.toolName})`);
            try {
                const result = await execute('tool', step.toolName, step.getArgs(ctx));
                if (abortedRef.current) break;
                if (result?.error) { setStep(step.id, 'error'); pushLog('error', humanizeErrorMessage(result.error)); continue; }

                const raw  = result?.result?.content || [];
                const text = Array.isArray(raw) ? raw.filter(i => i.type === 'text').map(i => i.text).join('\n\n') : '';
                tokenEst += Math.round(text.length / 4);
                setStep(step.id, 'done');
                pushLog('success', `${step.label} done (~${Math.round(text.length / 4)} tokens)`);
                lastOutput = text;
                if (step.id === 'generate') ctx.generatedCode = text;
                if (step.id === 'optimize') ctx.optimizedCode = text;
            } catch (err) {
                if (!abortedRef.current) { setStep(step.id, 'error'); pushLog('error', humanizeErrorMessage(err)); }
            }
        }

        if (!abortedRef.current) {
            const elapsed = Date.now() - startTimeRef.current;
            setElapsedMs(elapsed);
            pushLog('system', `Done in ${(elapsed / 1000).toFixed(1)}s — ~${tokenEst} tokens`);
            setFinalOutput(lastOutput);
            setIsDone(true);
            addToast('Agent pipeline complete!', 'success');
        }
        setIsRunning(false);
    }, [addToast, code, execute, groqApiKey, problem, pushLog, reset, setStep, targetLang]);

    const handleStop = () => {
        abortedRef.current = true;
        pushLog('system', 'Stopped by user');
        setIsRunning(false); setIsDone(true);
    };

    useEffect(() => {
        if (!preset || !activeAgentTab || isRunning) return;

        const token = preset.token || activeAgentTab.id;
        if (lastPresetTokenRef.current === token) return;

        lastPresetTokenRef.current = token;
        setProblem(preset.problem || '');
        setCode(preset.code || '');
        setTargetLang(preset.targetLang || '');

        if (preset.autoFocus) {
            setTimeout(() => {
                problemInputRef.current?.focus();
            }, 0);
        }

        if (preset.autoRun && preset.problem) {
            setTimeout(() => {
                handleRun({
                    problem: preset.problem || '',
                    code: preset.code || '',
                    targetLang: preset.targetLang || '',
                });
            }, 0);
        }

        updateTabState?.(activeAgentTab.id, { lastPresetToken: token });
    }, [activeAgentTab, handleRun, isRunning, preset, updateTabState]);

    const copyOutput = async () => {
        await navigator.clipboard.writeText(finalOutput);
        setCopiedOut(true); setTimeout(() => setCopiedOut(false), 2000);
    };

    const downloadOutput = () => {
        const blob = new Blob([finalOutput], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `agni_agent_${Date.now()}.md`; a.click();
        URL.revokeObjectURL(url);
    };

    // ── V6: Save Project ─────────────────────────────────────────────────────
    const handleSaveProject = () => {
        if (!finalOutput) { addToast('Nothing to save — run the agent first.', 'error'); return; }
        setIsSaving(true);
        const extractedCode = extractFirstCode(finalOutput);
        const endpoints = parseApiEndpoints(getApiSourceText(finalOutput));
        const id = saveProject({
            name: problem.slice(0, 40) || 'Untitled Project',
            code: extractedCode,
            language: guessLanguage(extractedCode),
            endpoints,
            outputs: {},
            timestamp: new Date().toISOString(),
        });
        addToast('Project saved to localStorage ✓', 'success');
        setTimeout(() => setIsSaving(false), 1500);
    };

    // ── V6: Download ZIP ─────────────────────────────────────────────────────
    const handleDownloadZip = async () => {
        if (!finalOutput) { addToast('Nothing to export — run the agent first.', 'error'); return; }
        setIsExporting(true);
        try {
            const extractedCode = extractFirstCode(finalOutput);
            const endpoints = parseApiEndpoints(getApiSourceText(finalOutput));
            const lang = guessLanguage(extractedCode);
            const resp = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: extractedCode,
                    language: lang,
                    projectName: problem.slice(0, 32).replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'agni-project',
                    endpoints,
                }),
            });
            if (!resp.ok) throw new Error('Export failed');
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = (resp.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/) || [])[1] || 'agni-project.zip';
            a.click();
            URL.revokeObjectURL(url);
            addToast('Project ZIP downloaded ✓', 'success');
        } catch (err) {
            addToast(`Export error: ${err.message}`, 'error');
        } finally {
            setIsExporting(false);
        }
    };

    // ── V6: Server URL callback ───────────────────────────────────────────────
    // ── Derived ───────────────────────────────────────────────────────────────
    const getDisplayContent = () => {
        if (!finalOutput) return '';
        switch (outputMode) {
            case 'summary':   return generateSummary(finalOutput);
            case 'developer': return extractHighlights(finalOutput);
            case 'full':      return finalOutput;
            default:          return finalOutput;
        }
    };

    const displayContent = getDisplayContent();
    const isLong   = displayContent.split('\n').length > 25;
    const pipeline = buildPipeline(problem, code, targetLang);
    const loadingMessage = getLoadingMessage(stepStatuses);

    const detectedLang = guessLanguage(finalOutput ? extractFirstCode(finalOutput) : '');
    const hasApiKey = !!groqApiKey?.trim();

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0d1017]">

            {/* Deploy modal */}
            {showDeploy && (
                <DeployPanel
                    onClose={() => setShowDeploy(false)}
                    projectName={problem.slice(0, 32).replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'agni-project'}
                    language={detectedLang}
                />
            )}

            {/* ── Config Panel ────────────────────────────────────────── */}
            <div className="shrink-0 border-b border-[#1f2937] bg-[#0f1117]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-[#1f2937]">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-[#7c3aed]/10 border border-[#7c3aed]/20">
                            <BrainCircuit className="w-4 h-4 text-[#a78bfa]" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white tracking-tight">AI Agent Mode</h2>
                            <p className="text-[10px] text-[#6b7280]">Guided generation for APIs, architecture, debugging, and code polish</p>
                        </div>
                    </div>

                    {/* Output Mode Toggle */}
                    <div className="flex items-center gap-1 bg-[#161b27] border border-[#2d3748] rounded-lg p-1">
                        {OUTPUT_MODES.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setOutputMode(m.id)}
                                title={m.desc}
                                className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all duration-200', {
                                    'bg-[#7c3aed] text-white shadow-md shadow-[#7c3aed]/30': outputMode === m.id,
                                    'text-[#6b7280] hover:text-white':                       outputMode !== m.id,
                                })}
                            >
                                <m.icon className="w-3 h-3" />
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {/* Run / Stop */}
                    <div className="flex items-center gap-2">
                        {!!finalOutput && !isRunning && (
                            <button
                                onClick={() => handleRun()}
                                disabled={!problem.trim() || !hasApiKey}
                                title={!hasApiKey ? 'Add API key to enable' : 'Regenerate'}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2d3748] bg-[#161b27] text-[#cbd5e1] text-sm font-semibold hover:border-[#7c3aed]/40 hover:text-white transition-all duration-300 disabled:opacity-40"
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                            </button>
                        )}
                        {!isRunning ? (
                            <button
                                onClick={handleRun}
                                disabled={!problem.trim() || !hasApiKey}
                                title={!hasApiKey ? 'Add API key to enable' : 'Run Agent'}
                                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-bold transition-all duration-300 disabled:opacity-40 shadow-lg shadow-[#7c3aed]/20"
                            >
                                <Sparkles className="w-4 h-4" /> Run Agent
                            </button>
                        ) : (
                            <button
                                onClick={handleStop}
                                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-sm font-bold transition-all"
                            >
                                <Square className="w-3.5 h-3.5 fill-current" /> Stop
                            </button>
                        )}
                    </div>
                </div>

                {/* Inputs */}
                <div className="grid grid-cols-3 gap-4 px-6 py-4">
                    <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest">Problem / Goal *</label>
                        <div className="flex flex-wrap gap-2 pb-1">
                            {QUICK_PROMPTS.map((prompt) => (
                                <button
                                    key={prompt.label}
                                    type="button"
                                    disabled={isRunning}
                                    onClick={() => setProblem(prompt.value)}
                                    className="rounded-full border border-[#2d3748] bg-[#161b27] px-3 py-1.5 text-[11px] font-semibold text-[#cbd5e1] transition-all duration-200 hover:border-[#7c3aed]/50 hover:bg-[#7c3aed]/10 hover:text-white disabled:opacity-40"
                                >
                                    {prompt.label}
                                </button>
                            ))}
                        </div>
                        <textarea
                            ref={problemInputRef}
                            value={problem} onChange={e => setProblem(e.target.value)} disabled={isRunning}
                            placeholder="Try: Build REST API for blog system"
                            className="w-full h-[88px] bg-[#161b27] border border-[#2d3748] rounded-xl px-4 py-3 text-[13px] text-white resize-none focus:outline-none focus:ring-1 focus:ring-[#7c3aed] focus:border-[#7c3aed] transition-all placeholder-[#4b5563] disabled:opacity-50 hover:border-[#475569]"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest">Code (optional)</label>
                            <textarea
                                value={code} onChange={e => setCode(e.target.value)} disabled={isRunning}
                                placeholder="// paste code to analyze..."
                                className="w-full h-[40px] bg-[#161b27] border border-[#2d3748] rounded-lg px-3 py-2 text-[12px] font-mono text-white resize-none focus:outline-none focus:ring-1 focus:ring-[#7c3aed] transition-all placeholder-[#4b5563] disabled:opacity-50"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest">Convert to</label>
                            <input
                                value={targetLang} onChange={e => setTargetLang(e.target.value)} disabled={isRunning}
                                placeholder="python, rust, go..."
                                className="w-full bg-[#161b27] border border-[#2d3748] rounded-lg px-3 py-2 text-[12px] text-white focus:outline-none focus:ring-1 focus:ring-[#7c3aed] transition-all placeholder-[#4b5563] disabled:opacity-50"
                            />
                        </div>
                    </div>
                </div>

                {/* Pipeline badges */}
                <div className="flex items-center gap-1.5 px-6 pb-3 overflow-x-auto">
                    {pipeline.map((step, i) => (
                        <div key={step.id} className="flex items-center gap-1.5 shrink-0">
                            <StepBadge step={step} status={stepStatuses[step.id] || 'pending'} />
                            {i < pipeline.length - 1 && <ChevronRight className="w-3 h-3 text-[#374151] shrink-0" />}
                        </div>
                    ))}
                    {elapsedMs !== null && (
                        <span className="ml-auto shrink-0 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                            {(elapsedMs / 1000).toFixed(1)}s
                        </span>
                    )}
                </div>
            </div>

            {/* ── Output Panel ─────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 flex flex-col">

                {/* Tab Bar */}
                <div className="flex items-center border-b border-[#1f2937] bg-[#0f1117] shrink-0">
                    {OUTPUT_TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                'flex items-center gap-1.5 px-5 py-3 text-[12px] font-semibold tracking-wide border-b-2 transition-all duration-200',
                                activeTab === tab.id
                                    ? 'border-[#7c3aed] text-white bg-[#7c3aed]/5'
                                    : 'border-transparent text-[#6b7280] hover:text-[#9ca3af] hover:bg-white/3'
                            )}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                            {tab.id === 'logs' && logs.length > 0 && (
                                <span className="ml-1 bg-[#2d3748] text-[#9ca3af] text-[9px] px-1.5 py-0.5 rounded font-mono">
                                    {logs.length}
                                </span>
                            )}
                        </button>
                    ))}

                    {/* V6 Action Buttons */}
                    {finalOutput && (
                        <div className="ml-auto flex items-center gap-1 pr-4">
                            {/* Copy */}
                            <button onClick={copyOutput} title="Copy output" className="flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-semibold text-[#6b7280] hover:text-white hover:bg-white/5 transition-all">
                                {copiedOut ? <><Check className="w-3 h-3 text-emerald-400" /> COPIED</> : <><Copy className="w-3 h-3" /> COPY</>}
                            </button>
                            {/* Download .md */}
                            <button onClick={downloadOutput} title="Download as Markdown" className="flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-semibold text-[#6b7280] hover:text-white hover:bg-white/5 transition-all">
                                <Download className="w-3 h-3" /> .MD
                            </button>
                            <button
                                onClick={() => handleRun()}
                                disabled={isRunning || !problem.trim() || !hasApiKey}
                                title={!hasApiKey ? 'Add API key to enable' : 'Regenerate output'}
                                className="flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-semibold text-[#6b7280] hover:text-white hover:bg-white/5 transition-all disabled:opacity-40"
                            >
                                <RefreshCw className="w-3 h-3" /> Retry
                            </button>
                            {/* Save */}
                            <button
                                onClick={handleSaveProject}
                                disabled={isSaving}
                                title="Save to local storage"
                                className="flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-semibold text-[#6b7280] hover:text-emerald-400 hover:bg-emerald-500/5 transition-all disabled:opacity-40"
                            >
                                {isSaving ? <Check className="w-3 h-3 text-emerald-400" /> : <Save className="w-3 h-3" />}
                                {isSaving ? 'Saved' : 'Save'}
                            </button>
                            {/* Download ZIP */}
                            <button
                                onClick={handleDownloadZip}
                                disabled={isExporting}
                                title="Download project as ZIP"
                                className="flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-semibold text-[#6b7280] hover:text-blue-400 hover:bg-blue-500/5 transition-all disabled:opacity-40"
                            >
                                {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                .ZIP
                            </button>
                            {/* Deploy */}
                            <button
                                onClick={() => setShowDeploy(true)}
                                title="Deploy to Render / Railway"
                                className="flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-semibold text-[#6b7280] hover:text-[#a78bfa] hover:bg-[#7c3aed]/5 transition-all"
                            >
                                <Rocket className="w-3 h-3" /> Deploy
                            </button>
                        </div>
                    )}
                </div>

                {/* Tab Content */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">

                    {/* OUTPUT TAB */}
                    {activeTab === 'output' && (
                        <div className="p-6">
                            {isRunning && !finalOutput ? (
                                <div className="flex flex-col items-center justify-center h-48 gap-3 text-[#7c3aed]/60">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <span className="text-[11px] font-bold uppercase tracking-widest">{loadingMessage}</span>
                                </div>
                            ) : finalOutput ? (
                                <div className="animate-in fade-in duration-400">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">
                                            {outputMode === 'summary'   && '5–6 line overview'}
                                            {outputMode === 'developer' && 'Key sections highlighted'}
                                            {outputMode === 'full'      && 'Full AI response'}
                                        </span>
                                        {outputMode === 'summary' && (
                                            <button
                                                onClick={() => setOutputMode('full')}
                                                className="text-[10px] font-bold text-[#7c3aed] hover:text-[#a78bfa] flex items-center gap-1 transition-colors"
                                            >
                                                View Full <ChevronDown className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6">
                                        <div className={clsx('overflow-hidden transition-all duration-300', !showMore && isLong && outputMode === 'full' ? 'max-h-[420px]' : 'max-h-none')}>
                                            <MarkdownRenderer text={displayContent} />
                                        </div>
                                        {isLong && outputMode === 'full' && (
                                            <button
                                                onClick={() => setShowMore(v => !v)}
                                                className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-[#2d3748] text-[11px] font-semibold text-[#6b7280] hover:text-white hover:border-[#4b5563] transition-all"
                                            >
                                                {showMore
                                                    ? <><ChevronUp className="w-3.5 h-3.5" /> Collapse</>
                                                    : <><ChevronDown className="w-3.5 h-3.5" /> Show More</>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-center gap-3 opacity-25">
                                    <Play className="w-10 h-10" />
                                    <p className="text-[11px] font-bold uppercase tracking-widest">Choose a quick start or write your own task</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* CODE TAB */}
                    {activeTab === 'code' && (
                        finalOutput
                            ? <CodeTab text={finalOutput} onCopy={() => { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }} copied={copiedCode} />
                            : <div className="flex items-center justify-center h-48 text-[#4b5563] text-sm">Run the agent first.</div>
                    )}

                    {/* API TAB */}
                    {activeTab === 'api' && (
                        <ApiTab finalOutput={finalOutput} liveServerUrl="" />
                    )}

                    {/* LOGS TAB */}
                    {activeTab === 'logs' && (
                        <div className="p-4 bg-[#080c10] min-h-full">
                            <button
                                onClick={() => setLogsExpanded(v => !v)}
                                className="flex items-center gap-2 text-[11px] font-bold text-[#6b7280] hover:text-white mb-3 transition-colors"
                            >
                                {logsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                {logsExpanded ? 'Collapse' : 'Expand'} Activity Log ({logs.length} entries)
                            </button>
                            <div className={clsx('space-y-2 font-mono overflow-hidden transition-all duration-300', logsExpanded ? 'max-h-none' : 'max-h-48')}>
                                {logs.length === 0 ? (
                                    <p className="text-[#4b5563] text-[11px]">No logs yet. Run the agent.</p>
                                ) : (
                                    logs.map((entry, i) => <LogLine key={i} entry={entry} />)
                                )}
                                <div ref={logsEndRef} />
                            </div>
                            {!logsExpanded && logs.length > 5 && (
                                <button
                                    onClick={() => setLogsExpanded(true)}
                                    className="mt-2 text-[10px] font-semibold text-[#7c3aed] hover:text-[#a78bfa] transition-colors"
                                >
                                    + {logs.length - 5} more entries — click to expand
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
