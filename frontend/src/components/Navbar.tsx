import React from 'react';
import { ShieldAlert, BarChart3, Map, Bot, Upload, RefreshCw, Camera, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export type TabType = 'overview' | 'works' | 'approvals' | 'payments' | 'public-requests' | 'gis' | 'evidence' | 'assistant';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  openUploadModal: () => void;
}

import axios from 'axios';

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, openUploadModal }) => {
  const { theme, setTheme } = useTheme();
  const [isResetting, setIsResetting] = React.useState(false);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Dashboard' },
    { id: 'works', label: 'Projects' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'payments', label: 'Payments' },
    { id: 'public-requests', label: 'Public Requests' },
    { id: 'gis', label: 'GIS Map' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'assistant', label: 'AI Assistant' },
  ];

  const handleResetDemo = async () => {
    const confirmed = window.confirm(
      "Reset all test changes and restore the original baseline demo state for judges?\n\nThis will reinitialize all databases and baseline scenarios."
    );
    if (!confirmed) return;

    setIsResetting(true);
    try {
      await axios.post('/api/system/reset-demo');
      window.location.reload();
    } catch (e: any) {
      console.error('Reset failed:', e);
      alert('Failed to reset demo state: ' + (e.response?.data?.detail || e.message));
      setIsResetting(false);
    }
  };

  return (
    <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 sticky top-0 z-50 shadow-sm border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded bg-brand-600 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight">MLPAD</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">MPLADS Risk Intelligence Platform</p>
            </div>
          </div>

          {/* Navigation Tabs - Text Links */}
          <nav className="hidden lg:flex items-center space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-5 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 rounded-md p-1 border border-slate-200 dark:border-slate-700">
              <button onClick={() => setTheme('light')} className={`p-1 rounded ${theme === 'light' ? 'bg-white shadow-sm dark:bg-slate-600 text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}`}>
                <Sun className="w-4 h-4" />
              </button>
              <button onClick={() => setTheme('system')} className={`p-1 rounded ${theme === 'system' ? 'bg-white shadow-sm dark:bg-slate-600 text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}`}>
                <Monitor className="w-4 h-4" />
              </button>
              <button onClick={() => setTheme('dark')} className={`p-1 rounded ${theme === 'dark' ? 'bg-white shadow-sm dark:bg-slate-600 text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}`}>
                <Moon className="w-4 h-4" />
              </button>
            </div>

            {/* Role Dropdown Demo */}
            <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 dark:text-slate-300">
              <option>District Official</option>
              <option>Site Supervisor</option>
              <option>Authorized Authority</option>
              <option>Public Citizen</option>
            </select>

            {/* Reset Demo Button */}
            <button
              onClick={handleResetDemo}
              disabled={isResetting}
              title="Reset all test modifications and restore original demo state for judges"
              className="flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2.5 py-1.5 rounded-md text-xs font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{isResetting ? 'Resetting...' : 'Reset Demo'}</span>
            </button>

            <button
              onClick={openUploadModal}
              className="flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload Data</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
