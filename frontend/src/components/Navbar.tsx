import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, BarChart3, Map, Bot, Upload, RefreshCw, Camera,
  Sun, Moon, Monitor, Gavel, Briefcase, UserCheck, Landmark, HeartHandshake, LogOut
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import axios from 'axios';

export type TabType =
  | 'overview'
  | 'works'
  | 'mp-dashboard'
  | 'citizen-portal'
  | 'tenders'
  | 'contractor'
  | 'approvals'
  | 'payments'
  | 'public-requests'
  | 'gis'
  | 'evidence'
  | 'assistant';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  openUploadModal: () => void;
  onRoleChange?: (role: string, personaKey: string) => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openUploadModal,
  onRoleChange,
  onLogout
}) => {
  const { theme, setTheme } = useTheme();
  const [isResetting, setIsResetting] = useState(false);
  const [activePersona, setActivePersona] = useState<string>(() => {
    const stored = localStorage.getItem('mplads_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.role === 'MP') return 'mp';
        if (u.role === 'CONTRACTOR') return 'contractor';
        if (u.role === 'CITIZEN') return 'citizen';
        if (u.role === 'DISTRICT_COLLECTOR') return 'dno';
        if (u.role === 'VIGILANCE') return 'vigilance';
      } catch (e) {}
    }
    return 'admin';
  });
  const [activeRole, setActiveRole] = useState<string>(() => {
    const stored = localStorage.getItem('mplads_user');
    if (stored) {
      try {
        return JSON.parse(stored).role || 'SUPER_ADMIN';
      } catch (e) {}
    }
    return 'SUPER_ADMIN';
  });
  const [switching, setSwitching] = useState(false);

  // Master list of tabs
  const allTabs: { id: TabType; label: string; allowedRoles?: string[] }[] = [
    { id: 'overview', label: 'Dashboard', allowedRoles: ['SUPER_ADMIN', 'DISTRICT_COLLECTOR', 'VIGILANCE'] },
    { id: 'mp-dashboard', label: 'MP Purse & Actions', allowedRoles: ['SUPER_ADMIN', 'MP'] },
    { id: 'public-requests', label: 'Jan Samwaad (Public Requests)', allowedRoles: ['SUPER_ADMIN', 'CITIZEN', 'MP', 'DISTRICT_COLLECTOR', 'VIGILANCE'] },
    { id: 'works', label: 'Projects', allowedRoles: ['SUPER_ADMIN', 'DISTRICT_COLLECTOR', 'MP', 'VIGILANCE'] },
    { id: 'tenders', label: 'E-Tenders', allowedRoles: ['SUPER_ADMIN', 'DISTRICT_COLLECTOR', 'VIGILANCE'] },
    { id: 'contractor', label: 'Contractor Portal', allowedRoles: ['SUPER_ADMIN', 'CONTRACTOR'] },
    { id: 'approvals', label: 'Approvals', allowedRoles: ['SUPER_ADMIN', 'DISTRICT_COLLECTOR'] },
    { id: 'payments', label: 'Payments', allowedRoles: ['SUPER_ADMIN', 'DISTRICT_COLLECTOR'] },
    { id: 'gis', label: 'GIS Map', allowedRoles: ['SUPER_ADMIN', 'MP', 'DISTRICT_COLLECTOR', 'CONTRACTOR', 'VIGILANCE', 'CITIZEN'] },
    { id: 'evidence', label: 'Ground Evidence', allowedRoles: ['SUPER_ADMIN', 'DISTRICT_COLLECTOR', 'VIGILANCE', 'CITIZEN'] },
    { id: 'assistant', label: 'AI Copilot', allowedRoles: ['SUPER_ADMIN', 'MP', 'DISTRICT_COLLECTOR', 'VIGILANCE'] },
  ];

  // Dynamic filter based on current user's role
  const visibleTabs = allTabs.filter(
    (tab) => !tab.allowedRoles || tab.allowedRoles.includes(activeRole)
  );

  const handlePersonaChange = async (personaKey: string) => {
    setActivePersona(personaKey);
    setSwitching(true);
    try {
      const res = await axios.post(`/api/auth/switch-persona/${personaKey}`);
      const token = res.data.access_token;
      const user = res.data.user;
      
      localStorage.setItem('mplads_token', token);
      localStorage.setItem('mplads_user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const role = user.role;
      setActiveRole(role);
      if (onRoleChange) onRoleChange(role, personaKey);

      // Smart landing page navigation based on chosen role
      if (personaKey === 'contractor') {
        setActiveTab('contractor');
      } else if (personaKey === 'mp') {
        setActiveTab('mp-dashboard');
      } else if (personaKey === 'citizen') {
        setActiveTab('public-requests');
      } else if (personaKey === 'dno') {
        setActiveTab('tenders');
      } else {
        setActiveTab('overview');
      }
    } catch (e) {
      console.error('Failed to switch persona:', e);
    } finally {
      setSwitching(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('mplads_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

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
      <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Logo & Branding */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <img
              src="/logo.png"
              alt="MLPAD Logo"
              className="w-10 h-10 object-contain drop-shadow-xs"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">MLPAD</span>
                <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                  {activeRole.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap hidden sm:block">
                MPLADS Governance & Accountability Portal
              </p>
            </div>
          </div>

          {/* Dynamic Role-Filtered Navigation Tabs */}
          <nav className="flex items-center h-16 overflow-x-auto no-scrollbar space-x-1 xl:space-x-1.5 shrink min-w-0">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`h-full flex items-center px-2.5 xl:px-3 text-xs xl:text-sm font-medium transition-colors border-b-2 whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Actions & Role Switcher */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Theme Toggle */}
            <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 border border-slate-200 dark:border-slate-700">
              <button onClick={() => setTheme('light')} className={`p-1 rounded ${theme === 'light' ? 'bg-white shadow-sm dark:bg-slate-600 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setTheme('system')} className={`p-1 rounded ${theme === 'system' ? 'bg-white shadow-sm dark:bg-slate-600 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setTheme('dark')} className={`p-1 rounded ${theme === 'dark' ? 'bg-white shadow-sm dark:bg-slate-600 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 1-Click Role Persona Dropdown */}
            <div className="relative flex items-center">
              <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-[11px] text-slate-500 hidden md:inline">Persona:</span>
                <select
                  value={activePersona}
                  onChange={(e) => handlePersonaChange(e.target.value)}
                  disabled={switching}
                  className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer text-xs"
                >
                  <option value="admin">MoSPI Super Admin (National)</option>
                  <option value="mp">Hon'ble MP (Varanasi)</option>
                  <option value="dno">District Collector / DM (Varanasi)</option>
                  <option value="contractor">Contractor (Gandhi Const.)</option>
                  <option value="vigilance">CAG Auditor (Vigilance)</option>
                  <option value="citizen">Citizen (Social Auditor)</option>
                </select>
              </div>
            </div>

            {/* Reset Demo Button */}
            <button
              onClick={handleResetDemo}
              disabled={isResetting}
              title="Reset all test modifications and restore original demo state for judges"
              className="flex items-center space-x-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2.5 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden xl:inline">{isResetting ? 'Resetting...' : 'Reset Demo'}</span>
            </button>

            {/* Upload Data Button (Admin & DC only) */}
            {['SUPER_ADMIN', 'DISTRICT_COLLECTOR'].includes(activeRole) && (
              <button
                onClick={openUploadModal}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload Data</span>
              </button>
            )}

            {/* Sign Out Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign out to official Authorization Gateway"
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 px-2.5 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
