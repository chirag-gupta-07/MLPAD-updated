import React from 'react';

interface HomeFooterProps {
  onNavigateSection: (id: string) => void;
  onAccessPlatform: () => void;
}

export const HomeFooter: React.FC<HomeFooterProps> = ({ onNavigateSection, onAccessPlatform }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-slate-800">
          
          {/* Left branding (2 cols) */}
          <div className="lg:col-span-2 flex flex-col items-start">
            <div className="flex items-center space-x-3 mb-4">
              <img src="/logo.png" alt="MLPAD Logo" className="w-10 h-10 object-contain drop-shadow-xs" />
              <div>
                <div className="text-white font-extrabold text-base tracking-tight">MLPAD</div>
                <div className="text-xs text-slate-400 font-medium">Multi-Level Project Anomaly Detection · MPLAD Scheme</div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mb-4">
              Ministry of Statistics & Programme Implementation<br />
              Government of India
            </p>

            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800 text-emerald-400 text-[11px] font-mono border border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>MoSPI DIID Initiative · SIH26102</span>
            </div>
          </div>

          {/* Column 1: Platform */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3.5">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigateSection('overview')} className="hover:text-white transition-colors text-left">
                  Overview
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('capabilities')} className="hover:text-white transition-colors text-left">
                  Capabilities
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('intelligence')} className="hover:text-white transition-colors text-left">
                  Intelligence
                </button>
              </li>
              <li>
                <button onClick={onAccessPlatform} className="hover:text-white transition-colors text-left">
                  Risk Analysis
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Governance */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3.5">
              Governance
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigateSection('governance')} className="hover:text-white transition-colors text-left">
                  Explainability
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('governance')} className="hover:text-white transition-colors text-left">
                  Audit Readiness
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('governance')} className="hover:text-white transition-colors text-left">
                  Human Review
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('governance')} className="hover:text-white transition-colors text-left">
                  Responsible AI
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3.5">
              Resources
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="https://mplads.gov.in" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="https://mplads.gov.in/mplads/Public/Guidelines2023.pdf" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                  Guidelines
                </a>
              </li>
              <li>
                <button onClick={onAccessPlatform} className="hover:text-white transition-colors text-left">
                  Authorized Sign In
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright line */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            © 2026 MLPAD — Multi-Level Project Anomaly Detection Platform · MPLAD Scheme
          </span>
          <div className="flex items-center space-x-1">
            <span className="h-1 w-6 bg-amber-500 rounded-full" />
            <span className="h-1 w-6 bg-slate-400 rounded-full" />
            <span className="h-1 w-6 bg-emerald-500 rounded-full" />
          </div>
        </div>

      </div>
    </footer>
  );
};
