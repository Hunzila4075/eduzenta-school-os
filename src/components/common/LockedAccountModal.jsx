import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldAlert, AlertCircle, Mail, Lock } from 'lucide-react';
import EduzentaLogo from './EduzentaLogo';

export default function LockedAccountModal() {
  const { lockedModal, setLockedModal } = useApp();

  if (!lockedModal.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center relative overflow-hidden">
        {/* Top Warning Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600"></div>

        <div className="flex justify-center mb-4">
          <EduzentaLogo className="h-9" variant="dark" />
        </div>

        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-inner">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <h3 className="text-xl font-black text-white tracking-tight">ACCESS BLOCKED</h3>
        
        <div className="my-3 p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 text-xs font-semibold leading-relaxed">
          {lockedModal.message || "ACCESS BLOCKED: Pending Payment Required. Please contact system administrator."}
        </div>

        <p className="text-xs text-slate-400 mb-6 leading-normal">
          Your institution's subscription is currently under review or has outstanding payments. Access to all school dashboards and faculty tools is temporarily restricted.
        </p>

        <div className="space-y-3">
          <a
            href="mailto:billing@eduzenta.com"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-red-900/30 transition-all"
          >
            <Mail className="w-4 h-4" /> Contact Support & Billing
          </a>

          <button
            onClick={() => setLockedModal({ open: false, email: '', message: '' })}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}
