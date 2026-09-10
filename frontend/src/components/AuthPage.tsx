import React, { useState } from 'react';
import axios from 'axios';
import {
  ShieldAlert, ShieldCheck, Lock, UserCheck, Briefcase, Landmark,
  HeartHandshake, ArrowRight, Key, Eye, EyeOff, AlertCircle,
  Building2, Scale, Sparkles, Sun, Moon, Monitor, CheckCircle2,
  Activity, Database, BrainCircuit, Network, Check, ExternalLink
} from 'lucide-react';
import { TabType } from './Navbar';
import { useTheme } from './ThemeProvider';

interface AuthPageProps {
  onAuthSuccess: (user: any, token: string, landingTab: TabType) => void;
}

interface PersonaInfo {
  key: string;
  name: string;
  designation: string;
  role: string;
  jurisdiction: string;
  badge: string;
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
  landingTab: TabType;
  description: string;
  username: string;
}

const PERSONAS: PersonaInfo[] = [
  {
    key: 'admin',
    name: 'Dr. R. K. Verma, IAS',
    designation: 'Director General (MPLADS Division), MoSPI',
    role: 'SUPER_ADMIN',
    jurisdiction: 'National Command · All 79,091 Works',
    badge: 'National Oversight',
    badgeColor: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    icon: Landmark,
    landingTab: 'overview',
    description: 'National risk heatmaps, AI anomaly detection, inter-district audit trails, and master system settings.',
    username: 'mospi_admin'
  },
  {
    key: 'dno',
    name: 'S. Rajalingam, IAS',
    designation: 'District Magistrate & District Nodal Authority',
    role: 'DISTRICT_COLLECTOR',
    jurisdiction: 'Varanasi District Administration',
    badge: 'Sanctions & Tenders',
    badgeColor: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    icon: UserCheck,
    landingTab: 'tenders',
    description: 'Work sanctions, administrative approval workflows, e-tender technical evaluations & PFMS disbursements.',
    username: 'dc_varanasi'
  },
  {
    key: 'mp',
    name: "Hon'ble Member of Parliament",
    designation: 'Lok Sabha Representative · Varanasi Constituency',
    role: 'MP',
    jurisdiction: 'Varanasi Parliamentary Constituency',
    badge: 'Constituency Purse',
    badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    icon: Building2,
    landingTab: 'mp-dashboard',
    description: 'Propose new works, allocate funds, track citizen demand petitions, and monitor constituency execution pace.',
    username: 'honble_mp_varanasi'
  },
  {
    key: 'contractor',
    name: 'Gandhi Construction & Supplier',
    designation: 'Managing Director (Class-A Enlisted Agency)',
    role: 'CONTRACTOR',
    jurisdiction: 'Civil Works Division · Varanasi',
    badge: 'Execution & Billing',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    icon: Briefcase,
    landingTab: 'contractor',
    description: 'Submit technical bids, track assigned work orders, upload site biometric attendance, and file running bills.',
    username: 'gandhi_construction'
  },
  {
    key: 'vigilance',
    name: 'Amitabh Sengupta',
    designation: 'Principal Director of Audit (Infrastructure), CAG',
    role: 'VIGILANCE',
    jurisdiction: 'Anti-Corruption & Statutory Vigilance',
    badge: 'Forensic Audit',
    badgeColor: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    icon: Scale,
    landingTab: 'evidence',
    description: 'Benford Law expenditure distribution tests, contractor cartel collusion graphs, and progress gap investigations.',
    username: 'cag_vigilance'
  },
  {
    key: 'citizen',
    name: 'Priya Sharma & Citizen Cell',
    designation: 'Lead Citizen Auditor · Social Audit Committee',
    role: 'CITIZEN',
    jurisdiction: 'Varanasi Parliamentary Constituency',
    badge: 'Jan Samwaad Social Audit',
    badgeColor: 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    icon: HeartHandshake,
    landingTab: 'citizen-portal',
    description: 'Public transparency: lodge geo-tagged infrastructure demands and upload ground inspection photos.',
    username: 'citizen_varanasi'
  }
];

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const { theme, setTheme } = useTheme();
  const [authMode, setAuthMode] = useState<'persona' | 'credentials'>('persona');
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [username, setUsername] = useState('mospi_admin');
  const [password, setPassword] = useState('demo@sih2026');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1-Click Persona Switching
  const handlePersonaSelect = async (persona: PersonaInfo) => {
    setLoadingKey(persona.key);
    setErrorMsg(null);
    try {
      const res = await axios.post(`/api/auth/switch-persona/${persona.key}`);
      const token = res.data.access_token;
      const user = res.data.user;

      localStorage.setItem('mplads_token', token);
      localStorage.setItem('mplads_user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      onAuthSuccess(user, token, persona.landingTab);
    } catch (err: any) {
      console.error('Persona authorization failed:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to authenticate official persona. Please check backend connection.');
    } finally {
      setLoadingKey(null);
    }
  };

  // Credentials Login
  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingKey('credentials');
    setErrorMsg(null);

    try {
      const res = await axios.post('/api/auth/login', {
        username: username.trim(),
        password: password.trim()
      });
      const token = res.data.access_token;
      const user = res.data.user;

      localStorage.setItem('mplads_token', token);
      localStorage.setItem('mplads_user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      let landing: TabType = 'overview';
      if (user.role === 'MP') landing = 'mp-dashboard';
      else if (user.role === 'CONTRACTOR') landing = 'contractor';
      else if (user.role === 'CITIZEN') landing = 'citizen-portal';
      else if (user.role === 'DISTRICT_COLLECTOR') landing = 'tenders';
      else if (user.role === 'VIGILANCE') landing = 'evidence';

      onAuthSuccess(user, token, landing);
    } catch (err: any) {
      console.error('Login failed:', err);
      setErrorMsg(err.response?.data?.detail || 'Invalid credentials. For demonstration evaluation, use username: mospi_admin and password: demo@sih2026');
    } finally {
      setLoadingKey(null);
    }
  };

  const quickFillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 sm:px-8 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src="/logo.png"
              alt="MLPAD Logo"
              className="w-11 h-11 object-contain drop-shadow-xs"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">MLPAD</span>
                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 uppercase tracking-wide">
                  Govt. of India
                </span>
                <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 hidden sm:inline-flex">
                  SIH26102
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Ministry of Statistics & Programme Implementation · National MPLADS Portal
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Theme Toggle Button */}
            <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setTheme('light')}
                title="Switch to Light Mode"
                className={`p-1.5 rounded-md text-xs transition ${
                  theme === 'light'
                    ? 'bg-white shadow-sm dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                title="Use System Preference"
                className={`p-1.5 rounded-md text-xs transition ${
                  theme === 'system'
                    ? 'bg-white shadow-sm dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                title="Switch to Dark Mode"
                className={`p-1.5 rounded-md text-xs transition ${
                  theme === 'dark'
                    ? 'bg-white shadow-sm dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>RBAC & GFR 2017 Gated</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Split Screen Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* ==================== LEFT COLUMN: Website / Platform Description ==================== */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col space-y-6">
            
            {/* Top Logo, Badge & Tricolor Accent */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img
                  src="/logo.png"
                  alt="MLPAD Official Emblem"
                  className="w-14 h-14 object-contain drop-shadow-sm"
                />
                <div>
                  <div className="flex items-center space-x-1 mb-1">
                    <span className="h-1 w-8 bg-amber-500 rounded-full" />
                    <span className="h-1 w-8 bg-slate-300 dark:bg-slate-500 rounded-full" />
                    <span className="h-1 w-8 bg-emerald-500 rounded-full" />
                  </div>
                  <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>MoSPI Smart India Hackathon 2026 Initiative</span>
                  </div>
                </div>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                MPLADS AI Risk Intelligence & Governance Platform
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                A unified, end-to-end decision-support and audit platform built for MoSPI to detect financial anomalies, schedule delays, duplicate works, and procurement cartels across nationwide Member of Parliament Local Area Development Scheme allocations.
              </p>
            </div>

            {/* Core Capability Pillar Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2.5">
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                  Multi-Signal Risk AI Engine
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Isolation Forest financial anomaly scoring, temporal leakage-free delay classifiers with SHAP explanations, and sentence-embedding duplicate asset index.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5">
                  <Activity className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                  Computer Vision Ground Truth
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Perceptual hash (pHash) duplicate photo reuse screening, and zero-shot CLIP construction-stage classification cross-checked with claimed progress.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2.5">
                  <Network className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                  Relational Cartel & Graph Analytics
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  NetworkX graph centrality analyzing contractor-agency-MP award concentration, community clusters, and Benford Law expenditure distributions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5">
                  <Database className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                  Statutory RAG Copilot
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Conversational assistant grounded in official MPLADS 2016 Guidelines and GFR 2017 procurement rules with verified citation sources.
                </p>
              </div>

            </div>

            {/* Live Scheme Macro Telemetry Strip */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-slate-900/80 border border-emerald-100 dark:border-emerald-900/40 flex flex-wrap items-center justify-between gap-4">
              <div className="text-left">
                <div className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">79,091</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">MPLADS Works Audited</div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
              <div className="text-left">
                <div className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">₹4,170.8 Cr</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Budget Monitored</div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
              <div className="text-left">
                <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight">0% Leakage</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Temporal Split Validated</div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
              <div className="text-left">
                <div className="text-lg font-extrabold text-indigo-700 dark:text-indigo-400 tracking-tight">6 Roles</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">End-to-End Governance</div>
              </div>
            </div>

            {/* Compliance Warning */}
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Compliant with official e-SAKSHI data formats and MoSPI National E-Governance Architecture.</span>
            </div>

          </div>

          {/* ==================== RIGHT COLUMN: Login / Authorization Options ==================== */}
          <div className="lg:col-span-6 xl:col-span-5 w-full">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/60 p-5 sm:p-7 transition-all">
              
              {/* Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    Official Access Verification
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select designated operational identity or enter credentials
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex mb-5 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => { setAuthMode('persona'); setErrorMsg(null); }}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    authMode === 'persona'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>1-Click Role Pass</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('credentials'); setErrorMsg(null); }}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    authMode === 'credentials'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Key className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Credentials Sign-In</span>
                </button>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start space-x-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">{errorMsg}</div>
                </div>
              )}

              {/* Option A: 1-Click Official Role Pass */}
              {authMode === 'persona' && (
                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                    <span>Authorized Stakeholder Roles:</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Click to enter workspace</span>
                  </div>

                  {PERSONAS.map((p) => {
                    const IconComponent = p.icon;
                    const isLoading = loadingKey === p.key;

                    return (
                      <div
                        key={p.key}
                        onClick={() => !isLoading && handlePersonaSelect(p)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                          isLoading
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700'
                            : 'bg-slate-50/70 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                                {p.name}
                              </h3>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {p.designation}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${p.badgeColor}`}>
                                {p.badge}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                                · {p.jurisdiction}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 ml-2">
                          <button
                            type="button"
                            disabled={isLoading}
                            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 group-hover:bg-emerald-600 text-slate-400 group-hover:text-white flex items-center justify-center transition shadow-sm border border-slate-200 dark:border-slate-600 group-hover:border-emerald-600"
                          >
                            {isLoading ? (
                              <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Option B: Standard Credentials Login */}
              {authMode === 'credentials' && (
                <div className="space-y-4 pt-1">
                  <form onSubmit={handleCredentialsLogin} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        NIC / Government Username
                      </label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. mospi_admin"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Security Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter security password"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Demo Quick-Fill Chips */}
                    <div className="pt-2">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                        Quick Demo Fill (Click to autofill):
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => quickFillCredentials('mospi_admin', 'demo@sih2026')}
                          className="text-[11px] text-left px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
                        >
                          👔 MoSPI Admin
                        </button>
                        <button
                          type="button"
                          onClick={() => quickFillCredentials('dc_varanasi', 'demo@sih2026')}
                          className="text-[11px] text-left px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
                        >
                          🏛️ District Collector
                        </button>
                        <button
                          type="button"
                          onClick={() => quickFillCredentials('honble_mp_varanasi', 'demo@sih2026')}
                          className="text-[11px] text-left px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
                        >
                          🇮🇳 Member of Parliament
                        </button>
                        <button
                          type="button"
                          onClick={() => quickFillCredentials('gandhi_construction', 'demo@sih2026')}
                          className="text-[11px] text-left px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
                        >
                          🏗️ Enlisted Contractor
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loadingKey === 'credentials'}
                      className="w-full mt-3 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 shadow-md shadow-emerald-700/20 disabled:opacity-50"
                    >
                      {loadingKey === 'credentials' ? (
                        <span className="flex items-center space-x-2">
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Validating Credentials...</span>
                        </span>
                      ) : (
                        <>
                          <span>Authenticate & Open Workspace</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Bottom Security Note */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 text-center">
                Signed JWT token with 24-hour validity issued upon successful authentication.
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3.5 px-4 sm:px-8 text-xs text-slate-500 dark:text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <span>Smart India Hackathon 2026 · Problem Statement <strong>SIH26102</strong></span>
          <span>Ministry of Statistics and Programme Implementation (MoSPI) · DIID</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">National MPLADS Risk Intelligence Portal</span>
        </div>
      </footer>

    </div>
  );
};
export default AuthPage;
