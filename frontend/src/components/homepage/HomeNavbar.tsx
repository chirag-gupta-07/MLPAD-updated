import React, { useState } from 'react';
import { Menu, X, ArrowRight, ShieldCheck } from 'lucide-react';

interface HomeNavbarProps {
  onAccessPlatform: () => void;
}

export const HomeNavbar: React.FC<HomeNavbarProps> = ({ onAccessPlatform }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -72;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* LEFT: Official Logo & Hierarchy */}
          <div className="flex items-center space-x-3.5 shrink-0">
            <a href="#" className="flex items-center space-x-3 group">
              <img
                src="/logo.png"
                alt="MLPAD Logo"
                className="w-12 h-12 object-contain drop-shadow-xs"
              />
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-950 font-sans">
                    MLPAD
                  </span>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/70 uppercase tracking-wider">
                    MoSPI
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-700 tracking-tight leading-none mt-0.5">
                  Multi-Level Project Anomaly Detection
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-normal mt-0.5 hidden sm:block">
                  MPLAD Scheme · Ministry of Statistics & Programme Implementation
                </span>
              </div>
            </a>
          </div>

          {/* CENTER: Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {[
              { label: 'Overview', target: 'overview' },
              { label: 'Capabilities', target: 'capabilities' },
              { label: 'How It Works', target: 'how-it-works' },
              { label: 'Intelligence', target: 'intelligence' },
              { label: 'Governance', target: 'governance' },
            ].map((item) => (
              <button
                key={item.target}
                onClick={() => scrollToSection(item.target)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-950 hover:bg-slate-50 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* RIGHT: Actions */}
          <div className="hidden md:flex items-center space-x-3">
            <a
              href="https://mplads.gov.in"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              About MPLADS
            </a>
            <button
              type="button"
              onClick={onAccessPlatform}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs hover:shadow transition-all"
            >
              <span>Login / Signup</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              type="button"
              onClick={onAccessPlatform}
              className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-semibold"
            >
              Login / Signup
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-1">
            Navigation
          </div>
          {[
            { label: 'Overview', target: 'overview' },
            { label: 'Capabilities', target: 'capabilities' },
            { label: 'How It Works', target: 'how-it-works' },
            { label: 'Intelligence Layer', target: 'intelligence' },
            { label: 'Governance & Trust', target: 'governance' },
          ].map((item) => (
            <button
              key={item.target}
              onClick={() => scrollToSection(item.target)}
              className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950 rounded-lg"
            >
              {item.label}
            </button>
          ))}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={onAccessPlatform}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <span>Login / Signup</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="https://mplads.gov.in"
              target="_blank"
              rel="noreferrer"
              className="w-full text-center py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              About MPLADS Guidelines →
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
