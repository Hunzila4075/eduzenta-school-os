import React from 'react';

export default function EduzentaLogo({ className = "h-8", iconOnly = false, variant = "brand" }) {
  const isDark = variant === "dark";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const subTextColor = isDark ? "text-purple-300" : "text-purple-700";

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Eduzenta Emblem */}
      <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-900 via-[#5A3193] to-indigo-600 shadow-md shadow-purple-900/30 text-white font-black text-xl tracking-tighter overflow-hidden border border-purple-400/30">
        <svg className="w-5 h-5 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" fill="rgba(255,255,255,0.15)" />
          <path d="M6 12v5c3 0 6 1 6 1s3-1 6-1v-5" />
          <path d="M12 13v5" />
        </svg>
      </div>

      {!iconOnly && (
        <div className="flex flex-col leading-none">
          <span className={`text-xl font-black tracking-tight ${textColor}`}>
            Edu<span className="text-[#5A3193]">zenta</span>
          </span>
          <span className={`text-[9px] font-extrabold tracking-widest uppercase ${subTextColor}`}>
            EDUZENTA SCHOOL OS
          </span>
        </div>
      )}
    </div>
  );
}
