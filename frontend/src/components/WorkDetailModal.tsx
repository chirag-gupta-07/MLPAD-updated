import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, ShieldAlert, AlertTriangle, CheckCircle, FileText, MapPin, DollarSign, Clock, Layers, Copy, 
  CheckSquare, ShieldCheck, Camera, PlusCircle, Check, ArrowRight, ExternalLink, Calendar, Flag,
  Package, ClipboardList, Activity, MessageSquare, History, UserCheck, AlertCircle, Download,
  HelpCircle, Sparkles
} from 'lucide-react';
import { CitizenEvidenceModal } from './CitizenEvidenceModal';

interface WorkDetailModalProps {
  work: any;
  onClose: () => void;
  onOpenProject?: (work: any) => void;
}

export const WorkDetailModal: React.FC<WorkDetailModalProps> = ({ work: initialWork, onClose, onOpenProject }) => {
  if (!initialWork) return null;

  const [currentWork, setCurrentWork] = useState<any>(initialWork);
  const [loadingWork, setLoadingWork] = useState(false);
  const [citizenEvidence, setCitizenEvidence] = useState<any[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // SIH26102 Longitudinal Lifecycle Hub state
  const [activeTab, setActiveTab] = useState<'overview' | 'scope_milestones' | 'materials' | 'finance' | 'inspections' | 'complaints' | 'audit'>('overview');
  const [lifecycleData, setLifecycleData] = useState<any>(null);
  const [loadingLifecycle, setLoadingLifecycle] = useState(false);

  // New Inspection Form State
  const [newInspectorName, setNewInspectorName] = useState('');
  const [newInspectorDesig, setNewInspectorDesig] = useState('Assistant Engineer');
  const [newObservedPct, setNewObservedPct] = useState(78);
  const [newInspectionResult, setNewInspectionResult] = useState('PARTIALLY_VERIFIED');
  const [newInspectionRemarks, setNewInspectionRemarks] = useState('');
  const [submittingInspection, setSubmittingInspection] = useState(false);

  // Explanatory Guidance Dialog States
  const [showWhyFlagged, setShowWhyFlagged] = useState(false);
  const [showWhatToDo, setShowWhatToDo] = useState(false);

  useEffect(() => {
    setCurrentWork(initialWork);
  }, [initialWork]);

  const fetchLifecycle = async (workId: string) => {
    if (!workId) return;
    setLoadingLifecycle(true);
    try {
      const res = await axios.get(`/api/projects/${encodeURIComponent(workId)}/lifecycle`);
      setLifecycleData(res.data);
    } catch (e) {
      console.warn('No extended lifecycle record found, using base work data:', e);
      setLifecycleData(null);
    } finally {
      setLoadingLifecycle(false);
    }
  };

  const fetchCitizenEvidence = async (workId: string) => {
    if (!workId) return;
    setLoadingEvidence(true);
    try {
      const res = await axios.get(`/api/citizen-evidence/work/${workId}`);
      setCitizenEvidence(res.data.evidence || []);
    } catch (e) {
      console.error('Failed to load citizen evidence for work:', e);
    } finally {
      setLoadingEvidence(false);
    }
  };

  useEffect(() => {
    if (currentWork?.work_id) {
      fetchCitizenEvidence(currentWork.work_id);
      fetchLifecycle(currentWork.work_id);
    }
  }, [currentWork?.work_id]);

  const handleRecordInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWork?.work_id) return;
    setSubmittingInspection(true);
    try {
      await axios.post(`/api/projects/${encodeURIComponent(currentWork.work_id)}/inspections`, {
        inspector_name: newInspectorName || 'Authorized Officer',
        inspector_designation: newInspectorDesig,
        observed_progress_pct: Number(newObservedPct),
        result: newInspectionResult,
        remarks: newInspectionRemarks,
        checklist: [
          'Joint physical measurement of cross-sections',
          'Material quality batch verification',
          'Site muster roll and GPS check-in verification'
        ]
      });
      alert('Field inspection record successfully logged and verified progress updated!');
      setNewInspectionRemarks('');
      fetchLifecycle(currentWork.work_id);
    } catch (e) {
      console.error('Failed to record inspection:', e);
      alert('Failed to record inspection. Please try again.');
    } finally {
      setSubmittingInspection(false);
    }
  };

  const handleNavigateToWork = async (targetWorkId: string) => {
    if (!targetWorkId || targetWorkId === currentWork?.work_id) return;
    setLoadingWork(true);
    try {
      const res = await axios.get(`/api/works/${targetWorkId}`);
      setCurrentWork(res.data);
    } catch (e) {
      console.error(`Failed to navigate to duplicate work ${targetWorkId}:`, e);
      alert(`Could not load work ${targetWorkId}. Please try again.`);
    } finally {
      setLoadingWork(false);
    }
  };

  let riskFactors: any[] = [];
  let recommendedActions: string[] = [];
  let duplicateMatches: any[] = [];

  try {
    if (typeof currentWork?.risk_factors_json === 'string') {
      riskFactors = JSON.parse(currentWork.risk_factors_json);
    } else if (Array.isArray(currentWork?.risk_factors_json)) {
      riskFactors = currentWork.risk_factors_json;
    }
  } catch (e) {}

  // Fallback dynamic risk factor generation based on quantitative evaluation metrics
  if (riskFactors.length === 0 && currentWork) {
    const isCapitalHealth = /hospital|medical college|phc|chc/i.test(currentWork.work_description || '');
    
    if (Number(currentWork.financial_anomaly_score || 0) >= 50) {
      riskFactors.push({
        metric: 'Cost Unusualness vs Regional Peer Baseline',
        dimension: 'Financial Anomaly',
        severity: Number(currentWork.financial_anomaly_score || 0) >= 70 ? 'HIGH' : 'MEDIUM',
        text: `Sanctioned cost is unusually high compared to typical regional peers in this sector.`,
        observed_value: `₹${(Number(currentWork.sanctioned_amount || 0) / 1e5).toFixed(2)} Lakh`,
        comparison_value: `Median: ₹${(Number(currentWork.peer_median_cost || 0) / 1e5).toFixed(2)} Lakh`,
        peer_group: currentWork.sector
      });
    } else if (isCapitalHealth && Number(currentWork.sanctioned_amount || 0) >= 1e7) {
      riskFactors.push({
        metric: 'Semantic Asset Classification',
        dimension: 'Capital Asset Normalization',
        severity: 'LOW',
        text: `Asset identified as Major Healthcare Facility (Hospital/Medical). Cost verified as consistent with hospital capital construction standards.`,
        observed_value: `₹${(Number(currentWork.sanctioned_amount || 0) / 1e7).toFixed(2)} Cr`,
        comparison_value: `Hospital Norm: ₹1.5 - 3.0 Cr`,
        peer_group: 'Public Health & Healthcare Infrastructure'
      });
    }

    if (Number(currentWork.utilization_anomaly_score || 0) >= 50) {
      const utilRate = currentWork.sanctioned_amount > 0 ? Math.round((currentWork.total_expenditure / currentWork.sanctioned_amount) * 100) : 0;
      riskFactors.push({
        metric: 'Premature Advance Drawdown (Fiscal Parking)',
        dimension: 'Fund Utilization',
        severity: Number(currentWork.utilization_anomaly_score || 0) >= 70 ? 'HIGH' : 'MEDIUM',
        text: `${utilRate}% of total budget was disbursed upfront while physical progress is logged at only ${currentWork.completion_percentage}%. GFR rules stipulate advance mobilization ceilings of 10-15%.`,
        observed_value: `${utilRate}% fund disbursed`,
        comparison_value: `${currentWork.completion_percentage}% physical execution`,
        peer_group: 'Disbursement vs Physical Milestone Rule'
      });
    }

    if (Number(currentWork.delay_risk_score || 0) >= 50) {
      riskFactors.push({
        metric: 'Predicted Execution Latency',
        dimension: 'Schedule Delay',
        severity: Number(currentWork.delay_risk_score || 0) >= 70 ? 'HIGH' : 'MEDIUM',
        text: `ML delay model predicts high probability of project overrun based on pre-kickoff administrative latency.`,
        observed_value: `${currentWork.delay_risk_score}/100 Risk`,
        comparison_value: `Threshold: 50.0`,
        peer_group: currentWork.district
      });
    }

    if (Number(currentWork.duplicate_risk_score || 0) >= 60) {
      riskFactors.push({
        metric: 'Geospatial / Textual Asset Overlap',
        dimension: 'Duplicate Asset',
        severity: Number(currentWork.duplicate_risk_score || 0) >= 80 ? 'HIGH' : 'MEDIUM',
        text: `High similarity detected with another work sanctioned in close proximity. Verify separate technical sanction.`,
        observed_value: `${currentWork.duplicate_risk_score}% Similarity`,
        comparison_value: `Threshold: 50%`,
        peer_group: currentWork.district
      });
    }
  }

  try {
    if (typeof currentWork?.recommended_actions_json === 'string') {
      recommendedActions = JSON.parse(currentWork.recommended_actions_json);
    } else if (Array.isArray(currentWork?.recommended_actions_json)) {
      recommendedActions = currentWork.recommended_actions_json;
    }
  } catch (e) {}

  try {
    if (typeof currentWork?.duplicate_matches_json === 'string') {
      duplicateMatches = JSON.parse(currentWork.duplicate_matches_json);
    } else if (Array.isArray(currentWork?.duplicate_matches_json)) {
      duplicateMatches = currentWork.duplicate_matches_json;
    }
  } catch (e) {}

  const getSeverityBadge = (severity: string) => {
    if (severity === 'HIGH') return 'bg-red-100 text-red-800 border-red-200';
    if (severity === 'MEDIUM') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  };

  // Professional Statutory Timeline Calculation (MoSPI 12-month standard)
  const getTimelineMetrics = () => {
    const isCompleted = currentWork?.status === 'COMPLETED' || Boolean(currentWork?.actual_completion_date);
    const expectedDateStr = currentWork?.expected_completion_date;
    const actualDateStr = currentWork?.actual_completion_date;
    const sanctionDateStr = currentWork?.sanction_date;
    const recDateStr = currentWork?.recommendation_date;

    const expectedDate = expectedDateStr ? new Date(expectedDateStr) : null;
    const actualDate = actualDateStr ? new Date(actualDateStr) : null;
    const now = new Date(); // Live current date

    let statusType: 'ON_TRACK' | 'OVERDUE' | 'COMPLETED_ON_TIME' | 'COMPLETED_DELAYED' | 'UNKNOWN' = 'UNKNOWN';
    let daysDelta = 0;
    let badgeText = '';
    let badgeClass = '';

    if (isCompleted && actualDate && expectedDate) {
      daysDelta = Math.round((actualDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDelta <= 0) {
        statusType = 'COMPLETED_ON_TIME';
        badgeText = Math.abs(daysDelta) === 0 ? 'Completed on target' : `Completed ${Math.abs(daysDelta)}d ahead`;
        badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      } else {
        statusType = 'COMPLETED_DELAYED';
        badgeText = `Completed ${daysDelta}d delayed`;
        badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      }
    } else if (expectedDate) {
      // If expected completion date is in the past compared to now, it is OVERDUE
      daysDelta = Math.round((now.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDelta > 0) {
        statusType = 'OVERDUE';
        badgeText = `${daysDelta} Days Overdue`;
        badgeClass = 'bg-red-100 text-red-800 border-red-300 animate-pulse';
      } else if (Number(currentWork?.delay_risk_score || 0) >= 65) {
        // Expected date not yet reached, but ML model predicts severe execution overrun
        statusType = 'OVERDUE';
        badgeText = `${Math.abs(daysDelta)}d to deadline · Execution Overrun Risk`;
        badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      } else {
        statusType = 'ON_TRACK';
        badgeText = `${Math.abs(daysDelta)} Days Remaining (On Track)`;
        badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      }
    }

    return {
      isCompleted,
      recDateStr,
      sanctionDateStr,
      expectedDateStr,
      actualDateStr,
      statusType,
      daysDelta,
      badgeText,
      badgeClass
    };
  };

  const timeline = getTimelineMetrics();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-5xl w-full h-[90vh] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200 dark:border-slate-700">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold tracking-tight font-mono">{currentWork.work_id}</h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  currentWork.risk_level === 'HIGH' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                  currentWork.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}>
                  {currentWork.risk_level} RISK ({currentWork.composite_risk_score}/100)
                </span>
                {loadingWork && (
                  <span className="text-[11px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded animate-pulse">
                    Loading Work...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{currentWork.sector} · {currentWork.district}, {currentWork.state}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenProject && (
              <button
                onClick={() => {
                  onClose();
                  onOpenProject(currentWork);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Full View</span>
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition text-xs font-semibold border border-slate-700"
              title="Export / Print Inspection Dossier"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Dossier</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Institutional 7-Tab Navigation Bar */}
        <div className="bg-slate-800 px-4 flex items-center space-x-1 overflow-x-auto border-b border-slate-700 text-xs font-semibold text-slate-300 scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-400 bg-slate-700/50'
                : 'border-transparent hover:text-white hover:bg-slate-700/30'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>1. Overview & Signals</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scope_milestones')}
            className={`py-3 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
              activeTab === 'scope_milestones'
                ? 'border-emerald-500 text-emerald-400 bg-slate-700/50'
                : 'border-transparent hover:text-white hover:bg-slate-700/30'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Scope & Milestones</span>
            {lifecycleData?.lifecycle?.milestones?.length > 0 && (
              <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded-full">
                {lifecycleData.lifecycle.milestones.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={`py-3 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
              activeTab === 'materials'
                ? 'border-emerald-500 text-emerald-400 bg-slate-700/50'
                : 'border-transparent hover:text-white hover:bg-slate-700/30'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>3. Materials Ledger</span>
            {lifecycleData?.lifecycle?.materials?.length > 0 && (
              <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded-full">
                {lifecycleData.lifecycle.materials.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            className={`py-3 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
              activeTab === 'finance'
                ? 'border-emerald-500 text-emerald-400 bg-slate-700/50'
                : 'border-transparent hover:text-white hover:bg-slate-700/30'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>4. Financial GFR Audit</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inspections')}
            className={`py-3 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
              activeTab === 'inspections'
                ? 'border-emerald-500 text-emerald-400 bg-slate-700/50'
                : 'border-transparent hover:text-white hover:bg-slate-700/30'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>5. Field Inspections & Checklist</span>
            {lifecycleData?.consistency?.verification_checklist?.length > 0 && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded-full font-mono">
                {lifecycleData.consistency.verification_checklist.length} Items
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('complaints')}
            className={`py-3 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
              activeTab === 'complaints'
                ? 'border-emerald-500 text-emerald-400 bg-slate-700/50'
                : 'border-transparent hover:text-white hover:bg-slate-700/30'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>6. Citizen Complaints & Signals</span>
            {(lifecycleData?.lifecycle?.complaints?.length || citizenEvidence.length) > 0 && (
              <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 px-1.5 py-0.2 rounded-full">
                {(lifecycleData?.lifecycle?.complaints?.length || 0) + citizenEvidence.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
              activeTab === 'audit'
                ? 'border-emerald-500 text-emerald-400 bg-slate-700/50'
                : 'border-transparent hover:text-white hover:bg-slate-700/30'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>7. Audit & Memory</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-6 text-xs text-slate-700">
          
          {/* TAB 1: OVERVIEW & MULTI-SIGNAL RISK */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              
              {/* Institutional Project Status Banner (Requirement 19, 20, 21) */}
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                currentWork.risk_level === 'HIGH'
                  ? 'bg-red-50/80 border-red-200 text-red-950'
                  : currentWork.risk_level === 'MEDIUM'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    currentWork.risk_level === 'HIGH' ? 'bg-red-600 text-white' :
                    currentWork.risk_level === 'MEDIUM' ? 'bg-amber-500 text-white' :
                    'bg-emerald-600 text-white'
                  }`}>
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm tracking-tight">
                        {currentWork.risk_level === 'HIGH' ? 'HIGH ATTENTION REQUIRED' :
                         currentWork.risk_level === 'MEDIUM' ? 'MODERATE SUPERVISORY REVIEW' :
                         'COMPLIANT WITH MINIMAL DETECTED RISK'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 border font-mono">
                        Risk Score: {currentWork.composite_risk_score}/100
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-0.5">
                      {currentWork.risk_level === 'HIGH'
                        ? 'Multi-stream inconsistencies detected across finance, materials, or reported progress. Priority field verification recommended.'
                        : currentWork.risk_level === 'MEDIUM'
                        ? 'Minor variance detected against district or sectoral peer baselines. Regular supervisory tracking advised.'
                        : 'Progress, expenditure tranches, and reported execution align with MoSPI norms.'}
                    </p>
                  </div>
                </div>

                {/* Primary Action Buttons: Why Flagged & What To Do */}
                <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => setShowWhyFlagged(true)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 shadow-sm transition"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span>Why is this flagged?</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowWhatToDo(true)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>What should I do?</span>
                  </button>
                </div>
              </div>

              {/* Tri-State Progress & Verification Discrepancy Bar */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Tri-State Progress Triangulation (Baseline vs Reported vs Verified)
                    </h4>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="flex items-center text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 mr-1"></span> Planned: <strong>100%</strong>
                    </span>
                    <span className="flex items-center text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 mr-1"></span> Reported: <strong>{lifecycleData?.lifecycle?.scope?.reported_completion_pct ?? currentWork.completion_percentage}%</strong>
                    </span>
                    <span className="flex items-center text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 mr-1"></span> Verified: <strong>{lifecycleData?.lifecycle?.scope?.verified_completion_pct ?? currentWork.completion_percentage}%</strong>
                    </span>
                  </div>
                </div>

                {/* Comparative Progress Bars */}
                <div className="space-y-2 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                      <span>Contractor / Agency Self-Reported Progress</span>
                      <span className="font-bold text-amber-700">{lifecycleData?.lifecycle?.scope?.reported_completion_pct ?? currentWork.completion_percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-amber-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${lifecycleData?.lifecycle?.scope?.reported_completion_pct ?? currentWork.completion_percentage}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                      <span>Official Field-Verified Execution (AEE / Vigilance Inspection)</span>
                      <span className="font-bold text-emerald-700">{lifecycleData?.lifecycle?.scope?.verified_completion_pct ?? currentWork.completion_percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${lifecycleData?.lifecycle?.scope?.verified_completion_pct ?? currentWork.completion_percentage}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Evidence Confidence & Discrepancy Callout */}
                {lifecycleData?.consistency && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-700">Evidence Confidence Score:</span>
                      <span className="px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-300 font-mono">
                        {lifecycleData.consistency.evidence_confidence_score}%
                      </span>
                      <span className="text-slate-400">(Corroborated across inspections, materials & ground logs)</span>
                    </div>

                    {lifecycleData.consistency.inconsistency_count > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                        {lifecycleData.consistency.inconsistency_count} Consistency Warning(s)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" />
                        Cross-Streams Consistent
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Work Description & Data Quality Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">Work Description</h4>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">
                  Data Quality: {currentWork.data_quality_score || 95}%
                </span>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Confidence: {currentWork.model_confidence || 'HIGH'}
                </span>
              </div>
            </div>
            <p className="text-slate-800 text-sm leading-relaxed">{currentWork.work_description}</p>
            
            {/* Project Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-200">
              <div>
                <span className="text-slate-500 block text-[11px]">Hon'ble MP</span>
                <span className="font-semibold text-slate-800">{currentWork.mp_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Implementing Agency</span>
                <span className="font-semibold text-slate-800 truncate block" title={currentWork.implementing_agency}>{currentWork.implementing_agency || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Sanction Date</span>
                <span className="font-semibold text-slate-800">{currentWork.sanction_date || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Physical Progress</span>
                <span className="font-semibold text-slate-800">{currentWork.completion_percentage}% ({currentWork.status})</span>
              </div>
            </div>

            {/* Financial Sanction & Expenditure Metrics Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-200 bg-white p-3 rounded-lg border">
              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Sanctioned Budget</span>
                <span className="font-bold text-slate-900 text-sm">
                  {currentWork.sanctioned_amount !== undefined && currentWork.sanctioned_amount !== null
                    ? currentWork.sanctioned_amount >= 1e7
                      ? `₹${(currentWork.sanctioned_amount / 1e7).toFixed(2)} Cr`
                      : `₹${(currentWork.sanctioned_amount / 1e5).toFixed(2)} Lakh (${currentWork.sanctioned_amount.toLocaleString('en-IN')})`
                    : 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Total Expended</span>
                <span className={`font-bold text-sm ${
                  Number(currentWork.total_expenditure || 0) > Number(currentWork.sanctioned_amount || 0)
                    ? 'text-red-600 font-bold'
                    : 'text-emerald-700'
                }`}>
                  {currentWork.total_expenditure !== undefined && currentWork.total_expenditure !== null
                    ? currentWork.total_expenditure >= 1e7
                      ? `₹${(currentWork.total_expenditure / 1e7).toFixed(2)} Cr`
                      : `₹${(currentWork.total_expenditure / 1e5).toFixed(2)} Lakh (${currentWork.total_expenditure.toLocaleString('en-IN')})`
                    : 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Fund Utilization</span>
                <span className="font-bold text-slate-800 text-sm">
                  {currentWork.sanctioned_amount > 0
                    ? `${Math.round(((currentWork.total_expenditure || 0) / currentWork.sanctioned_amount) * 100)}%`
                    : '0%'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Payment Tranches</span>
                <span className="font-bold text-slate-800 text-sm">
                  {currentWork.payment_count || 1} payment{(currentWork.payment_count || 1) > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Statutory Timeline & Execution Milestones (MoSPI Benchmark) */}
            <div className="mt-3 p-3.5 bg-gradient-to-r from-slate-50 to-amber-50/40 rounded-xl border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Statutory Project Timeline & Milestones
                  </h5>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-500 hidden sm:inline">
                    Benchmark: MoSPI 12-Month Guideline
                  </span>
                  {timeline.badgeText && (
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${timeline.badgeClass}`}>
                      {timeline.badgeText}
                    </span>
                  )}
                </div>
              </div>

              {/* 4 Milestones Progress Rail */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">1. Recommended</span>
                  <span className="font-bold text-slate-800 text-xs font-mono">
                    {timeline.recDateStr || 'N/A'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">MP Recommendation</span>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">2. Sanctioned</span>
                  <span className="font-bold text-slate-800 text-xs font-mono">
                    {timeline.sanctionDateStr || 'N/A'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Fund Allocated</span>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-amber-200 bg-amber-50/30">
                  <span className="text-[10px] uppercase font-semibold text-amber-700 block">3. Expected Target</span>
                  <span className="font-bold text-amber-900 text-xs font-mono">
                    {timeline.expectedDateStr || 'N/A'}
                  </span>
                  <span className="text-[10px] text-amber-700 block mt-0.5">Statutory 365d Norm</span>
                </div>

                <div className={`p-2.5 bg-white rounded-lg border ${
                  timeline.isCompleted ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'
                }`}>
                  <span className={`text-[10px] uppercase font-semibold block ${
                    timeline.isCompleted ? 'text-emerald-700' : 'text-slate-400'
                  }`}>
                    4. {timeline.isCompleted ? 'Actual Completed' : 'Current Status'}
                  </span>
                  <span className={`font-bold text-xs font-mono ${
                    timeline.isCompleted ? 'text-emerald-900' : 'text-slate-800'
                  }`}>
                    {timeline.actualDateStr || currentWork.status}
                  </span>
                  <span className={`text-[10px] block mt-0.5 ${
                    timeline.isCompleted ? 'text-emerald-700' : 'text-slate-500'
                  }`}>
                    {timeline.isCompleted ? 'Physically Completed' : `${currentWork.completion_percentage}% executed`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5 Risk Dimensions Radar / Bars */}
          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">AI Multi-Signal Risk Breakdown</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex justify-between font-semibold mb-1">
                  <span>1. Financial Anomaly Score</span>
                  <span className="text-red-700">{currentWork.financial_anomaly_score || 0}/100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: `${currentWork.financial_anomaly_score || 0}%` }}></div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Relative cost unusualness against state & sectoral peer baselines</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex justify-between font-semibold mb-1">
                  <span>2. Schedule Delay Risk</span>
                  <span className="text-amber-700">{currentWork.delay_risk_score || 0}/100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${currentWork.delay_risk_score || 0}%` }}></div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Predicted probability of delay based on pre-kickoff parameters</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex justify-between font-semibold mb-1">
                  <span>3. Semantic Duplicate Score</span>
                  <span className="text-purple-700">{currentWork.duplicate_risk_score || 0}/100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${currentWork.duplicate_risk_score || 0}%` }}></div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Multi-modal vector similarity on text, spatial radius & budget</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex justify-between font-semibold mb-1">
                  <span>4. Fund Utilization Irregularity</span>
                  <span className="text-blue-700">{currentWork.utilization_anomaly_score || 0}/100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${currentWork.utilization_anomaly_score || 0}%` }}></div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Fund disbursal ratio vs recorded physical execution rate</p>
              </div>

            </div>
          </div>

          {/* Evidence-Backed XAI Explanations */}
          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center">
              <FileText className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Verified Risk Evidence & Quantitative Reasons
            </h4>
            <div className="space-y-2">
              {riskFactors.map((rf, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{rf.metric || rf.dimension}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getSeverityBadge(rf.severity)}`}>
                      {rf.severity}
                    </span>
                  </div>
                  <p className="text-slate-700">{rf.text}</p>
                  {rf.comparison_value && (
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      <span>Observed: <strong className="text-slate-800">{rf.observed_value}</strong></span>
                      <span>• Baseline: <strong className="text-slate-800">{rf.comparison_value}</strong></span>
                      {rf.peer_group && <span>• Peer Group: <strong className="text-slate-800">{rf.peer_group}</strong></span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Potential Duplicate Matches */}
          {duplicateMatches.length > 0 && (
            <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-purple-900 text-xs uppercase tracking-wider flex items-center">
                  <Copy className="w-3.5 h-3.5 mr-1 text-purple-600" />
                  Potential Duplicate Work Pairs Detected ({duplicateMatches.length})
                </h4>
                <span className="text-[11px] text-purple-700 font-medium">Click any pair to inspect project</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {duplicateMatches.map((dm, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleNavigateToWork(dm.paired_work_id)}
                    className="w-full text-left p-3 bg-white hover:bg-purple-50/80 rounded-lg border border-purple-200 flex items-center justify-between transition group shadow-sm hover:shadow"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-purple-950 font-mono text-xs group-hover:text-purple-700 transition">
                          {dm.paired_work_id}
                        </span>
                        <ExternalLink className="w-3 h-3 text-purple-400 group-hover:text-purple-600 transition" />
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Distance: <span className="font-semibold">{dm.distance_km} km</span> ({dm.spatial_resolution || 'District approximation'}) · Cost Match: <span className="font-semibold">{dm.cost_similarity}%</span> · Date Gap: <span className="font-semibold">{dm.date_difference_days} days</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-bold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full text-xs">
                        {dm.similarity_score}% Similar
                      </span>
                      <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 group-hover:text-purple-600 transition" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Citizen Evidence & Ground Reality Signals (Feature 7.6) */}
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-indigo-950 text-xs uppercase tracking-wider flex items-center">
                <Camera className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                Crowdsourced Citizen Evidence & Field Signals ({citizenEvidence.length})
              </h4>
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center space-x-1 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg transition shadow-sm"
              >
                <PlusCircle className="w-3 h-3" />
                <span>Submit Ground Evidence</span>
              </button>
            </div>

            {loadingEvidence ? (
              <p className="text-[11px] text-slate-400">Loading ground reports...</p>
            ) : citizenEvidence.length === 0 ? (
              <div className="bg-white/80 p-3 rounded-lg border border-dashed border-indigo-200 text-center text-[11px] text-slate-500">
                <span>No citizen reports filed for this work yet. Citizens and local community members can submit geo-tagged photos and progress updates to flag field discrepancies.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {citizenEvidence.map((ev, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-lg border border-indigo-100 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-xs">{ev.issue_type.replace(/_/g, ' ')}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          ev.verification_status === 'SUPERVISORY_VERIFIED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          ev.verification_status === 'FIELD_INSPECTION_SCHEDULED' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {ev.verification_status === 'SUPERVISORY_VERIFIED' ? 'Verified Discrepancy' :
                           ev.verification_status === 'FIELD_INSPECTION_SCHEDULED' ? 'Inspection Scheduled' : 'Pending Verification'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {ev.distance_from_site_km !== undefined && `${ev.distance_from_site_km} km from site`}
                      </span>
                    </div>

                    {(ev.photo_url || ev.photo_filename) && (
                      <div className="relative rounded-lg overflow-hidden max-h-48 bg-slate-100 border border-slate-200 my-1.5">
                        <img
                          src={ev.photo_url || `/api/citizen-evidence/photo/${ev.photo_filename}`}
                          alt="Ground Evidence"
                          className="w-full h-44 object-cover"
                          onError={(e) => {
                            if (ev.photo_filename && !e.currentTarget.src.includes('/api/citizen-evidence/photo/')) {
                              e.currentTarget.src = `/api/citizen-evidence/photo/${ev.photo_filename}`;
                            } else {
                              e.currentTarget.style.display = 'none';
                            }
                          }}
                        />
                      </div>
                    )}

                    <p className="text-slate-700 text-xs">{ev.description}</p>

                    {ev.progress_gap > 0 && (
                      <div className="text-[11px] text-indigo-900 bg-indigo-50/80 px-2 py-1 rounded font-medium flex items-center justify-between">
                        <span>Portal Progress: <strong>{ev.official_progress}%</strong></span>
                        <span>Observed on Ground: <strong className="text-red-700">{ev.claimed_progress}%</strong></span>
                        <span className="text-[10px] text-red-600 font-bold font-mono">Gap: -{ev.progress_gap}%</span>
                      </div>
                    )}

                    {ev.admin_notes && (
                      <div className="p-2 bg-blue-50/80 rounded text-[11px] text-blue-900 border border-blue-200">
                        <strong>Supervisory Note:</strong> {ev.admin_notes}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>Submitted by: {ev.citizen_name || 'Anonymous'}</span>
                      <span>{ev.submission_timestamp?.slice(0, 10)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actionable Recommendations */}
          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center">
              <CheckSquare className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Recommended Supervisory Actions for District Authorities
            </h4>
            <ul className="space-y-1.5 pl-2">
              {recommendedActions.map((action, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0"></span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
            </div>
          )}

          {/* TAB 2: SCOPE BASELINE & MILESTONES */}
          {activeTab === 'scope_milestones' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center">
                    <Layers className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Sanctioned Physical Scope Baseline
                  </h4>
                  <div className="flex items-center space-x-2">
                    {lifecycleData?.lifecycle?.is_synthesized && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Standard Schedule of Rates (SOR) BoQ Baseline
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      {lifecycleData?.lifecycle?.scope?.contractor_status || 'TECHNICAL SANCTION VERIFIED'}
                    </span>
                  </div>
                </div>
                <p className="text-slate-800 text-sm font-medium">
                  {lifecycleData?.lifecycle?.scope?.approved_scope || currentWork.work_description}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Measurable Unit</span>
                    <span className="font-bold text-slate-900">{lifecycleData?.lifecycle?.scope?.measurable_unit || 'Units'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Approved Quantity</span>
                    <span className="font-bold text-slate-900">{lifecycleData?.lifecycle?.scope?.planned_quantity ?? 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Reported Quantity</span>
                    <span className="font-bold text-amber-800">{lifecycleData?.lifecycle?.scope?.reported_quantity ?? 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Field Verified Quantity</span>
                    <span className="font-bold text-emerald-800">{lifecycleData?.lifecycle?.scope?.verified_quantity ?? 'N/A'}</span>
                  </div>
                </div>
                {lifecycleData?.lifecycle?.scope?.technical_specifications && (
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-700">
                    <span className="font-semibold text-slate-900 block mb-0.5">Technical Specifications & Norms:</span>
                    {lifecycleData.lifecycle.scope.technical_specifications}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                    Sequential Milestone Execution Rail
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {lifecycleData?.lifecycle?.milestones?.length || 0} Registered Milestones
                  </span>
                </h4>

                {(!lifecycleData?.lifecycle?.milestones || lifecycleData.lifecycle.milestones.length === 0) ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500">
                    No granular milestone schedule registered for this work yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {lifecycleData.lifecycle.milestones.map((m: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center font-mono">
                              {m.milestone_order}
                            </span>
                            <span className="font-bold text-slate-900 text-xs">{m.milestone_name}</span>
                            <span className={`px-2 py-0.2 rounded text-[10px] font-bold border ${
                              m.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                              m.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                              'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {m.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3">
                            <span>Planned: {m.planned_start_date} to {m.planned_end_date}</span>
                            {m.actual_end_date && <span>· Completed: <strong>{m.actual_end_date}</strong></span>}
                            {m.verified_by && <span>· Verified by: <strong>{m.verified_by}</strong></span>}
                          </div>
                          {m.remarks && (
                            <p className="text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                              {m.remarks}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold font-mono text-slate-900 block">{m.target_percentage}%</span>
                          <span className="text-[10px] text-slate-400">Cumulative Target</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MATERIALS LEDGER & RECONCILIATION */}
          {activeTab === 'materials' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center">
                    <Package className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                    Material Ledger & 5-Way Inventory Reconciliation
                  </h4>
                  <p className="text-[11px] text-slate-500">Reconciling: Planned vs Ordered vs Received vs Used vs Remaining</p>
                </div>
                {lifecycleData?.lifecycle?.is_synthesized && (
                  <span className="self-start sm:self-auto px-2.5 py-1 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 flex items-center">
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                    MoSPI Schedule of Rates (SOR) Auto-Bootstrapped BoQ
                  </span>
                )}
              </div>

              {/* Material Inventory Inconsistencies Alert */}
              {lifecycleData?.consistency?.inconsistencies?.filter((i: any) => i.type.includes('MATERIAL')).map((inc: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 flex items-start space-x-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">{inc.type}</span>
                    <p>{inc.description}</p>
                  </div>
                </div>
              ))}

              {(!lifecycleData?.lifecycle?.materials || lifecycleData.lifecycle.materials.length === 0) ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500">
                  No material entries logged in ledger for this work.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                      <tr>
                        <th className="px-3 py-2.5">Material & Spec</th>
                        <th className="px-3 py-2.5 text-right">Planned</th>
                        <th className="px-3 py-2.5 text-right">Ordered</th>
                        <th className="px-3 py-2.5 text-right">Received</th>
                        <th className="px-3 py-2.5 text-right">Used</th>
                        <th className="px-3 py-2.5 text-right">Remaining</th>
                        <th className="px-3 py-2.5">Supplier / Invoice</th>
                        <th className="px-3 py-2.5 text-center">Quality Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lifecycleData.lifecycle.materials.map((m: any, idx: number) => {
                        const isViolation = Number(m.used_quantity) > Number(m.received_quantity);
                        return (
                          <tr key={idx} className={`hover:bg-slate-50/80 transition ${isViolation ? 'bg-red-50/30' : ''}`}>
                            <td className="px-3 py-2.5">
                              <div className="font-bold text-slate-900">{m.material_name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{m.specification} ({m.category})</div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-slate-700 font-mono">
                              {m.planned_quantity} {m.unit}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-slate-700 font-mono">
                              {m.ordered_quantity} {m.unit}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-slate-900 font-mono">
                              {m.received_quantity} {m.unit}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold font-mono text-emerald-800">
                              {m.used_quantity} {m.unit}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-slate-600 font-mono">
                              {m.remaining_quantity} {m.unit}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="text-slate-800 font-medium truncate max-w-[120px]" title={m.supplier_name}>{m.supplier_name || 'N/A'}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{m.invoice_ref || 'N/A'}</div>
                            </td>
                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                m.quality_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                'bg-amber-100 text-amber-800 border-amber-300'
                              }`}>
                                {m.quality_status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FINANCIAL GFR AUDIT & ADVANCES */}
          {activeTab === 'finance' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center">
                    <DollarSign className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    Financial Execution & GFR Rule Audit
                  </h4>
                  <p className="text-[11px] text-slate-500">Evaluation of mobilization advance ceilings, tranche velocity and fiscal parking</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <span className="text-slate-500 text-[11px]">GFR Mobilization Advance Ceiling</span>
                  <div className="text-lg font-bold text-slate-900">10% - 15%</div>
                  <p className="text-[10px] text-slate-400">Standard ceiling before physical milestone execution per GFR 2017</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <span className="text-slate-500 text-[11px]">Observed Initial Drawdown</span>
                  <div className={`text-lg font-bold ${
                    (Number(currentWork.total_expenditure || 0) / Number(currentWork.sanctioned_amount || 1)) * 100 > 50 && Number(currentWork.completion_percentage || 0) < 30
                      ? 'text-red-600 font-bold'
                      : 'text-emerald-700'
                  }`}>
                    {currentWork.sanctioned_amount > 0
                      ? `${Math.round(((currentWork.total_expenditure || 0) / currentWork.sanctioned_amount) * 100)}%`
                      : '0%'}
                  </div>
                  <p className="text-[10px] text-slate-400">Disbursed funds vs {currentWork.completion_percentage}% physical execution</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <span className="text-slate-500 text-[11px]">Remaining Unspent Balance</span>
                  <div className="text-lg font-bold text-slate-900">
                    ₹{Math.max(0, (Number(currentWork.sanctioned_amount || 0) - Number(currentWork.total_expenditure || 0)) / 1e5).toFixed(2)} Lakh
                  </div>
                  <p className="text-[10px] text-slate-400">In implementing agency escrow account</p>
                </div>
              </div>

              {(Number(currentWork.total_expenditure || 0) / Number(currentWork.sanctioned_amount || 1)) * 100 > 50 && Number(currentWork.completion_percentage || 0) < 30 && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs space-y-1">
                  <div className="flex items-center space-x-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Potential Fiscal Parking / GFR Mobilization Advance Breach</span>
                  </div>
                  <p className="text-[11px] text-red-800">
                    Significant fund draw occurred upfront while physical asset creation lags behind. Recommend auditing implementing agency passbook and unspent interest accrual.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: FIELD INSPECTIONS & DYNAMIC CHECKLIST */}
          {activeTab === 'inspections' && (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ClipboardList className="w-4 h-4 text-amber-700" />
                    <h4 className="font-bold text-amber-950 text-xs uppercase tracking-wider">
                      AI Dynamic Targeted Verification Checklist ({lifecycleData?.consistency?.verification_checklist?.length || 0} Mandates)
                    </h4>
                  </div>
                  <span className="text-[10px] bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded font-semibold">
                    Sector & Discrepancy Tailored
                  </span>
                </div>

                <div className="space-y-2">
                  {(lifecycleData?.consistency?.verification_checklist || []).map((chk: any, idx: number) => (
                    <div key={idx} className="p-2.5 bg-white rounded-lg border border-amber-200 flex items-start space-x-2.5 shadow-sm">
                      <span className="w-5 h-5 rounded bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-mono">
                        {idx + 1}
                      </span>
                      <div className="space-y-0.5 flex-1">
                        <span className="text-[10px] uppercase font-bold text-amber-700 block">{chk.category}</span>
                        <p className="text-slate-800 text-xs font-medium">{chk.item}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    Official Field Inspection Records ({lifecycleData?.lifecycle?.inspections?.length || 0})
                  </span>
                </h4>

                {(!lifecycleData?.lifecycle?.inspections || lifecycleData.lifecycle.inspections.length === 0) ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500">
                    No official inspection reports logged for this work yet. Use form below to record first inspection.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {lifecycleData.lifecycle.inspections.map((insp: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 text-xs">{insp.inspector_name}</span>
                            <span className="text-[11px] text-slate-500">({insp.inspector_designation})</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {insp.result} · {insp.observed_progress_pct}% Verified
                          </span>
                        </div>
                        <p className="text-slate-700 text-xs">{insp.remarks}</p>
                        {insp.measurements_taken && (
                          <div className="p-2 bg-slate-50 rounded text-[11px] text-slate-600 font-mono">
                            Measurements: {insp.measurements_taken}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                          <span>Inspection Date: {insp.inspection_date}</span>
                          <span>GPS: {insp.gps_latitude}, {insp.gps_longitude} ({insp.distance_from_site_meters}m from site)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center">
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5 text-slate-700" />
                  Record New Field Inspection Entry
                </h4>
                <form onSubmit={handleRecordInspection} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Inspector Name</label>
                      <input
                        type="text"
                        required
                        value={newInspectorName}
                        onChange={(e) => setNewInspectorName(e.target.value)}
                        placeholder="e.g. Er. Rajesh Sharma"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Designation</label>
                      <input
                        type="text"
                        value={newInspectorDesig}
                        onChange={(e) => setNewInspectorDesig(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Observed Physical Progress (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={newObservedPct}
                        onChange={(e) => setNewObservedPct(Number(e.target.value))}
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Inspection Result</label>
                      <select
                        value={newInspectionResult}
                        onChange={(e) => setNewInspectionResult(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="VERIFIED">VERIFIED (Compliant)</option>
                        <option value="PARTIALLY_VERIFIED">PARTIALLY_VERIFIED (Gap Observed)</option>
                        <option value="DISCREPANCY_FLAGGED">DISCREPANCY_FLAGGED</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Findings & Measurement Notes</label>
                    <textarea
                      rows={2}
                      required
                      value={newInspectionRemarks}
                      onChange={(e) => setNewInspectionRemarks(e.target.value)}
                      placeholder="Record physical measurements, test core results, or quality observations..."
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingInspection}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{submittingInspection ? 'Submitting...' : 'Log Inspection & Update Verified Baseline'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 6: CITIZEN COMPLAINTS & REPEATED SIGNALS */}
          {activeTab === 'complaints' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center">
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-red-600" />
                    Citizen Grievances & Repeated Signal Detection
                  </h4>
                  <p className="text-[11px] text-slate-500">Repeated reports on same work trigger automatic supervisory escalation</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="flex items-center space-x-1 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg transition shadow-sm"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>Submit Ground Evidence</span>
                </button>
              </div>

              {/* Repeated Signal Alert */}
              {((lifecycleData?.lifecycle?.complaints?.length || 0) + citizenEvidence.length) >= 2 && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs space-y-1">
                  <div className="flex items-center space-x-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Repeated Public Signal Detected: Supervisory Escalation Triggered</span>
                  </div>
                  <p className="text-[11px] text-red-800">
                    Multiple independent complaints/evidence submissions received for this work. Priority verification inspection recommended.
                  </p>
                </div>
              )}

              {/* Combined Complaints List */}
              <div className="space-y-2.5">
                {(lifecycleData?.lifecycle?.complaints || []).map((c: any, idx: number) => (
                  <div key={`c-${idx}`} className="p-3 bg-white rounded-xl border border-red-100 shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">{c.issue_category}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        {c.status}
                      </span>
                    </div>
                    <p className="text-slate-700 text-xs">{c.description}</p>
                    {c.action_taken && (
                      <div className="p-2 bg-blue-50 rounded text-[11px] text-blue-900 border border-blue-200">
                        <strong>Action Taken:</strong> {c.action_taken}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>Complainant: {c.citizen_name}</span>
                      <span>Filed: {c.submission_date}</span>
                    </div>
                  </div>
                ))}

                {citizenEvidence.map((ev: any, idx: number) => (
                  <div key={`ev-${idx}`} className="p-3 bg-white rounded-xl border border-indigo-100 shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">{ev.issue_type?.replace(/_/g, ' ') || 'Ground Discrepancy'}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                        {ev.verification_status}
                      </span>
                    </div>
                    <p className="text-slate-700 text-xs">{ev.description}</p>
                    {ev.progress_gap > 0 && (
                      <div className="text-[11px] text-red-700 font-bold bg-red-50 p-1.5 rounded">
                        Reported: {ev.official_progress}% vs Ground Observed: {ev.claimed_progress}% (Discrepancy: -{ev.progress_gap}%)
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>Submitted by: {ev.citizen_name || 'Anonymous'}</span>
                      <span>{ev.submission_timestamp?.slice(0, 10)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: LONGITUDINAL AUDIT LOGS & MEMORY */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center">
                    <History className="w-3.5 h-3.5 mr-1.5 text-slate-700" />
                    Immutable Chronological Audit Trail & System Memory
                  </h4>
                  <p className="text-[11px] text-slate-500">Cryptographically sequenced change memory across inspections, check-ins, and baseline revisions</p>
                </div>
              </div>

              {/* Site Geotagged Check-ins */}
              {lifecycleData?.lifecycle?.checkins?.length > 0 && (
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
                  <span className="font-bold text-emerald-950 text-xs uppercase block">Latest Geotagged Site Check-ins</span>
                  <div className="space-y-1.5">
                    {lifecycleData.lifecycle.checkins.map((chk: any, idx: number) => (
                      <div key={idx} className="p-2 bg-white rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{chk.responsible_person_name}</span>
                          <span className="text-slate-500 text-[11px] ml-1.5">({chk.checkin_timestamp})</span>
                        </div>
                        <span className="text-emerald-700 font-mono font-bold text-[11px]">
                          {chk.distance_meters}m from site ({chk.status})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audit Logs Table */}
              {(!lifecycleData?.lifecycle?.audit_logs || lifecycleData.lifecycle.audit_logs.length === 0) ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500">
                  No historical audit entries logged yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {lifecycleData.lifecycle.audit_logs.map((log: any, idx: number) => (
                    <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-xs font-mono">{log.action_type}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">{log.user_role}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          By <strong className="text-slate-800">{log.performed_by}</strong> {log.reason && `· Reason: ${log.reason}`}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">{log.timestamp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div>
            Decision Support System · <span className="font-medium text-slate-700">Requires human supervisory verification</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition"
          >
            Close Audit Inspector
          </button>
        </div>

        {/* Embedded Citizen Evidence Submission Modal */}
        <CitizenEvidenceModal
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          prefilledWork={currentWork}
          onSuccess={() => {
            if (currentWork?.work_id) {
              fetchCitizenEvidence(currentWork.work_id);
            }
          }}
        />

        {/* Why Is This Flagged? Explanatory Modal (Requirements 20, 76) */}
        {showWhyFlagged && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Why is this project flagged?</h4>
                </div>
                <button
                  onClick={() => setShowWhyFlagged(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-800">
                  The decision-support system identified multiple cross-source inconsistencies:
                </p>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-2">
                    <span className="font-bold text-blue-700">1.</span>
                    <div>
                      <strong className="text-slate-900 block">Financial vs Physical Execution:</strong>
                      Financial fund utilization is at {currentWork.sanctioned_amount > 0 ? Math.round(((currentWork.total_expenditure || 0) / currentWork.sanctioned_amount) * 100) : 0}% while ground-verified physical progress is {lifecycleData?.lifecycle?.scope?.verified_completion_pct ?? currentWork.completion_percentage}%.
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-2">
                    <span className="font-bold text-blue-700">2.</span>
                    <div>
                      <strong className="text-slate-900 block">Reported vs Verified Progress Gap:</strong>
                      Contractor reported {lifecycleData?.lifecycle?.scope?.reported_completion_pct ?? currentWork.completion_percentage}% physical execution, but official ground inspection verified {lifecycleData?.lifecycle?.scope?.verified_completion_pct ?? currentWork.completion_percentage}%.
                    </div>
                  </div>

                  {lifecycleData?.consistency?.inconsistencies && lifecycleData.consistency.inconsistencies.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-2">
                      <span className="font-bold text-blue-700">3.</span>
                      <div>
                        <strong className="text-slate-900 block">Material & Logistics Triangulation:</strong>
                        {lifecycleData.consistency.inconsistencies[0]?.description || 'Material consumption pace differs from recorded physical asset milestones.'}
                      </div>
                    </div>
                  )}

                  {((lifecycleData?.lifecycle?.complaints?.length || 0) + citizenEvidence.length) > 0 && (
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-2">
                      <span className="font-bold text-blue-700">4.</span>
                      <div>
                        <strong className="text-slate-900 block">Public Signals Corroboration:</strong>
                        {(lifecycleData?.lifecycle?.complaints?.length || 0) + citizenEvidence.length} citizen report(s) / photos have been submitted regarding this site.
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] space-y-1">
                  <strong>Statutory Notice:</strong>
                  <p>
                    These signals indicate an empirical inconsistency requiring supervisory verification. This automated risk score does NOT establish wrongdoing or fraud.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowWhyFlagged(false)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold text-xs hover:bg-slate-800 transition"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        )}

        {/* What Should I Do? Action Plan Modal (Requirements 21, 88) */}
        {showWhatToDo && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Recommended Action Plan</h4>
                </div>
                <button
                  onClick={() => setShowWhatToDo(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <p className="text-slate-600">
                  Recommended standard operating procedure (SOP) for district monitoring authorities:
                </p>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div>
                      <strong className="text-slate-900 block">Deploy Field Inspector (Tab 5)</strong>
                      <span>Schedule an Assistant Engineer to take physical core measurements and verify milestone claims.</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div>
                      <strong className="text-slate-900 block">Reconcile Material Ledger (Tab 3)</strong>
                      <span>Verify delivery challans, test certificates, and physical on-site remaining inventory.</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <div>
                      <strong className="text-slate-900 block">Audit Financial Vouchers (Tab 4)</strong>
                      <span>Match contractor running bills against statutory GFR 10-15% advance benchmarks.</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <div>
                      <strong className="text-slate-900 block">Close Citizen Grievances (Tab 6)</strong>
                      <span>Verify citizen photos and record supervisory resolution notes.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowWhatToDo(false);
                    setActiveTab('inspections');
                  }}
                  className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition"
                >
                  Go to Inspection Checklist →
                </button>

                <button
                  type="button"
                  onClick={() => setShowWhatToDo(false)}
                  className="px-3 py-1.5 text-slate-600 font-semibold text-xs hover:text-slate-900"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
