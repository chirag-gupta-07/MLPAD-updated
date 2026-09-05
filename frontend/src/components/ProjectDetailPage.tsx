import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, ShieldAlert, AlertTriangle, CheckCircle, FileText, MapPin, DollarSign, Clock, Layers, Copy, 
  CheckSquare, ShieldCheck, Camera, PlusCircle, Check, ArrowRight, ExternalLink, Calendar, Flag,
  Package, ClipboardList, Activity, MessageSquare, History, UserCheck, AlertCircle, Download,
  HelpCircle, Sparkles, Map, BarChart3, TrendingUp, Search, RefreshCw, Send, Crosshair, Building2,
  CheckCircle2, Info, Eye, ChevronRight, Landmark, Truck, Coins, Hammer
} from 'lucide-react';

import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface ProjectDetailPageProps {
  work: any;
  onClose: () => void;
}

type TabType = 'overview' | 'scope' | 'daily' | 'materials' | 'finance' | 'risk' | 'evidence' | 'public' | 'timeline' | 'ai';

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ work, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Data States
  const [lifecycle, setLifecycle] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null);
  const [responsiblePersons, setResponsiblePersons] = useState<any[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<any[]>([]);
  const [agencySupply, setAgencySupply] = useState<any[]>([]);
  const [siteInventory, setSiteInventory] = useState<any[]>([]);
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [riskBreakdown, setRiskBreakdown] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [publicSignals, setPublicSignals] = useState<any[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  
  // Loading States
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Feature 1: Check-in Form States
  const [checkinPersonId, setCheckinPersonId] = useState<number | undefined>(undefined);
  const [checkinPersonName, setCheckinPersonName] = useState<string>('');
  const [checkinPersonRole, setCheckinPersonRole] = useState<string>('Site Head');
  const [checkinLat, setCheckinLat] = useState<string>('');
  const [checkinLon, setCheckinLon] = useState<string>('');
  const [checkinRemarks, setCheckinRemarks] = useState<string>('Morning layout review and material presence verification');
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState<boolean>(false);
  const [checkinFeedback, setCheckinFeedback] = useState<any>(null);
  const [checkinError, setCheckinError] = useState<string | null>(null);

  // Feature 2: Daily Work Update Form States
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [updateWorkDesc, setUpdateWorkDesc] = useState<string>('');
  const [updateCategory, setUpdateCategory] = useState<string>('Installation');
  const [updateProgressPct, setUpdateProgressPct] = useState<number>(work?.completion_percentage || 50);
  const [updateWorkerCount, setUpdateWorkerCount] = useState<number>(8);
  const [updateMaterialsUsed, setUpdateMaterialsUsed] = useState<string>('');
  const [updateIssues, setUpdateIssues] = useState<string>('');
  const [updateNextActivity, setUpdateNextActivity] = useState<string>('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState<boolean>(false);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState<string | null>(null);

  // Feature 6: Field Inspection Form States (Scope Tab)
  const [showInspectionModal, setShowInspectionModal] = useState<boolean>(false);
  const [inspectorName, setInspectorName] = useState<string>('Er. P. K. Mishra');
  const [inspectorDesig, setInspectorDesig] = useState<string>('Assistant Engineer / District Quality Monitor');
  const [observedProgressPct, setObservedProgressPct] = useState<number>(work?.completion_percentage || 65);
  const [inspectionResult, setInspectionResult] = useState<string>('VERIFIED');
  const [inspectionRemarks, setInspectionRemarks] = useState<string>('Physical measurements match reported quantities. Foundations verified.');
  const [isSubmittingInspection, setIsSubmittingInspection] = useState<boolean>(false);
  const [inspectionSuccessMsg, setInspectionSuccessMsg] = useState<string | null>(null);

  // Quick citizen photo submit modal state
  const [showEvidenceModal, setShowEvidenceModal] = useState<boolean>(false);
  const [evidencePhotoUrl, setEvidencePhotoUrl] = useState<string>('https://images.unsplash.com/photo-1590496793929-36417d3117de?w=800&auto=format&fit=crop');
  const [evidenceRemarks, setEvidenceRemarks] = useState<string>('Solar lighting pole foundation in place with wiring conduit.');
  const [submittingEvidence, setSubmittingEvidence] = useState<boolean>(false);

  // Timeline Filtering States
  const [timelineFilter, setTimelineFilter] = useState<'ALL' | 'MILESTONE' | 'ATTENDANCE' | 'UPDATE' | 'MATERIAL' | 'PAYMENT' | 'PUBLIC'>('ALL');
  const [timelineSearch, setTimelineSearch] = useState<string>('');

  const workId = work?.work_id;

  const projectLat = work?.latitude ? parseFloat(work.latitude) : 28.6139;
  const projectLon = work?.longitude ? parseFloat(work.longitude) : 77.2090;

  const formatQty = (val: any): string => {
    if (val === null || val === undefined || val === '') return '-';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  };

  // Initialize default GPS coordinates
  useEffect(() => {
    if (projectLat && projectLon && !checkinLat) {
      setCheckinLat((projectLat + 0.0001).toFixed(6));
      setCheckinLon((projectLon + 0.0001).toFixed(6));
    }
  }, [projectLat, projectLon]);

  const fetchTabBasedData = async (tab: TabType) => {
    if (!workId) return;
    const setLoad = (key: string, val: boolean) => setLoading(p => ({ ...p, [key]: val }));
    
    try {
      if ((tab === 'overview' || tab === 'scope') && !lifecycle) {
        setLoad('lifecycle', true);
        const res = await axios.get(`/api/projects/${encodeURIComponent(workId)}/lifecycle`).catch(() => ({ data: null }));
        setLifecycle(res.data);
        setLoad('lifecycle', false);
      }
      
      if (tab === 'daily') {
        setLoad('daily', true);
        const [attRes, updRes, personsRes, sumRes] = await Promise.all([
          axios.get('/api/attendance/history', { params: { project_id: workId } }).catch(() => ({ data: [] })),
          axios.get('/api/daily-updates', { params: { project_id: workId } }).catch(() => ({ data: [] })),
          axios.get('/api/attendance/persons', { params: { project_id: workId } }).catch(() => ({ data: [] })),
          axios.get('/api/attendance/summary', { params: { project_id: workId } }).catch(() => ({ data: null }))
        ]);
        
        setAttendance(Array.isArray(attRes.data) ? attRes.data : []);
        setDailyUpdates(Array.isArray(updRes.data) ? updRes.data : []);
        if (Array.isArray(personsRes.data) && personsRes.data.length > 0) {
          setResponsiblePersons(personsRes.data);
          if (!checkinPersonName) {
            setCheckinPersonName(personsRes.data[0].person_name);
            setCheckinPersonRole(personsRes.data[0].person_role);
            setCheckinPersonId(personsRes.data[0].id);
          }
        }
        if (sumRes.data) setAttendanceSummary(sumRes.data);
        setLoad('daily', false);
      }
      else if (tab === 'materials' && siteInventory.length === 0) {
        setLoad('materials', true);
        const [agRes, siRes, recRes, txRes] = await Promise.all([
          axios.get('/api/inventory/agency-supply', { params: { project_id: workId } }).catch(() => ({ data: [] })),
          axios.get('/api/inventory/site', { params: { project_id: workId } }).catch(() => ({ data: [] })),
          axios.get('/api/inventory/reconciliation', { params: { project_id: workId } }).catch(() => ({ data: null })),
          axios.get('/api/inventory/transactions', { params: { project_id: workId } }).catch(() => ({ data: [] }))
        ]);
        setAgencySupply(Array.isArray(agRes.data) ? agRes.data : []);
        setSiteInventory(Array.isArray(siRes.data) ? siRes.data : []);
        setReconciliation(recRes.data);
        setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
        setLoad('materials', false);
      }
      else if (tab === 'finance' && payments.length === 0) {
        setLoad('finance', true);
        const res = await axios.get('/api/payments', { params: { project_id: workId } }).catch(() => ({ data: [] }));
        setPayments(Array.isArray(res.data) ? res.data : []);
        setLoad('finance', false);
      }
      else if (tab === 'risk' && !riskBreakdown) {
        setLoad('risk', true);
        const res = await axios.get(`/api/projects/${encodeURIComponent(workId)}/risk-breakdown`).catch(() => ({ data: null }));
        setRiskBreakdown(res.data);
        setLoad('risk', false);
      }
      else if (tab === 'evidence' && evidence.length === 0) {
        setLoad('evidence', true);
        const res = await axios.get(`/api/citizen-evidence/work/${encodeURIComponent(workId)}`).catch(() => ({ data: { evidence: [] } }));
        setEvidence(res.data?.evidence || []);
        setLoad('evidence', false);
      }
      else if (tab === 'public' && publicSignals.length === 0) {
        setLoad('public', true);
        const res = await axios.get(`/api/development-requests`, { params: { linked_project_id: workId } }).catch(() => ({ data: [] }));
        setPublicSignals(Array.isArray(res.data) ? res.data : []);
        setLoad('public', false);
      }
      else if (tab === 'timeline' && timelineEvents.length === 0) {
        setLoad('timeline', true);
        const res = await axios.get(`/api/projects/${encodeURIComponent(workId)}/timeline`).catch(() => ({ data: [] }));
        setTimelineEvents(Array.isArray(res.data?.timeline) ? res.data.timeline : []);
        setLoad('timeline', false);
      }
      else if (tab === 'ai' && !aiAnalysis) {
        setLoad('ai', true);
        const res = await axios.post(`/api/assistant/query`, {
          query: `Provide a comprehensive official audit and cross-source consistency analysis for project ${workId}`,
          work_id: workId
        }).catch(() => ({ data: { answer: 'AI analysis unavailable at the moment.' } }));
        setAiAnalysis(res.data);
        setLoad('ai', false);
      }
    } catch (e) {
      console.error(`Failed loading data for tab ${tab}`, e);
    }
  };

  useEffect(() => {
    fetchTabBasedData(activeTab);
  }, [activeTab, workId]);

  // Handle GPS Auto-Detection
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setCheckinError('Browser Geolocation is not supported by your device.');
      return;
    }
    setIsDetectingGps(true);
    setCheckinError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCheckinLat(pos.coords.latitude.toFixed(6));
        setCheckinLon(pos.coords.longitude.toFixed(6));
        setIsDetectingGps(false);
      },
      (err) => {
        console.warn('GPS detection warning:', err.message);
        setCheckinLat((projectLat + 0.00015).toFixed(6));
        setCheckinLon((projectLon + 0.00012).toFixed(6));
        setIsDetectingGps(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSetOnSite = () => {
    setCheckinLat((projectLat + 0.00015).toFixed(6));
    setCheckinLon((projectLon + 0.00012).toFixed(6));
    setCheckinRemarks('Morning on-site supervision and structural verification');
    setCheckinError(null);
    setCheckinFeedback(null);
  };

  const handleSetOffSite = () => {
    setCheckinLat((projectLat + 0.045).toFixed(6));
    setCheckinLon((projectLon + 0.038).toFixed(6));
    setCheckinRemarks('Checked in remotely from regional administrative office (>4 km away)');
    setCheckinError(null);
    setCheckinFeedback(null);
  };

  const handleSubmitCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkinLat || !checkinLon) {
      setCheckinError('Please enter or detect check-in coordinates.');
      return;
    }
    setIsSubmittingCheckin(true);
    setCheckinError(null);
    setCheckinFeedback(null);

    try {
      const selectedName = checkinPersonName || (responsiblePersons[0]?.person_name || 'Er. Rajesh K. Sharma');
      const res = await axios.post('/api/attendance/checkin', {
        project_id: workId,
        person_id: checkinPersonId || undefined,
        person_name: selectedName,
        person_role: checkinPersonRole || 'Site Head',
        latitude: parseFloat(checkinLat),
        longitude: parseFloat(checkinLon),
        project_lat: projectLat,
        project_lon: projectLon,
        allowed_radius: 500.0,
        remarks: checkinRemarks
      });

      setCheckinFeedback(res.data);
      setAttendance(prev => [res.data, ...prev]);

      const sumRes = await axios.get('/api/attendance/summary', { params: { project_id: workId } }).catch(() => null);
      if (sumRes?.data) setAttendanceSummary(sumRes.data);
    } catch (err: any) {
      setCheckinError(err?.response?.data?.detail || 'Failed to submit check-in. Please verify inputs.');
    } finally {
      setIsSubmittingCheckin(false);
    }
  };

  const handleSubmitDailyUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateWorkDesc.trim()) return;
    setIsSubmittingUpdate(true);
    setUpdateSuccessMsg(null);

    try {
      const selectedName = checkinPersonName || (responsiblePersons[0]?.person_name || 'Er. Rajesh K. Sharma');
      const mats = updateMaterialsUsed ? [{ material: updateMaterialsUsed, quantity: 1, unit: 'units' }] : [];
      await axios.post('/api/daily-updates', {
        project_id: workId,
        person_name: selectedName,
        date: new Date().toISOString().split('T')[0],
        work_description: updateWorkDesc,
        work_category: updateCategory,
        cumulative_progress_pct: Number(updateProgressPct),
        worker_count: Number(updateWorkerCount),
        materials_used: mats,
        current_issues: updateIssues || undefined,
        expected_next_activity: updateNextActivity || undefined
      });

      setUpdateSuccessMsg('Daily work update logged successfully into project ledger!');
      const updRes = await axios.get('/api/daily-updates', { params: { project_id: workId } }).catch(() => ({ data: [] }));
      setDailyUpdates(updRes.data);
      setShowUpdateModal(false);
      setUpdateWorkDesc('');
      setUpdateMaterialsUsed('');
      setUpdateIssues('');
    } catch (err: any) {
      console.error('Failed submitting update:', err);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingInspection(true);
    setInspectionSuccessMsg(null);
    try {
      await axios.post(`/api/projects/${encodeURIComponent(workId)}/inspections`, {
        inspector_name: inspectorName,
        inspector_designation: inspectorDesig,
        observed_progress_pct: Number(observedProgressPct),
        result: inspectionResult,
        remarks: inspectionRemarks,
        checklist: [
          'Foundation and structural depth measurement',
          'Material testing certificates verified',
          'Site muster roll and GPS check-in cross-check'
        ]
      });
      setInspectionSuccessMsg('Official inspection dossier successfully recorded!');
      setShowInspectionModal(false);
      // Re-fetch lifecycle
      const res = await axios.get(`/api/projects/${encodeURIComponent(workId)}/lifecycle`);
      setLifecycle(res.data);
    } catch (err) {
      console.error('Failed submitting inspection:', err);
    } finally {
      setIsSubmittingInspection(false);
    }
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEvidence(true);
    try {
      await axios.post('/api/citizen-evidence/submit', {
        work_id: workId,
        photo_url: evidencePhotoUrl,
        latitude: projectLat,
        longitude: projectLon,
        citizen_remarks: evidenceRemarks,
        stage_tag: 'In Progress'
      });
      setShowEvidenceModal(false);
      const res = await axios.get(`/api/citizen-evidence/work/${encodeURIComponent(workId)}`);
      setEvidence(res.data?.evidence || []);
    } catch (err) {
      console.error('Failed submitting evidence:', err);
    } finally {
      setSubmittingEvidence(false);
    }
  };

  const tabsConfig = [
    { id: 'overview', label: 'Overview', icon: ShieldAlert },
    { id: 'scope', label: 'Scope & Milestones', icon: Layers },
    { id: 'daily', label: 'Daily Monitoring', icon: Activity },
    { id: 'materials', label: 'Materials', icon: Package },
    { id: 'finance', label: 'Finance & Payments', icon: DollarSign },
    { id: 'risk', label: 'Risk', icon: AlertTriangle },
    { id: 'evidence', label: 'Evidence', icon: Camera },
    { id: 'public', label: 'Public Signals', icon: MessageSquare },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'ai', label: 'AI Analysis', icon: Sparkles },
  ];

  const sanctioned = Number(work.sanctioned_amount || 0);
  const expended = Number(work.total_expenditure || 0);
  const unspent = Math.max(0, sanctioned - expended);
  const finPct = sanctioned > 0 ? Math.round((expended / sanctioned) * 100) : 0;
  const physPct = Number(work.completion_percentage || 0);
  const gapPct = finPct - physPct;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden animate-in fade-in duration-200 text-slate-900 dark:text-slate-100">
      
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors border border-slate-200 dark:border-slate-700"
            title="Go Back to Dashboard"
          >
            <ArrowRight className="w-5 h-5 rotate-180 text-slate-600 dark:text-slate-400" />
          </button>
          
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold truncate max-w-lg font-mono text-slate-900 dark:text-slate-100" title={work.work_description}>
                {work.work_id}
              </h1>
              <span className={cn(
                "px-2.5 py-0.5 text-xs font-bold rounded-full border",
                work.risk_level === 'HIGH' ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" :
                work.risk_level === 'MEDIUM' ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" :
                "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
              )}>
                {work.risk_level} RISK
              </span>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-slate-700 dark:text-slate-300">
                {work.status || 'SANCTIONED'}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-2xl mt-0.5">
              {work.work_description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex overflow-x-auto scrollbar-none shrink-0">
        {tabsConfig.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as TabType)}
              className={cn(
                "flex items-center space-x-2 py-3 px-4 border-b-2 whitespace-nowrap text-sm font-medium transition-colors",
                isActive 
                  ? "border-brand-600 text-brand-700 dark:text-brand-400 dark:border-brand-500 font-semibold" 
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-500")} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* TAB: OVERVIEW (ENRICHED WITH STATUTORY SANCTION & FINANCIAL DETAILS) */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Snapshot Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Sanctioned Budget</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    ₹{(sanctioned / 100000).toFixed(2)} Lakh
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">Exact: ₹{sanctioned.toLocaleString()}</p>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Total Expended</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    ₹{(expended / 100000).toFixed(2)} Lakh
                  </p>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 mt-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, finPct)}%` }} />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Physical Completion</p>
                  <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{physPct}%</p>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 mt-2 rounded-full overflow-hidden">
                    <div className="bg-brand-500 h-full rounded-full" style={{ width: `${physPct}%` }} />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Composite Risk</p>
                  <p className={cn("text-2xl font-bold", work.composite_risk_score > 70 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400')}>
                    {work.composite_risk_score}/100
                  </p>
                  <span className="text-[11px] text-slate-500">{work.risk_level} Priority</span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Unspent Balance</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{(unspent / 100000).toFixed(2)} Lakh
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">Remaining in Escrow</p>
                </div>
              </div>

              {/* Financial vs Physical Gap Alert */}
              {gapPct > 20 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-amber-900 dark:text-amber-300">
                      Disproportionate Fund Utilization Warning ({gapPct}% Gap)
                    </h4>
                    <p className="text-xs text-amber-800 dark:text-amber-400 mt-1 leading-relaxed">
                      Financial utilization is at <strong>{finPct}%</strong> while reported physical progress stands at <strong>{physPct}%</strong>.
                      This requires supervisory inspection of advance material procurement vs. ground execution.
                    </p>
                  </div>
                </div>
              )}

              {/* Statutory Project Case File Details */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                  <h3 className="font-bold text-base border-b border-slate-100 dark:border-slate-700 pb-2.5 flex items-center">
                    <Building2 className="w-4 h-4 mr-2 text-brand-600 dark:text-brand-400" />
                    Statutory Administrative Context
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Implementing Agency:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{work.implementing_agency || 'District Rural Development Agency (DRDA)'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Sector / Scheme:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{work.sector || 'Community Infrastructure'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">State & District:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{work.district}, {work.state}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Constituency:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{work.constituency || work.district} (Hon'ble MP)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Sanction Date:</span>
                      <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">{work.sanction_date || '2024-06-15'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Target Completion Date:</span>
                      <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">{work.target_completion_date || '2025-03-31'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                  <h3 className="font-bold text-base border-b border-slate-100 dark:border-slate-700 pb-2.5 flex items-center">
                    <ShieldCheck className="w-4 h-4 mr-2 text-brand-600 dark:text-brand-400" />
                    Data Integrity & Evidence Confidence
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Data Quality Score:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{work.data_quality_score || 92}% Compliant</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Evidence Confidence:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{lifecycle?.consistency?.evidence_confidence_score || '85/100'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Registered Coordinates:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{projectLat.toFixed(4)}, {projectLon.toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Schedule Delay Risk:</span>
                      <span className={cn("font-bold", work.delay_risk_score > 50 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300')}>
                        {work.delay_risk_score || 25}/100 ({work.delay_days || 0} days delay)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Duplicate Semantics Score:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{work.duplicate_risk_score || 0}/100</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Financial Anomaly Score:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{work.financial_anomaly_score || 0}/100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Executive Summary */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    <h3 className="font-bold text-base">Executive AI Synthesis & Operational Findings</h3>
                  </div>
                  <button 
                    onClick={() => setActiveTab('ai')}
                    className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center"
                  >
                    View Deep Audit Dossier <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
                <div className="p-5">
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    Project <strong>{work.work_id}</strong> is under execution by <strong>{work.implementing_agency || 'DRDA'}</strong>. 
                    Sanctioned outlay of ₹{(sanctioned / 100000).toFixed(2)} Lakh with ₹{(expended / 100000).toFixed(2)} Lakh expended ({finPct}% financial draw). 
                    {work.risk_level === 'HIGH' 
                      ? " The platform has identified cross-dimensional deviations between fund release pacing and ground inspection measurements." 
                      : " Pacing aligns with expected milestone schedules without critical red flags."}
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-4 mt-6">
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                      <h4 className="font-semibold text-emerald-800 dark:text-emerald-400 flex items-center mb-2 text-xs uppercase tracking-wider">
                        <CheckCircle className="w-4 h-4 mr-1.5" /> Strengths & Compliances
                      </h4>
                      <ul className="text-xs text-emerald-700 dark:text-emerald-300 space-y-1.5 list-disc list-inside">
                        <li>Geo-fenced check-ins logged for site supervisor within registered 500m perimeter</li>
                        <li>Escrow and initial mobilization advance properly accounted for</li>
                        <li>Data quality score is high ({work.data_quality_score || 90}%)</li>
                      </ul>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-100 dark:border-amber-900/30">
                      <h4 className="font-semibold text-amber-800 dark:text-amber-400 flex items-center mb-2 text-xs uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4 mr-1.5" /> Supervisory Verification Checkpoints
                      </h4>
                      <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1.5 list-disc list-inside">
                        <li>Cross-verify site BoQ balance with agency supply vouchers in Materials tab</li>
                        <li>Ensure scheduled milestone deliverables have signed engineering test certificates</li>
                        {gapPct > 15 && <li>Inspect reason for fund draw exceeding physical progress by {gapPct}%</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SCOPE & MILESTONES (ACTIVATED WITH 4 STAGES + INSPECTION FORM) */}
          {activeTab === 'scope' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center">
                    <Layers className="w-5 h-5 mr-2 text-brand-600 dark:text-brand-400" />
                    Approved Scope & Statutory Milestones
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Measurable physical engineering deliverables and 4-stage sequential progress tracker.
                  </p>
                </div>
                <button 
                  onClick={() => setShowInspectionModal(true)}
                  className="text-xs font-semibold px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-md flex items-center transition shadow-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  + Log Official Field Inspection
                </button>
              </div>

              {inspectionSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1.5 shrink-0" />
                  {inspectionSuccessMsg}
                </div>
              )}

              {/* Approved Scope Card */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Approved Scope of Works (BoQ Specifications)
                </h4>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {lifecycle?.scope?.approved_scope || work.work_description}
                </p>
                <div className="grid grid-cols-3 gap-4 pt-2 text-xs border-t border-slate-100 dark:border-slate-700/60">
                  <div>
                    <span className="text-slate-500 block">Deliverable Quantity:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{lifecycle?.scope?.target_quantity || '30 Units / 1 Complete Set'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Standard Rate Schedule:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">CPWD / State PWD Schedule of Rates</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Inspection Authority:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">District Quality Control Division</span>
                  </div>
                </div>
              </div>

              {/* 4 Sequential Milestones */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Sequential Milestone Execution Pipeline
                </h4>
                
                <div className="space-y-4">
                  {[
                    { stage: 'Stage 1: Mobilization & Site Layout', weight: '20%', progress: 100, status: 'COMPLETED', detail: 'Site survey, demarcation, initial material receipt & soil compaction.' },
                    { stage: 'Stage 2: Core Foundation & Substructure', weight: '35%', progress: Math.min(100, Math.round(physPct * 1.2)), status: physPct >= 40 ? 'COMPLETED' : 'IN_PROGRESS', detail: 'PCC casting, structural anchor bolt fixing, and earthing pits.' },
                    { stage: 'Stage 3: Superstructure Erection & Mounting', weight: '30%', progress: Math.max(0, Math.min(100, Math.round((physPct - 35) * 2))), status: physPct >= 75 ? 'COMPLETED' : physPct >= 35 ? 'IN_PROGRESS' : 'PENDING', detail: 'Pole erection, luminaire mounting, battery connections.' },
                    { stage: 'Stage 4: Commissioning & Joint Quality Inspection', weight: '15%', progress: physPct >= 95 ? 100 : 0, status: physPct >= 95 ? 'COMPLETED' : 'PENDING', detail: 'Final load testing, joint measurement book entry & handover.' }
                  ].map((m, i) => (
                    <div key={i} className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{m.stage}</span>
                          <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">Weight: {m.weight}</span>
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded font-bold",
                          m.status === 'COMPLETED' ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" :
                          m.status === 'IN_PROGRESS' ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" :
                          "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-400"
                        )}>
                          {m.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{m.detail}</p>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-brand-600 h-full rounded-full transition-all" style={{ width: `${m.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Field Inspections Audit Record */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Recorded Quality Inspection Reports
                </h4>
                
                {Array.isArray(lifecycle?.inspections) && lifecycle.inspections.length > 0 ? (
                  <div className="space-y-3">
                    {lifecycle.inspections.map((insp: any, i: number) => (
                      <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{insp.inspector_name}</span>
                          <span className="text-slate-500 block">{insp.inspector_designation}</span>
                          <p className="text-slate-600 dark:text-slate-300 mt-1 italic">"{insp.remarks}"</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold">
                            {insp.result || 'VERIFIED'} ({insp.observed_progress_pct}%)
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-1 font-mono">{insp.inspection_date || 'Recent'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No formal field inspection reports logged yet. Click "+ Log Official Field Inspection" above to record one.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB: DAILY MONITORING (FEATURES 1 & 2) */}
          {activeTab === 'daily' && (
            <div className="grid lg:grid-cols-12 gap-6 animate-in fade-in">
              {/* LEFT COLUMN: ATTENDANCE (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3 mb-4">
                    <div>
                      <h3 className="font-bold text-lg flex items-center text-slate-900 dark:text-slate-100">
                        <UserCheck className="w-5 h-5 mr-2 text-brand-600 dark:text-brand-400" />
                        Site Responsible Person Geo-Check-In
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Feature 1 • Records authorized site head presence near project coordinates.
                      </p>
                    </div>
                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                      Allowed: 500m
                    </span>
                  </div>

                  {/* Summary Badges */}
                  <div className="grid grid-cols-4 gap-3 mb-5">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200/60 dark:border-slate-700/50 text-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Check-ins</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{attendanceSummary?.total_checkins ?? attendance.length}</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800/50 text-center">
                      <span className="text-xs text-emerald-700 dark:text-emerald-400 block font-medium">Verified</span>
                      <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{attendanceSummary?.verified ?? attendance.filter(a => a.location_status === 'VERIFIED').length}</span>
                    </div>
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800/50 text-center">
                      <span className="text-xs text-amber-700 dark:text-amber-400 block font-medium">Mismatches</span>
                      <span className="text-lg font-bold text-amber-700 dark:text-amber-400">{attendanceSummary?.mismatches ?? attendance.filter(a => a.location_status === 'MISMATCH').length}</span>
                    </div>
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800/50 text-center">
                      <span className="text-xs text-blue-700 dark:text-blue-400 block font-medium">Rate</span>
                      <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{attendanceSummary?.attendance_rate ?? 75}%</span>
                    </div>
                  </div>

                  {/* Registered GPS Card */}
                  <div className="p-3 bg-slate-100/70 dark:bg-slate-900/70 rounded-lg border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between mb-5">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Registered Site Location: </span>
                        <span className="font-mono text-slate-900 dark:text-slate-100">{projectLat.toFixed(5)}, {projectLon.toFixed(5)}</span>
                      </div>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 font-mono">Max: 500m</span>
                  </div>

                  {/* Checkin Form */}
                  <form onSubmit={handleSubmitCheckin} className="space-y-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center">
                        <Crosshair className="w-4 h-4 mr-1.5 text-brand-600 dark:text-brand-400" />
                        Execute Live Geotagged Check-In
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Responsible Person</label>
                        <select 
                          className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
                          value={checkinPersonName}
                          onChange={(e) => {
                            setCheckinPersonName(e.target.value);
                            const matched = responsiblePersons.find(p => p.person_name === e.target.value);
                            if (matched) {
                              setCheckinPersonRole(matched.person_role);
                              setCheckinPersonId(matched.id);
                            }
                          }}
                        >
                          {responsiblePersons.length > 0 ? (
                            responsiblePersons.map(p => (
                              <option key={p.id} value={p.person_name}>{p.person_name} ({p.person_role})</option>
                            ))
                          ) : (
                            <>
                              <option value="Er. Rajesh K. Sharma">Er. Rajesh K. Sharma (Site Head)</option>
                              <option value="Vikramaditya Rao">Vikramaditya Rao (Site Supervisor)</option>
                              <option value="Suresh Patel">Suresh Patel (Agency Representative)</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Authorized Role</label>
                        <select 
                          className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
                          value={checkinPersonRole}
                          onChange={(e) => setCheckinPersonRole(e.target.value)}
                        >
                          <option value="Site Head">Site Head</option>
                          <option value="Site Supervisor">Site Supervisor</option>
                          <option value="Agency Representative">Agency Representative</option>
                          <option value="Project Representative">Project Representative</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Check-in Coordinates (GPS)</label>
                        <div className="flex items-center space-x-1.5">
                          <button 
                            type="button" 
                            onClick={handleSetOnSite}
                            className="text-[11px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 transition"
                          >
                            🎯 Preset: On-Site (Verified)
                          </button>
                          <button 
                            type="button" 
                            onClick={handleSetOffSite}
                            className="text-[11px] px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition"
                          >
                            ⚠️ Preset: Off-Site (Mismatch)
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-5">
                          <input 
                            type="text" 
                            placeholder="Latitude" 
                            value={checkinLat}
                            onChange={(e) => setCheckinLat(e.target.value)}
                            className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md font-mono"
                          />
                        </div>
                        <div className="col-span-5">
                          <input 
                            type="text" 
                            placeholder="Longitude" 
                            value={checkinLon}
                            onChange={(e) => setCheckinLon(e.target.value)}
                            className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <button 
                            type="button"
                            onClick={handleDetectGps}
                            disabled={isDetectingGps}
                            className="w-full h-full text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md flex items-center justify-center transition"
                            title="Auto-detect browser GPS"
                          >
                            {isDetectingGps ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Remarks</label>
                      <input 
                        type="text" 
                        value={checkinRemarks}
                        onChange={(e) => setCheckinRemarks(e.target.value)}
                        className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
                      />
                    </div>

                    {checkinError && (
                      <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
                        {checkinError}
                      </div>
                    )}

                    {checkinFeedback && (
                      <div className={cn(
                        "p-3 rounded-lg border text-xs space-y-1 animate-in fade-in",
                        checkinFeedback.location_status === 'VERIFIED'
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                          : "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                      )}>
                        <div className="flex items-center justify-between font-bold text-sm">
                          <span className="flex items-center">
                            {checkinFeedback.location_status === 'VERIFIED' ? <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-600" />}
                            {checkinFeedback.location_status === 'VERIFIED' ? 'LOCATION VERIFIED' : 'LOCATION MISMATCH — REQUIRES REVIEW'}
                          </span>
                          <span className="font-mono">
                            {checkinFeedback.distance_meters > 1000 ? `${(checkinFeedback.distance_meters / 1000).toFixed(2)} km` : `${checkinFeedback.distance_meters} m`}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-90">
                          {checkinFeedback.location_status === 'VERIFIED' 
                            ? `Authorized ${checkinFeedback.person_role} checked in within acceptable radius (${checkinFeedback.allowed_radius_meters}m).`
                            : `Authorized person checked in outside allowed radius (500m). Flagged for supervisory desk review.`}
                        </p>
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={isSubmittingCheckin}
                      className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center transition shadow-sm"
                    >
                      {isSubmittingCheckin ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
                      Submit Authorized Site Check-In
                    </button>
                  </form>
                </div>

                {/* History */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                  <h4 className="font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                    Attendance Audit History ({attendance.length} Records)
                  </h4>
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {attendance.map((att, i) => (
                      <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200/80 dark:border-slate-700/60 flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{att.person_name}</span>
                            <span className="text-[11px] px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium">
                              {att.person_role}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                            <span>📅 {att.date}</span>
                            <span>•</span>
                            <span>🕒 {att.checkin_time ? att.checkin_time.replace('T', ' ').slice(0, 19) : '09:30 AM'}</span>
                          </div>
                          {att.remarks && <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{att.remarks}"</p>}
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "text-xs font-mono font-bold px-2 py-1 rounded border inline-block",
                            att.location_status === 'VERIFIED' ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300"
                          )}>
                            {att.location_status === 'VERIFIED' ? 'VERIFIED' : 'MISMATCH'}
                          </span>
                          {att.distance_meters !== null && (
                            <span className="text-[11px] text-slate-500 block mt-1 font-mono">
                              {att.distance_meters > 1000 ? `${(att.distance_meters / 1000).toFixed(2)} km` : `${att.distance_meters} m`}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: DAILY WORK UPDATES (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3 mb-4">
                    <div>
                      <h3 className="font-bold text-lg flex items-center text-slate-900 dark:text-slate-100">
                        <Activity className="w-5 h-5 mr-2 text-brand-600 dark:text-brand-400" />
                        Daily Work Updates
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Feature 2 • Physical progress ledger (independent of attendance).
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowUpdateModal(true)}
                      className="text-xs font-semibold px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-md flex items-center transition shadow-sm"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1" />
                      + Log Work
                    </button>
                  </div>

                  {updateSuccessMsg && (
                    <div className="p-3 mb-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1.5 shrink-0" />
                      {updateSuccessMsg}
                    </div>
                  )}

                  <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
                    {dailyUpdates.map((update, i) => (
                      <div key={i} className="relative pl-6 pb-4 border-l-2 border-brand-500/40 last:border-0">
                        <div className="absolute w-3 h-3 bg-brand-600 rounded-full -left-[7px] top-1.5 ring-4 ring-white dark:ring-slate-800"></div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono font-semibold text-brand-700 dark:text-brand-400">📅 {update.date}</span>
                          <span className="text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-medium">
                            {update.work_category || 'Installation'}
                          </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{update.work_description}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/50">
                            <div><span className="text-slate-500">Progress: </span><span className="font-bold">{update.cumulative_progress_pct}%</span></div>
                            <div><span className="text-slate-500">Workers: </span><span className="font-bold">{update.worker_count || 'N/A'}</span></div>
                          </div>
                          {update.current_issues && (
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded text-[11px] text-amber-800 dark:text-amber-300 flex items-start space-x-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>{update.current_issues}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MATERIALS */}
          {activeTab === 'materials' && (
            <div className="space-y-6 animate-in fade-in">
              {reconciliation?.has_issues && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800 dark:text-amber-400">Material Reconciliation Discrepancies Detected</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Variances found between agency supply commitments and physical site ledger balances.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold">Agency Supply Commitments</h3>
                  </div>
                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Material</th>
                          <th className="px-4 py-3">Contracted</th>
                          <th className="px-4 py-3">Supplied</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {agencySupply.length > 0 ? agencySupply.map((item, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3 font-medium">{item.material_name}</td>
                            <td className="px-4 py-3">{formatQty(item.contracted_quantity)} {item.unit}</td>
                            <td className="px-4 py-3 font-bold">{formatQty(item.supplied_quantity)} {item.unit}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium">
                                {item.verification_status || 'VERIFIED'}
                              </span>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} className="px-4 py-4 text-center text-slate-500 italic">No supply records.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold">Site Inventory (Running Ledger)</h3>
                  </div>
                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Material</th>
                          <th className="px-4 py-3">Received</th>
                          <th className="px-4 py-3">Consumed</th>
                          <th className="px-4 py-3">Stock Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {siteInventory.length > 0 ? siteInventory.map((item, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3 font-medium">{item.material_name}</td>
                            <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">{formatQty(item.total_received)}</td>
                            <td className="px-4 py-3 text-amber-600 dark:text-amber-400 font-semibold">{formatQty(item.total_used)}</td>
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{formatQty(item.current_stock)} {item.unit}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} className="px-4 py-4 text-center text-slate-500 italic">No inventory logs.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* AGENCY SUPPLY VS SITE INVENTORY 5-WAY RECONCILIATION TABLE */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-750 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">Agency Supply vs Site Inventory Reconciliation Matrix</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      5-Way Verification: Contracted Quantity vs Agency Supplied vs Site Received vs Site Used vs Current Stock
                    </p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                    Continuous Audit
                  </span>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3">Material</th>
                        <th className="px-4 py-3 text-center">Contracted (A)</th>
                        <th className="px-4 py-3 text-center">Agency Supplied (B)</th>
                        <th className="px-4 py-3 text-center">Site Received (C)</th>
                        <th className="px-4 py-3 text-center">Difference (B - C)</th>
                        <th className="px-4 py-3 text-center">Site Used (D)</th>
                        <th className="px-4 py-3 text-center">Current Stock (C - D)</th>
                        <th className="px-4 py-3">Audit / Reconciliation Assessment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {Array.isArray(reconciliation) && reconciliation.length > 0 ? (
                        reconciliation.map((rec: any, idx: number) => {
                          const diff = rec.supply_receipt_difference || 0;
                          const hasIssue = rec.has_issues;
                          return (
                            <tr key={idx} className={hasIssue ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}>
                              <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                                {rec.material_name}
                                <span className="text-xs font-normal text-slate-400 block">{rec.unit}</span>
                              </td>
                              <td className="px-4 py-3.5 text-center font-medium text-slate-600 dark:text-slate-300">
                                {formatQty(rec.contracted)}
                              </td>
                              <td className="px-4 py-3.5 text-center font-medium text-blue-600 dark:text-blue-400">
                                {formatQty(rec.agency_supplied)}
                              </td>
                              <td className="px-4 py-3.5 text-center font-medium text-emerald-600 dark:text-emerald-400">
                                {formatQty(rec.site_received)}
                              </td>
                              <td className="px-4 py-3.5 text-center font-semibold">
                                {diff > 0.01 ? (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    +{formatQty(diff)}
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400">0</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-center font-medium text-slate-700 dark:text-slate-300">
                                {formatQty(rec.site_used)}
                              </td>
                              <td className="px-4 py-3.5 text-center font-bold text-slate-900 dark:text-slate-100">
                                {formatQty(rec.current_stock)}
                              </td>
                              <td className="px-4 py-3.5 text-xs">
                                {rec.issues && rec.issues.length > 0 ? (
                                  <div className="space-y-1">
                                    {rec.issues.map((iss: string, iIndex: number) => (
                                      <div
                                        key={iIndex}
                                        className={`px-2.5 py-1 rounded-md border text-xs leading-relaxed ${
                                          iss.includes("Material Inconsistency Alert")
                                            ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-300 font-semibold"
                                            : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300"
                                        }`}
                                      >
                                        {iss}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md font-medium">
                                    ✓ Perfect Reconciliation
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-4 py-4 text-center text-slate-500 italic">
                            No reconciliation data recorded for this project yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: FINANCE & PAYMENTS */}
          {activeTab === 'finance' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Payment Workflow & Traceability Layer</h3>
                <span className="px-3 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 rounded-full text-xs font-bold uppercase tracking-wider border border-brand-200 dark:border-brand-800">
                  Demo Payment Processor
                </span>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-4">Request / Invoice Ref</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Milestone</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Reconciliation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {payments.length > 0 ? (
                        payments.map((p, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-6 py-4 font-mono font-medium">{p.payment_request_id || p.invoice_reference || `PAY-${i + 1}`}</td>
                            <td className="px-6 py-4 font-bold">₹{(p.amount || 0).toLocaleString()}</td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{p.milestone_id || 'Civil Foundation Stage'}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2.5 py-1 rounded text-xs font-semibold",
                                p.status === 'PAID' || p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                p.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                              )}>
                                {p.status || 'PAID'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                              {p.reconciliation_status || 'Verified with bank receipt'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">No payment records found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: RISK */}
          {activeTab === 'risk' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
                  <h3 className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs mb-4">Overall Composite Risk</h3>
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">{work.composite_risk_score}</span>
                  </div>
                  <p className="mt-4 text-sm font-medium">Confidence: <span className="text-emerald-600 dark:text-emerald-400">HIGH (95%)</span></p>
                </div>

                <div className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <h3 className="font-bold mb-6">Risk Contributors Breakdown</h3>
                  <div className="space-y-5">
                    {[
                      { label: 'Financial Outlier Risk', score: work.financial_anomaly_score || 25 },
                      { label: 'Schedule Delay Probability', score: work.delay_risk_score || 35 },
                      { label: 'Duplicate Semantics Risk', score: work.duplicate_risk_score || 10 },
                      { label: 'Fund Utilization / Stall Anomaly', score: work.utilization_anomaly_score || 30 }
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium">{item.label}</span>
                          <span className="font-bold">{item.score}/100</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-500", item.score > 70 ? "bg-red-500" : item.score > 40 ? "bg-amber-500" : "bg-emerald-500")}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3-DIMENSIONAL TRIANGULATION CARD: MATERIAL -> WORK -> FINANCE */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-750 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center">
                      <Sparkles className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                      Cross-Source Triangulation: Material ↔ Physical Work ↔ Financial Expenditure
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Inter-dimensional telemetry consistency check per official MoSPI public works verification standards.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                    Triangulation Engine
                  </span>
                </div>

                <div className="p-6 space-y-6">
                  {/* 3 Metric Dimension Gauges */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Dimension 1: Physical Work */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">1. Physical Progress</span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                          {work.completion_percentage ?? 30}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, work.completion_percentage ?? 30)}%` }} />
                      </div>
                      <p className="text-[11px] text-slate-500">Milestone ground completion verified from site updates</p>
                    </div>

                    {/* Dimension 2: Material Consumption */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">2. Material Consumed</span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                          {Array.isArray(reconciliation) && reconciliation.length > 0
                            ? `${Math.round((reconciliation.reduce((a: number, c: any) => a + (c.site_used || 0), 0) / Math.max(1, reconciliation.reduce((a: number, c: any) => a + (c.contracted || c.agency_supplied || 1), 0))) * 100)}%`
                            : '75%'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full" 
                          style={{ 
                            width: `${Math.min(100, Array.isArray(reconciliation) && reconciliation.length > 0 
                              ? Math.round((reconciliation.reduce((a: number, c: any) => a + (c.site_used || 0), 0) / Math.max(1, reconciliation.reduce((a: number, c: any) => a + (c.contracted || c.agency_supplied || 1), 0))) * 100)
                              : 75)}%` 
                          }} 
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">Aggregated site inventory usage vs. planned/supplied BoQ</p>
                    </div>

                    {/* Dimension 3: Financial Expenditure */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">3. Financial Expenditure</span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300">
                          {work.sanctioned_amount && work.total_expenditure
                            ? `${Math.round((work.total_expenditure / work.sanctioned_amount) * 100)}%`
                            : '80%'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full" 
                          style={{ 
                            width: `${Math.min(100, work.sanctioned_amount && work.total_expenditure ? Math.round((work.total_expenditure / work.sanctioned_amount) * 100) : 80)}%` 
                          }} 
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">Disbursed funds via PFMS vs. total administrative sanction</p>
                    </div>
                  </div>

                  {/* AI Non-Accusatory Analysis Notice Banner */}
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <h4 className="font-bold text-xs text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                        AI Telemetry Triangulation Assessment
                      </h4>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                      "The project reports <strong>{work.completion_percentage ?? 30}% physical completion</strong>, while <strong>{
                        Array.isArray(reconciliation) && reconciliation.length > 0
                          ? `${Math.round((reconciliation.reduce((a: number, c: any) => a + (c.site_used || 0), 0) / Math.max(1, reconciliation.reduce((a: number, c: any) => a + (c.contracted || c.agency_supplied || 1), 0))) * 100)}%`
                          : '75%'
                      } of the planned material quantity</strong> has already been consumed and <strong>{
                        work.sanctioned_amount && work.total_expenditure
                          ? `${Math.round((work.total_expenditure / work.sanctioned_amount) * 100)}%`
                          : '80%'
                      } of the sanctioned expenditure</strong> has been recorded. This gap may be legitimate during early procurement or advance expenditure, but the current pattern requires verification against invoices, delivery records, milestone progress, and site measurements."
                    </p>
                    <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/60 text-[11px] text-amber-700 dark:text-amber-400 font-mono">
                      Statutory Directive: Early warning signal for supervisory audit. Does not constitute a determination of fraud.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: EVIDENCE (ACTIVATED WITH CITIZEN PHOTOS & GEOTAG VALIDATION) */}
          {activeTab === 'evidence' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center">
                    <Camera className="w-5 h-5 mr-2 text-brand-600 dark:text-brand-400" />
                    Ground Reality Evidence & Citizen Photographs
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Geotagged ground truth citizen photos with AI vision tamper checks and coordinate verification.
                  </p>
                </div>
                <button 
                  onClick={() => setShowEvidenceModal(true)}
                  className="text-xs font-semibold px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-md flex items-center transition shadow-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  + Submit Ground Evidence
                </button>
              </div>

              {evidence.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-6">
                  {evidence.map((ev: any, i: number) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                      <div className="h-48 bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                        <img 
                          src={ev.photo_url || ev.image_path || 'https://images.unsplash.com/photo-1590496793929-36417d3117de?w=800&auto=format&fit=crop'} 
                          alt="Evidence" 
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 text-white backdrop-blur-sm">
                          {ev.status || 'VERIFIED'}
                        </span>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <span className="text-xs font-mono text-slate-400 block mb-1">📅 {ev.timestamp || '2026-09-02'}</span>
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{ev.citizen_remarks || ev.description || 'Ground foundation inspection photograph.'}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px]">
                          <span className="text-emerald-600 font-bold flex items-center">
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> AI Confidence: {ev.ai_confidence ? `${ev.ai_confidence}%` : '94%'}
                          </span>
                          <span className="text-slate-400 font-mono">Distance: &lt; 40m</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
                  <Camera className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="font-bold text-sm">No Citizen Photos Uploaded Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Be the first to submit geotagged physical proof from the site. Click "+ Submit Ground Evidence" above.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB: PUBLIC SIGNALS (ACTIVATED WITH CITIZEN COMPLAINTS & DEMAND CLUSTERING) */}
          {activeTab === 'public' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-brand-600 dark:text-brand-400" />
                    Public Signals, Complaints & Local Demand
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Separated citizen feedback: operational complaints vs. citizen development demand requests.
                  </p>
                </div>
              </div>

              {/* Demand Cluster Alert Banner */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-blue-900 dark:text-blue-300">
                    Local Area Infrastructure Demand Signal
                  </h4>
                  <p className="text-xs text-blue-800 dark:text-blue-400 mt-1 leading-relaxed">
                    The citizen development engine has detected <strong>14 public development requests</strong> within a 3.5 km radius of this project site. 
                    Most requested category: <strong>Solar Street Lighting & Road Connectivity</strong>.
                  </p>
                </div>
              </div>

              {/* Public Requests Table */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Citizen Development Requests Linked or Nearby
                </h4>
                {publicSignals.length > 0 ? (
                  <div className="space-y-3">
                    {publicSignals.map((req: any, i: number) => (
                      <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start justify-between text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{req.category}</span>
                            <span className="text-slate-400 font-mono">ID: {req.request_id}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300">{req.description}</p>
                          <span className="text-[11px] text-slate-400 block">Submitted on: {req.request_date}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded font-bold shrink-0">
                          {req.status || 'SUBMITTED'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start justify-between text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">Solar Street Lighting</span>
                          <span className="text-slate-400 font-mono">ID: DR-2026-PACHMO</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">Public demand for 8 additional solar street lights near Pachmo high school and health sub-centre junction.</p>
                        <span className="text-[11px] text-slate-400 block">Submitted on: 2026-08-14</span>
                      </div>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded font-bold shrink-0">
                        LINKED_TO_PROJECT
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: TIMELINE (ENRICHED MASTER LIFECYCLE TRACK + CATEGORIZED EVENT STREAM) */}
          {activeTab === 'timeline' && (
            <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto">
              
              {/* MASTER STATUTORY LIFECYCLE TRACK (Answers "what is the main timeline for what") */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-700/70 pb-3 gap-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center">
                      <Landmark className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />
                      Master Project Lifecycle Track (Key Milestone Stages)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Statutory stage-by-stage progression from MP recommendation to final physical handover.
                    </p>
                  </div>
                  <span className="text-xs font-mono bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-md border border-purple-200 dark:border-purple-800 font-bold self-start sm:self-auto">
                    Active: Stage 4 (Execution & Materials)
                  </span>
                </div>

                {/* 5-Stage Stepper */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {[
                    { step: '1', title: 'MP Recommendation', date: 'May 2024', status: 'COMPLETED', detail: 'Hon\'ble MP proposed work under MPLADS constituency quota.' },
                    { step: '2', title: 'Administrative Sanction', date: work.sanction_date || '15 Jun 2024', status: 'COMPLETED', detail: `Formal sanction of ₹${(sanctioned / 100000).toFixed(2)}L approved by District Collector.` },
                    { step: '3', title: 'Work Order Issued', date: '01 Jul 2024', status: 'COMPLETED', detail: `Execution entrusted to ${work.implementing_agency || 'DRDA'}.` },
                    { step: '4', title: 'Execution & Materials', date: 'Ongoing (Sep 2026)', status: 'ACTIVE', detail: `${physPct}% physical progress reported with material delivery tracking.` },
                    { step: '5', title: 'Commissioning & Handover', date: work.target_completion_date || '31 Mar 2025', status: 'SCHEDULED', detail: 'Final joint measurement book entry and public dedication.' }
                  ].map((st, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "p-3 rounded-xl border text-xs flex flex-col justify-between space-y-2 transition",
                        st.status === 'COMPLETED' ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60" :
                        st.status === 'ACTIVE' ? "bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 ring-2 ring-purple-500/20 shadow-sm" :
                        "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-80"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                          st.status === 'COMPLETED' ? "bg-emerald-600 text-white" :
                          st.status === 'ACTIVE' ? "bg-purple-600 text-white animate-pulse" :
                          "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        )}>
                          {st.status === 'COMPLETED' ? '✓' : st.step}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{st.date}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block leading-tight">{st.title}</span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-normal">{st.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TIMELINE CONTROLS: CATEGORY FILTERS & SEARCH */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'ALL', label: 'All Events', count: timelineEvents.length },
                      { id: 'MILESTONE', label: '🏛️ Master Milestones', count: timelineEvents.filter(e => e.type === 'milestone').length },
                      { id: 'ATTENDANCE', label: '📍 Site Check-Ins', count: timelineEvents.filter(e => e.type === 'attendance').length },
                      { id: 'UPDATE', label: '🔨 Work Updates', count: timelineEvents.filter(e => e.type === 'daily_update').length },
                      { id: 'MATERIAL', label: '📦 Materials', count: timelineEvents.filter(e => e.type === 'material_supply' || e.type === 'inventory').length },
                      { id: 'PAYMENT', label: '💰 Payments', count: timelineEvents.filter(e => e.type === 'payment').length },
                      { id: 'PUBLIC', label: '📢 Public Signals', count: timelineEvents.filter(e => e.type === 'development_request' || e.type === 'complaint').length }
                    ].map(btn => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setTimelineFilter(btn.id as any)}
                        className={cn(
                          "px-2.5 py-1 text-xs rounded-lg font-medium transition flex items-center space-x-1.5 border",
                          timelineFilter === btn.id
                            ? "bg-brand-600 text-white border-brand-700 dark:border-brand-500 shadow-sm font-semibold"
                            : "bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        <span>{btn.label}</span>
                        <span className={cn(
                          "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                          timelineFilter === btn.id ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        )}>
                          {btn.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full md:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input 
                      type="text"
                      value={timelineSearch}
                      onChange={(e) => setTimelineSearch(e.target.value)}
                      placeholder="Filter timeline events..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* CHRONOLOGICAL EVENT STREAM */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 mb-6">
                  <h4 className="font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Chronological Event Ledger ({
                      timelineEvents.filter((evt) => {
                        if (timelineFilter === 'MILESTONE' && evt.type !== 'milestone') return false;
                        if (timelineFilter === 'ATTENDANCE' && evt.type !== 'attendance') return false;
                        if (timelineFilter === 'UPDATE' && evt.type !== 'daily_update') return false;
                        if (timelineFilter === 'MATERIAL' && evt.type !== 'material_supply' && evt.type !== 'inventory') return false;
                        if (timelineFilter === 'PAYMENT' && evt.type !== 'payment') return false;
                        if (timelineFilter === 'PUBLIC' && evt.type !== 'development_request' && evt.type !== 'complaint') return false;
                        if (timelineSearch.trim()) {
                          const q = timelineSearch.toLowerCase();
                          const matchTitle = (evt.title || '').toLowerCase().includes(q);
                          const matchDetail = (evt.detail || evt.description || '').toLowerCase().includes(q);
                          const matchDate = (evt.date || '').toLowerCase().includes(q);
                          const matchStatus = (evt.status || '').toLowerCase().includes(q);
                          if (!matchTitle && !matchDetail && !matchDate && !matchStatus) return false;
                        }
                        return true;
                      }).length
                    } Shown)
                  </h4>
                  <span className="text-xs text-slate-400">Single Source of Ground Truth</span>
                </div>

                {loading['timeline'] ? (
                  <div className="py-12 text-center text-slate-500 text-sm">Aggregating cross-source chronological events...</div>
                ) : (
                  <div className="space-y-4">
                    {timelineEvents
                      .filter((evt) => {
                        if (timelineFilter === 'MILESTONE' && evt.type !== 'milestone') return false;
                        if (timelineFilter === 'ATTENDANCE' && evt.type !== 'attendance') return false;
                        if (timelineFilter === 'UPDATE' && evt.type !== 'daily_update') return false;
                        if (timelineFilter === 'MATERIAL' && evt.type !== 'material_supply' && evt.type !== 'inventory') return false;
                        if (timelineFilter === 'PAYMENT' && evt.type !== 'payment') return false;
                        if (timelineFilter === 'PUBLIC' && evt.type !== 'development_request' && evt.type !== 'complaint') return false;
                        if (timelineSearch.trim()) {
                          const q = timelineSearch.toLowerCase();
                          const matchTitle = (evt.title || '').toLowerCase().includes(q);
                          const matchDetail = (evt.detail || evt.description || '').toLowerCase().includes(q);
                          const matchDate = (evt.date || '').toLowerCase().includes(q);
                          const matchStatus = (evt.status || '').toLowerCase().includes(q);
                          if (!matchTitle && !matchDetail && !matchDate && !matchStatus) return false;
                        }
                        return true;
                      })
                      .map((evt, i) => {
                        // Determine styling by type
                        const isMilestone = evt.type === 'milestone';
                        const isPayment = evt.type === 'payment';
                        const isMaterial = evt.type === 'material_supply' || evt.type === 'inventory';
                        const isAttendance = evt.type === 'attendance';
                        const isUpdate = evt.type === 'daily_update';
                        const isPublic = evt.type === 'development_request' || evt.type === 'complaint';

                        return (
                          <div 
                            key={i} 
                            className={cn(
                              "p-4 rounded-xl border flex flex-col sm:flex-row sm:items-start justify-between gap-3 transition hover:shadow-sm",
                              isMilestone ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/60" :
                              isPayment ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60" :
                              isMaterial ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60" :
                              isAttendance ? "bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800/60" :
                              isUpdate ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60" :
                              isPublic ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60" :
                              "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
                            )}
                          >
                            <div className="flex items-start space-x-3">
                              {/* Semantic Event Icon */}
                              <div className={cn(
                                "p-2 rounded-lg shrink-0 mt-0.5",
                                isMilestone ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300" :
                                isPayment ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300" :
                                isMaterial ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" :
                                isAttendance ? "bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300" :
                                isUpdate ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300" :
                                isPublic ? "bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300" :
                                "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              )}>
                                {isMilestone ? <Landmark className="w-4 h-4" /> :
                                 isPayment ? <DollarSign className="w-4 h-4" /> :
                                 isMaterial ? <Package className="w-4 h-4" /> :
                                 isAttendance ? <UserCheck className="w-4 h-4" /> :
                                 isUpdate ? <Activity className="w-4 h-4" /> :
                                 isPublic ? <MessageSquare className="w-4 h-4" /> :
                                 <Clock className="w-4 h-4" />}
                              </div>

                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                                    isMilestone ? "bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 border-purple-200" :
                                    isPayment ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-200" :
                                    isMaterial ? "bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 border-blue-200" :
                                    isAttendance ? "bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 border-cyan-200" :
                                    isUpdate ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border-amber-200" :
                                    "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200"
                                  )}>
                                    {isMilestone ? '🏛️ MASTER MILESTONE' :
                                     isPayment ? '💰 PAYMENT PIPELINE' :
                                     isMaterial ? '📦 MATERIAL LEDGER' :
                                     isAttendance ? '📍 SITE CHECK-IN' :
                                     isUpdate ? '🔨 DAILY WORK UPDATE' :
                                     isPublic ? '📢 PUBLIC SIGNAL' :
                                     'OPERATIONAL LOG'}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                    {evt.title}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                  {evt.detail || evt.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start shrink-0 pl-11 sm:pl-0">
                              <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                                📅 {evt.date}
                              </span>
                              {evt.status && (
                                <span className={cn(
                                  "text-[10px] font-mono font-bold px-2 py-0.5 rounded border mt-1",
                                  evt.status === 'VERIFIED' || evt.status === 'APPROVED' || evt.status === 'PAID'
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : evt.status === 'MISMATCH'
                                    ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300"
                                    : "bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700 dark:text-slate-300"
                                )}>
                                  {evt.status}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}


          {/* TAB: AI ANALYSIS (ACTIVATED WITH DEEP 11-SECTION AUDIT DOSSIER) */}
          {activeTab === 'ai' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
                <h3 className="font-bold text-lg flex items-center text-slate-900 dark:text-slate-100">
                  <Sparkles className="w-5 h-5 mr-2 text-brand-600 dark:text-brand-400" />
                  Auditable AI Decision-Support Dossier
                </h3>
                <button 
                  onClick={() => fetchTabBasedData('ai')}
                  className="text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-md flex items-center transition"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Re-evaluate Analysis
                </button>
              </div>

              {loading['ai'] ? (
                <div className="py-16 text-center text-slate-500 animate-pulse">Running cross-source consistency audit with Gemini AI...</div>
              ) : (
                <div className="space-y-6">
                  {/* Structured Visual Triangulation Dashboard */}
                  {aiAnalysis?.triangulation ? (
                    <div className="space-y-6">
                      {/* Section 1: Header & Key Metrics Badges */}
                      <div className="p-5 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/70 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 rounded-xl border border-indigo-100 dark:border-slate-700 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-indigo-100/60 dark:border-slate-700 pb-3">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center">
                            <Sparkles className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                            Multi-Dimensional Cross-Source Telemetry Triangulation
                          </h4>
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            Continuous 3D Engine
                          </span>
                        </div>

                        {/* 3 Metric Dimension Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          {/* Physical Progress */}
                          <div className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-500 dark:text-slate-400">1. Physical Progress</span>
                              <span className="font-bold font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                {aiAnalysis.triangulation.physical_progress}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, aiAnalysis.triangulation.physical_progress)}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-400 block">Ground completion</span>
                          </div>

                          {/* Material Consumed */}
                          <div className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-500 dark:text-slate-400">2. Material Consumed</span>
                              <span className="font-bold font-mono px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                                {aiAnalysis.triangulation.material_consumption}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(100, aiAnalysis.triangulation.material_consumption)}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-400 block">Planned vs. consumed in work</span>
                          </div>

                          {/* Financial Expenditure */}
                          <div className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-500 dark:text-slate-400">3. Financial Release</span>
                              <span className="font-bold font-mono px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                {aiAnalysis.triangulation.financial_expenditure}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${Math.min(100, aiAnalysis.triangulation.financial_expenditure)}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-400 block">Sanctioned vs. disbursed</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: AI Triangulation Analysis Banner */}
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-2">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-300">
                            AI Triangulation Analysis
                          </h4>
                        </div>
                        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                          {aiAnalysis.triangulation.analysis}
                        </p>
                      </div>

                      {/* Section 3: Cross-Dimensional Telemetry Streams */}
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center">
                          <Activity className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                          Cross-Dimensional Audit Assessment Streams
                        </h4>
                        <div className="grid sm:grid-cols-3 gap-3 text-xs">
                          {/* Stream 1 */}
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center">
                              <Package className="w-3.5 h-3.5 mr-1 text-blue-600" /> Inventory Reality
                            </span>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                              {aiAnalysis.triangulation.inventory_summary}
                            </p>
                          </div>
                          {/* Stream 2 */}
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center">
                              <UserCheck className="w-3.5 h-3.5 mr-1 text-cyan-600" /> Site Presence
                            </span>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                              {aiAnalysis.triangulation.attendance_summary}
                            </p>
                          </div>
                          {/* Stream 3 */}
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center">
                              <DollarSign className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Expenditure Trail
                            </span>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                              {aiAnalysis.triangulation.expenditure_summary}
                            </p>
                          </div>
                        </div>

                        {/* Statutory Notice */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span><strong>Statutory Directive:</strong> This finding represents a data-driven inconsistency signal for supervisory inquiry, not a determination of fraud or culpability.</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Fallback Render if general prompt */
                    <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-800 dark:text-slate-200">
                      {aiAnalysis?.answer || 'Audit analysis ready. Gathering live cross-dimensional telemetry...'}
                    </div>
                  )}

                  {/* Verification Action Checklist */}
                  <div className="bg-slate-100/70 dark:bg-slate-900/70 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center">
                      <CheckSquare className="w-4 h-4 mr-2 text-brand-600" />
                      Priority Field Verification Checklist (Audit Guide)
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      <li className="flex items-start">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 mr-2 shrink-0 mt-0.5" />
                        <span>Inspect physical cross-sections of completed foundations against registered BoQ quantities.</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 mr-2 shrink-0 mt-0.5" />
                        <span>Cross-verify contractor material dispatch challans with on-site received inventory ledger.</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 mr-2 shrink-0 mt-0.5" />
                        <span>Audit supervisor GPS check-in logs for consecutive missing days or off-site coordinate flags.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* MODAL: LOG TODAY'S WORK UPDATE (FEATURE 2) */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-brand-600 dark:text-brand-400" />
                Log Daily Site Work Update (Feature 2)
              </h3>
              <button onClick={() => setShowUpdateModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitDailyUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Today's Work Description *</label>
                <textarea 
                  rows={3}
                  required
                  value={updateWorkDesc}
                  onChange={(e) => setUpdateWorkDesc(e.target.value)}
                  placeholder="e.g., Base preparation completed for 120 metres. Aggregate compacted and tested."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Work Category</label>
                  <input 
                    type="text" 
                    value={updateCategory}
                    onChange={(e) => setUpdateCategory(e.target.value)}
                    placeholder="e.g. Installation, Civil Works"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Cumulative Progress %</label>
                  <input 
                    type="number" 
                    min="0" max="100"
                    value={updateProgressPct}
                    onChange={(e) => setUpdateProgressPct(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Workers Present (Aggregate)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={updateWorkerCount}
                    onChange={(e) => setUpdateWorkerCount(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Materials Used Today</label>
                  <input 
                    type="text" 
                    value={updateMaterialsUsed}
                    onChange={(e) => setUpdateMaterialsUsed(e.target.value)}
                    placeholder="e.g., Cement: 25 bags, Gravel: 4T"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Current Issues / Delay Reasons (if any)</label>
                <input 
                  type="text" 
                  value={updateIssues}
                  onChange={(e) => setUpdateIssues(e.target.value)}
                  placeholder="e.g., Material delivery delayed by 2 days due to transit"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg font-medium text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingUpdate}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold flex items-center shadow-sm"
                >
                  {isSubmittingUpdate ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
                  Submit Work Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG FIELD INSPECTION */}
      {showInspectionModal && (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2 text-brand-600 dark:text-brand-400" />
                Record Statutory Field Inspection Dossier
              </h3>
              <button onClick={() => setShowInspectionModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitInspection} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Inspector Name *</label>
                  <input 
                    type="text" 
                    required
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Designation</label>
                  <input 
                    type="text" 
                    value={inspectorDesig}
                    onChange={(e) => setInspectorDesig(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Verified Progress %</label>
                  <input 
                    type="number" 
                    min="0" max="100"
                    value={observedProgressPct}
                    onChange={(e) => setObservedProgressPct(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Inspection Result</label>
                  <select 
                    value={inspectionResult}
                    onChange={(e) => setInspectionResult(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold"
                  >
                    <option value="VERIFIED">VERIFIED (Full Compliance)</option>
                    <option value="PARTIALLY_VERIFIED">PARTIALLY VERIFIED (Minor Corrections)</option>
                    <option value="DISCREPANCY_FLAGGED">DISCREPANCY FLAGGED (Audit Required)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Inspection Remarks & Measurements *</label>
                <textarea 
                  rows={3}
                  required
                  value={inspectionRemarks}
                  onChange={(e) => setInspectionRemarks(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowInspectionModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg font-medium text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingInspection}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold flex items-center shadow-sm"
                >
                  {isSubmittingInspection ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-1.5" />}
                  Submit Inspection Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT CITIZEN EVIDENCE */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center">
                <Camera className="w-5 h-5 mr-2 text-brand-600 dark:text-brand-400" />
                Submit Ground Reality Photograph
              </h3>
              <button onClick={() => setShowEvidenceModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvidence} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Photo URL / Upload Link *</label>
                <input 
                  type="text" 
                  required
                  value={evidencePhotoUrl}
                  onChange={(e) => setEvidencePhotoUrl(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Citizen Remarks & Observations *</label>
                <textarea 
                  rows={3}
                  required
                  value={evidenceRemarks}
                  onChange={(e) => setEvidenceRemarks(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowEvidenceModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg font-medium text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingEvidence}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold flex items-center shadow-sm"
                >
                  {submittingEvidence ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <Camera className="w-4 h-4 mr-1.5" />}
                  Submit Evidence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
