"use client";

import { PlugZap, Activity, Loader2, Key, X, Shield, Plus, Trash2, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useMcp } from '@/context/McpContext';
import { useToast } from '@/context/ToastContext';
import SettingsModal from '@/components/SettingsModal';

export default function Header() {
  const {
    isConnected,
    connect,
    disconnect,
    headers,
    setHeaders,
    settings,
    saveSettings,
    groqApiKey,
    saveGroqApiKey,
    removeGroqApiKey,
    apiKeyRuntime,
    apiKeyNotice,
    consumeApiKeyNotice,
  } = useMcp();
  const { addToast } = useToast();

  const [isConnecting, setIsConnecting] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");

  useEffect(() => {
    if (!apiKeyNotice?.id) return;
    if (apiKeyNotice.type === "required") {
      setTimeout(() => setShowSettings(true), 0);
    }
    addToast(apiKeyNotice.message, apiKeyNotice.type === "required" ? "error" : apiKeyNotice.type);
    consumeApiKeyNotice();
  }, [addToast, apiKeyNotice, consumeApiKeyNotice]);

  const handleConnect = async () => {
    if (isConnected) {
      disconnect();
    } else {
      setIsConnecting(true);
      const res = await connect();
      setIsConnecting(false);
      if (res?.error) addToast(res.error, "error");
      else addToast("Connected to server successfully", "success");
    }
  };

  const addHeader = () => {
    if (!newHeaderKey.trim() || !newHeaderValue.trim()) return;
    setHeaders([...headers, { key: newHeaderKey, value: newHeaderValue }]);
    setNewHeaderKey("");
    setNewHeaderValue("");
  };

  const removeHeader = (idx) => {
    setHeaders(headers.filter((_, i) => i !== idx));
  };

  const hasApiKey = apiKeyRuntime.source === "user" || !!groqApiKey.trim();

  return (
    <>
      <header className="flex items-center justify-between h-14 border-b border-border-color bg-panel-bg px-4 shrink-0 transition-colors duration-200 z-40 relative shadow-sm">
        <div className="flex items-center space-x-3 w-64 shrink-0">
          <div className="bg-accent/10 p-1.5 rounded-lg border border-accent/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Activity className="text-accent h-5 w-5" />
          </div>
          <span className="font-bold text-sm tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-foreground to-text-muted">AGNI V5</span>
        </div>

        <div className="flex flex-1 max-w-3xl mx-8 relative items-center gap-3">
          <div className="flex items-center gap-3 rounded-md border border-border-color bg-sidebar-bg/50 px-4 py-2 text-sm">
            <div className={clsx(
              "w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor] transition-colors duration-500",
              isConnected ? "bg-success text-success" : "bg-danger text-danger"
            )} />
            <span className={clsx("font-semibold", isConnected ? "text-success" : "text-danger")}>
              {isConnected ? "Connected" : "Disconnected"}
            </span>
            {isConnecting && <Loader2 className="w-4 h-4 animate-spin text-accent" />}
          </div>

          <div className={clsx(
            "flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold",
            hasApiKey
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          )}>
            <div className={clsx("h-2.5 w-2.5 rounded-full", hasApiKey ? "bg-emerald-400" : "bg-red-300")} />
            <span>{hasApiKey ? "Using your API key" : "No API Key"}</span>
          </div>

          {!hasApiKey && (
            <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200">
              Add your API key to enable AGNI.
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setShowSettings(true)}
            title="Settings - Model, API Key"
            className="flex items-center justify-center w-8 h-8 rounded-md transition-all border bg-sidebar-bg border-border-color text-text-muted hover:text-foreground hover:border-accent/30"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAuth(true)}
            title="Configure Headers / Authentication"
            className={clsx(
              "flex items-center justify-center w-8 h-8 rounded-md transition-all border",
              headers.length > 0 ? "bg-accent/10 border-accent/30 text-accent" : "bg-sidebar-bg border-border-color text-text-muted hover:text-foreground"
            )}
          >
            <Key className="w-4 h-4" />
          </button>

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-300 ${
              isConnected
                ? 'bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20'
                : 'bg-accent text-white hover:bg-accent-hover shadow-lg shadow-accent/20 border border-transparent'
            }`}
          >
            {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />}
            <span>{isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect'}</span>
          </button>
        </div>
      </header>

      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowAuth(false)} />
          <div className="relative bg-panel-bg border border-border-color rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 fade-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-bold">Authentication Headers</h2>
              </div>
              <button onClick={() => setShowAuth(false)} className="text-text-muted hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            <p className="text-sm text-text-muted mb-4 opacity-80">Add custom headers (for example Authorization) to inject into all MCP network requests.</p>

            <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto">
              {headers.length === 0 ? (
                <div className="text-center p-4 border border-dashed border-border-color rounded-lg text-sm text-text-muted">No custom headers configured</div>
              ) : (
                headers.map((h, i) => (
                  <div key={i} className="flex space-x-2 items-center">
                    <input readOnly value={h.key} className="flex-1 bg-sidebar-bg border border-border-color rounded px-3 py-1.5 text-sm" />
                    <input readOnly value={h.value} type="password" className="flex-1 bg-sidebar-bg border border-border-color rounded px-3 py-1.5 text-sm" />
                    <button onClick={() => removeHeader(i)} className="p-1.5 text-danger hover:bg-danger/10 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))
              )}
            </div>

            <div className="flex space-x-2 items-center pt-4 border-t border-border-color">
              <input
                placeholder="Header Key"
                value={newHeaderKey}
                onChange={e => setNewHeaderKey(e.target.value)}
                className="flex-1 bg-transparent border border-border-color rounded px-3 py-1.5 text-sm focus:border-accent outline-none"
              />
              <input
                placeholder="Value"
                value={newHeaderValue}
                onChange={e => setNewHeaderValue(e.target.value)}
                className="flex-1 bg-transparent border border-border-color rounded px-3 py-1.5 text-sm focus:border-accent outline-none"
              />
              <button
                onClick={addHeader}
                disabled={!newHeaderKey || !newHeaderValue}
                className="p-1.5 bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={saveSettings}
          groqApiKey={groqApiKey}
          apiKeyRuntime={apiKeyRuntime}
          onSaveGroqKey={saveGroqApiKey}
          onRemoveGroqKey={removeGroqApiKey}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}
