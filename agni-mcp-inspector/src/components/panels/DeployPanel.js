"use client";

import { useState } from 'react';
import { X, Rocket, Copy, Check, ExternalLink, Server, Train } from 'lucide-react';
import clsx from 'clsx';

// ─── Config generators ──────────────────────────────────────────────────────
function renderConfig(platform, { projectName, language }) {
    const name = projectName || 'agni-project';
    const isNode = language !== 'python';

    if (platform === 'render') {
        return {
            filename: 'render.yaml',
            config: `services:
  - type: web
    name: ${name}
    runtime: ${isNode ? 'node' : 'python'}
    buildCommand: ${isNode ? 'npm install' : 'pip install -r requirements.txt'}
    startCommand: ${isNode ? 'node index.js' : 'python main.py'}
    envVars:
      - key: NODE_ENV
        value: production
    plan: free`,
            steps: [
                'Go to https://render.com and sign in',
                'Click "New +" → "Web Service"',
                'Connect your GitHub repo',
                'Paste the render.yaml config OR fill in the form fields',
                'Click "Create Web Service"',
                'Your app will be live at render.com within ~2 minutes',
            ],
            url: 'https://render.com',
            color: '#46E3B7',
            label: 'Render',
        };
    }

    if (platform === 'railway') {
        return {
            filename: 'railway.json',
            config: JSON.stringify({
                $schema: 'https://railway.app/railway.schema.json',
                build: { builder: 'NIXPACKS' },
                deploy: {
                    startCommand: isNode ? 'node index.js' : 'python main.py',
                    restartPolicyType: 'ON_FAILURE',
                    restartPolicyMaxRetries: 3,
                },
            }, null, 2),
            steps: [
                'Go to https://railway.app and sign in',
                'Click "New Project" → "Deploy from GitHub"',
                'Select your repo (push the downloaded ZIP first)',
                'Add the railway.json to your project root',
                'Railway auto-detects Node.js / Python — no extra config needed',
                'Your app gets a public URL instantly',
            ],
            url: 'https://railway.app',
            color: '#B044F8',
            label: 'Railway',
        };
    }
}

// ─── CopyButton ──────────────────────────────────────────────────────────────
function CopyButton({ text, label = 'COPY' }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={handleCopy}
            className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold border transition-all duration-200',
                copied
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                    : 'bg-[#1f2937] border-[#2d3748] text-[#6b7280] hover:text-white hover:bg-[#2d3748]'
            )}
        >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'COPIED' : label}
        </button>
    );
}

// ─── Platform Card ───────────────────────────────────────────────────────────
function PlatformCard({ platform, meta }) {
    const cfg = renderConfig(platform, meta);
    const [open, setOpen] = useState(false);

    return (
        <div className="border border-[#1f2937] rounded-xl overflow-hidden bg-[#111827]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: cfg.color + '20', border: `1px solid ${cfg.color}30` }}
                    >
                        {platform === 'render' ? (
                            <Server className="w-4 h-4" style={{ color: cfg.color }} />
                        ) : (
                            <Train className="w-4 h-4" style={{ color: cfg.color }} />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">{cfg.label}</p>
                        <p className="text-[10px] text-[#6b7280]">Free tier available • Auto-deploy from GitHub</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={cfg.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-bold text-[#6b7280] hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
                    >
                        <ExternalLink className="w-3 h-3" /> Open
                    </a>
                    <button
                        onClick={() => setOpen(v => !v)}
                        className="text-[10px] font-bold text-[#6b7280] hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
                    >
                        {open ? 'Hide' : 'Show'} Config
                    </button>
                </div>
            </div>

            {/* Steps */}
            <div className="px-5 pb-4 space-y-1.5">
                {cfg.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-[12px] text-[#9ca3af]">
                        <span
                            className="shrink-0 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center mt-0.5"
                            style={{ background: cfg.color + '20', color: cfg.color }}
                        >{i + 1}</span>
                        {step}
                    </div>
                ))}
            </div>

            {/* Config block */}
            {open && (
                <div className="border-t border-[#1f2937]">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#0d1017]">
                        <span className="text-[10px] font-mono font-bold text-[#6b7280] uppercase tracking-widest">{cfg.filename}</span>
                        <CopyButton text={cfg.config} />
                    </div>
                    <pre className="p-4 text-[11px] font-mono text-[#7dd3fc] bg-[#080c10] overflow-x-auto leading-relaxed whitespace-pre">
                        {cfg.config}
                    </pre>
                </div>
            )}
        </div>
    );
}

// ─── DeployPanel ─────────────────────────────────────────────────────────────
export default function DeployPanel({ onClose, projectName, language }) {
    const meta = { projectName, language };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-[#0f1117] border border-[#1f2937] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2937] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#7c3aed]/10 border border-[#7c3aed]/20">
                            <Rocket className="w-4 h-4 text-[#a78bfa]" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white">Deploy Project</h2>
                            <p className="text-[10px] text-[#6b7280]">Choose a platform to host your generated app</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-[#6b7280] hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Platforms */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#4b5563] mb-4">
                        Supported Platforms
                    </p>
                    <PlatformCard platform="render"  meta={meta} />
                    <PlatformCard platform="railway" meta={meta} />
                </div>

                {/* Footer note */}
                <div className="px-6 py-3 border-t border-[#1f2937] shrink-0">
                    <p className="text-[10px] text-[#4b5563] leading-relaxed">
                        💡 Download the project ZIP first, push to a GitHub repo, then connect it to your chosen platform.
                    </p>
                </div>
            </div>
        </div>
    );
}
