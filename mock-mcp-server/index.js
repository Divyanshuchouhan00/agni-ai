require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
function createGroqClient(apiKey) {
    return new OpenAI({
        apiKey,
        baseURL: GROQ_BASE_URL,
    });
}

function isDev() {
    return process.env.NODE_ENV !== 'production';
}

function logKeyMode(message) {
    if (isDev()) {
        console.log(message);
    }
}

async function runAI(userPrompt, { systemPrompt, temperature = 0.7, model = DEFAULT_MODEL, apiKey } = {}) {
    const messages = [
        {
            role: 'system',
            content: systemPrompt || 'You are an expert AI developer assistant. Provide precise, well-structured, markdown-formatted responses. Use headings, bullets, and fenced code blocks where appropriate.',
        },
        { role: 'user', content: userPrompt },
    ];

    const client = createGroqClient(apiKey);
    const response = await client.chat.completions.create({ model, messages, temperature });

    return {
        text: response.choices[0].message.content,
        byok: {
            used: 'user',
            fallbackUsed: false,
            message: null,
        },
    };
}

function normalizeResult(result) {
    if (typeof result === 'string') {
        return { text: result, meta: null };
    }

    if (result && typeof result === 'object' && typeof result.text === 'string') {
        return {
            text: result.text,
            meta: result.byok ? { byok: result.byok } : null,
        };
    }

    return { text: String(result ?? ''), meta: null };
}

const tools = [
    { name: 'analyze_code', category: 'Code', description: 'Identifies bugs and anti-patterns in code using AI', inputSchema: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string', enum: ['js', 'py', 'rs', 'go'] } }, required: ['code'] } },
    { name: 'optimize_code', category: 'Code', description: 'Suggests AI-powered performance improvements', inputSchema: { type: 'object', properties: { code: { type: 'string' }, strictMode: { type: 'boolean' } }, required: ['code'] } },
    { name: 'find_bugs', category: 'Code', description: 'Deep static analysis to detect edge cases and bugs', inputSchema: { type: 'object', properties: { source: { type: 'string' } }, required: ['source'] } },
    { name: 'convert_code', category: 'Code', description: 'Transpiles syntax between programming languages via AI', inputSchema: { type: 'object', properties: { code: { type: 'string' }, targetLang: { type: 'string' } }, required: ['code', 'targetLang'] } },
    { name: 'generate_code', category: 'Code', description: 'Writes production-quality code from a prompt', inputSchema: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] } },
    { name: 'parse_json', category: 'Data', description: 'Recursively parses and validates JSON fields', inputSchema: { type: 'object', properties: { payload: { type: 'string' } }, required: ['payload'] } },
    { name: 'validate_json', category: 'Data', description: 'Checks JSON validity and structure', inputSchema: { type: 'object', properties: { data: { type: 'string' } }, required: ['data'] } },
    { name: 'format_json', category: 'Data', description: 'Prettifies raw JSON with configurable indentation', inputSchema: { type: 'object', properties: { rawData: { type: 'string' }, indent: { type: 'number' } }, required: ['rawData'] } },
    { name: 'csv_to_json', category: 'Data', description: 'Converts CSV data to a structured JSON array', inputSchema: { type: 'object', properties: { csvData: { type: 'string' } }, required: ['csvData'] } },
    { name: 'fetch_api_data', category: 'API', description: 'Executes a real HTTP GET request and returns response', inputSchema: { type: 'object', properties: { endpoint: { type: 'string' } }, required: ['endpoint'] } },
    { name: 'test_endpoint', category: 'API', description: 'Pings an endpoint and validates HTTP status code', inputSchema: { type: 'object', properties: { url: { type: 'string' }, expectedStatus: { type: 'number' } }, required: ['url'] } },
    { name: 'generate_request', category: 'API', description: 'AI-builds a curl command with headers and payload', inputSchema: { type: 'object', properties: { method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] }, payload: { type: 'string' }, endpoint: { type: 'string' } }, required: ['method'] } },
    { name: 'summarize_text', category: 'AI', description: 'NLP-powered text summarization to target word count', inputSchema: { type: 'object', properties: { document: { type: 'string' }, words: { type: 'number' } }, required: ['document'] } },
    { name: 'chat_with_ai', category: 'AI', description: 'Conversational AI reasoning engine', inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, temperature: { type: 'number' } }, required: ['prompt'] } },
    { name: 'generate_email', category: 'AI', description: 'Drafts professional AI-generated emails', inputSchema: { type: 'object', properties: { to: { type: 'string' }, context: { type: 'string' } }, required: ['to', 'context'] } },
    { name: 'resume_analyzer', category: 'AI', description: 'AI-powered ATS score analysis and resume feedback', inputSchema: { type: 'object', properties: { resumeText: { type: 'string' } }, required: ['resumeText'] } },
    { name: 'run_sql_query', category: 'Database', description: 'AI explains and simulates SQL query execution', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] } },
    { name: 'generate_schema', category: 'Database', description: 'AI builds relational SQL schemas from entity list', inputSchema: { type: 'object', properties: { entities: { type: 'array' } }, required: ['entities'] } },
    { name: 'optimize_query', category: 'Database', description: 'Analyzes and rewrites SQL queries for performance', inputSchema: { type: 'object', properties: { sql: { type: 'string' } }, required: ['sql'] } },
    { name: 'calculate_expression', category: 'Utility', description: 'Safely evaluates mathematical expressions', inputSchema: { type: 'object', properties: { math: { type: 'string' } }, required: ['math'] } },
    { name: 'generate_uuid', category: 'Utility', description: 'Generates cryptographically secure V4 UUIDs', inputSchema: { type: 'object', properties: { count: { type: 'number' } }, required: [] } },
    { name: 'format_date', category: 'Utility', description: 'Converts timestamps to human-readable ISO formats', inputSchema: { type: 'object', properties: { timestamp: { type: 'number' } }, required: ['timestamp'] } },
];

async function handleTool(name, args = {}, aiOpts = {}) {
    const ai = (prompt, opts = {}) => runAI(prompt, { ...aiOpts, ...opts });

    if (name === 'analyze_code') {
        const lang = args.language || 'javascript';
        return ai(`Analyze the following ${lang} code.\n\nProvide:\n### Analysis\n- bugs, anti-patterns, issues\n- severity for each issue\n\n### Suggestions\n- fixes for each issue\n\n### Improved Code\nReturn a fixed version in a fenced code block.\n\nCode:\n\`\`\`${lang}\n${args.code}\n\`\`\``);
    }

    if (name === 'optimize_code') {
        const strict = args.strictMode ? ' Apply strict mode optimizations.' : '';
        return ai(`Optimize the following code for performance, readability, and best practices.${strict}\n\nProvide:\n### Optimization Report\n### Complexity Analysis\n### Optimized Code\n\nCode:\n\`\`\`\n${args.code}\n\`\`\``);
    }

    if (name === 'find_bugs') {
        return ai(`Perform a thorough static analysis on this code. Find bugs, edge cases, security issues, and logic errors.\n\nProvide:\n### Bug Report\n### Fix Recommendations\n\nCode:\n\`\`\`\n${args.source}\n\`\`\``);
    }

    if (name === 'convert_code') {
        return ai(`Convert the following code to ${args.targetLang}. Preserve logic and functionality.\n\nProvide:\n### Conversion Notes\n### ${args.targetLang} Code\n\nOriginal Code:\n\`\`\`\n${args.code}\n\`\`\``);
    }

    if (name === 'generate_code') {
        return ai(`Generate production-quality code for the following requirement:\n\n${args.prompt}\n\nProvide:\n### Implementation Plan\n### Code\n### Usage Example`);
    }

    if (name === 'parse_json') {
        try {
            const parsed = JSON.parse(args.payload);
            const keys = Object.keys(parsed);
            return `### JSON Parse Result\n- **Status**: Valid JSON\n- **Top-level keys (${keys.length})**: ${keys.map(k => `\`${k}\``).join(', ')}\n\n### Parsed Structure\n\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
        } catch (error) {
            return `### JSON Parse Result\n- **Status**: Invalid JSON\n- **Error**: ${error.message}\n\n### Raw Input\n\`\`\`\n${args.payload}\n\`\`\``;
        }
    }

    if (name === 'validate_json') {
        try {
            const parsed = JSON.parse(args.data);
            const parsedType = Array.isArray(parsed) ? 'array' : typeof parsed;
            return `### JSON Validation Result\n- **Status**: Valid JSON\n- **Type**: ${parsedType}\n- **Size**: ${args.data.length} chars\n\n### Formatted\n\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
        } catch (error) {
            return `### JSON Validation Result\n- **Status**: Invalid\n- **Error**: \`${error.message}\``;
        }
    }

    if (name === 'format_json') {
        try {
            const indent = args.indent || 2;
            const parsed = JSON.parse(args.rawData);
            return `### Formatted JSON\n\`\`\`json\n${JSON.stringify(parsed, null, indent)}\n\`\`\``;
        } catch (error) {
            return `### Format Error\n- **Error**: \`${error.message}\``;
        }
    }

    if (name === 'csv_to_json') {
        const lines = String(args.csvData || '').trim().split('\n');
        if (lines.length < 2) return '### CSV Parse Error\n- Need a header row and one data row.';
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row = {};
            headers.forEach((header, index) => { row[header] = values[index] ?? null; });
            return row;
        });
        return `### CSV to JSON Conversion\n- **Rows**: ${rows.length}\n\n### Result\n\`\`\`json\n${JSON.stringify(rows, null, 2)}\n\`\`\``;
    }

    if (name === 'fetch_api_data') {
        const start = Date.now();
        const response = await fetch(args.endpoint);
        const latency = Date.now() - start;
        let body;
        try {
            body = JSON.stringify(await response.json(), null, 2);
        } catch {
            body = await response.text();
        }
        return `### API Response\n- **Endpoint**: \`${args.endpoint}\`\n- **Status**: ${response.status} ${response.statusText}\n- **Latency**: ${latency}ms\n\n### Body\n\`\`\`json\n${body}\n\`\`\``;
    }

    if (name === 'test_endpoint') {
        const start = Date.now();
        try {
            const response = await fetch(args.url, { method: 'HEAD' });
            const latency = Date.now() - start;
            const expected = args.expectedStatus || 200;
            return `### Endpoint Test Result\n- **URL**: \`${args.url}\`\n- **Status**: ${response.status} ${response.statusText}\n- **Expected**: ${expected}\n- **Latency**: ${latency}ms\n- **Result**: ${response.status === expected ? 'PASSED' : 'FAILED'}`;
        } catch (error) {
            return `### Endpoint Test Failed\n- **URL**: \`${args.url}\`\n- **Error**: ${error.message}`;
        }
    }

    if (name === 'generate_request') {
        const endpoint = args.endpoint || 'https://api.example.com/endpoint';
        return ai(`Generate a complete, production-ready ${args.method} HTTP request for: ${endpoint}\n${args.payload ? `Payload context: ${args.payload}` : ''}\n\nProvide:\n### Request Details\n### curl Command\n### JavaScript (fetch)\n### Python (requests)`);
    }

    if (name === 'summarize_text') {
        const target = args.words ? `in approximately ${args.words} words` : 'concisely';
        return ai(`Summarize the following text ${target}.\n\nProvide:\n### Summary\n### Key Points\n\nText:\n${args.document}`);
    }

    if (name === 'chat_with_ai') {
        return ai(args.prompt, { temperature: args.temperature ?? 0.7 });
    }

    if (name === 'generate_email') {
        return ai(`Write a professional email.\n- To: ${args.to}\n- Context: ${args.context}\n\nProvide:\n### Subject\n### Email Body`, {
            systemPrompt: 'You are an expert business communication writer. Write professional, clear, and compelling emails.',
        });
    }

    if (name === 'resume_analyzer') {
        return ai(`Analyze this resume for ATS compatibility and overall quality.\n\nProvide:\n### ATS Score\n### Strengths\n### Issues Found\n### Keyword Gaps\n### Recommendations\n\nResume:\n${args.resumeText}`, {
            systemPrompt: 'You are an expert HR consultant and ATS specialist.',
        });
    }

    if (name === 'run_sql_query') {
        return ai(`Analyze and explain this SQL query, then simulate its result set.\n\nProvide:\n### Query Explanation\n### Simulated Result\n### Performance Notes\n\nQuery:\n\`\`\`sql\n${args.query}\n\`\`\``, {
            systemPrompt: 'You are a senior database engineer and SQL expert.',
        });
    }

    if (name === 'generate_schema') {
        const entities = Array.isArray(args.entities) ? args.entities.join(', ') : String(args.entities);
        return ai(`Design a complete normalized relational schema for these entities: ${entities}\n\nProvide:\n### Entity Relationship Overview\n### Schema (PostgreSQL)\n### Relationship Diagram (text)`, {
            systemPrompt: 'You are a senior database architect specializing in relational schema design.',
        });
    }

    if (name === 'optimize_query') {
        return ai(`Analyze and optimize this SQL query.\n\nProvide:\n### Performance Analysis\n### Explain Plan Simulation\n### Optimized Query\n### Optimization Summary\n\nOriginal Query:\n\`\`\`sql\n${args.sql}\n\`\`\``, {
            systemPrompt: 'You are a senior database performance engineer specializing in query optimization.',
        });
    }

    if (name === 'calculate_expression') {
        try {
            const sanitized = String(args.math || '').replace(/[^0-9+\-*/().,% \t\n]/g, '');
            if (!sanitized.trim()) throw new Error('Expression contains invalid characters');
            const result = Function(`"use strict"; return (${sanitized})`)();
            return `### Calculation Result\n- **Expression**: \`${args.math}\`\n- **Result**: \`${result}\``;
        } catch (error) {
            return `### Calculation Error\n- **Error**: ${error.message}`;
        }
    }

    if (name === 'generate_uuid') {
        const count = Math.min(Math.max(args.count || 1, 1), 20);
        const uuids = Array.from({ length: count }, () => crypto.randomUUID());
        return `### Generated UUID${count > 1 ? 's' : ''}\n${uuids.map(uuid => `- \`${uuid}\``).join('\n')}`;
    }

    if (name === 'format_date') {
        const timestamp = args.timestamp;
        const date = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
        return `### Date Conversion\n- **Input**: \`${timestamp}\`\n- **ISO 8601**: \`${date.toISOString()}\`\n- **UTC**: \`${date.toUTCString()}\`\n- **Local**: \`${date.toLocaleString()}\``;
    }

    throw new Error(`Unknown tool: ${name}`);
}

app.post('/mcp', async (req, res) => {
    const { jsonrpc, id, method, params } = req.body || {};
    const userKey = req.headers['x-groq-key'];
    const trimmedUserKey = typeof userKey === 'string' ? userKey.trim() : '';
    const hasUserKey = trimmedUserKey !== '';
    const customModel = req.get('X-Model') || req.get('x-model') || DEFAULT_MODEL;
    const requiresAiKey = method === 'tools/call' || method === 'prompts/run';

    if (requiresAiKey && !hasUserKey) {
        return res.status(401).json({
            error: 'API_KEY_REQUIRED',
            message: 'Please add your Groq API key in settings to continue.',
        });
    }

    const aiOpts = {
        apiKey: trimmedUserKey,
        model: customModel,
    };

    if (requiresAiKey) {
        logKeyMode('Using USER API key');
    }

    if (jsonrpc !== '2.0') {
        return res.json({ jsonrpc: '2.0', id: id || null, error: { code: -32600, message: 'Invalid Request' } });
    }

    try {
        switch (method) {
            case 'ping':
                return res.json({ jsonrpc: '2.0', id: id || null, result: { ok: true } });

            case 'tools/list':
                return res.json({ jsonrpc: '2.0', id: id || null, result: { tools } });

            case 'tools/call': {
                const { name, arguments: toolArgs = {} } = params || {};
                if (!name) {
                    return res.json({ jsonrpc: '2.0', id: id || null, error: { code: -32602, message: 'Missing tool name' } });
                }
                const resultText = normalizeResult(await handleTool(name, toolArgs, aiOpts));
                const meta = { ...(resultText.meta || {}) };
                return res.json({
                    jsonrpc: '2.0',
                    id: id || null,
                    result: { content: [{ type: 'text', text: resultText.text }], meta },
                    meta,
                });
            }

            case 'prompts/list':
                return res.json({
                    jsonrpc: '2.0',
                    id: id || null,
                    result: {
                        prompts: [
                            { name: 'analyze_code', description: 'AI-powered code analysis with bug detection and suggestions', arguments: [{ name: 'code', description: 'Source code to analyze', required: true }] },
                            { name: 'draft_architecture', description: 'AI proposes a full system architecture', arguments: [{ name: 'requirements', description: 'System requirements', required: true }, { name: 'stack', description: 'Preferred tech stack', required: false }] },
                        ],
                    },
                });

            case 'prompts/run': {
                const { name: promptName, arguments: promptArgs = {} } = params || {};
                if (promptName === 'analyze_code') {
                    const responseText = normalizeResult(await runAI(`Analyze the following code. Find bugs, issues, and suggest an improved version:\n\`\`\`\n${promptArgs.code}\n\`\`\``, aiOpts));
                    const meta = { ...(responseText.meta || {}) };
                    return res.json({
                        jsonrpc: '2.0',
                        id: id || null,
                        result: { messages: [{ role: 'assistant', content: { type: 'text', text: responseText.text } }], meta },
                        meta,
                    });
                }
                if (promptName === 'draft_architecture') {
                    const stack = promptArgs.stack ? ` using the ${promptArgs.stack} stack` : '';
                    const prompt = `Design a complete system architecture${stack} for the following requirements:\n\n${promptArgs.requirements}\n\nReturn the answer in exactly 3 parts and keep it highly visual.\n\n### 1. Short Explanation\n- Use a maximum of 5-6 bullets\n- Keep each bullet concise\n- Focus only on major components and their purpose\n- Avoid long paragraphs\n\n### 2. Architecture Diagram\n- This is the primary output\n- Use a clean ASCII diagram in markdown\n- Always include arrows such as ->, =>, or downward flow\n- Show clear flow direction between components\n- Group components logically by layer when possible: Frontend / Backend / Infra\n- Include useful labels when relevant, such as Auth, Realtime, Queue, Storage\n- Make it readable in under 10 seconds\n\nExample style:\n[Client]\n  |\n  v\n[API Gateway]\n  |\n  v\n[Backend Service] ---> [Queue]\n  |\n  +----> [Database]\n  |\n  +----> [Storage]\n\n### 3. Data Flow\n- Use 3-5 short numbered steps maximum\n- Keep it concise\n\nImportant:\n- Do not write a long essay\n- The diagram is mandatory and should be the clearest part of the answer\n- Prefer visual structure over theory`;
                    const responseText = normalizeResult(await runAI(prompt, aiOpts));
                    const meta = { ...(responseText.meta || {}) };
                    return res.json({
                        jsonrpc: '2.0',
                        id: id || null,
                        result: { messages: [{ role: 'assistant', content: { type: 'text', text: responseText.text } }], meta },
                        meta,
                    });
                }
                return res.json({ jsonrpc: '2.0', id: id || null, error: { code: -32602, message: `Unknown prompt: '${promptName}'` } });
            }

            case 'resources/list':
                return res.json({
                    jsonrpc: '2.0',
                    id: id || null,
                    result: {
                        resources: [
                            { uri: 'file:///logs/system.log', name: 'System Logs', description: 'Recent AI server log entries', mimeType: 'text/plain' },
                            { uri: 'file:///config/mcp.json', name: 'Server Configuration', description: 'Active server environment configuration', mimeType: 'application/json' },
                        ],
                    },
                });

            default:
                return res.json({ jsonrpc: '2.0', id: id || null, error: { code: -32601, message: `Method not found: '${method}'` } });
        }
    } catch (error) {
        console.error('[MCP] Error:', error.message);
        return res.json({ jsonrpc: '2.0', id: id || null, error: { code: -32603, message: `AI Execution Error: ${error.message}` } });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        strictByok: true,
        model: DEFAULT_MODEL,
        tools: tools.length,
        timestamp: new Date().toISOString(),
    });
});

app.listen(PORT, () => {
    console.log(`\nAGNI AI MCP Server running on http://localhost:${PORT}`);
    console.log(`MCP Endpoint: POST http://localhost:${PORT}/mcp`);
    console.log(`Model: ${DEFAULT_MODEL}`);
    console.log(`Tools: ${tools.length} registered\n`);
});