import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-xl", size }) {
  if (!isOpen) return null;

  const sizeMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl' };
  const widthClass = size && sizeMap[size] ? sizeMap[size] : maxWidth;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className={`bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-[95vw] w-full ${widthClass} max-h-[90vh] flex flex-col overflow-hidden transition-all my-auto mx-auto`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors focus:outline-none shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 max-h-[90vh]">
          {children}
        </div>
      </div>
    </div>
  );
}
