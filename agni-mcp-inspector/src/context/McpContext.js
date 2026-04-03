"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useHistory } from "@/hooks/useHistory";
import { useTools } from "@/hooks/useTools";
import { useMcpClient } from "@/hooks/useMcpClient";

const McpContext = createContext();
const MCP_URL = "http://localhost:3001/mcp";

const SETTINGS_KEY = "agni_v5_settings";
const GROQ_KEY_STORAGE = "agni_groq_key";
const DEFAULT_SETTINGS = {
    model: "llama-3.3-70b-versatile",
};

function loadSettings() {
    try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

function loadGroqApiKey() {
    try {
        return localStorage.getItem(GROQ_KEY_STORAGE) || "";
    } catch {
        return "";
    }
}

function defaultRuntime(hasUserKey) {
    return {
        source: hasUserKey ? "user" : "missing",
        warning: !hasUserKey,
    };
}

export function McpProvider({ children }) {
    const [url, setUrl] = useState(MCP_URL);
    const [servers, setServers] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [groqApiKey, setGroqApiKey] = useState("");
    const [apiKeyRuntime, setApiKeyRuntime] = useState(defaultRuntime(false));
    const [apiKeyNotice, setApiKeyNotice] = useState(null);

    const buildEffectiveHeaders = () => {
        const effective = [...headers];

        if (settings.model) {
            effective.push({ key: "X-Model", value: settings.model });
        }

        effective.push({ key: "X-Groq-Key", value: groqApiKey || "" });

        return effective;
    };

    const client = useMcpClient(url, buildEffectiveHeaders());
    const historyManager = useHistory();
    const toolsManager = useTools(client.tools, client.prompts, client.resources);

    const [tabs, setTabs] = useState([{ id: "welcome", type: "welcome", data: null }]);
    const [activeTabId, setActiveTabId] = useState("welcome");

    useEffect(() => {
        try {
            const savedServers = JSON.parse(localStorage.getItem("mcp_servers") || "[]");
            const savedHeaders = JSON.parse(localStorage.getItem("mcp_headers") || "[]");
            const loadedSettings = loadSettings();
            const legacyApiKey = loadedSettings.apiKey || "";
            const storedGroqKey = loadGroqApiKey() || legacyApiKey;

            if (savedServers.length) setServers(savedServers);
            if (savedHeaders.length) setHeaders(savedHeaders);

            setUrl(MCP_URL);
            setSettings({ model: loadedSettings.model || DEFAULT_SETTINGS.model });
            setGroqApiKey(storedGroqKey);
            setApiKeyRuntime(defaultRuntime(!!storedGroqKey.trim()));

            if (storedGroqKey) {
                localStorage.setItem(GROQ_KEY_STORAGE, storedGroqKey);
            }

            if (legacyApiKey) {
                localStorage.setItem(
                    SETTINGS_KEY,
                    JSON.stringify({ model: loadedSettings.model || DEFAULT_SETTINGS.model })
                );
            }
        } catch {}
    }, []);

    useEffect(() => {
        localStorage.setItem("mcp_servers", JSON.stringify(servers));
        localStorage.setItem("mcp_headers", JSON.stringify(headers));
    }, [servers, headers]);

    const saveSettings = (newSettings) => {
        const merged = { ...settings, ...newSettings };
        setSettings(merged);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    };

    const saveGroqApiKey = (newKey) => {
        const trimmedKey = (newKey || "").trim();
        setGroqApiKey(trimmedKey);
        setApiKeyRuntime(defaultRuntime(!!trimmedKey));

        if (trimmedKey) {
            localStorage.setItem(GROQ_KEY_STORAGE, trimmedKey);
            setApiKeyNotice({
                id: Date.now(),
                type: "success",
                message: "Groq API key saved locally.",
            });
            return true;
        }

        localStorage.removeItem(GROQ_KEY_STORAGE);
        return false;
    };

    const removeGroqApiKey = () => {
        setGroqApiKey("");
        setApiKeyRuntime(defaultRuntime(false));
        localStorage.removeItem(GROQ_KEY_STORAGE);
        setApiKeyNotice({
            id: Date.now(),
            type: "info",
            message: "Groq API key removed. Add your API key to enable AGNI.",
        });
    };

    const consumeApiKeyNotice = () => setApiKeyNotice(null);

    const openTab = (type, data) => {
        const existingTabId = type === "welcome" ? "welcome" : data?.id || data?.name || data?.uri;
        const id = existingTabId || Date.now().toString();
        setTabs((prev) => {
            if (!prev.find((t) => t.id === id)) return [...prev, { id, type, data, itemState: null }];
            return prev;
        });
        setActiveTabId(id);
    };

    const closeTab = (id) => {
        setTabs((prev) => {
            const newTabs = prev.filter((t) => t.id !== id);
            return newTabs.length === 0 ? [{ id: "welcome", type: "welcome", data: null }] : newTabs;
        });
        if (activeTabId === id) {
            const idx = tabs.findIndex((t) => t.id === id);
            const nextTab = tabs[idx - 1] || tabs[idx + 1] || tabs[0];
            setActiveTabId(nextTab ? nextTab.id : "welcome");
        }
    };

    const updateTabState = (id, newState) => {
        setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, itemState: { ...t.itemState, ...newState } } : t)));
    };

    const updateTabResult = (id, resultData) => {
        setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, result: resultData } : t)));
    };

    const saveServer = (newUrl) => {
        if (!servers.includes(newUrl)) setServers([...servers, newUrl]);
    };

    const connect = async (serverUrl) => {
        const targetUrl = serverUrl || MCP_URL;
        saveServer(targetUrl);
        return await client.connect(targetUrl);
    };

    useEffect(() => {
        connect(MCP_URL);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const execute = async (type, name, args, tabId = null) => {
        const result = await client.execute(type, name, args);
        const requiresApiKey = result?.error?.type === "API_KEY_REQUIRED";

        if (requiresApiKey) {
            setApiKeyRuntime(defaultRuntime(false));
            setApiKeyNotice({
                id: Date.now(),
                type: "required",
                message: "API key required to use AGNI",
            });
        } else {
            setApiKeyRuntime(defaultRuntime(!!groqApiKey.trim()));
        }

        historyManager.addHistory({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            type,
            serverUrl: url,
            request: { [type === "tool" ? "toolName" : "promptName"]: name, args },
            response: result,
            timeMs: result.timeMs,
            model: settings.model,
        });

        if (tabId) updateTabResult(tabId, result);
        return result;
    };

    return (
        <McpContext.Provider
            value={{
                url,
                setUrl,
                servers,
                setServers,
                headers,
                setHeaders,
                isConnected: client.isConnected,
                logs: client.logs,
                clearLogs: client.clearLogs,
                connect,
                disconnect: client.disconnect,
                execute,
                settings,
                saveSettings,
                groqApiKey,
                saveGroqApiKey,
                removeGroqApiKey,
                apiKeyRuntime,
                apiKeyNotice,
                consumeApiKeyNotice,
                ...historyManager,
                ...toolsManager,
                tools: client.tools,
                resources: client.resources,
                prompts: client.prompts,
                tabs,
                activeTabId,
                openTab,
                closeTab,
                updateTabState,
                updateTabResult,
                setActiveTabId,
            }}
        >
            {children}
        </McpContext.Provider>
    );
}

export function useMcp() {
    return useContext(McpContext);
}
