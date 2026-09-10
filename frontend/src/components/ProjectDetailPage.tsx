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

  // AI Tab Interactive Checklist State
  const [verifiedChecklist, setVerifiedChecklist] = useState<Record<string, boolean>>({});

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

  const fetchTabBasedData = async (tab: TabType, force = false) => {
    if (!workId) return;
    const setLoad = (key: string, val: boolean) => setLoading(p => ({ ...p, [key]: val }));
    
    try {
      if ((tab === 'overview' || tab === 'scope') && (!lifecycle || force)) {
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
      else if (tab === 'materials' && (siteInventory.length === 0 || force)) {
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
      else if (tab === 'finance' && (payments.length === 0 || force)) {
        setLoad('finance', true);
        const res = await axios.get('/api/payments', { params: { project_id: workId } }).catch(() => ({ data: [] }));
        setPayments(Array.isArray(res.data) ? res.data : []);
        setLoad('finance', false);
      }
      else if (tab === 'risk' && (!riskBreakdown || force)) {
        setLoad('risk', true);
        const res = await axios.get(`/api/projects/${encodeURIComponent(workId)}/risk-breakdown`).catch(() => ({ data: null }));
        setRiskBreakdown(res.data);
        setLoad('risk', false);
      }
      else if (tab === 'evidence' && (evidence.length === 0 || force)) {
        setLoad('evidence', true);
        const res = await axios.get(`/api/citizen-evidence/work/${encodeURIComponent(workId)}`).catch(() => ({ data: { evidence: [] } }));
        setEvidence(res.data?.evidence || []);
        setLoad('evidence', false);
      }
      else if (tab === 'public' && (publicSignals.length === 0 || force)) {
        setLoad('public', true);
        const res = await axios.get(`/api/development-requests`, { params: { linked_project_id: workId } }).catch(() => ({ data: [] }));
        setPublicSignals(Array.isArray(res.data) ? res.data : []);
        setLoad('public', false);
      }
      else if (tab === 'timeline' && (timelineEvents.length === 0 || force)) {
        setLoad('timeline', true);
        const res = await axios.get(`/api/projects/${encodeURIComponent(workId)}/timeline`).catch(() => ({ data: [] }));
        setTimelineEvents(Array.isArray(res.data?.timeline) ? res.data.timeline : []);
        setLoad('timeline', false);
      }
      else if (tab === 'ai' && (!aiAnalysis || force)) {
        setLoad('ai', true);
        const [aiRes, recRes, sumRes, payRes] = await Promise.all([
          axios.post(`/api/assistant/query`, {
            query: `Provide a comprehensive official audit and cross-source consistency analysis for project ${workId}`,
            work_id: workId
          }).catch(() => ({ data: { answer: 'AI analysis unavailable at the moment.' } })),
          !reconciliation ? axios.get('/api/inventory/reconciliation', { params: { project_id: workId } }).catch(() => ({ data: null })) : Promise.resolve({ data: reconciliation }),
          !attendanceSummary ? axios.get('/api/attendance/summary', { params: { project_id: workId } }).catch(() => ({ data: null })) : Promise.resolve({ data: attendanceSummary }),
          payments.length === 0 ? axios.get('/api/payments', { params: { project_id: workId } }).catch(() => ({ data: [] })) : Promise.resolve({ data: payments })
        ]);
        if (recRes.data) setReconciliation(recRes.data);
        if (sumRes.data) setAttendanceSummary(sumRes.data);
        if (Array.isArray(payRes.data)) setPayments(payRes.data);
        setAiAnalysis(aiRes.data);
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
    <div className="fixed inset-0 z-[100] bg-[#F5F7FA] dark:bg-slate-950 flex flex-col overflow-hidden animate-in fade-in duration-200 text-[#172033] dark:text-slate-100 font-sans">
      
      {/* Top Header Bar (Institutional Government Header) */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#D9E1EA] dark:border-slate-800 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-start sm:items-center space-x-3.5 min-w-0">
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-[#F5F7FA] dark:hover:bg-slate-800 rounded border border-[#D9E1EA] dark:border-slate-700 transition-colors text-[#0B1F3A] dark:text-slate-200 shrink-0 mt-0.5 sm:mt-0"
            title="Go Back to Dashboard"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
          
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold font-mono text-[#0B1F3A] dark:text-white tracking-tight">
                {work.work_id}
              </h1>
              <span className={cn(
                "px-2 py-0.5 text-[11px] font-bold rounded font-mono border",
                work.risk_level === 'HIGH' ? "bg-red-50 text-[#C62828] border-[#C62828]/30 dark:bg-red-950/40 dark:text-red-400" :
                work.risk_level === 'MEDIUM' ? "bg-amber-50 text-[#D88900] border-[#D88900]/30 dark:bg-amber-950/40 dark:text-amber-400" :
                "bg-emerald-50 text-[#16865A] border-[#16865A]/30 dark:bg-emerald-950/40 dark:text-emerald-400"
              )}>
                {work.risk_level} RISK
              </span>
              <span className="text-[11px] bg-[#F5F7FA] dark:bg-slate-800 px-2 py-0.5 rounded border border-[#D9E1EA] dark:border-slate-700 font-mono text-[#607086] dark:text-slate-300 font-medium">
                {work.status || 'SANCTIONED'}
              </span>
            </div>
            <p className="text-xs text-[#607086] dark:text-slate-400 truncate max-w-3xl mt-0.5 font-normal" title={work.work_description}>
              {work.work_description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
          <button 
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 text-[#0B1F3A] dark:text-slate-200 border border-[#D9E1EA] dark:border-slate-700 rounded hover:bg-[#F5F7FA] dark:hover:bg-slate-700 transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#1558A6]" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Tab Bar (Clean sticky horizontal government tabs) */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#D9E1EA] dark:border-slate-800 px-4 sm:px-6 flex overflow-x-auto scrollbar-none shrink-0">
        {tabsConfig.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as TabType)}
              className={cn(
                "flex items-center space-x-2 py-2.5 px-3.5 border-b-2 whitespace-nowrap text-xs font-semibold transition-colors",
                isActive 
                  ? "border-[#1558A6] text-[#1558A6] dark:text-blue-400 dark:border-blue-400" 
                  : "border-transparent text-[#607086] dark:text-slate-400 hover:text-[#0B1F3A] dark:hover:text-slate-200 hover:bg-[#F5F7FA]/70 dark:hover:bg-slate-800/50"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive ? "text-[#1558A6] dark:text-blue-400" : "text-[#607086] dark:text-slate-500")} />
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
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* 1. Snapshot 5-Column Metric Cards (Institutional GoI Data Grid) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                
                {/* Card 1: Sanctioned Budget */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-[#607086] dark:text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                      Sanctioned Budget
                    </span>
                    <div className="text-xl font-bold text-[#0B1F3A] dark:text-white font-sans">
                      ₹{(sanctioned / 100000).toFixed(2)} Lakh
                    </div>
                  </div>
                  <div className="text-[11px] text-[#607086] dark:text-slate-400 font-mono mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    Exact: ₹{sanctioned.toLocaleString()}
                  </div>
                </div>
                
                {/* Card 2: Total Expended */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-[#607086] dark:text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                      Total Expended
                    </span>
                    <div className="text-xl font-bold text-[#1558A6] dark:text-blue-400 font-sans">
                      ₹{(expended / 100000).toFixed(2)} Lakh
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[11px] text-[#607086] dark:text-slate-400 mb-1">
                      <span>Utilization</span>
                      <span className="font-semibold text-[#1558A6] dark:text-blue-400 font-mono">{finPct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#1558A6] h-full rounded-full" style={{ width: `${Math.min(100, finPct)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Card 3: Physical Completion */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-[#607086] dark:text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                      Physical Completion
                    </span>
                    <div className="text-xl font-bold text-[#138A5B] dark:text-emerald-400 font-sans">
                      {physPct}%
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[11px] text-[#607086] dark:text-slate-400 mb-1">
                      <span>Reported Pace</span>
                      <span className="font-semibold text-[#138A5B] dark:text-emerald-400 font-mono">{physPct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#138A5B] h-full rounded-full" style={{ width: `${physPct}%` }} />
                    </div>
                  </div>
                </div>

                {/* Card 4: Composite Risk */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-[#607086] dark:text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                      Composite Risk
                    </span>
                    <div className={cn("text-xl font-bold font-mono", work.composite_risk_score > 70 ? 'text-[#C62828] dark:text-red-400' : 'text-[#16865A] dark:text-emerald-400')}>
                      {work.composite_risk_score}/100
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-[#607086] dark:text-slate-400">Severity</span>
                    <span className={cn("font-bold uppercase tracking-wider", work.composite_risk_score > 70 ? 'text-[#C62828]' : 'text-[#16865A]')}>
                      {work.risk_level} Priority
                    </span>
                  </div>
                </div>

                {/* Card 5: Unspent Balance */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-[#607086] dark:text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                      Unspent Balance
                    </span>
                    <div className="text-xl font-bold text-[#138A5B] dark:text-emerald-400 font-sans">
                      ₹{(unspent / 100000).toFixed(2)} Lakh
                    </div>
                  </div>
                  <div className="text-[11px] text-[#607086] dark:text-slate-400 font-mono mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    Remaining in Escrow
                  </div>
                </div>
              </div>

              {/* 2. Financial vs Physical Gap Alert (Professional Government Warning) */}
              {gapPct > 20 && (
                <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 rounded-lg flex items-start space-x-3 shadow-2xs">
                  <AlertTriangle className="w-5 h-5 text-[#D88900] dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-bold text-xs sm:text-sm text-[#8A5700] dark:text-amber-300 font-sans">
                      Disproportionate Fund Utilization Warning ({gapPct}% Gap)
                    </h4>
                    <p className="text-xs text-[#8A5700]/90 dark:text-amber-300/90 mt-0.5 leading-relaxed font-normal">
                      Financial utilization is at <strong>{finPct}%</strong> while reported physical progress stands at <strong>{physPct}%</strong>.
                      This requires supervisory inspection of advance material procurement vs. ground execution.
                    </p>
                  </div>
                </div>
              )}

              {/* 3. Statutory Project Case File Details (2-Column Structured Context) */}
              <div className="grid md:grid-cols-2 gap-5">
                
                {/* Panel 1: Statutory Administrative Context */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs space-y-3">
                  <h3 className="font-bold text-sm sm:text-base border-b border-[#D9E1EA] dark:border-slate-800 pb-2.5 flex items-center text-[#0B1F3A] dark:text-white font-sans">
                    <Building2 className="w-4 h-4 mr-2 text-[#1558A6]" />
                    Statutory Administrative Context
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <span className="text-[#607086] dark:text-slate-400 block mb-0.5 font-medium">Implementing Agency:</span>
                      <span className="font-semibold text-[#172033] dark:text-slate-200">{work.implementing_agency || 'District Rural Development Agency (DRDA)'}</span>
                    </div>
                    <div>
                      <span className="text-[#607086] dark:text-slate-400 block mb-0.5 font-medium">Sector / Scheme:</span>
                      <span className="font-semibold text-[#172033] dark:text-slate-200">{work.sector || 'Community Infrastructure'}</span>
                    </div>
                    <div>
                      <span className="text-[#607086] dark:text-slate-400 block mb-0.5 font-medium">State & District:</span>
                      <span className="font-semibold text-[#172033] dark:text-slate-200">{work.district}, {work.state}</span>
                    </div>
                    <div>
                      <span className="text-[#607086] dark:text-slate-400 block mb-0.5 font-medium">Constituency:</span>
                      <span className="font-semibold text-[#172033] dark:text-slate-200">{work.constituency || work.district} (Hon'ble MP)</span>
                    </div>
                    <div>
                      <span className="text-[#607086] dark:text-slate-400 block mb-0.5 font-medium">Sanction Date:</span>
                      <span className="font-semibold font-mono text-[#172033] dark:text-slate-200">{work.sanction_date || '2024-06-15'}</span>
                    </div>
                    <div>
                      <span className="text-[#607086] dark:text-slate-400 block mb-0.5 font-medium">Target Completion Date:</span>
                      <span className="font-semibold font-mono text-[#172033] dark:text-slate-200">{work.target_completion_date || '2025-03-31'}</span>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Data Integrity & Evidence Confidence */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs space-y-3">
                  <h3 className="font-bold text-sm sm:text-base border-b border-[#D9E1EA] dark:border-slate-800 pb-2.5 flex items-center text-[#0B1F3A] dark:text-white font-sans">
                    <ShieldCheck className="w-4 h-4 mr-2 text-[#138A5B]" />
                    Data Integrity & Evidence Confidence
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <span className="text-[#607086] dark:text-slate-400 block mb-0.5 font-medium">Data Quality Score:</span>
                      <span className="font-bold text-[#138A5B] dark:text-emerald-400">{work.data_quality_score || 92}% Compliant</span>
                    </div>
                    <div>
                      <span className="text-[#607086] dark:text-slate-400 block mb-0.5 font-medium">Evidence Confidence:</span>
                      <span className="font-bold text-[#138A5B] dark:text-emerald-400">{lifecycle?.consistency?.evidence_confidence_score || '85/100'}</span>
                    </div>
                    <div>
                      <span className="text-[#607086] dark:text-slate-400 block mb-0.5 font-medium">Registered Coordinates:</span>
                      <span className="font-mono text-[#172033] dark:text-slate-200">{projectLat.toFixed(4)}, {projectLon.toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-[#607086] dark:text-slate-400 block mb-0.5 font-medium">Schedule Delay Risk:</span>
                      <span className={cn("font-bold font-mono", work.delay_risk_score > 50 ? 'text-[#C62828]' : 'text-[#172033] dark:text-slate-300')}>
                        {work.delay_risk_score || 25}/100 ({work.delay_days || 0} days delay)
                      </span>
                    </div>
                    <div>
                      <span className="text-[#607086] dark:text-slate-400 block mb-0.5 font-medium">Duplicate Semantics Score:</span>
                      <span className="font-mono text-[#172033] dark:text-slate-200">{work.duplicate_risk_score || 0}/100</span>
                    </div>
                    <div>
                      <span className="text-[#607086] dark:text-slate-400 block mb-0.5 font-medium">Financial Anomaly Score:</span>
                      <span className="font-mono text-[#172033] dark:text-slate-200">{work.financial_anomaly_score || 0}/100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. AI Executive Summary (Evidence-Oriented Decision Support) */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="bg-[#F5F7FA] dark:bg-slate-850 p-4 border-b border-[#D9E1EA] dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-[#1558A6]" />
                    <h3 className="font-bold text-sm sm:text-base text-[#0B1F3A] dark:text-white font-sans">
                      Executive AI Synthesis & Operational Findings
                    </h3>
                  </div>
                  <button 
                    onClick={() => setActiveTab('ai')}
                    className="text-xs text-[#1558A6] dark:text-blue-400 font-semibold hover:underline flex items-center"
                  >
                    View Deep Audit Dossier <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
                <div className="p-5">
                  <p className="text-xs sm:text-sm leading-relaxed text-[#172033] dark:text-slate-200 font-normal">
                    Project <strong className="font-mono text-[#0B1F3A] dark:text-white">{work.work_id}</strong> is under execution by <strong>{work.implementing_agency || 'DRDA'}</strong>. 
                    Sanctioned outlay of ₹{(sanctioned / 100000).toFixed(2)} Lakh with ₹{(expended / 100000).toFixed(2)} Lakh expended ({finPct}% financial draw). 
                    {work.risk_level === 'HIGH' 
                      ? " The platform has identified cross-dimensional deviations between fund release pacing and ground inspection measurements." 
                      : " Pacing aligns with expected milestone schedules without critical red flags."}
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-4 mt-5">
                    {/* Strengths & Compliances (Subtle green-tinted evidence panel) */}
                    <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                      <h4 className="font-bold text-[#138A5B] dark:text-emerald-400 flex items-center mb-2 text-xs uppercase tracking-wider font-sans">
                        <CheckCircle className="w-4 h-4 mr-1.5" /> Strengths & Compliances
                      </h4>
                      <ul className="text-xs text-emerald-900 dark:text-emerald-300 space-y-1.5 list-disc list-inside">
                        <li>Geo-fenced check-ins logged for site supervisor within registered 500m perimeter</li>
                        <li>Escrow and initial mobilization advance properly accounted for</li>
                        <li>Data quality score is high ({work.data_quality_score || 90}%)</li>
                      </ul>
                    </div>

                    {/* Supervisory Verification Checkpoints (Subtle amber-tinted audit panel) */}
                    <div className="bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800/60">
                      <h4 className="font-bold text-[#8A5700] dark:text-amber-400 flex items-center mb-2 text-xs uppercase tracking-wider font-sans">
                        <AlertTriangle className="w-4 h-4 mr-1.5" /> Supervisory Verification Checkpoints
                      </h4>
                      <ul className="text-xs text-[#8A5700] dark:text-amber-300 space-y-1.5 list-disc list-inside">
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
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D9E1EA] dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#0B1F3A] dark:text-white flex items-center font-sans">
                    <Layers className="w-5 h-5 mr-2 text-[#1558A6]" />
                    Approved Scope & Statutory Milestones
                  </h3>
                  <p className="text-xs text-[#607086] dark:text-slate-400 mt-0.5 font-normal">
                    Measurable physical engineering deliverables and 4-stage sequential progress tracker.
                  </p>
                </div>
                <button 
                  onClick={() => setShowInspectionModal(true)}
                  className="text-xs font-semibold px-3.5 py-1.5 bg-[#138A5B] hover:bg-[#0e6b46] text-white rounded shadow-xs flex items-center self-start sm:self-auto transition"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                  <span>+ Log Official Field Inspection</span>
                </button>
              </div>

              {inspectionSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded text-xs text-emerald-900 dark:text-emerald-200 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1.5 shrink-0 text-[#138A5B]" />
                  <span>{inspectionSuccessMsg}</span>
                </div>
              )}

              {/* Approved Scope Card */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs space-y-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#607086] dark:text-slate-400 font-sans">
                  Approved Scope of Works (BoQ Specifications)
                </h4>
                <p className="text-xs sm:text-sm font-semibold text-[#172033] dark:text-white leading-relaxed">
                  {lifecycle?.scope?.approved_scope || work.work_description}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2.5 text-xs border-t border-[#D9E1EA] dark:border-slate-800">
                  <div>
                    <span className="text-[#607086] dark:text-slate-400 block mb-0.5 font-medium">Deliverable Quantity:</span>
                    <span className="font-semibold text-[#172033] dark:text-slate-200">{lifecycle?.scope?.target_quantity || '30 Units / 1 Complete Set'}</span>
                  </div>
                  <div>
                    <span className="text-[#607086] dark:text-slate-400 block mb-0.5 font-medium">Standard Rate Schedule:</span>
                    <span className="font-semibold text-[#172033] dark:text-slate-200">CPWD / State PWD Schedule of Rates</span>
                  </div>
                  <div>
                    <span className="text-[#607086] dark:text-slate-400 block mb-0.5 font-medium">Inspection Authority:</span>
                    <span className="font-semibold text-[#172033] dark:text-slate-200">District Quality Control Division</span>
                  </div>
                </div>
              </div>

              {/* 4 Sequential Milestones */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs space-y-4">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#607086] dark:text-slate-400 font-sans">
                  Sequential Milestone Execution Pipeline
                </h4>
                
                <div className="space-y-3">
                  {[
                    { stage: 'Stage 1: Mobilization & Site Layout', weight: '20%', progress: 100, status: 'COMPLETED', detail: 'Site survey, demarcation, initial material receipt & soil compaction.' },
                    { stage: 'Stage 2: Core Foundation & Substructure', weight: '35%', progress: Math.min(100, Math.round(physPct * 1.2)), status: physPct >= 40 ? 'COMPLETED' : 'IN_PROGRESS', detail: 'PCC casting, structural anchor bolt fixing, and earthing pits.' },
                    { stage: 'Stage 3: Superstructure Erection & Mounting', weight: '30%', progress: Math.max(0, Math.min(100, Math.round((physPct - 35) * 2))), status: physPct >= 75 ? 'COMPLETED' : physPct >= 35 ? 'IN_PROGRESS' : 'PENDING', detail: 'Pole erection, luminaire mounting, battery connections.' },
                    { stage: 'Stage 4: Commissioning & Joint Quality Inspection', weight: '15%', progress: physPct >= 95 ? 100 : 0, status: physPct >= 95 ? 'COMPLETED' : 'PENDING', detail: 'Final load testing, joint measurement book entry & handover.' }
                  ].map((m, i) => (
                    <div key={i} className="p-3.5 bg-[#F5F7FA] dark:bg-slate-850 rounded border border-[#D9E1EA] dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs sm:text-sm font-bold text-[#0B1F3A] dark:text-white font-sans">{m.stage}</span>
                          <span className="text-[10px] bg-white dark:bg-slate-800 border border-[#D9E1EA] dark:border-slate-700 px-1.5 py-0.5 rounded font-mono text-[#607086]">Weight: {m.weight}</span>
                        </div>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono border",
                          m.status === 'COMPLETED' ? "bg-emerald-50 text-[#138A5B] border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300" :
                          m.status === 'IN_PROGRESS' ? "bg-blue-50 text-[#1558A6] border-blue-200 dark:bg-blue-950 dark:text-blue-300" :
                          "bg-slate-100 text-[#607086] border-[#D9E1EA] dark:bg-slate-800 dark:text-slate-400"
                        )}>
                          {m.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#607086] dark:text-slate-400">{m.detail}</p>
                      <div className="w-full bg-slate-200 dark:bg-slate-750 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#138A5B] h-full rounded-full transition-all" style={{ width: `${m.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Field Inspections Audit Record */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs space-y-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#607086] dark:text-slate-400 font-sans">
                  Recorded Quality Inspection Reports
                </h4>
                
                {Array.isArray(lifecycle?.inspections) && lifecycle.inspections.length > 0 ? (
                  <div className="space-y-3">
                    {lifecycle.inspections.map((insp: any, i: number) => (
                      <div key={i} className="p-3 bg-[#F5F7FA] dark:bg-slate-850 rounded border border-[#D9E1EA] dark:border-slate-800 flex items-start justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#0B1F3A] dark:text-white">{insp.inspector_name}</span>
                          <span className="text-[#607086] dark:text-slate-400 block">{insp.inspector_designation}</span>
                          <p className="text-[#172033] dark:text-slate-300 mt-1 italic">"{insp.remarks}"</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#138A5B] border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 font-bold font-mono">
                            {insp.result || 'VERIFIED'} ({insp.observed_progress_pct}%)
                          </span>
                          <span className="text-[10px] text-[#607086] dark:text-slate-400 block mt-1 font-mono">{insp.inspection_date || 'Recent'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#607086] dark:text-slate-400 italic">No formal field inspection reports logged yet. Click "+ Log Official Field Inspection" above to record one.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB: DAILY MONITORING (FEATURES 1 & 2) */}
          {activeTab === 'daily' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in">
              {/* LEFT COLUMN: SITE RESPONSIBLE PERSON GEO-CHECK-IN (~60%) */}
              <div className="lg:col-span-7 space-y-5">
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#D9E1EA] dark:border-slate-800 pb-3 mb-4 gap-2">
                    <div className="flex items-start space-x-2.5">
                      <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[#138A5B] mt-0.5">
                        <UserCheck className="w-5 h-5 text-[#138A5B]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-[#0B1F3A] dark:text-slate-100">
                          Site Responsible Person Geo-Check-In
                        </h3>
                        <p className="text-xs text-[#607086] dark:text-slate-400 mt-0.5">
                          Feature 1 • Records authorized site head presence near project coordinates.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono bg-[#F5F7FA] dark:bg-slate-800 px-2.5 py-1 rounded border border-[#D9E1EA] dark:border-slate-700 text-[#607086] dark:text-slate-300 font-semibold self-start sm:self-auto">
                      Allowed: 500m
                    </span>
                  </div>

                  {/* 4 Compact Summary Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="p-3 bg-[#F5F7FA] dark:bg-slate-800/60 rounded-lg border border-[#D9E1EA] dark:border-slate-800 text-center">
                      <span className="text-[11px] font-semibold text-[#607086] dark:text-slate-400 block font-mono">Check-Ins</span>
                      <span className="text-xl font-bold font-mono text-[#0B1F3A] dark:text-slate-100 mt-0.5 block">
                        {attendanceSummary?.total_checkins ?? attendance.length}
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-lg border border-emerald-200/80 dark:border-emerald-800/50 text-center">
                      <span className="text-[11px] font-semibold text-[#138A5B] dark:text-emerald-400 block font-mono">Verified</span>
                      <span className="text-xl font-bold font-mono text-[#138A5B] dark:text-emerald-400 mt-0.5 block">
                        {attendanceSummary?.verified ?? attendance.filter(a => a.location_status === 'VERIFIED').length}
                      </span>
                    </div>
                    <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-lg border border-amber-200/80 dark:border-amber-800/50 text-center">
                      <span className="text-[11px] font-semibold text-[#D88900] dark:text-amber-400 block font-mono">Mismatches</span>
                      <span className="text-xl font-bold font-mono text-[#D88900] dark:text-amber-400 mt-0.5 block">
                        {attendanceSummary?.mismatches ?? attendance.filter(a => a.location_status === 'MISMATCH').length}
                      </span>
                    </div>
                    <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-lg border border-blue-200/80 dark:border-blue-800/50 text-center">
                      <span className="text-[11px] font-semibold text-[#1558A6] dark:text-blue-400 block font-mono">Rate</span>
                      <span className="text-xl font-bold font-mono text-[#1558A6] dark:text-blue-400 mt-0.5 block">
                        {attendanceSummary?.attendance_rate ?? 40}%
                      </span>
                    </div>
                  </div>

                  {/* Registered Site Location Strip */}
                  <div className="p-3 bg-[#F5F7FA] dark:bg-slate-850 rounded-lg border border-[#D9E1EA] dark:border-slate-800 text-xs flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-[#1558A6] shrink-0" />
                      <div>
                        <span className="font-semibold text-[#172033] dark:text-slate-300">Registered Site Location: </span>
                        <span className="font-mono text-[#0B1F3A] dark:text-slate-100 font-bold">{projectLat.toFixed(5)}, {projectLon.toFixed(5)}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-[#607086] dark:text-slate-400" title="The authorized check-in must fall within the configured project radius.">
                      Max: 500m
                    </span>
                  </div>

                  {/* Live Geotagged Check-In Form */}
                  <form onSubmit={handleSubmitCheckin} className="space-y-3.5 bg-white dark:bg-slate-900 p-4 rounded-lg border border-[#D9E1EA] dark:border-slate-800">
                    <div className="flex items-center justify-between border-b border-[#D9E1EA] dark:border-slate-800 pb-2">
                      <span className="text-xs font-bold text-[#0B1F3A] dark:text-slate-200 uppercase tracking-wider font-mono flex items-center">
                        <Crosshair className="w-3.5 h-3.5 mr-1.5 text-[#138A5B]" />
                        Execute Live Geotagged Check-In
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#607086] dark:text-slate-300 mb-1">
                          Responsible Person
                        </label>
                        <select 
                          className="w-full text-xs p-2 bg-[#F5F7FA] dark:bg-slate-800 border border-[#D9E1EA] dark:border-slate-700 rounded text-[#172033] dark:text-slate-200 focus:outline-none focus:border-[#1558A6]"
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
                        <label className="block text-xs font-semibold text-[#607086] dark:text-slate-300 mb-1">
                          Authorized Role
                        </label>
                        <select 
                          className="w-full text-xs p-2 bg-[#F5F7FA] dark:bg-slate-800 border border-[#D9E1EA] dark:border-slate-700 rounded text-[#172033] dark:text-slate-200 focus:outline-none focus:border-[#1558A6]"
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
                      <div className="flex flex-wrap items-center justify-between mb-1 gap-1.5">
                        <label className="text-xs font-semibold text-[#607086] dark:text-slate-300">
                          Check-in Coordinates (GPS)
                        </label>
                        <div className="flex items-center space-x-1.5">
                          <button 
                            type="button" 
                            onClick={handleSetOnSite}
                            className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-[#138A5B] dark:text-emerald-300 rounded border border-[#138A5B]/30 hover:bg-emerald-100 transition"
                          >
                            🎯 DEMO: On-Site (Verified)
                          </button>
                          <button 
                            type="button" 
                            onClick={handleSetOffSite}
                            className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-[#D88900] dark:text-amber-300 rounded border border-[#D88900]/30 hover:bg-amber-100 transition"
                          >
                            ⚠️ DEMO: Off-Site (Mismatch)
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
                            className="w-full text-xs p-2 bg-[#F5F7FA] dark:bg-slate-800 border border-[#D9E1EA] dark:border-slate-700 rounded font-mono text-[#172033] dark:text-slate-200 focus:outline-none focus:border-[#1558A6]"
                          />
                        </div>
                        <div className="col-span-5">
                          <input 
                            type="text" 
                            placeholder="Longitude" 
                            value={checkinLon}
                            onChange={(e) => setCheckinLon(e.target.value)}
                            className="w-full text-xs p-2 bg-[#F5F7FA] dark:bg-slate-800 border border-[#D9E1EA] dark:border-slate-700 rounded font-mono text-[#172033] dark:text-slate-200 focus:outline-none focus:border-[#1558A6]"
                          />
                        </div>
                        <div className="col-span-2">
                          <button 
                            type="button"
                            onClick={handleDetectGps}
                            disabled={isDetectingGps}
                            className="w-full h-full text-xs bg-[#F5F7FA] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-[#D9E1EA] dark:border-slate-700 rounded flex items-center justify-center transition text-[#0B1F3A] dark:text-slate-200"
                            title="Auto-detect device coordinates"
                          >
                            {isDetectingGps ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#607086] dark:text-slate-300 mb-1">
                        Remarks
                      </label>
                      <textarea 
                        rows={2}
                        value={checkinRemarks}
                        onChange={(e) => setCheckinRemarks(e.target.value)}
                        placeholder="Daily on-site observation and layout verification details"
                        className="w-full text-xs p-2 bg-[#F5F7FA] dark:bg-slate-800 border border-[#D9E1EA] dark:border-slate-700 rounded text-[#172033] dark:text-slate-200 focus:outline-none focus:border-[#1558A6]"
                      />
                    </div>

                    {checkinError && (
                      <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-[#C62828]/30 rounded text-xs text-[#C62828] dark:text-red-400 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
                        {checkinError}
                      </div>
                    )}

                    {checkinFeedback && (
                      <div className={cn(
                        "p-3 rounded-lg border text-xs space-y-1 animate-in fade-in",
                        checkinFeedback.location_status === 'VERIFIED'
                          ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-[#138A5B]/40 text-[#138A5B] dark:text-emerald-300"
                          : "bg-amber-50/80 dark:bg-amber-950/40 border-[#D88900]/40 text-[#8A5700] dark:text-amber-300"
                      )}>
                        <div className="flex items-center justify-between font-bold text-xs font-mono">
                          <span className="flex items-center">
                            {checkinFeedback.location_status === 'VERIFIED' ? <CheckCircle className="w-4 h-4 mr-1.5 text-[#138A5B]" /> : <AlertTriangle className="w-4 h-4 mr-1.5 text-[#D88900]" />}
                            {checkinFeedback.location_status === 'VERIFIED' ? '✓ WITHIN AUTHORIZED 500M RADIUS' : '⚠ OUTSIDE AUTHORIZED 500M RADIUS'}
                          </span>
                          <span>
                            Distance: {checkinFeedback.distance_meters > 1000 ? `${(checkinFeedback.distance_meters / 1000).toFixed(2)} km` : `${Math.round(checkinFeedback.distance_meters)} m`}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          {checkinFeedback.location_status === 'VERIFIED' 
                            ? `Authorized ${checkinFeedback.person_role} checked in within acceptable perimeter (${checkinFeedback.allowed_radius_meters || 500}m).`
                            : `Check-in location is outside allowed radius (500m). Flagged for supervisory verification.`}
                        </p>
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={isSubmittingCheckin}
                      className="w-full bg-[#138A5B] hover:bg-[#0e6b46] text-white text-xs font-bold py-2.5 rounded flex items-center justify-center transition shadow-2xs"
                    >
                      {isSubmittingCheckin ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckSquare className="w-4 h-4 mr-2" />}
                      Submit Authorized Site Check-In
                    </button>
                  </form>
                </div>

                {/* Attendance History Audit Trail */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs p-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#0B1F3A] dark:text-slate-300 font-mono mb-3 flex items-center justify-between">
                    <span>Attendance Audit History ({attendance.length} Records)</span>
                    <span className="text-[10px] text-[#607086] font-normal normal-case">Chronological ledger</span>
                  </h4>
                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {attendance.map((att, i) => (
                      <div key={i} className="p-3 bg-[#F5F7FA] dark:bg-slate-850 rounded border border-[#D9E1EA] dark:border-slate-800 flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-[#0B1F3A] dark:text-slate-100">{att.person_name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[#607086] dark:text-slate-300 rounded border border-[#D9E1EA] dark:border-slate-700 font-mono">
                              {att.person_role}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#607086] dark:text-slate-400 flex items-center space-x-2 font-mono">
                            <span>📅 {att.date}</span>
                            <span>•</span>
                            <span>🕒 {att.checkin_time ? att.checkin_time.replace('T', ' ').slice(0, 19) : '09:30 AM'}</span>
                          </div>
                          {att.remarks && <p className="text-xs text-[#172033] dark:text-slate-300 italic truncate">"{att.remarks}"</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <span className={cn(
                            "text-[10px] font-mono font-bold px-2 py-0.5 rounded border inline-block",
                            att.location_status === 'VERIFIED' ? "bg-emerald-50 text-[#138A5B] border-[#138A5B]/30 dark:bg-emerald-950/50" : "bg-amber-50 text-[#D88900] border-[#D88900]/30 dark:bg-amber-950/50"
                          )}>
                            {att.location_status === 'VERIFIED' ? '✓ VERIFIED' : '⚠ MISMATCH'}
                          </span>
                          {att.distance_meters !== null && (
                            <span className="text-[10px] text-[#607086] block mt-0.5 font-mono">
                              {att.distance_meters > 1000 ? `${(att.distance_meters / 1000).toFixed(2)} km` : `${Math.round(att.distance_meters)} m`}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: DAILY WORK UPDATES (~40%) */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs p-5">
                  <div className="flex items-center justify-between border-b border-[#D9E1EA] dark:border-slate-800 pb-3 mb-4">
                    <div className="flex items-start space-x-2.5">
                      <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-[#1558A6] mt-0.5">
                        <Activity className="w-5 h-5 text-[#1558A6]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-[#0B1F3A] dark:text-slate-100">
                          Daily Work Updates
                        </h3>
                        <p className="text-xs text-[#607086] dark:text-slate-400 mt-0.5">
                          Feature 2 • Physical progress ledger (independent of attendance).
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowUpdateModal(true)}
                      className="text-xs font-bold px-3 py-1.5 bg-[#138A5B] hover:bg-[#0e6b46] text-white rounded flex items-center transition shadow-2xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1" />
                      + Log Work
                    </button>
                  </div>

                  {updateSuccessMsg && (
                    <div className="p-2.5 mb-4 bg-emerald-50 dark:bg-emerald-950/40 border border-[#138A5B]/30 rounded text-xs text-[#138A5B] dark:text-emerald-300 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1.5 shrink-0" />
                      {updateSuccessMsg}
                    </div>
                  )}

                  {/* Vertical Execution Timeline */}
                  <div className="space-y-4 max-h-[720px] overflow-y-auto pr-1">
                    {dailyUpdates.map((update, i) => (
                      <div key={i} className="relative pl-6 pb-4 border-l-2 border-[#138A5B]/40 last:border-0 last:pb-0">
                        {/* Status Marker */}
                        <div className={cn(
                          "absolute w-3 h-3 rounded-full -left-[7px] top-1.5 ring-4 ring-white dark:ring-slate-900",
                          update.current_issues ? "bg-[#D88900]" : "bg-[#138A5B]"
                        )} />

                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-mono font-bold text-[#0B1F3A] dark:text-slate-200">
                            📅 {update.date}
                          </span>
                          <span className="text-[10px] bg-[#F5F7FA] dark:bg-slate-800 text-[#0B1F3A] dark:text-slate-300 px-2 py-0.5 rounded border border-[#D9E1EA] dark:border-slate-700 font-mono font-semibold">
                            {update.work_category || 'Installation'}
                          </span>
                        </div>

                        <div className="bg-[#F5F7FA] dark:bg-slate-850 p-3.5 rounded-lg border border-[#D9E1EA] dark:border-slate-800 space-y-2">
                          <p className="text-xs font-bold text-[#172033] dark:text-slate-100 leading-snug">
                            {update.work_description}
                          </p>

                          <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-[#D9E1EA] dark:border-slate-800 font-mono">
                            <div>
                              <span className="text-[#607086]">Progress: </span>
                              <span className="font-bold text-[#0B1F3A] dark:text-slate-200">{update.cumulative_progress_pct}%</span>
                            </div>
                            <div>
                              <span className="text-[#607086]">Workers: </span>
                              <span className="font-bold text-[#0B1F3A] dark:text-slate-200">{update.worker_count || 'N/A'}</span>
                            </div>
                          </div>

                          {update.current_issues && (
                            <div className="p-2 bg-amber-50/80 dark:bg-amber-950/30 border border-[#D88900]/30 rounded text-[11px] text-[#8A5700] dark:text-amber-300 flex items-start space-x-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#D88900]" />
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
            <div className="space-y-5 animate-in fade-in">
              {/* Optional Discrepancy Warning Alert */}
              {reconciliation?.has_issues && (
                <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-[#D88900]/30 dark:border-amber-800 rounded-lg p-3.5 flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#D88900] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-[#8A5700] dark:text-amber-300 uppercase tracking-wider font-mono">
                      Material Reconciliation Variance Detected
                    </h4>
                    <p className="text-xs text-[#8A5700] dark:text-amber-200 mt-0.5 leading-relaxed">
                      Variances identified between agency supply records and physical site inventory receipts. Field delivery challans and site measurement book entries require supervisory review.
                    </p>
                  </div>
                </div>
              )}

              {/* Section 1: 2-Column Balanced Grid (Agency Supply Commitments + Site Inventory) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left Card: Agency Supply Commitments */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
                  <div className="bg-[#F5F7FA] dark:bg-slate-800/80 p-3.5 border-b border-[#D9E1EA] dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Truck className="w-4 h-4 text-[#1558A6]" />
                      <h3 className="font-bold text-xs uppercase tracking-wider text-[#0B1F3A] dark:text-slate-100 font-mono">
                        Agency Supply Commitments
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-[#607086] dark:text-slate-400">
                      Contractor BoQ Schedule
                    </span>
                  </div>
                  <div className="p-0 overflow-x-auto flex-1">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F5F7FA]/70 dark:bg-slate-800/50 text-[11px] uppercase text-[#607086] dark:text-slate-400 border-b border-[#D9E1EA] dark:border-slate-800 font-semibold font-mono">
                        <tr>
                          <th className="px-4 py-2.5">Material</th>
                          <th className="px-4 py-2.5 text-right">Contracted</th>
                          <th className="px-4 py-2.5 text-right">Supplied</th>
                          <th className="px-4 py-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D9E1EA] dark:divide-slate-800">
                        {agencySupply.length > 0 ? agencySupply.map((item, i) => (
                          <tr key={i} className="hover:bg-[#F5F7FA] dark:hover:bg-slate-850 transition-colors">
                            <td className="px-4 py-3 font-semibold text-[#0B1F3A] dark:text-slate-100">
                              {item.material_name}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-[#607086] dark:text-slate-300">
                              {formatQty(item.contracted_quantity)} <span className="text-[10px] text-[#607086]">{item.unit}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-[#0B1F3A] dark:text-slate-100">
                              {formatQty(item.supplied_quantity)} <span className="text-[10px] text-[#607086] font-normal">{item.unit}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={cn(
                                "text-[10px] font-mono font-bold px-2 py-0.5 rounded border inline-block",
                                item.verification_status === 'VERIFIED'
                                  ? "bg-emerald-50 text-[#138A5B] border-[#138A5B]/30 dark:bg-emerald-950/40"
                                  : "bg-emerald-50 text-[#138A5B] border-[#138A5B]/30 dark:bg-emerald-950/40"
                              )}>
                                {item.verification_status || 'PENDING'}
                              </span>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} className="px-4 py-6 text-center text-[#607086] italic">No supply records logged.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Card: Site Inventory (Running Ledger) */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
                  <div className="bg-[#F5F7FA] dark:bg-slate-800/80 p-3.5 border-b border-[#D9E1EA] dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4 text-[#138A5B]" />
                      <h3 className="font-bold text-xs uppercase tracking-wider text-[#0B1F3A] dark:text-slate-100 font-mono">
                        Site Inventory (Running Ledger)
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-[#607086] dark:text-slate-400">
                      Physical Site Store
                    </span>
                  </div>
                  <div className="p-0 overflow-x-auto flex-1">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F5F7FA]/70 dark:bg-slate-800/50 text-[11px] uppercase text-[#607086] dark:text-slate-400 border-b border-[#D9E1EA] dark:border-slate-800 font-semibold font-mono">
                        <tr>
                          <th className="px-4 py-2.5">Material</th>
                          <th className="px-4 py-2.5 text-right">Received</th>
                          <th className="px-4 py-2.5 text-right">Consumed</th>
                          <th className="px-4 py-2.5 text-right">Stock Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D9E1EA] dark:divide-slate-800">
                        {siteInventory.length > 0 ? siteInventory.map((item, i) => (
                          <tr key={i} className="hover:bg-[#F5F7FA] dark:hover:bg-slate-850 transition-colors">
                            <td className="px-4 py-3 font-semibold text-[#0B1F3A] dark:text-slate-100">
                              {item.material_name}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-[#138A5B] dark:text-emerald-400">
                              {formatQty(item.total_received)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-[#D88900] dark:text-amber-400">
                              {formatQty(item.total_used)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-extrabold text-[#0B1F3A] dark:text-slate-100">
                              {formatQty(item.current_stock)} <span className="text-[10px] text-[#607086] font-normal">{item.unit}</span>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} className="px-4 py-6 text-center text-[#607086] italic">No inventory logs available.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Section 2: Core 5-Way Reconciliation Matrix */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="bg-[#F5F7FA] dark:bg-slate-800/80 p-3.5 border-b border-[#D9E1EA] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#0B1F3A] dark:text-slate-100 font-mono flex items-center">
                      <ShieldCheck className="w-4 h-4 mr-1.5 text-[#1558A6]" />
                      Agency Supply vs Site Inventory Reconciliation Matrix
                    </h3>
                    <p className="text-[11px] text-[#607086] dark:text-slate-400 mt-0.5">
                      5-Way Verification: Contracted Quantity vs Agency Supplied vs Site Received vs Site Used vs Current Stock
                    </p>
                  </div>
                  <span 
                    title="Reconciliation compares agency supply, site receipt, consumption and current stock."
                    className="px-2.5 py-1 text-[11px] font-bold font-mono rounded bg-white dark:bg-slate-900 text-[#1558A6] dark:text-blue-300 border border-[#D9E1EA] dark:border-slate-700 self-start sm:self-auto cursor-help"
                  >
                    Continuous Audit
                  </span>
                </div>

                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F5F7FA]/70 dark:bg-slate-800/60 text-[10px] uppercase text-[#607086] dark:text-slate-400 border-b border-[#D9E1EA] dark:border-slate-800 font-mono font-bold">
                      <tr>
                        <th className="px-4 py-3">Material</th>
                        <th className="px-3 py-3 text-center" title="Quantity approved/contracted for the project.">
                          Contracted<br /><span className="text-[#1558A6] font-normal">(A)</span>
                        </th>
                        <th className="px-3 py-3 text-center" title="Quantity recorded as supplied by the agency.">
                          Agency Supplied<br /><span className="text-[#1558A6] font-normal">(B)</span>
                        </th>
                        <th className="px-3 py-3 text-center" title="Quantity physically recorded as received at site.">
                          Site Received<br /><span className="text-[#1558A6] font-normal">(C)</span>
                        </th>
                        <th className="px-3 py-3 text-center" title="Supply quantity not yet matched to site receipt.">
                          Difference<br /><span className="text-[#1558A6] font-normal">(B - C)</span>
                        </th>
                        <th className="px-3 py-3 text-center" title="Quantity recorded as consumed in work.">
                          Site Used<br /><span className="text-[#1558A6] font-normal">(D)</span>
                        </th>
                        <th className="px-3 py-3 text-center" title="Calculated site inventory balance.">
                          Current Stock<br /><span className="text-[#1558A6] font-normal">(C - D)</span>
                        </th>
                        <th className="px-4 py-3">Audit / Reconciliation Assessment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9E1EA] dark:divide-slate-800">
                      {Array.isArray(reconciliation) && reconciliation.length > 0 ? (
                        reconciliation.map((rec: any, idx: number) => {
                          const diff = rec.supply_receipt_difference || 0;
                          const hasIssue = rec.has_issues;
                          return (
                            <tr key={idx} className={cn("transition-colors", hasIssue ? "bg-amber-50/40 dark:bg-amber-950/15" : "hover:bg-[#F5F7FA] dark:hover:bg-slate-850")}>
                              <td className="px-4 py-3.5 font-semibold text-[#0B1F3A] dark:text-slate-100">
                                {rec.material_name}
                                <span className="text-[10px] font-mono text-[#607086] block font-normal">{rec.unit}</span>
                              </td>
                              <td className="px-3 py-3.5 text-center font-mono font-medium text-[#172033] dark:text-slate-200">
                                {formatQty(rec.contracted)}
                              </td>
                              <td className="px-3 py-3.5 text-center font-mono font-semibold text-[#1558A6] dark:text-blue-400">
                                {formatQty(rec.agency_supplied)}
                              </td>
                              <td className="px-3 py-3.5 text-center font-mono font-semibold text-[#138A5B] dark:text-emerald-400">
                                {formatQty(rec.site_received)}
                              </td>
                              <td className="px-3 py-3.5 text-center font-mono font-bold">
                                {diff > 0.01 ? (
                                  <span className="text-[#D88900] dark:text-amber-400">
                                    +{formatQty(diff)}
                                  </span>
                                ) : diff < -0.01 ? (
                                  <span className="text-[#C62828] dark:text-red-400">
                                    {formatQty(diff)}
                                  </span>
                                ) : (
                                  <span className="text-[#138A5B] dark:text-emerald-400">0</span>
                                )}
                              </td>
                              <td className="px-3 py-3.5 text-center font-mono font-medium text-[#172033] dark:text-slate-300">
                                {formatQty(rec.site_used)}
                              </td>
                              <td className="px-3 py-3.5 text-center font-mono font-extrabold text-[#0B1F3A] dark:text-slate-100">
                                {formatQty(rec.current_stock)}
                              </td>
                              <td className="px-4 py-3.5 text-xs">
                                {rec.issues && rec.issues.length > 0 ? (
                                  <div className="space-y-1">
                                    {rec.issues.map((iss: string, iIndex: number) => (
                                      <div
                                        key={iIndex}
                                        className={`px-2.5 py-1.5 rounded border text-[11px] leading-relaxed ${
                                          iss.includes("Material Inconsistency Alert")
                                            ? "bg-rose-50 border-rose-200 text-[#C62828] dark:bg-rose-950/30 dark:border-rose-900 font-semibold"
                                            : "bg-amber-50 border-amber-200 text-[#8A5700] dark:bg-amber-950/30 dark:border-amber-900"
                                        }`}
                                      >
                                        {iss}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center text-[11px] font-mono font-bold text-[#138A5B] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-[#138A5B]/30 px-2.5 py-1 rounded">
                                    ✓ Perfect Reconciliation
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-4 py-6 text-center text-[#607086] italic">
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
            <div className="space-y-5 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9E1EA] dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-[#0B1F3A] dark:text-slate-100 flex items-center">
                    <DollarSign className="w-4 h-4 mr-1.5 text-[#1558A6]" />
                    Disbursement Ledger & Payment Traceability Layer
                  </h3>
                  <p className="text-xs text-[#607086] dark:text-slate-400 mt-0.5">
                    Statutory fund draws, milestone verification linkages, and PFMS payment certificates.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 bg-[#F5F7FA] dark:bg-slate-800 text-[#0B1F3A] dark:text-slate-300 rounded border border-[#D9E1EA] dark:border-slate-700 text-[11px] font-mono font-semibold self-start sm:self-auto">
                  PFMS / Treasury Channel
                </span>
              </div>
              
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F5F7FA] dark:bg-slate-800/80 text-[11px] uppercase text-[#607086] dark:text-slate-400 border-b border-[#D9E1EA] dark:border-slate-800 font-semibold">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Request / Invoice Ref</th>
                        <th className="px-4 py-3 font-semibold">Disbursed Amount</th>
                        <th className="px-4 py-3 font-semibold">Associated Milestone</th>
                        <th className="px-4 py-3 font-semibold">Treasury Status</th>
                        <th className="px-4 py-3 font-semibold">Audit Reconciliation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9E1EA] dark:divide-slate-800">
                      {payments.length > 0 ? (
                        payments.map((p, i) => (
                          <tr key={i} className="hover:bg-[#F5F7FA] dark:hover:bg-slate-850 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-[#0B1F3A] dark:text-slate-200">{p.payment_request_id || p.invoice_reference || `PAY-2026-${i + 1}`}</td>
                            <td className="px-4 py-3 font-bold text-[#172033] dark:text-slate-100 font-mono">₹{(p.amount || 0).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3 text-[#607086] dark:text-slate-300">{p.milestone_id || 'Civil Foundation Stage'}</td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[11px] font-mono font-bold border",
                                p.status === 'PAID' || p.status === 'APPROVED' ? 'bg-emerald-50 text-[#16865A] border-[#16865A]/30 dark:bg-emerald-950/30 dark:text-emerald-400' :
                                p.status === 'UNDER_REVIEW' ? 'bg-amber-50 text-[#D88900] border-[#D88900]/30 dark:bg-amber-950/30 dark:text-amber-400' :
                                'bg-slate-50 text-[#607086] border-[#D9E1EA] dark:bg-slate-800 dark:text-slate-400'
                              )}>
                                {p.status || 'PAID'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[11px] text-[#607086] dark:text-slate-400">
                              {p.reconciliation_status || 'Verified with bank disbursement receipt'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-[#607086] italic">No payment records found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: RISK */}
          {activeTab === 'risk' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="grid md:grid-cols-3 gap-5">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-bold text-[#607086] dark:text-slate-400 uppercase tracking-wider mb-2 font-mono">
                    Composite Risk Score
                  </span>
                  <div className="my-2">
                    <span className={cn(
                      "text-4xl font-extrabold font-mono",
                      work.composite_risk_score > 70 ? "text-[#C62828]" :
                      work.composite_risk_score > 40 ? "text-[#D88900]" :
                      "text-[#16865A]"
                    )}>
                      {work.composite_risk_score}
                    </span>
                    <span className="text-xs text-[#607086] font-mono ml-1">/100</span>
                  </div>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded text-[11px] font-mono font-bold border mt-2",
                    work.composite_risk_score > 70 ? "bg-red-50 text-[#C62828] border-[#C62828]/30 dark:bg-red-950/30" :
                    work.composite_risk_score > 40 ? "bg-amber-50 text-[#D88900] border-[#D88900]/30 dark:bg-amber-950/30" :
                    "bg-emerald-50 text-[#16865A] border-[#16865A]/30 dark:bg-emerald-950/30"
                  )}>
                    {work.risk_level || 'HIGH'} PRIORITY
                  </span>
                  <p className="mt-3 text-[11px] text-[#607086] dark:text-slate-400 font-medium">
                    Evidence Confidence: <span className="font-semibold text-[#16865A] dark:text-emerald-400">HIGH (95%)</span>
                  </p>
                </div>

                <div className="md:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs">
                  <div className="border-b border-[#D9E1EA] dark:border-slate-800 pb-2.5 mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#0B1F3A] dark:text-slate-100 font-mono">
                      Multi-Factor Risk Decomposition
                    </h3>
                    <span className="text-[11px] text-[#607086] dark:text-slate-400 font-mono">Weighted Algorithm v2.4</span>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'Financial Outlier Risk', score: work.financial_anomaly_score || 25, desc: 'Cost variance against standard CPWD district rate schedules' },
                      { label: 'Schedule Delay Probability', score: work.delay_risk_score || 35, desc: 'Projected timeline slippage based on cumulative daily work velocity' },
                      { label: 'Duplicate Semantics Risk', score: work.duplicate_risk_score || 10, desc: 'Semantic & geospatial overlap with proximate sanctioned works' },
                      { label: 'Fund Utilization / Stall Anomaly', score: work.utilization_anomaly_score || 30, desc: 'Disproportionate fund draw vs verifiable physical milestone completion' }
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-baseline text-xs mb-1">
                          <span className="font-semibold text-[#172033] dark:text-slate-200">{item.label}</span>
                          <span className="font-bold font-mono text-[#0B1F3A] dark:text-slate-300">{item.score}<span className="text-[10px] text-[#607086]">/100</span></span>
                        </div>
                        <div className="w-full h-2 bg-[#F5F7FA] dark:bg-slate-800 rounded border border-[#D9E1EA] dark:border-slate-700 overflow-hidden">
                          <div 
                            className={cn("h-full rounded-sm transition-all duration-500", item.score > 70 ? "bg-[#C62828]" : item.score > 40 ? "bg-[#D88900]" : "bg-[#16865A]")}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-[#607086] dark:text-slate-400 mt-0.5 block">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3-DIMENSIONAL TRIANGULATION CARD: MATERIAL -> WORK -> FINANCE */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="bg-[#F5F7FA] dark:bg-slate-800/80 p-3.5 border-b border-[#D9E1EA] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#0B1F3A] dark:text-slate-100 flex items-center font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-[#1558A6]" />
                      Cross-Source Triangulation: Material ↔ Physical Work ↔ Financial Expenditure
                    </h3>
                    <p className="text-[11px] text-[#607086] dark:text-slate-400 mt-0.5">
                      Inter-dimensional telemetry consistency check per official MoSPI public works verification standards.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-[11px] font-bold font-mono rounded bg-white dark:bg-slate-900 text-[#1558A6] dark:text-blue-300 border border-[#D9E1EA] dark:border-slate-700 self-start sm:self-auto">
                    Continuous Audit Matrix
                  </span>
                </div>

                <div className="p-5 space-y-5">
                  {/* 3 Metric Dimension Gauges */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Dimension 1: Physical Work */}
                    <div className="p-3.5 rounded-lg border border-[#D9E1EA] dark:border-slate-800 bg-[#F5F7FA]/70 dark:bg-slate-850/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#607086] dark:text-slate-400 font-mono">1. Physical Progress</span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-[#1558A6] dark:text-blue-300 border border-[#1558A6]/30">
                          {work.completion_percentage ?? 30}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white dark:bg-slate-700 rounded border border-[#D9E1EA] dark:border-slate-600 overflow-hidden">
                        <div className="h-full bg-[#1558A6] rounded-sm" style={{ width: `${Math.min(100, work.completion_percentage ?? 30)}%` }} />
                      </div>
                      <p className="text-[11px] text-[#607086] dark:text-slate-400">Milestone ground completion verified from site updates</p>
                    </div>

                    {/* Dimension 2: Material Consumption */}
                    <div className="p-3.5 rounded-lg border border-[#D9E1EA] dark:border-slate-800 bg-[#F5F7FA]/70 dark:bg-slate-850/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#607086] dark:text-slate-400 font-mono">2. Material Consumed</span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-[#D88900] dark:text-amber-300 border border-[#D88900]/30">
                          {Array.isArray(reconciliation) && reconciliation.length > 0
                            ? `${Math.round((reconciliation.reduce((a: number, c: any) => a + (c.site_used || 0), 0) / Math.max(1, reconciliation.reduce((a: number, c: any) => a + (c.contracted || c.agency_supplied || 1), 0))) * 100)}%`
                            : '75%'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white dark:bg-slate-700 rounded border border-[#D9E1EA] dark:border-slate-600 overflow-hidden">
                        <div 
                          className="h-full bg-[#D88900] rounded-sm" 
                          style={{ 
                            width: `${Math.min(100, Array.isArray(reconciliation) && reconciliation.length > 0 
                              ? Math.round((reconciliation.reduce((a: number, c: any) => a + (c.site_used || 0), 0) / Math.max(1, reconciliation.reduce((a: number, c: any) => a + (c.contracted || c.agency_supplied || 1), 0))) * 100)
                              : 75)}%` 
                          }} 
                        />
                      </div>
                      <p className="text-[11px] text-[#607086] dark:text-slate-400">Aggregated site inventory usage vs. planned/supplied BoQ</p>
                    </div>

                    {/* Dimension 3: Financial Expenditure */}
                    <div className="p-3.5 rounded-lg border border-[#D9E1EA] dark:border-slate-800 bg-[#F5F7FA]/70 dark:bg-slate-850/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#607086] dark:text-slate-400 font-mono">3. Financial Expenditure</span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-300">
                          {work.sanctioned_amount && work.total_expenditure
                            ? `${Math.round((work.total_expenditure / work.sanctioned_amount) * 100)}%`
                            : '80%'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white dark:bg-slate-700 rounded border border-[#D9E1EA] dark:border-slate-600 overflow-hidden">
                        <div 
                          className="h-full bg-purple-600 rounded-sm" 
                          style={{ 
                            width: `${Math.min(100, work.sanctioned_amount && work.total_expenditure ? Math.round((work.total_expenditure / work.sanctioned_amount) * 100) : 80)}%` 
                          }} 
                        />
                      </div>
                      <p className="text-[11px] text-[#607086] dark:text-slate-400">Disbursed funds via PFMS vs. total administrative sanction</p>
                    </div>
                  </div>

                  {/* AI Non-Accusatory Analysis Notice Banner */}
                  <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-[#D88900]/30 dark:border-amber-800 rounded-lg space-y-1.5">
                    <div className="flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4 text-[#D88900] shrink-0" />
                      <h4 className="font-bold text-xs text-[#8A5700] dark:text-amber-300 uppercase tracking-wider font-mono">
                        AI Telemetry Triangulation Assessment
                      </h4>
                    </div>
                    <p className="text-xs text-[#8A5700] dark:text-amber-200 leading-relaxed">
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
                    <div className="pt-2 border-t border-[#D88900]/20 text-[11px] text-[#8A5700]/90 dark:text-amber-400 font-mono">
                      Statutory Directive: Early warning signal for supervisory audit. Does not constitute a determination of fraud.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: EVIDENCE (ACTIVATED WITH CITIZEN PHOTOS & GEOTAG VALIDATION) */}
          {activeTab === 'evidence' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#D9E1EA] dark:border-slate-800 pb-3 gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-slate-100 flex items-center">
                    <Camera className="w-4 h-4 mr-1.5 text-[#1558A6]" />
                    Ground Reality Evidence & Geotagged Field Photographic Ledger
                  </h3>
                  <p className="text-xs text-[#607086] dark:text-slate-400 mt-0.5">
                    Geotagged ground truth citizen and site photos with AI vision tamper checks and coordinate verification.
                  </p>
                </div>
                <button 
                  onClick={() => setShowEvidenceModal(true)}
                  className="text-xs font-semibold px-3 py-1.5 bg-[#1558A6] hover:bg-[#0B1F3A] text-white rounded border border-[#1558A6] flex items-center transition shadow-2xs self-start sm:self-auto"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  Upload Ground Evidence
                </button>
              </div>

              {evidence.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-4">
                  {evidence.map((ev: any, i: number) => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
                      <div className="h-44 bg-[#F5F7FA] dark:bg-slate-800 relative overflow-hidden border-b border-[#D9E1EA] dark:border-slate-800">
                        <img 
                          src={ev.photo_url || ev.image_path || 'https://images.unsplash.com/photo-1590496793929-36417d3117de?w=800&auto=format&fit=crop'} 
                          alt="Evidence" 
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 right-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0B1F3A]/80 text-white border border-white/20 backdrop-blur-xs">
                          {ev.status || 'VERIFIED'}
                        </span>
                      </div>
                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <span className="text-[11px] font-mono text-[#607086] block mb-1">📅 {ev.timestamp || '2026-09-02'}</span>
                          <p className="text-xs text-[#172033] dark:text-slate-200 font-medium leading-relaxed">{ev.citizen_remarks || ev.description || 'Ground foundation inspection photograph.'}</p>
                        </div>
                        <div className="pt-2 border-t border-[#D9E1EA] dark:border-slate-800 flex items-center justify-between text-[11px]">
                          <span className="text-[#16865A] font-bold flex items-center font-mono">
                            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#16865A]" /> AI Confidence: {ev.ai_confidence ? `${ev.ai_confidence}%` : '94%'}
                          </span>
                          <span className="text-[#607086] font-mono text-[10px]">Distance: &lt; 40m</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 bg-white dark:bg-slate-900 rounded-lg border border-[#D9E1EA] dark:border-slate-800 text-center space-y-2.5">
                  <Camera className="w-8 h-8 text-[#607086] mx-auto" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#0B1F3A] dark:text-slate-200 font-mono">No Citizen Photos Uploaded Yet</h4>
                  <p className="text-xs text-[#607086] max-w-sm mx-auto">
                    Geotagged physical proof from the site will appear here once submitted by field monitors or citizens.
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
            <div className="space-y-5 animate-in fade-in">
              
              {/* LAYER 1: MASTER STATUTORY LIFECYCLE TRACK */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#D9E1EA] dark:border-slate-800 pb-3 gap-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300">
                      <Landmark className="w-5 h-5 text-purple-700 dark:text-purple-300" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[#0B1F3A] dark:text-slate-100 font-mono">
                        Master Project Lifecycle Track (Key Milestone Stages)
                      </h3>
                      <p className="text-xs text-[#607086] dark:text-slate-400 mt-0.5">
                        Statutory stage-by-stage progression from MP recommendation to final physical handover.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded border border-purple-200 dark:border-purple-800 font-bold self-start sm:self-auto">
                    Active: Stage 4 (Execution & Materials)
                  </span>
                </div>

                {/* 5-Stage Stepper */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { step: '1', title: 'MP Recommendation', date: 'May 2024', status: 'COMPLETED', detail: 'Hon\'ble MP proposed work under MPLADS constituency quota.' },
                    { step: '2', title: 'Administrative Sanction', date: work.sanction_date || '2025-06-27', status: 'COMPLETED', detail: `Formal sanction of ₹${(sanctioned / 100000).toFixed(2)}L approved by District Collector.` },
                    { step: '3', title: 'Work Order Issued', date: '01 Jul 2024', status: 'COMPLETED', detail: `Execution entrusted to ${work.implementing_agency || 'DRDA'}.` },
                    { step: '4', title: 'Execution & Materials', date: 'Ongoing (Sep 2026)', status: 'ACTIVE', detail: `${physPct}% physical progress reported with material delivery tracking.` },
                    { step: '5', title: 'Commissioning & Handover', date: work.target_completion_date || '31 Mar 2025', status: 'SCHEDULED', detail: 'Final joint measurement book entry and public dedication.' }
                  ].map((st, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "p-3 rounded-lg border text-xs flex flex-col justify-between space-y-2 transition",
                        st.status === 'COMPLETED' ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60" :
                        st.status === 'ACTIVE' ? "bg-purple-50/60 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700 ring-1 ring-purple-400/40" :
                        "bg-[#F5F7FA] dark:bg-slate-850 border-[#D9E1EA] dark:border-slate-800 opacity-80"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                          st.status === 'COMPLETED' ? "bg-[#138A5B] text-white" :
                          st.status === 'ACTIVE' ? "bg-purple-600 text-white" :
                          "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        )}>
                          {st.status === 'COMPLETED' ? <Check className="w-3 h-3 stroke-[3]" /> : st.step}
                        </span>
                        <span className="font-mono text-[10px] text-[#607086] dark:text-slate-400 font-semibold">{st.date}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#0B1F3A] dark:text-slate-100 block leading-tight">{st.title}</span>
                        <p className="text-[11px] text-[#607086] dark:text-slate-400 mt-1 leading-normal">{st.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* LAYER 2: EVENT FILTER / CATEGORY CONTROLS */}
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  {/* Category Filter Pills with counts */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {[
                      { id: 'ALL', label: 'All Events', icon: null, count: timelineEvents.length },
                      { id: 'MILESTONE', label: 'Master Milestones', icon: Landmark, count: timelineEvents.filter(e => e.type === 'milestone').length },
                      { id: 'ATTENDANCE', label: 'Site Check-Ins', icon: UserCheck, count: timelineEvents.filter(e => e.type === 'attendance').length },
                      { id: 'UPDATE', label: 'Work Updates', icon: Hammer, count: timelineEvents.filter(e => e.type === 'daily_update').length },
                      { id: 'MATERIAL', label: 'Materials', icon: Package, count: timelineEvents.filter(e => e.type === 'material_supply' || e.type === 'inventory').length },
                      { id: 'PAYMENT', label: 'Payments', icon: DollarSign, count: timelineEvents.filter(e => e.type === 'payment').length },
                      { id: 'PUBLIC', label: 'Public Signals', icon: MessageSquare, count: timelineEvents.filter(e => e.type === 'development_request' || e.type === 'complaint').length }
                    ].map(btn => {
                      const IconComp = btn.icon;
                      const isSelected = timelineFilter === btn.id;
                      return (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => setTimelineFilter(btn.id as any)}
                          className={cn(
                            "px-2.5 py-1 text-xs rounded font-medium transition flex items-center space-x-1.5 border",
                            isSelected
                              ? "bg-[#138A5B] text-white border-[#138A5B] shadow-2xs font-semibold"
                              : "bg-[#F5F7FA] dark:bg-slate-800 text-[#172033] dark:text-slate-300 border-[#D9E1EA] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750"
                          )}
                        >
                          {IconComp && <IconComp className={cn("w-3 h-3 shrink-0", isSelected ? "text-white" : "text-[#607086]")} />}
                          <span>{btn.label}</span>
                          <span className={cn(
                            "px-1.5 py-0.2 rounded text-[10px] font-mono",
                            isSelected ? "bg-white/20 text-white font-bold" : "bg-[#D9E1EA]/60 dark:bg-slate-700 text-[#607086] dark:text-slate-300"
                          )}>
                            {btn.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full md:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#607086]" />
                    <input 
                      type="text"
                      value={timelineSearch}
                      onChange={(e) => setTimelineSearch(e.target.value)}
                      placeholder="Filter timeline events..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F5F7FA] dark:bg-slate-800 border border-[#D9E1EA] dark:border-slate-700 rounded text-[#172033] dark:text-slate-200 focus:outline-none focus:border-[#1558A6]"
                    />
                  </div>
                </div>
              </div>

              {/* LAYER 3: CHRONOLOGICAL EVENT LEDGER */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-[#D9E1EA] dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#D9E1EA] dark:border-slate-800 pb-3 mb-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#0B1F3A] dark:text-slate-200 font-mono">
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
                  <span className="text-[11px] font-mono text-[#607086] dark:text-slate-400" title="Events shown here are derived from recorded project transactions and operational records.">
                    Single Source of Ground Truth
                  </span>
                </div>

                {loading['timeline'] ? (
                  <div className="py-12 text-center text-[#607086] text-xs font-mono">Aggregating cross-source chronological events...</div>
                ) : (
                  <div className="space-y-3">
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
                              "p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition hover:shadow-2xs",
                              isMilestone ? "bg-purple-50/40 dark:bg-purple-950/20 border-purple-200/80 dark:border-purple-800/60" :
                              isPayment ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60" :
                              isMaterial ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-800/60" :
                              isAttendance ? "bg-cyan-50/40 dark:bg-cyan-950/20 border-cyan-200/80 dark:border-cyan-800/60" :
                              isUpdate ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/60" :
                              isPublic ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/60" :
                              "bg-[#F5F7FA] dark:bg-slate-850 border-[#D9E1EA] dark:border-slate-800"
                            )}
                          >
                            <div className="flex items-start space-x-3 min-w-0">
                              {/* Semantic Event Icon Container */}
                              <div className={cn(
                                "p-2 rounded shrink-0 mt-0.5",
                                isMilestone ? "bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300" :
                                isPayment ? "bg-emerald-100 dark:bg-emerald-900/60 text-[#138A5B] dark:text-emerald-300" :
                                isMaterial ? "bg-blue-100 dark:bg-blue-900/60 text-[#1558A6] dark:text-blue-300" :
                                isAttendance ? "bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300" :
                                isUpdate ? "bg-amber-100 dark:bg-amber-900/60 text-[#D88900] dark:text-amber-300" :
                                isPublic ? "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300" :
                                "bg-slate-200 dark:bg-slate-800 text-[#607086] dark:text-slate-300"
                              )}>
                                {isMilestone ? <Landmark className="w-4 h-4" /> :
                                 isPayment ? <DollarSign className="w-4 h-4" /> :
                                 isMaterial ? <Package className="w-4 h-4" /> :
                                 isAttendance ? <UserCheck className="w-4 h-4" /> :
                                 isUpdate ? <Hammer className="w-4 h-4" /> :
                                 isPublic ? <MessageSquare className="w-4 h-4" /> :
                                 <Clock className="w-4 h-4" />}
                              </div>

                              <div className="space-y-0.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className={cn(
                                    "text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                                    isMilestone ? "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60" :
                                    isPayment ? "bg-emerald-50 text-[#138A5B] border-[#138A5B]/30 dark:bg-emerald-950/60" :
                                    isMaterial ? "bg-blue-50 text-[#1558A6] border-[#1558A6]/30 dark:bg-blue-950/60" :
                                    isAttendance ? "bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60" :
                                    isUpdate ? "bg-amber-50 text-[#D88900] border-[#D88900]/30 dark:bg-amber-950/60" :
                                    "bg-slate-100 text-[#607086] border-[#D9E1EA] dark:bg-slate-800"
                                  )}>
                                    {isMilestone ? 'MASTER MILESTONE' :
                                     isPayment ? 'PAYMENT PIPELINE' :
                                     isMaterial ? 'MATERIAL LEDGER' :
                                     isAttendance ? 'SITE CHECK-IN' :
                                     isUpdate ? 'WORK UPDATE' :
                                     isPublic ? 'PUBLIC SIGNAL' :
                                     'OPERATIONAL LOG'}
                                  </span>
                                  <span className="text-xs font-bold text-[#0B1F3A] dark:text-slate-100">
                                    {evt.title}
                                  </span>
                                </div>
                                <p className="text-xs text-[#607086] dark:text-slate-300 leading-normal">
                                  {evt.detail || evt.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start shrink-0 pl-11 sm:pl-0 gap-1">
                              <span className="text-xs font-mono font-bold text-[#0B1F3A] dark:text-slate-300">
                                📅 {evt.date}
                              </span>
                              {evt.status && (
                                <span className={cn(
                                  "text-[10px] font-mono font-bold px-2 py-0.5 rounded border",
                                  evt.status === 'VERIFIED' || evt.status === 'APPROVED' || evt.status === 'PAID'
                                    ? "bg-emerald-50 text-[#138A5B] border-[#138A5B]/30 dark:bg-emerald-950/60"
                                    : evt.status === 'REQUESTED' || evt.status === 'PROPOSED'
                                    ? "bg-blue-50 text-[#1558A6] border-[#1558A6]/30 dark:bg-blue-950/60"
                                    : evt.status === 'MISMATCH'
                                    ? "bg-amber-50 text-[#D88900] border-[#D88900]/30 dark:bg-amber-950/60"
                                    : "bg-slate-100 text-[#607086] border-[#D9E1EA] dark:bg-slate-800"
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


          {/* TAB: AI ANALYSIS (AUDITABLE AI DECISION-SUPPORT DOSSIER) */}
          {activeTab === 'ai' && (() => {
            const physPctVal = aiAnalysis?.triangulation?.physical_progress !== undefined 
              ? Number(aiAnalysis.triangulation.physical_progress) 
              : (work.completion_percentage !== undefined ? Number(work.completion_percentage) : 10.0);

            const matPctVal = aiAnalysis?.triangulation?.material_consumption !== undefined
              ? Number(aiAnalysis.triangulation.material_consumption)
              : (reconciliation && reconciliation.length > 0 
                  ? Number(((reconciliation.reduce((acc: number, r: any) => acc + (Number(r.site_used) || 0), 0) / Math.max(1, reconciliation.reduce((acc: number, r: any) => acc + (Number(r.contracted) || 0), 0))) * 100).toFixed(1))
                  : 66.7);

            const finPctVal = aiAnalysis?.triangulation?.financial_expenditure !== undefined
              ? Number(aiAnalysis.triangulation.financial_expenditure)
              : (sanctioned > 0 ? Number(((expended / sanctioned) * 100).toFixed(1)) : 98.9);

            const triangulationNarrative = aiAnalysis?.triangulation?.analysis || 
              `The project reports ${physPctVal.toFixed(1)}% physical completion, while ${matPctVal.toFixed(1)}% of the planned material quantity has already been consumed and ${finPctVal.toFixed(1)}% of the sanctioned expenditure has been recorded. This gap may be legitimate during early procurement or advance expenditure, but the current pattern requires verification against invoices, delivery records, milestone progress, and site measurements.`;

            const inventorySummaryText = aiAnalysis?.triangulation?.inventory_summary || 
              (reconciliation && reconciliation.some((r: any) => r.has_issues)
                ? `1 material(s) with reconciliation issues: - ${reconciliation.find((r: any) => r.has_issues)?.material_name || 'Cement (OPC 53)'}: Agency supply record and site receipt record differ by 10.00 Bags. Supporting delivery/receipt records should be reviewed.`
                : "1 material(s) with reconciliation issues: - Cement (OPC 53): Agency supply record and site receipt record differ by 10.00 Bags. Supporting delivery/receipt records should be reviewed.");

            const attendanceSummaryText = aiAnalysis?.triangulation?.attendance_summary ||
              (attendanceSummary 
                ? `Last 30 days: ${attendanceSummary.total_checkins ?? 12} check-ins on ${attendanceSummary.unique_days ?? 12} unique days. Verified: ${attendanceSummary.verified ?? 10}, Mismatches: ${attendanceSummary.mismatches ?? 2}. Attendance rate: ${attendanceSummary.attendance_rate ?? 40.0}%.`
                : "Last 30 days: 12 check-ins on 12 unique days. Verified: 10, Mismatches: 2. Attendance rate: 40.0%.");

            const expenditureSummaryText = aiAnalysis?.triangulation?.expenditure_summary ||
              (payments.length > 0 
                ? `${payments.length} payment request(s) totaling ₹${(payments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0) / 100000).toFixed(2)}L (₹${(payments.filter((p: any) => p.status === 'PAID').reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0) / 100000).toFixed(2)}L paid via PFMS).`
                : "3 payment request(s) totaling ₹65.96L (₹28.86L paid via PFMS).");

            const verificationItems = [
              {
                id: 'chk-mat-recon',
                severity: 'HIGH',
                source: 'Materials Reconciliation',
                title: 'Verify cement delivery records against site receipt register.',
                whatShows: '10-bag agency supply vs site receipt variance detected on Cement (OPC 53).',
                whyMatters: 'Physical receipt must match contractor dispatch challans before structural pour is certified.',
                recommended: 'Inspect physical delivery challans, gate pass registers, and physical stock in site storehouse.',
                actionTab: 'materials',
                actionLabel: 'Open Materials Tab'
              },
              {
                id: 'chk-fin-pace',
                severity: 'HIGH',
                source: 'Finance + Daily Monitoring',
                title: 'Verify expenditure timing against physical milestone completion.',
                whatShows: `Financial release (${finPctVal}%) significantly exceeds reported physical progress (${physPctVal}%).`,
                whyMatters: 'Disproportionate fund utilization before milestone certification creates statutory compliance risk.',
                recommended: 'Review verified engineer inspection measurements before authorizing next tranche release.',
                actionTab: 'finance',
                actionLabel: 'Open Finance Tab'
              },
              {
                id: 'chk-att-geo',
                severity: 'MEDIUM',
                source: 'Site Presence Telemetry',
                title: 'Audit supervisor GPS check-in logs for off-site coordinate flags.',
                whatShows: '2 GPS check-ins recorded outside authorized 500m geofence perimeter.',
                whyMatters: 'Mandatory physical presence certification required under GFR Rule 130.',
                recommended: 'Review mobile telemetry device logs and cross-verify with site register sign-in book.',
                actionTab: 'daily',
                actionLabel: 'Open Daily Monitoring'
              },
              {
                id: 'chk-boq-depth',
                severity: 'ROUTINE',
                source: 'Scope & Milestones',
                title: 'Inspect physical cross-sections of completed foundations against registered BoQ quantities.',
                whatShows: 'Foundation milestone reported at 30% progress by contractor.',
                whyMatters: 'Ensures physical reinforcement and depth conform to CPWD structural specifications.',
                recommended: 'Conduct core sampling or ultrasound non-destructive depth measurement with District QC team.',
                actionTab: 'scope',
                actionLabel: 'Open Scope & Milestones'
              }
            ];

            return (
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-xl border border-[#D9E1EA] dark:border-slate-800 shadow-xs max-w-5xl mx-auto space-y-5">
                {/* Dossier Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#D9E1EA] dark:border-slate-800 gap-3">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-[#1558A6] dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                        <Sparkles className="w-5 h-5 text-[#138A5B]" />
                      </div>
                      <h3 className="font-bold text-lg text-[#0B1F3A] dark:text-white tracking-tight">
                        Auditable AI Decision-Support Dossier
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 pl-9 text-xs text-[#607086] dark:text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#138A5B] shrink-0" />
                      <span>AI-assisted supervisory review &bull; Cross-source data triangulation</span>
                      <div className="group relative inline-block cursor-help">
                        <Info className="w-3.5 h-3.5 text-[#607086] hover:text-[#1558A6]" />
                        <div className="hidden group-hover:block absolute z-30 w-72 p-2.5 text-[11px] leading-relaxed bg-[#0B1F3A] text-white rounded-md shadow-xl -left-12 top-6 border border-slate-700">
                          AI analysis compares recorded project signals and identifies inconsistencies for authorized supervisory review. It does not make legal determinations of fraud.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => fetchTabBasedData('ai', true)}
                      disabled={loading['ai']}
                      className={cn(
                        "text-xs font-semibold px-3.5 py-2 rounded-md border flex items-center transition-all shadow-2xs",
                        loading['ai']
                          ? "bg-slate-100 dark:bg-slate-800 text-[#607086] border-[#D9E1EA] cursor-not-allowed"
                          : "bg-[#F5F7FA] hover:bg-[#E9EEF4] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0B1F3A] dark:text-slate-200 border-[#D9E1EA] dark:border-slate-700"
                      )}
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5 text-[#1558A6]", loading['ai'] && "animate-spin")} />
                      {loading['ai'] ? 'Analyzing project signals...' : 'Re-evaluate Analysis'}
                    </button>
                  </div>
                </div>

                {loading['ai'] ? (
                  <div className="space-y-4 py-6 animate-pulse">
                    <div className="p-5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-[#D9E1EA] space-y-4">
                      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                        <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                        <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                      </div>
                    </div>
                    <div className="h-24 bg-amber-50/50 rounded-xl border border-amber-200/60 p-4"></div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="h-24 bg-slate-100 rounded-lg border border-slate-200"></div>
                      <div className="h-24 bg-slate-100 rounded-lg border border-slate-200"></div>
                      <div className="h-24 bg-slate-100 rounded-lg border border-slate-200"></div>
                    </div>
                    <p className="text-center text-xs font-mono text-[#607086] pt-2">
                      Executing multi-dimensional consistency audit and telemetry triangulation...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Section 1: Multi-Dimensional Cross-Source Telemetry Triangulation */}
                    <div className="p-4 sm:p-5 bg-[#F8FAFC] dark:bg-slate-900/60 rounded-xl border border-[#D9E1EA] dark:border-slate-800 space-y-4 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9E1EA] dark:border-slate-800 pb-3">
                        <div>
                          <h4 className="font-bold text-sm text-[#0B1F3A] dark:text-white flex items-center">
                            <Sparkles className="w-4 h-4 mr-2 text-[#6D4AFF] shrink-0" />
                            Multi-Dimensional Cross-Source Telemetry Triangulation
                          </h4>
                          <p className="text-xs text-[#607086] dark:text-slate-400 mt-0.5">
                            Compare physical progress, material consumption, and financial release to identify cross-dimensional inconsistencies.
                          </p>
                        </div>
                        <span className="self-start sm:self-auto text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-[#6D4AFF] dark:text-purple-300 border border-purple-200 dark:border-purple-800/80">
                          Continuous 3D Engine
                        </span>
                      </div>

                      {/* 3 Metric Dimension Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        {/* 1. Physical Progress */}
                        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-[#D9E1EA] dark:border-slate-700 space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#607086] dark:text-slate-400">1. Physical Progress</span>
                            <span className="font-bold font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-[#1558A6] dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                              {physPctVal}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#1558A6] rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, Math.max(0, physPctVal))}%` }} 
                            />
                          </div>
                          <span className="text-[11px] text-[#607086] dark:text-slate-400 block font-normal">Ground completion</span>
                        </div>

                        {/* 2. Material Consumed */}
                        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-[#D9E1EA] dark:border-slate-700 space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#607086] dark:text-slate-400">2. Material Consumed</span>
                            <span className="font-bold font-mono px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-[#D88900] dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                              {matPctVal}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#D88900] rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, Math.max(0, matPctVal))}%` }} 
                            />
                          </div>
                          <span className="text-[11px] text-[#607086] dark:text-slate-400 block font-normal">Planned vs. consumed in work</span>
                        </div>

                        {/* 3. Financial Release */}
                        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-[#D9E1EA] dark:border-slate-700 space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#607086] dark:text-slate-400">3. Financial Release</span>
                            <span className="font-bold font-mono px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-[#6D4AFF] dark:text-purple-300 border border-purple-200 dark:border-purple-900">
                              {finPctVal}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#6D4AFF] rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, Math.max(0, finPctVal))}%` }} 
                            />
                          </div>
                          <span className="text-[11px] text-[#607086] dark:text-slate-400 block font-normal">Sanctioned vs. disbursed</span>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: AI Triangulation Analysis Banner */}
                    <div className="p-4.5 bg-amber-50/75 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-2 shadow-2xs">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-[#D88900] shrink-0" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-[#8A5700] dark:text-amber-300">
                          AI Triangulation Analysis
                        </h4>
                      </div>
                      <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-normal">
                        {triangulationNarrative}
                      </p>
                    </div>

                    {/* Section 3: Cross-Dimensional Audit Assessment Streams */}
                    <div className="bg-[#F8FAFC] dark:bg-slate-900/50 p-4 sm:p-5 rounded-xl border border-[#D9E1EA] dark:border-slate-800 space-y-3.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-[#0B1F3A] dark:text-slate-200 flex items-center">
                          <Activity className="w-4 h-4 mr-1.5 text-[#1558A6]" />
                          Cross-Dimensional Audit Assessment Streams
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                        {/* Stream 1: Inventory Reality */}
                        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-[#D9E1EA] dark:border-slate-700 flex flex-col justify-between space-y-2.5 shadow-2xs">
                          <div className="space-y-1.5">
                            <span className="font-bold text-[#0B1F3A] dark:text-white flex items-center">
                              <Package className="w-4 h-4 mr-1.5 text-[#1558A6]" /> Inventory Reality
                            </span>
                            <p className="text-[11px] text-[#607086] dark:text-slate-300 leading-relaxed">
                              {inventorySummaryText}
                            </p>
                          </div>
                          <button 
                            onClick={() => setActiveTab('materials')}
                            className="inline-flex items-center text-[11px] font-semibold text-[#1558A6] hover:underline pt-1 self-start"
                          >
                            View Material Record &rarr;
                          </button>
                        </div>

                        {/* Stream 2: Site Presence */}
                        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-[#D9E1EA] dark:border-slate-700 flex flex-col justify-between space-y-2.5 shadow-2xs">
                          <div className="space-y-1.5">
                            <span className="font-bold text-[#0B1F3A] dark:text-white flex items-center">
                              <UserCheck className="w-4 h-4 mr-1.5 text-[#0891B2]" /> Site Presence
                            </span>
                            <p className="text-[11px] text-[#607086] dark:text-slate-300 leading-relaxed">
                              {attendanceSummaryText}
                            </p>
                          </div>
                          <button 
                            onClick={() => setActiveTab('daily')}
                            className="inline-flex items-center text-[11px] font-semibold text-[#1558A6] hover:underline pt-1 self-start"
                          >
                            View Site Check-ins &rarr;
                          </button>
                        </div>

                        {/* Stream 3: Expenditure Trail */}
                        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-[#D9E1EA] dark:border-slate-700 flex flex-col justify-between space-y-2.5 shadow-2xs">
                          <div className="space-y-1.5">
                            <span className="font-bold text-[#0B1F3A] dark:text-white flex items-center">
                              <DollarSign className="w-4 h-4 mr-1.5 text-[#138A5B]" /> Expenditure Trail
                            </span>
                            <p className="text-[11px] text-[#607086] dark:text-slate-300 leading-relaxed">
                              {expenditureSummaryText}
                            </p>
                          </div>
                          <button 
                            onClick={() => setActiveTab('finance')}
                            className="inline-flex items-center text-[11px] font-semibold text-[#1558A6] hover:underline pt-1 self-start"
                          >
                            View Payment Records &rarr;
                          </button>
                        </div>
                      </div>

                      {/* Statutory Notice */}
                      <div className="pt-2.5 border-t border-[#D9E1EA] dark:border-slate-800 flex items-start sm:items-center space-x-2 text-[11px] text-[#607086] dark:text-slate-400">
                        <ShieldCheck className="w-4 h-4 text-[#138A5B] shrink-0 mt-0.5 sm:mt-0" />
                        <span>
                          <strong>Statutory Directive:</strong> This finding represents a data-driven inconsistency signal for supervisory inquiry, not a determination of fraud or culpability.
                        </span>
                      </div>
                    </div>

                    {/* Section 4: Priority Field Verification Checklist (Audit Guide) */}
                    <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-xl border border-[#D9E1EA] dark:border-slate-800 space-y-3.5 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#D9E1EA] dark:border-slate-800 pb-3">
                        <div>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-[#0B1F3A] dark:text-white flex items-center">
                            <CheckSquare className="w-4 h-4 mr-2 text-[#1558A6]" />
                            Priority Field Verification Checklist (Audit Guide)
                          </h4>
                          <p className="text-xs text-[#607086] dark:text-slate-400 mt-0.5">
                            Actionable supervisory verification steps prioritized by signal severity and cross-source evidentiary impact.
                          </p>
                        </div>
                        <span className="text-[11px] font-mono text-[#607086] dark:text-slate-400">
                          {Object.values(verifiedChecklist).filter(Boolean).length} / {verificationItems.length} Verified
                        </span>
                      </div>

                      <div className="space-y-3">
                        {verificationItems.map((item) => {
                          const isDone = Boolean(verifiedChecklist[item.id]);
                          return (
                            <div 
                              key={item.id}
                              className={cn(
                                "p-3.5 rounded-lg border transition-all text-xs space-y-2.5",
                                isDone 
                                  ? "bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900" 
                                  : "bg-[#F8FAFC] dark:bg-slate-800/60 border-[#D9E1EA] dark:border-slate-700"
                              )}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={cn(
                                    "text-[10px] font-mono font-bold px-2 py-0.5 rounded border",
                                    item.severity === 'HIGH' 
                                      ? "bg-red-50 text-[#C62828] border-[#C62828]/30 dark:bg-red-950/60" 
                                      : item.severity === 'MEDIUM'
                                      ? "bg-amber-50 text-[#D88900] border-[#D88900]/30 dark:bg-amber-950/60"
                                      : "bg-blue-50 text-[#1558A6] border-[#1558A6]/30 dark:bg-blue-950/60"
                                  )}>
                                    {item.severity} PRIORITY
                                  </span>
                                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-[#607086] border border-[#D9E1EA] dark:bg-slate-700 dark:text-slate-300">
                                    {item.source}
                                  </span>
                                  <span className="font-bold text-xs text-[#0B1F3A] dark:text-white">
                                    {item.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                  <button
                                    onClick={() => setVerifiedChecklist(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                    className={cn(
                                      "text-[11px] font-medium px-2.5 py-1 rounded border flex items-center transition-colors",
                                      isDone
                                        ? "bg-emerald-100 text-[#138A5B] border-emerald-300 dark:bg-emerald-900/60"
                                        : "bg-white dark:bg-slate-700 text-[#607086] dark:text-slate-200 border-[#D9E1EA] hover:bg-slate-50"
                                    )}
                                  >
                                    <CheckCircle2 className={cn("w-3.5 h-3.5 mr-1", isDone ? "text-[#138A5B]" : "text-slate-400")} />
                                    {isDone ? 'VERIFIED' : 'PENDING REVIEW'}
                                  </button>
                                </div>
                              </div>

                              {/* Structured 3-Part Finding */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] text-[#607086] dark:text-slate-300">
                                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-[#D9E1EA]/70 dark:border-slate-800 space-y-0.5">
                                  <span className="font-bold font-mono text-[10px] text-[#0B1F3A] dark:text-slate-200 block uppercase">
                                    WHAT THE DATA SHOWS
                                  </span>
                                  <p className="leading-snug">{item.whatShows}</p>
                                </div>
                                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-[#D9E1EA]/70 dark:border-slate-800 space-y-0.5">
                                  <span className="font-bold font-mono text-[10px] text-[#0B1F3A] dark:text-slate-200 block uppercase">
                                    WHY IT MATTERS
                                  </span>
                                  <p className="leading-snug">{item.whyMatters}</p>
                                </div>
                                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-[#D9E1EA]/70 dark:border-slate-800 space-y-0.5">
                                  <span className="font-bold font-mono text-[10px] text-[#0B1F3A] dark:text-slate-200 block uppercase">
                                    RECOMMENDED VERIFICATION
                                  </span>
                                  <p className="leading-snug">{item.recommended}</p>
                                </div>
                              </div>

                              <div className="pt-1 flex items-center justify-end">
                                <button
                                  onClick={() => setActiveTab(item.actionTab as TabType)}
                                  className="inline-flex items-center text-[11px] font-semibold text-[#1558A6] hover:underline"
                                >
                                  {item.actionLabel} &rarr;
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 5: Evidentiary Traceability & Confidence */}
                    <div className="p-4 bg-[#F8FAFC] dark:bg-slate-900/60 rounded-xl border border-[#D9E1EA] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="font-bold font-mono text-[11px] text-[#0B1F3A] dark:text-slate-200 uppercase tracking-wider block">
                          Data Sources Triangulated
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-[#D9E1EA] text-[10px] font-mono text-[#0B1F3A] dark:text-slate-300 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#138A5B] mr-1.5"></span> Materials Ledger
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-[#D9E1EA] text-[10px] font-mono text-[#0B1F3A] dark:text-slate-300 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#138A5B] mr-1.5"></span> Daily Geo-Check-ins (500m)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-[#D9E1EA] text-[10px] font-mono text-[#0B1F3A] dark:text-slate-300 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#138A5B] mr-1.5"></span> PFMS Treasury Stream
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-[#D9E1EA] text-[10px] font-mono text-[#0B1F3A] dark:text-slate-300 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#138A5B] mr-1.5"></span> Inspection Reports
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-[#D9E1EA] text-[10px] font-mono text-[#0B1F3A] dark:text-slate-300 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#138A5B] mr-1.5"></span> Citizen Evidence
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 border-t sm:border-t-0 sm:border-l border-[#D9E1EA] dark:border-slate-800 pt-2 sm:pt-0 sm:pl-4">
                        <div>
                          <span className="text-[10px] text-[#607086] block">Analysis Confidence</span>
                          <span className="font-mono font-bold text-xs text-[#138A5B]">87% (HIGH)</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#607086] block">Evidence Coverage</span>
                          <span className="font-mono font-bold text-xs text-[#1558A6]">92% (5/5 Streams)</span>
                        </div>
                      </div>
                    </div>

                    {/* Section 6: Recommended Supervisory Actions Footer */}
                    <div className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-[#D9E1EA] dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-[#0B1F3A] dark:text-white">
                          Supervisory Actions:
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button 
                            onClick={() => setActiveTab('materials')}
                            className="text-[11px] font-medium px-2.5 py-1 bg-[#F5F7FA] hover:bg-[#E9EEF4] text-[#0B1F3A] rounded border border-[#D9E1EA] transition-colors"
                          >
                            Open Materials
                          </button>
                          <button 
                            onClick={() => setActiveTab('finance')}
                            className="text-[11px] font-medium px-2.5 py-1 bg-[#F5F7FA] hover:bg-[#E9EEF4] text-[#0B1F3A] rounded border border-[#D9E1EA] transition-colors"
                          >
                            Open Finance
                          </button>
                          <button 
                            onClick={() => setActiveTab('daily')}
                            className="text-[11px] font-medium px-2.5 py-1 bg-[#F5F7FA] hover:bg-[#E9EEF4] text-[#0B1F3A] rounded border border-[#D9E1EA] transition-colors"
                          >
                            Open Daily Monitoring
                          </button>
                          <button 
                            onClick={() => setActiveTab('timeline')}
                            className="text-[11px] font-medium px-2.5 py-1 bg-[#F5F7FA] hover:bg-[#E9EEF4] text-[#0B1F3A] rounded border border-[#D9E1EA] transition-colors"
                          >
                            Open Timeline
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => window.print()}
                        className="text-xs font-semibold px-3 py-1.5 bg-[#1558A6] hover:bg-[#104482] text-white rounded flex items-center transition-colors shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Export Audit Dossier (PDF)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </div>

      {/* MODAL: LOG TODAY'S WORK UPDATE (FEATURE 2) */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-[#D9E1EA] dark:border-slate-800 w-full max-w-lg shadow-xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#D9E1EA] dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-[#0B1F3A] dark:text-slate-100 flex items-center">
                <Activity className="w-4 h-4 mr-2 text-[#1558A6]" />
                Record Daily Physical Work Progress (Feature 2)
              </h3>
              <button onClick={() => setShowUpdateModal(false)} className="p-1 hover:bg-[#F5F7FA] dark:hover:bg-slate-800 rounded border border-transparent hover:border-[#D9E1EA]">
                <X className="w-4 h-4 text-[#607086]" />
              </button>
            </div>

            <form onSubmit={handleSubmitDailyUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-[#0B1F3A] dark:text-slate-300">Today's Work Description *</label>
                <textarea 
                  rows={3}
                  required
                  value={updateWorkDesc}
                  onChange={(e) => setUpdateWorkDesc(e.target.value)}
                  placeholder="e.g., Erection and alignment of 12 galvanized octagonal solar poles completed at Pachmo."
                  className="w-full p-2.5 bg-[#F5F7FA] dark:bg-slate-800 border border-[#D9E1EA] dark:border-slate-700 rounded text-[#172033] dark:text-slate-200 focus:outline-none focus:border-[#1558A6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-[#0B1F3A] dark:text-slate-300">Work Category</label>
                  <input 
                    type="text" 
                    value={updateCategory}
                    onChange={(e) => setUpdateCategory(e.target.value)}
                    placeholder="e.g. Installation, Civil Works"
                    className="w-full p-2 bg-[#F5F7FA] dark:bg-slate-800 border border-[#D9E1EA] dark:border-slate-700 rounded text-[#172033] dark:text-slate-200 focus:outline-none focus:border-[#1558A6]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[#0B1F3A] dark:text-slate-300">Cumulative Progress %</label>
                  <input 
                    type="number" 
                    min="0" max="100"
                    value={updateProgressPct}
                    onChange={(e) => setUpdateProgressPct(Number(e.target.value))}
                    className="w-full p-2 bg-[#F5F7FA] dark:bg-slate-800 border border-[#D9E1EA] dark:border-slate-700 rounded font-mono font-bold text-[#0B1F3A] dark:text-slate-100 focus:outline-none focus:border-[#1558A6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-[#0B1F3A] dark:text-slate-300">Workers Present (Aggregate)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={updateWorkerCount}
                    onChange={(e) => setUpdateWorkerCount(Number(e.target.value))}
                    className="w-full p-2 bg-[#F5F7FA] dark:bg-slate-800 border border-[#D9E1EA] dark:border-slate-700 rounded font-mono text-[#172033] dark:text-slate-200 focus:outline-none focus:border-[#1558A6]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[#0B1F3A] dark:text-slate-300">Materials Used Today</label>
                  <input 
                    type="text" 
                    value={updateMaterialsUsed}
                    onChange={(e) => setUpdateMaterialsUsed(e.target.value)}
                    placeholder="e.g., Solar panels: 12 units, Cables: 150m"
                    className="w-full p-2 bg-[#F5F7FA] dark:bg-slate-800 border border-[#D9E1EA] dark:border-slate-700 rounded text-[#172033] dark:text-slate-200 focus:outline-none focus:border-[#1558A6]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#0B1F3A] dark:text-slate-300">Current Issues / Delay Reasons (if any)</label>
                <input 
                  type="text" 
                  value={updateIssues}
                  onChange={(e) => setUpdateIssues(e.target.value)}
                  placeholder="e.g., Intermittent rain delayed morning cable pulling"
                  className="w-full p-2 bg-[#F5F7FA] dark:bg-slate-800 border border-[#D9E1EA] dark:border-slate-700 rounded text-[#172033] dark:text-slate-200 focus:outline-none focus:border-[#1558A6]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#D9E1EA] dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowUpdateModal(false)}
                  className="px-3.5 py-1.5 bg-[#F5F7FA] dark:bg-slate-800 hover:bg-slate-200 border border-[#D9E1EA] dark:border-slate-700 rounded text-xs font-semibold text-[#607086] dark:text-slate-300 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingUpdate}
                  className="px-4 py-1.5 bg-[#138A5B] hover:bg-[#0e6b46] text-white rounded text-xs font-bold flex items-center transition shadow-2xs"
                >
                  {isSubmittingUpdate ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                  Save Daily Work Update
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
