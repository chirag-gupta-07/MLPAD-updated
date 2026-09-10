import React, { useState } from 'react';
import axios from 'axios';
import {
  Lock, UserCheck, Key, Eye, EyeOff, AlertCircle,
  ArrowRight, ShieldCheck, UserPlus, CheckCircle2,
  Landmark, Briefcase, HeartHandshake, Scale
} from 'lucide-react';
import { TabType } from './Navbar';

interface AuthPageProps {
  onAuthSuccess: (user: any, token: string, landingTab: TabType) => void;
  onBackToHome?: () => void;
  initialMode?: 'login' | 'signup' | 'persona';
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
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
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
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
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
    badge: 'Public Representative',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Landmark,
    landingTab: 'mp-dashboard',
    description: 'Track annual ₹5 Cr entitlement, review AI-recommended citizen works, and issue formal sanctions.',
    username: 'honble_mp_varanasi'
  },
  {
    key: 'contractor',
    name: 'R. K. Gandhi (Managing Director)',
    designation: 'Gandhi Construction And Supplier (Class-A Enlisted)',
    role: 'CONTRACTOR',
    jurisdiction: 'UP PWD & Varanasi Municipal Corporation',
    badge: 'Enlisted Vendor',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: Briefcase,
    landingTab: 'contractor',
    description: 'Live e-procurement tenders, secure bid submissions, milestone progress logs, and PFMS payments.',
    username: 'gandhi_construction'
  },
  {
    key: 'vigilance',
    name: 'Anand Swaroop, IPS',
    designation: 'Chief Vigilance Officer · DIID Audit Division',
    role: 'VIGILANCE',
    jurisdiction: 'Special Audit Unit (Northern Zone)',
    badge: 'Independent Vigilance',
    badgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
    icon: Scale,
    landingTab: 'evidence',
    description: 'Ground truth photo verification, AI perceptual-hash reuse signals, and contractor cartel graph investigation.',
    username: 'cvo_vigilance'
  },
  {
    key: 'citizen',
    name: 'Priya Sharma',
    designation: 'Lead Citizen Auditor · Social Audit Committee',
    role: 'CITIZEN',
    jurisdiction: 'Varanasi Parliamentary Constituency',
    badge: 'Jan Samwaad Social Audit',
    badgeColor: 'bg-teal-100 text-teal-700 border-teal-200',
    icon: HeartHandshake,
    landingTab: 'citizen-portal',
    description: 'Public transparency: lodge geo-tagged infrastructure demands and upload ground inspection photos.',
    username: 'citizen_varanasi'
  }
];

export const AuthPage: React.FC<AuthPageProps> = ({ 
  onAuthSuccess, 
  onBackToHome,
  initialMode = 'login'
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'persona'>(initialMode);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('mospi_admin');
  const [loginPassword, setLoginPassword] = useState('demo@sih2026');

  // Signup form state
  const [signupFullName, setSignupFullName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState('CITIZEN');
  const [signupDesignation, setSignupDesignation] = useState('');

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
    setLoadingKey('login');
    setErrorMsg(null);

    try {
      const res = await axios.post('/api/auth/login', {
        username: loginUsername.trim(),
        password: loginPassword.trim()
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
      setErrorMsg(err.response?.data?.detail || 'Invalid username or password. For demonstration, you can use 1-Click Role Pass or user: mospi_admin, pass: demo@sih2026');
    } finally {
      setLoadingKey(null);
    }
  };

  // New User Signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingKey('signup');
    setErrorMsg(null);

    try {
      const res = await axios.post('/api/auth/register', {
        username: signupUsername.trim(),
        email: signupEmail.trim(),
        password: signupPassword.trim(),
        full_name: signupFullName.trim(),
        role: signupRole,
        designation: signupDesignation.trim() || undefined
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
      console.error('Signup failed:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to create account. Please ensure username and email are unique.');
    } finally {
      setLoadingKey(null);
    }
  };

  const quickFill = (u: string, p: string) => {
    setLoginUsername(u);
    setLoginPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Top subtle brand & Back link */}
      <div className="max-w-md w-full mx-auto mb-6 flex items-center justify-between">
        {onBackToHome && (
          <button
            type="button"
            onClick={onBackToHome}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-200/60 transition flex items-center space-x-1"
          >
            <span>← Back to Homepage</span>
          </button>
        )}
        <div className="ml-auto flex items-center space-x-2 text-[11px] text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>MoSPI Secure Gateway</span>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 p-7 sm:p-8">
        
        {/* Header with Logo */}
        <div className="text-center mb-6">
          <img
            src="/logo.png"
            alt="MPLAD Logo"
            className="w-16 h-16 object-contain mx-auto mb-3 drop-shadow-xs"
          />
          <h1 className="text-xl font-black text-slate-950 tracking-tight">
            MPLADS AI Portal Authorization
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ministry of Statistics & Programme Implementation · Govt. of India
          </p>
        </div>

        {/* 3-Mode Tab Switcher */}
        <div className="bg-slate-100 p-1 rounded-xl flex mb-6 border border-slate-200">
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setErrorMsg(null); }}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              authMode === 'login'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-blue-700" />
            <span>Login</span>
          </button>

          <button
            type="button"
            onClick={() => { setAuthMode('signup'); setErrorMsg(null); }}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              authMode === 'signup'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sign Up</span>
          </button>

          <button
            type="button"
            onClick={() => { setAuthMode('persona'); setErrorMsg(null); }}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              authMode === 'persona'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-purple-700" />
            <span>Role Pass</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* ================= MODE 1: LOGIN ================= */}
        {authMode === 'login' && (
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Username
              </label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="e.g. mospi_admin"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Security Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your security password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 text-sm text-slate-900 placeholder-slate-400 outline-none transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Demo Quick Fills */}
            <div className="pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick Demo Presets:
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => quickFill('mospi_admin', 'demo@sih2026')}
                  className="text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium transition"
                >
                  👔 MoSPI Director
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('dc_varanasi', 'demo@sih2026')}
                  className="text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium transition"
                >
                  🏛️ District Authority
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('honble_mp_varanasi', 'demo@sih2026')}
                  className="text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium transition"
                >
                  🇮🇳 Hon'ble MP
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('gandhi_construction', 'demo@sih2026')}
                  className="text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium transition"
                >
                  🏗️ Contractor
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingKey === 'login'}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50"
            >
              {loadingKey === 'login' ? (
                <span className="flex items-center space-x-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </span>
              ) : (
                <>
                  <span>Sign In & Open Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ================= MODE 2: SIGN UP ================= */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Legal Name
              </label>
              <input
                type="text"
                required
                value={signupFullName}
                onChange={(e) => setSignupFullName(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 text-xs text-slate-900 outline-none transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  placeholder="rajesh_gov"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 text-xs text-slate-900 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="name@gov.in"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 text-xs text-slate-900 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Governance Role
              </label>
              <select
                value={signupRole}
                onChange={(e) => setSignupRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 text-xs text-slate-900 outline-none transition font-medium"
              >
                <option value="CITIZEN">Citizen / Social Auditor (Public Requests & Evidence)</option>
                <option value="CONTRACTOR">Enlisted Contractor (Bid & Progress Submissions)</option>
                <option value="DISTRICT_COLLECTOR">District Authority / DNO (Sanctions & Tenders)</option>
                <option value="MP">Member of Parliament (Purse & Recommendations)</option>
                <option value="VIGILANCE">Vigilance & Quality Audit Officer</option>
                <option value="SUPER_ADMIN">MoSPI State/National Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Designation / Organization
              </label>
              <input
                type="text"
                value={signupDesignation}
                onChange={(e) => setSignupDesignation(e.target.value)}
                placeholder="e.g. Resident Social Auditor / Junior Engineer"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 text-xs text-slate-900 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Create Security Password
              </label>
              <input
                type="password"
                required
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 text-xs text-slate-900 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loadingKey === 'signup'}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50"
            >
              {loadingKey === 'signup' ? (
                <span className="flex items-center space-x-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Registering Identity...</span>
                </span>
              ) : (
                <>
                  <span>Create Account & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ================= MODE 3: 1-CLICK ROLE PASS ================= */}
        {authMode === 'persona' && (
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center justify-between">
              <span>Demonstration Personas:</span>
              <span className="text-[10px] text-emerald-700 font-bold">1-Click Instant Pass</span>
            </div>

            {PERSONAS.map((p) => {
              const IconComponent = p.icon;
              const isLoading = loadingKey === p.key;

              return (
                <div
                  key={p.key}
                  onClick={() => !isLoading && handlePersonaSelect(p)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-slate-900 hover:shadow-xs bg-slate-50/60 hover:bg-white transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:text-slate-950">
                      <IconComponent className="w-4 h-4 text-blue-700" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 truncate">
                        {p.name}
                      </h3>
                      <p className="text-[10px] text-slate-500 truncate">
                        {p.designation}
                      </p>
                      <span className={`inline-block mt-0.5 text-[8px] font-bold px-1.5 py-0.2 rounded border ${p.badgeColor}`}>
                        {p.badge}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {isLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Security Note */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-400 text-center flex items-center justify-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Compliant with GFR 2017 & MoSPI RBAC Security Specifications</span>
        </div>

      </div>

    </div>
  );
};
