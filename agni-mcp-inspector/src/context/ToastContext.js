"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { X, Info, AlertTriangle, CheckCircle } from "lucide-react";
import clsx from "clsx";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 3s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      
      {/* Toast Container fixed at bottom right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          let Icon = Info;
          let colorClass = "bg-panel-bg border-border-color text-text-muted";
          
          if (toast.type === "success") {
            Icon = CheckCircle;
            colorClass = "bg-success/10 border-success/30 text-success";
          } else if (toast.type === "error") {
            Icon = AlertTriangle;
            colorClass = "bg-danger/10 border-danger/30 text-danger";
          }

          return (
            <div 
              key={toast.id} 
              className={clsx(
                  "pointer-events-auto flex items-center p-3 rounded-lg shadow-xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-right-8 fade-in",
                  colorClass
              )}
            >
              <Icon className="w-5 h-5 mr-3 shrink-0" />
              <p className="flex-1 text-sm font-medium mr-4">{toast.message}</p>
              <button onClick={() => removeToast(toast.id)} className="opacity-70 hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
