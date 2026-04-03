"use client";

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Code2 } from 'lucide-react';

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyButton({ text, className = '', size = 'sm' }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    }, [text]);

    return (
        <button
            onClick={handleCopy}
            title="Copy to clipboard"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold tracking-wide transition-all duration-200
                ${copied
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 hover:bg-white/10 text-[#a0aec0] hover:text-white border border-white/10'
                } ${className}`}
        >
            {copied
                ? <><Check className="w-3 h-3" /> COPIED</>
                : <><Copy className="w-3 h-3" /> COPY</>
            }
        </button>
    );
}

// ─── Inline Code ──────────────────────────────────────────────────────────────
function InlineCode({ children, ...props }) {
    return (
        <code
            className="font-mono text-[12px] bg-[#1e2433] text-[#7dd3fc] px-1.5 py-0.5 rounded border border-[#2d3748]"
            {...props}
        >
            {children}
        </code>
    );
}

// ─── Code Block Component (react-markdown v10+) ───────────────────────────────
// In v10, `pre` wraps block code. We intercept `pre` to render our styled block.
function CodeBlock({ children, node, ...props }) {
    // `children` here is the <code> element from react-markdown
    // Extract language and raw text from it
    const codeEl = Array.isArray(children) ? children[0] : children;
    const className = codeEl?.props?.className || '';
    const match = /language-(\w+)/.exec(className);
    const lang = match ? match[1] : 'text';
    const codeString = codeEl?.props?.children
        ? String(codeEl.props.children).replace(/\n$/, '')
        : '';

    // Custom oneDark overrides to match VS Code feel
    const customStyle = {
        ...oneDark,
        'pre[class*="language-"]': {
            ...oneDark['pre[class*="language-"]'],
            margin: 0,
            padding: '1.25rem',
            background: '#0d1017',
            borderRadius: '0',
            fontSize: '13px',
            lineHeight: '1.7',
        },
        'code[class*="language-"]': {
            ...oneDark['code[class*="language-"]'],
            background: 'transparent',
            fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace',
        },
    };

    return (
        <div className="relative group my-4 rounded-xl overflow-hidden border border-[#2d3748] shadow-lg shadow-black/30">
            {/* Code block header bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#161b27] border-b border-[#2d3748]">
                <div className="flex items-center gap-2">
                    <Code2 className="w-3.5 h-3.5 text-[#6b7280]" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6b7280]">
                        {lang}
                    </span>
                </div>
                <CopyButton text={codeString} />
            </div>

            {/* Syntax highlighted code */}
            <SyntaxHighlighter
                style={customStyle}
                language={lang}
                PreTag="div"
                wrapLongLines={true}
                customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    background: '#0d1017',
                    fontSize: '13px',
                    lineHeight: '1.7',
                }}
                codeTagProps={{
                    style: {
                        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace',
                    }
                }}
            >
                {codeString}
            </SyntaxHighlighter>
        </div>
    );
}

// ─── Main Markdown Renderer ───────────────────────────────────────────────────
/**
 * MarkdownRenderer — premium shared component for rendering AI tool responses.
 * Supports: headings, bold, italic, lists, code blocks w/ syntax highlighting & copy.
 *
 * @param {string} text  — raw markdown string
 * @param {boolean} compact — if true, reduce spacing
 */
export default function MarkdownRenderer({ text, compact = false }) {
    if (!text) return null;

    // Normalize escaped newlines (e.g. \\n → actual newline)
    const normalizedText = text
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '');

    return (
        <div className={`markdown-body ${compact ? 'space-y-2' : 'space-y-3'}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // ── Headings ───────────────────────────────────────
                    h1: ({ children }) => (
                        <h1 className="text-lg font-bold text-white mt-6 mb-3 pb-2 border-b border-[#2d3748] tracking-tight">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-base font-bold text-white mt-5 mb-2 tracking-tight">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-sm font-bold text-[#8b5cf6] mt-4 mb-2 uppercase tracking-wider">
                            {children}
                        </h3>
                    ),
                    h4: ({ children }) => (
                        <h4 className="text-sm font-semibold text-[#a0aec0] mt-3 mb-1.5 uppercase tracking-wider">
                            {children}
                        </h4>
                    ),

                    // ── Paragraphs ─────────────────────────────────────
                    p: ({ children }) => (
                        <p className="text-sm text-[#cbd5e1] leading-relaxed">
                            {children}
                        </p>
                    ),

                    // ── Lists ──────────────────────────────────────────
                    ul: ({ children }) => (
                        <ul className="space-y-1 my-2 pl-4">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="space-y-1 my-2 pl-5 list-decimal">
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => (
                        <li className="text-sm text-[#cbd5e1] leading-relaxed list-none flex items-start gap-2">
                            <span className="text-[#8b5cf6] mt-1 shrink-0">▸</span>
                            <span>{children}</span>
                        </li>
                    ),

                    // ── Text Formatting ────────────────────────────────
                    strong: ({ children }) => (
                        <strong className="font-bold text-white">{children}</strong>
                    ),
                    em: ({ children }) => (
                        <em className="italic text-[#a0aec0]">{children}</em>
                    ),

                    // ── Blockquote ─────────────────────────────────────
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-[#8b5cf6] pl-4 my-3 text-[#a0aec0] italic text-sm bg-[#8b5cf6]/5 py-2 pr-3 rounded-r-lg">
                            {children}
                        </blockquote>
                    ),

                    // ── Horizontal Rule ────────────────────────────────
                    hr: () => (
                        <hr className="border-[#2d3748] my-4" />
                    ),

                    // ── Tables ─────────────────────────────────────────
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-4 rounded-lg border border-[#2d3748]">
                            <table className="w-full text-sm">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="bg-[#161b27] text-[#a0aec0] text-xs uppercase tracking-wider">
                            {children}
                        </thead>
                    ),
                    tbody: ({ children }) => (
                        <tbody className="divide-y divide-[#2d3748]">{children}</tbody>
                    ),
                    tr: ({ children }) => (
                        <tr className="hover:bg-[#161b27]/50 transition-colors">{children}</tr>
                    ),
                    th: ({ children }) => (
                        <th className="px-4 py-2 text-left font-semibold">{children}</th>
                    ),
                    td: ({ children }) => (
                        <td className="px-4 py-2 text-[#cbd5e1]">{children}</td>
                    ),

                    // ── Code ───────────────────────────────────────────
                    // In react-markdown v10: `pre` wraps block code, `code` is inline
                    pre: CodeBlock,
                    code: ({ children, className, ...props }) => {
                        // If className has language-xxx it's a block (inside <pre>)
                        // but in v10, `pre` is overridden above, so `code` here = inline only
                        return <InlineCode {...props}>{children}</InlineCode>;
                    },
                }}
            >
                {normalizedText}
            </ReactMarkdown>
        </div>
    );
}
