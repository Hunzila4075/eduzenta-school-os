import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import EduzentaLogo from '../common/EduzentaLogo';
import { LogIn } from 'lucide-react';

export default function PublicNavbar() {
  const { setCurrentView } = useApp();

  // Warm the login page chunk on mount so clicking Faculty Login opens it
  // instantly instead of waiting for the lazy chunk to download.
  useEffect(() => {
    import('../../pages/auth/UnifiedLoginPage').catch(() => {});
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Eduzenta Logo on Top Left */}
        <div onClick={() => setCurrentView('landing')} className="cursor-pointer">
          <EduzentaLogo variant="light" className="h-9" />
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-600">
          <button onClick={() => scrollToSection('features')} className="hover:text-[#5A3193] transition-colors">
            Features
          </button>
          <button onClick={() => scrollToSection('about')} className="hover:text-[#5A3193] transition-colors">
            About Eduzenta
          </button>
          <button onClick={() => scrollToSection('highlights')} className="hover:text-[#5A3193] transition-colors">
            Platform Highlights
          </button>
          <button onClick={() => scrollToSection('faqs')} className="hover:text-[#5A3193] transition-colors">
            FAQs
          </button>
        </nav>

        {/* Top Right Action: Prominent Login Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('login')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl qobe-btn-faculty text-white text-xs font-black tracking-wide shadow-lg shadow-purple-700/30 transition-all transform hover:-translate-y-0.5"
          >
            <LogIn className="w-4 h-4" />
            <span>Faculty Login</span>
          </button>
        </div>
      </div>
    </header>
  );
}
