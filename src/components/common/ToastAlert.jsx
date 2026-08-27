import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export default function ToastAlert() {
  const { toasts, removeToast } = useApp();

  if (!toasts.length) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';
        const isError = toast.type === 'error';

        const bg = isSuccess
          ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100'
          : isWarning
          ? 'bg-amber-950/90 border-amber-500/40 text-amber-100'
          : isError
          ? 'bg-red-950/90 border-red-500/40 text-red-100'
          : 'bg-slate-900/90 border-blue-500/40 text-slate-100';

        const Icon = isSuccess
          ? CheckCircle2
          : isWarning
          ? AlertTriangle
          : isError
          ? XCircle
          : Info;

        const iconColor = isSuccess
          ? 'text-emerald-400'
          : isWarning
          ? 'text-amber-400'
          : isError
          ? 'text-red-400'
          : 'text-blue-400';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-x-0 animate-in slide-in-from-right-5 ${bg}`}
          >
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold tracking-tight">{toast.title}</h4>
              <p className="text-xs mt-0.5 text-slate-300 leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
