import React from 'react';
import { Mail, Phone, Code2 } from 'lucide-react';

export default function Footer({ className = "", isDark = false }) {
  const textColor = isDark ? "text-slate-400" : "text-slate-500";
  const brandColor = isDark ? "text-purple-400" : "text-purple-600";
  const linkHover = isDark ? "hover:text-white" : "hover:text-purple-700";
  const borderColor = isDark ? "border-slate-800" : "border-slate-200/80";

  return (
    <footer className={`py-4 px-6 border-t ${borderColor} ${className}`}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto text-xs">
        {/* Brand & Developer Credit */}
        <div className="flex items-center gap-1.5 font-medium tracking-wide">
          <Code2 className={`w-3.5 h-3.5 ${brandColor}`} />
          <span className={textColor}>
            Eduzenta — Developed by <span className={`font-bold ${brandColor}`}>Hunzila Khan</span>
          </span>
        </div>

        {/* Contact Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-semibold">
          <a
            href="mailto:eduzentawithkhan@gmail.com"
            className={`flex items-center gap-1.5 transition-colors ${textColor} ${linkHover}`}
            title="Send Email"
          >
            <Mail className="w-3.5 h-3.5 text-purple-500" />
            <span>eduzentawithkhan@gmail.com</span>
          </a>

          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

          <a
            href="tel:+923330935652"
            className={`flex items-center gap-1.5 transition-colors ${textColor} ${linkHover}`}
            title="Call Phone"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-mono">+92 333 0935652</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
