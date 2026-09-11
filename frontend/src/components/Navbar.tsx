import React, { useState, useEffect, useRef } from 'react';
import {
  Menu, X, ShieldAlert, BarChart3, Map, Bot, Upload, RefreshCw, Camera,
  Sun, Moon, Monitor, Gavel, Briefcase, UserCheck, Landmark, HeartHandshake,
  LogOut, Layers, CheckCircle2, CreditCard, ChevronRight, Sparkles, FolderKanban
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
  currentUser?: any | null;
  onLogout?: () => void;
}

interface TabItem {
  id: TabType;
  label: string;
  category: 'Core Monitoring' | 'Governance & Workflows' | 'Intelligence & Operations';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  allowedRoles?: string[];
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openUploadModal,
  currentUser,
  onLogout
}) => {
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  // Active role and display name derived from logged-in user or localStorage
  const activeRole = currentUser?.role || (() => {
    const stored = localStorage.getItem('mplads_user');
    if (stored) {
      try {
        return JSON.parse(stored).role || 'CITIZEN';
      } catch (e) {}
    }
    return 'CITIZEN';
  })();

  const activeUserName = currentUser?.name || (() => {
    const stored = localStorage.getItem('mplads_user');
    if (stored) {
      try {
        return JSON.parse(stored).name || currentUser?.username || 'Authorized User';
      } catch (e) {}
    }
    return currentUser?.username || 'Authorized User';
  })();

  // Close sidebar on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // Master list of tabs with icons & categories
  const allTabs: TabItem[] = [
    { 
      id: 'overview', 
      label: 'Dashboard', 
      category: 'Core Monitoring',
      icon: BarChart3,
      description: 'National risk heatmap, KPI summaries, and priority audit queues',
      allowedRoles: ['SUPER_ADMIN', 'DISTRICT_COLLECTOR', 'VIGILANCE'] 
    },
    { 
      id: 'works', 
      label: 'Projects Repository', 
      category: 'Core Monitoring',
      icon: FolderKanban,
      description: 'Full inspection grid across 79,000+ monitored infrastructure works',
      allowedRoles: ['SUPER_ADMIN', 'DISTRICT_COLLECTOR', 'MP', 'VIGILANCE'] 
    },
    { 
      id: 'mp-dashboard', 
      label: 'MP Purse & Actions', 
      category: 'Governance & Workflows',
      icon: Landmark,
      description: '₹5 Cr annual entitlement, AI recommended citizen demands & sanctions',
      allowedRoles: ['SUPER_ADMIN', 'MP'] 
    },
    { 
      id: 'public-requests', 
      label: 'Jan Samwaad (Public Requests)', 
      category: 'Governance & Workflows',
      icon: HeartHandshake,
      description: 'Citizen infrastructure demands, DBSCAN clustering & notice issue',
      allowedRoles: ['SUPER_ADMIN', 'CITIZEN', 'MP', 'DISTRICT_COLLECTOR', 'VIGILANCE'] 
    },
    { 
      id: 'tenders', 
      label: 'E-Tenders & Bidding', 
      category: 'Governance & Workflows',
      icon: Gavel,
      description: 'E-procurement workflow, technical verification & L1 awards',
      allowedRoles: ['SUPER_ADMIN', 'DISTRICT_COLLECTOR', 'VIGILANCE'] 
    },
    { 
      id: 'contractor', 
      label: 'Contractor Portal', 
      category: 'Governance & Workflows',
      icon: Briefcase,
      description: 'Bid submission, milestone progress logging & PFMS claims',
      allowedRoles: ['SUPER_ADMIN', 'CONTRACTOR'] 
    },
    { 
      id: 'approvals', 
      label: 'DNO Approvals', 
      category: 'Governance & Workflows',
      icon: CheckCircle2,
      description: 'Official administrative sanctions and statutory stage clearances',
      allowedRoles: ['SUPER_ADMIN', 'DISTRICT_COLLECTOR'] 
    },
    { 
      id: 'payments', 
      label: 'PFMS Disbursements', 
      category: 'Governance & Workflows',
      icon: CreditCard,
      description: 'Milestone payment releases, expenditure velocity & UC tracking',
      allowedRoles: ['SUPER_ADMIN', 'DISTRICT_COLLECTOR'] 
    },
    { 
      id: 'gis', 
      label: 'GIS Spatial Map', 
      category: 'Intelligence & Operations',
      icon: Map,
      description: 'Interactive geospatial distribution, cluster overlays & radius scans',
      allowedRoles: ['SUPER_ADMIN', 'MP', 'DISTRICT_COLLECTOR', 'CONTRACTOR', 'VIGILANCE', 'CITIZEN'] 
    },
    { 
      id: 'evidence', 
      label: 'Ground Reality Evidence', 
      category: 'Intelligence & Operations',
      icon: Camera,
      description: 'Citizen evidence photos, CLIP stage classification & pHash reuse',
      allowedRoles: ['SUPER_ADMIN', 'DISTRICT_COLLECTOR', 'VIGILANCE', 'CITIZEN'] 
    },
    { 
      id: 'assistant', 
      label: 'Statutory AI Copilot', 
      category: 'Intelligence & Operations',
      icon: Bot,
      description: 'Conversational assistant grounded in MPLADS Guidelines & GFR 2017',
      allowedRoles: ['SUPER_ADMIN', 'MP', 'DISTRICT_COLLECTOR', 'VIGILANCE'] 
    },
  ];

  // Dynamic filter based on current user's role
  const visibleTabs = allTabs.filter(
    (tab) => !tab.allowedRoles || tab.allowedRoles.includes(activeRole)
  );

  const currentActiveTabObj = allTabs.find((t) => t.id === activeTab) || allTabs[0];



  const handleResetDemo = async () => {
    if (!window.confirm("Restore entire MPLADS database to initial benchmark state for presentation?")) return;
    setIsResetting(true);
    try {
      const token = localStorage.getItem('mplads_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        await axios.post("/api/system/reset-demo", {}, { headers });
      } catch (postErr) {
        await axios.post("/api/lifecycle/reset-demo", {}, { headers });
      }
      window.location.reload();
    } catch (err: any) {
      alert("Failed to reset demo: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsResetting(false);
    }
  };

  const selectTabAndClose = (tabId: TabType) => {
    setActiveTab(tabId);
    setSidebarOpen(false);
  };

  // Group tabs by category
  const categories: ('Core Monitoring' | 'Governance & Workflows' | 'Intelligence & Operations')[] = [
    'Core Monitoring',
    'Governance & Workflows',
    'Intelligence & Operations'
  ];

  return (
    <>
      <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 sticky top-0 z-40 border-b border-[#D9E0E8] dark:border-slate-800 transition-colors duration-200">
        {/* Tricolor decorative top micro-bar for Government of India identity */}
        <div className="h-1 w-full flex">
          <div className="h-full flex-1 bg-[#F28C28]" />
          <div className="h-full flex-1 bg-white" />
          <div className="h-full flex-1 bg-[#138A5B]" />
        </div>

        <div className="w-full max-w-[1700px] mx-auto px-3 sm:px-5">
          <div className="flex items-center justify-between h-14 gap-2 sm:gap-4">
            
            {/* LEFT: Modules Drawer Button + Emblem & Portal Identity */}
            <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
              
              {/* Institutional Hamburger Drawer Button */}
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                title="Open Governance Modules Navigation Drawer"
                className="px-2 py-1.5 rounded-md border border-[#D9E0E8] dark:border-slate-700 bg-[#F5F7FA] hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0B1F3A] dark:text-slate-200 transition-colors flex items-center space-x-1.5 focus:outline-none focus:ring-1 focus:ring-[#1558A6]"
              >
                <Menu className="w-4 h-4 text-[#0B1F3A] dark:text-slate-200" />
                <span className="text-xs font-semibold text-[#0B1F3A] dark:text-slate-200 hidden sm:inline tracking-tight">
                  Modules
                </span>
              </button>

              {/* National Emblem / Platform Identity */}
              <div className="flex items-center space-x-2 sm:space-x-2.5">
                <img
                  src="/logo.png"
                  alt="Emblem / Platform Logo"
                  className="w-8 h-8 object-contain shrink-0"
                />
                
                {/* Vertical Divider */}
                <div className="h-6 w-px bg-[#D9E0E8] dark:bg-slate-700 hidden lg:block" />

                <div className="flex flex-col justify-center">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs sm:text-sm tracking-tight text-[#0B1F3A] dark:text-white uppercase font-sans whitespace-nowrap">
                      MLPAD Portal
                    </span>
                    <span className="hidden md:inline-block bg-[#1558A6]/10 dark:bg-blue-950/60 text-[#1558A6] dark:text-blue-400 text-[10px] font-semibold px-2 py-0.5 rounded border border-[#1558A6]/20 uppercase tracking-wider whitespace-nowrap">
                      {activeRole.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#5F6F82] dark:text-slate-400 whitespace-nowrap hidden xl:block font-medium leading-none mt-0.5">
                    Multi-Level Project Anomaly Detection · MPLAD Scheme
                  </p>
                </div>
              </div>

            </div>

            {/* CENTER: Active Workspace Pill (Compact & non-wrapping) */}
            <div className="hidden 2xl:flex items-center space-x-2 bg-[#F5F7FA] dark:bg-slate-800/80 border border-[#D9E0E8] dark:border-slate-700 px-2.5 py-1 rounded-md text-xs">
              <span className="text-[#5F6F82] dark:text-slate-400 font-medium">Workspace:</span>
              <div className="flex items-center space-x-1.5 font-semibold text-[#0B1F3A] dark:text-slate-200 whitespace-nowrap">
                {React.createElement(currentActiveTabObj.icon, { className: 'w-3.5 h-3.5 text-[#1558A6] dark:text-blue-400' })}
                <span>{currentActiveTabObj.label}</span>
              </div>
            </div>

            {/* RIGHT: System Controls & Profile */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
              
              {/* Theme Toggle */}
              <div className="hidden sm:flex items-center space-x-0.5 bg-[#F5F7FA] dark:bg-slate-800 rounded-md p-0.5 border border-[#D9E0E8] dark:border-slate-700">
                <button 
                  onClick={() => setTheme('light')} 
                  title="Light Mode"
                  className={`p-1.5 rounded text-xs transition ${theme === 'light' ? 'bg-white shadow-xs dark:bg-slate-700 text-[#1558A6] dark:text-blue-400 font-bold' : 'text-[#5F6F82] dark:text-slate-400 hover:text-[#0B1F3A]'}`}
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setTheme('system')} 
                  title="System Preference"
                  className={`p-1.5 rounded text-xs transition ${theme === 'system' ? 'bg-white shadow-xs dark:bg-slate-700 text-[#1558A6] dark:text-blue-400 font-bold' : 'text-[#5F6F82] dark:text-slate-400 hover:text-[#0B1F3A]'}`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setTheme('dark')} 
                  title="Dark Mode"
                  className={`p-1.5 rounded text-xs transition ${theme === 'dark' ? 'bg-white shadow-xs dark:bg-slate-700 text-[#1558A6] dark:text-blue-400 font-bold' : 'text-[#5F6F82] dark:text-slate-400 hover:text-slate-200'}`}
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Authenticated Official Identity */}
              <div className="flex items-center space-x-1.5 sm:space-x-2 bg-[#F5F7FA] dark:bg-slate-800 border border-[#D9E0E8] dark:border-slate-700 rounded-md px-2 py-1">
                <div className="w-5 h-5 rounded bg-[#0B1F3A] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  {activeUserName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-[#0B1F3A] dark:text-slate-100 truncate max-w-[90px] sm:max-w-[130px] leading-tight">
                    {activeUserName}
                  </span>
                  <span className="text-[9px] text-[#5F6F82] dark:text-slate-400 font-medium leading-none">
                    {activeRole.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Reset Demo Button */}
              <button
                onClick={handleResetDemo}
                disabled={isResetting}
                title="Reset test modifications to demo benchmark"
                className="flex items-center space-x-1.5 bg-[#F5F7FA] hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-[#5F6F82] dark:text-slate-300 border border-[#D9E0E8] dark:border-slate-700 px-2 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">{isResetting ? 'Resetting...' : 'Reset Demo'}</span>
              </button>

              {/* Upload Data Button (Admin & DC only) */}
              {['SUPER_ADMIN', 'DISTRICT_COLLECTOR'].includes(activeRole) && (
                <button
                  onClick={openUploadModal}
                  className="flex items-center space-x-1.5 bg-[#1558A6] hover:bg-[#0B1F3A] text-white px-2.5 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Upload Data</span>
                </button>
              )}

              {/* Sign Out Button */}
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sign out of administrative session"
                  className="flex items-center space-x-1 bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 hover:text-[#C62828] dark:text-slate-300 dark:hover:text-rose-300 border border-[#D9E0E8] dark:border-slate-700 hover:border-red-300 px-2 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5 text-[#C62828]" />
                  <span className="hidden xl:inline">Sign Out</span>
                </button>
              )}

            </div>

          </div>
        </div>
      </header>

      {/* ================= SIDEBAR DRAWER OVERLAY ================= */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        >
          {/* Drawer Container */}
          <div
            ref={sidebarRef}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-y-0 left-0 w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-250 ease-out"
          >
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50">
              <div className="flex items-center space-x-3">
                <img src="/logo.png" alt="MLPAD Logo" className="w-10 h-10 object-contain drop-shadow-xs" />
                <div>
                  <div className="text-sm font-black text-slate-950 dark:text-white tracking-tight">
                    MLPAD Governance Modules
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Role View: <span className="font-bold text-indigo-600 dark:text-indigo-400">{activeRole.replace('_', ' ')}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                aria-label="Close Sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category-Grouped Module Navigation List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {categories.map((category) => {
                const categoryTabs = visibleTabs.filter((t) => t.category === category);
                if (categoryTabs.length === 0) return null;

                return (
                  <div key={category} className="space-y-1.5">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 mb-2 flex items-center justify-between">
                      <span>{category}</span>
                      <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                        {categoryTabs.length}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {categoryTabs.map((tab) => {
                        const IconComponent = tab.icon;
                        const isCurrent = activeTab === tab.id;

                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => selectTabAndClose(tab.id)}
                            className={`w-full text-left p-2.5 rounded-md transition-all flex items-start space-x-3 group ${
                              isCurrent
                                ? 'bg-[#1558A6]/10 dark:bg-blue-950/50 border border-[#1558A6]/30 shadow-xs'
                                : 'hover:bg-[#F5F7FA] dark:hover:bg-slate-800/70 border border-transparent hover:border-[#D9E0E8] dark:hover:border-slate-700'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 transition-colors ${
                              isCurrent
                                ? 'bg-[#1558A6] text-white'
                                : 'bg-[#F5F7FA] dark:bg-slate-800 text-[#5F6F82] dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 group-hover:text-[#0B1F3A] dark:group-hover:text-white'
                            }`}>
                              <IconComponent className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold truncate ${
                                  isCurrent ? 'text-[#1558A6] dark:text-blue-300' : 'text-[#0B1F3A] dark:text-white'
                                }`}>
                                  {tab.label}
                                </span>
                                {isCurrent && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#1558A6] shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-[#5F6F82] dark:text-slate-400 line-clamp-2 mt-0.5 font-normal leading-snug">
                                {tab.description}
                              </p>
                            </div>

                            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                              isCurrent ? 'text-[#1558A6]' : 'text-slate-300 dark:text-slate-600'
                            }`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-xs text-slate-500 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">MoSPI DIID SIH 2026</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">v1.0 Audit Gated</span>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
