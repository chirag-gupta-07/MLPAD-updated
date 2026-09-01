import React from 'react';
import { ShieldAlert, BarChart3, Map, Bot, Upload, RefreshCw } from 'lucide-react';

interface NavbarProps {
  activeTab: 'overview' | 'works' | 'gis' | 'assistant';
  setActiveTab: (tab: 'overview' | 'works' | 'gis' | 'assistant') => void;
  openUploadModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, openUploadModal }) => {
  return (
    <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight">MPLADS Risk Intelligence</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded border border-emerald-500/30">
                  SIH 2026
                </span>
              </div>
              <p className="text-xs text-slate-400">MoSPI · Data Informatics & Innovation Division</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 bg-slate-800/60 p-1 rounded-lg border border-slate-700/50">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('works')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'works'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Risk Inspector</span>
            </button>

            <button
              onClick={() => setActiveTab('gis')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'gis'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>GIS Map</span>
            </button>

            <button
              onClick={() => setActiveTab('assistant')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'assistant'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>AI Assistant</span>
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={openUploadModal}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Data</span>
            </button>

            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 border-l border-slate-800 pl-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Model Online (v1.0)</span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
