import { useState, useCallback } from 'react';

function normalizeError(data) {
    if (!data) return { message: 'Unknown request error' };
    if (typeof data.error === 'string') {
        return {
            type: data.error,
            message: data.message || data.error,
        };
    }
    return data.error || data.result || { message: 'Unknown request error' };
}

export function useMcpClient(url, headers) {
    const [isConnected, setIsConnected] = useState(false);
    const [tools, setTools] = useState([]);
    const [resources, setResources] = useState([]);
    const [prompts, setPrompts] = useState([]);
    const [logs, setLogs] = useState([]);

    const addLog = useCallback((log) => {
        setLogs((prev) => [...prev, { ...log, id: Date.now() + Math.random(), timestamp: new Date() }]);
    }, []);

    const clearLogs = () => setLogs([]);

    const baseCall = async (method, params, overrideUrl = url, extraHeaders = []) => {
        const response = await fetch("/api/mcp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: overrideUrl,
                customHeaders: [...headers, ...extraHeaders],
                payload: {
                    jsonrpc: "2.0",
                    method,
                    params,
                    id: Date.now(),
                },
            }),
        });
        const data = await response.json();
        return { response, data };
    };

    const fetchResources = async (serverUrl) => {
        try {
            const { data } = await baseCall("resources/list", {}, serverUrl);
            if (data.result?.resources) setResources(data.result.resources);
        } catch {}
    };

    const fetchPrompts = async (serverUrl) => {
        try {
            const { data } = await baseCall("prompts/list", {}, serverUrl);
            if (data.result?.prompts) setPrompts(data.result.prompts);
        } catch {}
    };

    const connect = async (serverUrl) => {
        try {
            const { response, data } = await baseCall("tools/list", {}, serverUrl);
            if (response.ok && data.result) {
                setIsConnected(true);
                setTools(data.result.tools || []);
                addLog({ type: "info", message: `Connected to ${serverUrl}` });
                fetchResources(serverUrl);
                fetchPrompts(serverUrl);
                return { success: true };
            } else {
                setIsConnected(false);
                addLog({ type: "error", message: `Failed to connect: ${data.error?.message || data.message || 'Unknown error'}` });
                return { error: data.error?.message || data.message || 'Failed to connect' };
            }
        } catch (err) {
            setIsConnected(false);
            addLog({ type: "error", message: `Connection error: ${err.message}` });
            return { error: err.message };
        }
    };

    const disconnect = () => {
        setIsConnected(false);
        setTools([]);
        setResources([]);
        setPrompts([]);
        addLog({ type: "info", message: "Disconnected" });
    };

    const execute = async (type, name, args, extraHeaders = []) => {
        const method = type === 'tool' ? 'tools/call' : 'prompts/run';
        const startTime = performance.now();
        addLog({ type: "request", method: `${method}: ${name}`, payload: args });

        try {
            const { response, data } = await baseCall(method, { name, arguments: args }, url, extraHeaders);
            const timeMs = Math.round(performance.now() - startTime);

            const finalResult = {
                result: data.result,
                error: (!response.ok || data.error || data.result?.isError) ? normalizeError(data) : null,
                timeMs,
                statusCode: response.status,
                meta: data.meta || data.result?.meta || null,
            };

            if (finalResult.error) {
                addLog({ type: "response_error", method: `${method}: ${name}`, response: data, timeMs });
            } else {
                addLog({ type: "response", method: `${method}: ${name}`, response: data.result, timeMs });
            }
            return finalResult;
        } catch (err) {
            addLog({ type: "error", message: `Execution failed: ${err.message}` });
            return { error: { message: err.message }, timeMs: 0 };
        }
    };

    return {
        isConnected,
        tools,
        resources,
        prompts,
        logs,
        clearLogs,
        connect,
        disconnect,
        execute,
    };
}