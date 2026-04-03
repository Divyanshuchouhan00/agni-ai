"use client";

import { useMcp } from '@/context/McpContext';
import { Terminal, Clock, AlertCircle, CheckCircle, Trash2, Ban } from 'lucide-react';
import { useRef, useEffect } from 'react';
import clsx from 'clsx';

export default function BottomPanel() {
  const { logs, clearLogs } = useMcp();
  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="h-56 border-t border-border-color bg-sidebar-bg/80 backdrop-blur-md flex flex-col shrink-0 font-mono text-xs shadow-[inset_0_5px_20px_rgba(0,0,0,0.03)] relative transition-all z-20">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-color/50 bg-panel-bg/90 text-text-muted tracking-widest sticky top-0 z-10 font-sans shadow-sm">
          <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-accent" />
              <span className="font-bold text-[10px] text-foreground">SYSTEM LOGS</span>
              <span className="bg-foreground/5 rounded text-[10px] px-1.5 font-mono">{logs.length}</span>
          </div>
          <button 
             onClick={clearLogs}
             title="Clear Logs"
             disabled={logs.length === 0}
             className="flex items-center space-x-1 hover:text-danger hover:bg-danger/10 px-2 py-1 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          >
              <Ban className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold">CLEAR</span>
          </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-50 space-y-2">
              <Terminal className="w-8 h-8" />
              <p className="font-sans text-sm">No activity recorded</p>
          </div>
        ) : (
          logs.map((log) => {
            const isError = log.type === 'error' || log.type === 'response_error';
            const isRequest = log.type === 'request';
            const isSuccess = log.type === 'response';
            
            return (
              <div 
                key={log.id} 
                className={clsx(
                    "p-2.5 rounded-lg border transition-all duration-300 hover:shadow-md break-words",
                    isError ? "bg-danger/5 border-danger/20 text-danger hover:bg-danger/10" : 
                    isRequest ? "bg-accent/5 border-accent/20 text-accent/90 hover:bg-accent/10" : 
                    isSuccess ? "bg-success/5 border-success/20 text-success/90 hover:bg-success/10" :
                    "bg-panel-bg border-border-color text-text-muted hover:bg-panel-bg"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 w-full max-w-[90%]">
                      <span className="text-[10px] opacity-40 mt-0.5 min-w-[65px] whitespace-nowrap font-sans font-medium">
                          {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                      </span>
                      
                      {isError && <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-danger" />}
                      {isSuccess && <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-success" />}
                      {!isError && !isSuccess && <Terminal className="w-4 h-4 mt-0.5 shrink-0 opacity-50" />}
                      
                      <div className="flex-1 min-w-0">
                          <div className="flex items-center mb-1">
                              <span className={clsx("font-bold px-2 py-0.5 rounded text-[9px] tracking-wider mr-2", isError ? "bg-danger/20 text-danger" : "bg-foreground/10 text-foreground")}>
                                 {log.type.replace('_', ' ').toUpperCase()}
                              </span>
                              <span className="font-semibold text-[11px] truncate">{log.method || log.message}</span>
                          </div>
                          
                          {(log.payload || log.response) && (
                             <pre className={clsx(
                                 "mt-2 p-3 rounded-md max-h-40 overflow-y-auto text-xs whitespace-pre-wrap font-mono shadow-inner custom-scrollbar",
                                 isError ? "bg-danger/10 text-danger" : "bg-black/5 dark:bg-black/40 text-foreground"
                             )}>
                                 {JSON.stringify(log.payload || log.response, null, 2)}
                             </pre>
                          )}
                      </div>
                  </div>
                  
                  {log.timeMs !== undefined && (
                     <div className="flex items-center space-x-1 opacity-70 shrink-0 ml-4 font-mono text-[10px] bg-foreground/5 px-2 py-1 rounded">
                        <Clock className="w-3 h-3" />
                        <span>{log.timeMs}ms</span>
                     </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
