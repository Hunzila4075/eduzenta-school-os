import React from 'react';
import { useApp } from '../../context/AppContext';
import EduzentaLogo from '../common/EduzentaLogo';
import { LogIn, ArrowRight } from 'lucide-react';

export default function PublicNavbar() {
  const { setCurrentView } = useApp();

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Eduzenta Logo on Top Left */}
        <div onClick={() => setCurrentView('landing')} className="cursor-pointer">
          <EduzentaLogo variant="dark" className="h-9" />
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-300">
          <button onClick={() => scrollToSection('features')} className="hover:text-blue-400 transition-colors">
            Features
          </button>
          <button onClick={() => scrollToSection('about')} className="hover:text-blue-400 transition-colors">
            About Eduzenta
          </button>
          <button onClick={() => scrollToSection('highlights')} className="hover:text-blue-400 transition-colors">
            Platform Highlights
          </button>
          <button onClick={() => scrollToSection('faqs')} className="hover:text-blue-400 transition-colors">
            FAQs
          </button>
        </nav>

        {/* Top Right Action: Prominent Login Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('login')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white text-xs font-black tracking-wide shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all transform hover:-translate-y-0.5"
          >
            <LogIn className="w-4 h-4" />
            <span>Login to Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
