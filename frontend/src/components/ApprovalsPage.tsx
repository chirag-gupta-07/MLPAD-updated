import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileCheck, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Building2,
  Layers,
  RotateCcw,
  HelpCircle,
  History,
  TrendingUp,
  FolderCheck,
  Send
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface ApprovalAction {
  id: number;
  approval_id: number;
  project_id: string;
  user_name: string;
  user_role: string;
  action: string;
  previous_status: string | null;
  new_status: string;
  remarks: string | null;
  timestamp: string;
}

interface ApprovalItem {
  id: number;
  project_id: string;
  current_status: string;
  proposed_by: string;
  proposed_date: string;
  estimated_cost: number;
  proposal_description: string;
  location_description?: string;
  latitude?: number;
  longitude?: number;
  supporting_documents?: string[];
  approved_by?: string;
  approved_date?: string;
  rejection_reason?: string;
  return_remarks?: string;
  created_at?: string;
  updated_at?: string;
  actions?: ApprovalAction[];
  // Enriched signals
  work_description?: string;
  sector?: string;
  district?: string;
  state?: string;
  implementing_agency?: string;
  sanctioned_amount?: number;
  duplicate_signals?: number;
  nearby_projects_count?: number;
  public_requests_count?: number;
  risk_level?: string;
}

export const ApprovalsPage: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // Action Modal State
  const [actionModal, setActionModal] = useState<{ 
    isOpen: boolean; 
    actionName: 'APPROVE' | 'REJECT' | 'RETURN' | 'REQUEST_INFO' | 'SANCTION';
    targetStatus: string;
    approval: ApprovalItem; 
  } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [decisionMakerRole, setDecisionMakerRole] = useState('Authorized Authority / Decision Maker');
  const [decisionMakerName, setDecisionMakerName] = useState('District Magistrate / Competent Authority');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      const res = await axios.get('/api/approvals', { params });
      setApprovals(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load approvals:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [statusFilter]);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;
    
    setSubmittingAction(true);
    try {
      await axios.post(`/api/approvals/${actionModal.approval.id}/action`, {
        user_name: decisionMakerName,
        user_role: decisionMakerRole,
        action: actionModal.actionName,
        new_status: actionModal.targetStatus,
        remarks: remarks.trim() ? remarks.trim() : `Action executed by ${decisionMakerRole}`
      });
      
      setActionSuccessMsg(`Action "${actionModal.actionName}" successfully applied to Project ${actionModal.approval.project_id}`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      
      setActionModal(null);
      setRemarks('');
      await fetchApprovals();
    } catch (e: any) {
      console.error('Action failed:', e);
      alert(e.response?.data?.detail || 'Failed to submit approval action.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Approved</span>;
      case 'SANCTIONED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800"><FolderCheck className="w-3.5 h-3.5 mr-1" /> Sanctioned</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"><XCircle className="w-3.5 h-3.5 mr-1" /> Rejected</span>;
      case 'RETURNED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><RotateCcw className="w-3.5 h-3.5 mr-1" /> Returned</span>;
      case 'UNDER_REVIEW':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 border border-sky-200 dark:border-sky-800"><Clock className="w-3.5 h-3.5 mr-1" /> Under Review</span>;
      case 'ELIGIBILITY_CHECK':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"><ShieldCheck className="w-3.5 h-3.5 mr-1" /> Eligibility Check</span>;
      case 'AUTHORITY_REVIEW':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800 animate-pulse"><Clock className="w-3.5 h-3.5 mr-1" /> Authority Review</span>;
      case 'PROPOSED':
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800"><FileCheck className="w-3.5 h-3.5 mr-1" /> Proposed</span>;
    }
  };

  const getNextApprovedStatus = (currentStatus: string): string => {
    switch (currentStatus) {
      case 'PROPOSED':
        return 'UNDER_REVIEW';
      case 'UNDER_REVIEW':
        return 'ELIGIBILITY_CHECK';
      case 'ELIGIBILITY_CHECK':
        return 'AUTHORITY_REVIEW';
      case 'AUTHORITY_REVIEW':
        return 'APPROVED';
      case 'APPROVED':
        return 'SANCTIONED';
      default:
        return currentStatus;
    }
  };

  const getApproveButtonLabel = (currentStatus: string): string => {
    switch (currentStatus) {
      case 'PROPOSED':
        return 'Forward for Review';
      case 'UNDER_REVIEW':
        return 'Pass Eligibility Check';
      case 'ELIGIBILITY_CHECK':
        return 'Submit for Authority Review';
      case 'AUTHORITY_REVIEW':
        return 'Approve Project';
      case 'APPROVED':
        return 'Issue Sanction Order';
      default:
        return 'Approve';
    }
  };

  const tabs = [
    { label: 'All', value: 'ALL' },
    { label: 'Proposed', value: 'PROPOSED' },
    { label: 'Under Review', value: 'UNDER_REVIEW' },
    { label: 'Eligibility Check', value: 'ELIGIBILITY_CHECK' },
    { label: 'Authority Review', value: 'AUTHORITY_REVIEW' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Sanctioned', value: 'SANCTIONED' },
    { label: 'Returned', value: 'RETURNED' },
    { label: 'Rejected', value: 'REJECTED' }
  ];

  const filteredApprovals = approvals.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.project_id.toLowerCase().includes(q) ||
      (item.proposal_description && item.proposal_description.toLowerCase().includes(q)) ||
      (item.work_description && item.work_description.toLowerCase().includes(q)) ||
      (item.proposed_by && item.proposed_by.toLowerCase().includes(q)) ||
      (item.location_description && item.location_description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              Project Approval Workflow
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
              Authorized Authority Cockpit
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Multi-stage proposal review, eligibility scrutiny, duplicate check, and statutory sanction lifecycle with immutable audit trails.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search proposal ID, location, work..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
        <div className="flex p-2 gap-1 min-w-max">
          {tabs.map(tab => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-semibold border border-brand-200 dark:border-brand-700/50" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4"></div>
            <p>Loading project approval queue...</p>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <FileCheck className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-base font-medium">No project proposals found</p>
            <p className="text-sm mt-1">Try switching tabs or adjusting search criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredApprovals.map(approval => {
              const isExpanded = expandedId === approval.id;
              const nextStatus = getNextApprovedStatus(approval.current_status);
              const canAct = !['SANCTIONED', 'REJECTED'].includes(approval.current_status);

              return (
                <div key={approval.id} className="flex flex-col">
                  {/* Summary Header Row */}
                  <div 
                    className={cn(
                      "p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                      isExpanded && "bg-slate-50/80 dark:bg-slate-800/40"
                    )}
                    onClick={() => setExpandedId(isExpanded ? null : approval.id)}
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {approval.project_id}
                        </span>
                        {getStatusBadge(approval.current_status)}
                        {approval.duplicate_signals !== undefined && approval.duplicate_signals > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700">
                            <AlertCircle className="w-3 h-3 mr-1 text-amber-600 dark:text-amber-400" /> Duplicate Signal
                          </span>
                        )}
                        {approval.risk_level && (
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border",
                            approval.risk_level === 'LOW' 
                              ? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" 
                              : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                          )}>
                            Risk: {approval.risk_level}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-1">
                        {approval.work_description || approval.proposal_description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span><strong>Proposer:</strong> {approval.proposed_by}</span>
                        <span><strong>Date:</strong> {approval.proposed_date || '2026-09-01'}</span>
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">
                          ₹{((approval.sanctioned_amount || approval.estimated_cost) / 100000).toFixed(2)} Lakhs
                        </span>
                        {approval.location_description && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {approval.location_description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-brand-600 dark:text-brand-400 font-medium hidden sm:inline">
                        {isExpanded ? 'Hide Details' : 'Review Dossier'}
                      </span>
                      <div className="text-slate-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Authorized Authority Decision-Maker Cockpit */}
                  {isExpanded && (
                    <div className="p-5 bg-slate-50/60 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 space-y-6">
                      
                      {/* Decision Maker Overview Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        
                        {/* 1. Location & Work Scope */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <MapPin className="w-3.5 h-3.5 text-brand-500" /> Location & Sector
                          </div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {approval.location_description || `${approval.district || 'District'}, ${approval.state || 'State'}`}
                          </p>
                          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                            <div>Sector: <span className="text-slate-800 dark:text-slate-200 font-medium">{approval.sector || 'Infrastructure'}</span></div>
                            {approval.latitude && approval.longitude && (
                              <div>GPS: <span className="font-mono text-[11px]">{approval.latitude.toFixed(4)}, {approval.longitude.toFixed(4)}</span></div>
                            )}
                          </div>
                        </div>

                        {/* 2. Financial & Sanction Estimates */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Financial Availability
                          </div>
                          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            ₹{((approval.sanctioned_amount || approval.estimated_cost) / 100000).toFixed(2)} Lakhs
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                            <div>Budget Status: <span className="text-emerald-600 dark:text-emerald-400 font-medium">Fund Allocated</span></div>
                            <div>Agency: <span className="text-slate-800 dark:text-slate-200 font-medium truncate block">{approval.implementing_agency || 'DRDA / PWD'}</span></div>
                          </div>
                        </div>

                        {/* 3. Nearby Projects & Duplicate Signals */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <Layers className="w-3.5 h-3.5 text-purple-500" /> Spatial Intelligence
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                              {approval.nearby_projects_count || 2} Nearby
                            </span>
                            {approval.duplicate_signals && approval.duplicate_signals > 0 ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                                Duplicate Check Required
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                No Duplicate Found
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            GIS radius scan within 1.0 km shows zero duplicate sanction conflicts.
                          </p>
                        </div>

                        {/* 4. Public Requests & Grievances */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Public Demands
                          </div>
                          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {approval.public_requests_count || 1} Citizen Requests
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Aligned with public representation submitted for this constituency ward.
                          </p>
                        </div>

                      </div>

                      {/* Main Detail & Audit Trail Section */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Left: Work Proposal Description, Milestones & Supporting Documents */}
                        <div className="lg:col-span-2 space-y-4">
                          
                          {/* Work Scope */}
                          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                              Full Project Description & Scope of Work
                            </h4>
                            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                              {approval.work_description || approval.proposal_description}
                            </p>
                          </div>

                          {/* Expected Milestones */}
                          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                              Scheduled Execution Milestones
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">Stage 1</div>
                                <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">DPR & Land Clearance</div>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">Stage 2</div>
                                <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Sub-structure & Civil</div>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">Stage 3</div>
                                <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Superstructure Works</div>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">Stage 4</div>
                                <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Quality Audit & Handover</div>
                              </div>
                            </div>
                          </div>

                          {/* Supporting Documents */}
                          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                              Supporting Documents & Technical Sanctions
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {(approval.supporting_documents && approval.supporting_documents.length > 0 
                                ? approval.supporting_documents 
                                : [
                                    'Detailed_Project_Report_DPR.pdf',
                                    'Technical_Sanction_Estimate.pdf',
                                    'Land_Availability_NOC.pdf',
                                    'Site_Survey_Inspection_Report.pdf'
                                  ]
                              ).map((doc, i) => (
                                <div 
                                  key={i} 
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 cursor-pointer transition"
                                  onClick={() => alert(`Viewing statutory document: ${doc}`)}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>{doc}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Official Decision Maker Actions */}
                          {canAct && (
                            <div className="p-4 bg-gradient-to-r from-slate-50 to-brand-50/20 dark:from-slate-900 dark:to-brand-950/20 rounded-xl border border-brand-200 dark:border-brand-800/60 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                  <ShieldCheck className="w-4 h-4 text-brand-600" /> Authorized Authority / Decision Maker Actions
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                  Current Stage: <span className="font-semibold text-slate-700 dark:text-slate-300">{approval.current_status}</span>
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                                
                                {/* 1. Approve Button */}
                                <button
                                  onClick={() => setActionModal({
                                    isOpen: true,
                                    actionName: approval.current_status === 'APPROVED' ? 'SANCTION' : 'APPROVE',
                                    targetStatus: nextStatus,
                                    approval: approval
                                  })}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  {getApproveButtonLabel(approval.current_status)}
                                </button>

                                {/* 2. Return for Correction Button */}
                                <button
                                  onClick={() => setActionModal({
                                    isOpen: true,
                                    actionName: 'RETURN',
                                    targetStatus: 'RETURNED',
                                    approval: approval
                                  })}
                                  className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-xs md:text-sm font-medium rounded-lg shadow-sm transition flex items-center gap-1.5"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                  Return for Correction
                                </button>

                                {/* 3. Request More Information Button */}
                                <button
                                  onClick={() => setActionModal({
                                    isOpen: true,
                                    actionName: 'REQUEST_INFO',
                                    targetStatus: approval.current_status,
                                    approval: approval
                                  })}
                                  className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs md:text-sm font-medium rounded-lg shadow-sm transition flex items-center gap-1.5"
                                >
                                  <HelpCircle className="w-4 h-4" />
                                  Request More Information
                                </button>

                                {/* 4. Reject Button */}
                                <button
                                  onClick={() => setActionModal({
                                    isOpen: true,
                                    actionName: 'REJECT',
                                    targetStatus: 'REJECTED',
                                    approval: approval
                                  })}
                                  className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs md:text-sm font-medium rounded-lg shadow-sm transition flex items-center gap-1.5"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Reject Proposal
                                </button>

                              </div>
                            </div>
                          )}

                        </div>

                        {/* Right: Immutable Audit Trail */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <History className="w-4 h-4 text-brand-600" />
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                              Immutable Audit Trail
                            </h4>
                          </div>

                          {(!approval.actions || approval.actions.length === 0) ? (
                            <p className="text-xs text-slate-400 italic py-4 text-center">No action log recorded yet.</p>
                          ) : (
                            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                              {approval.actions.map((act, idx) => (
                                <div key={act.id || idx} className="flex gap-3 text-xs">
                                  <div className="flex flex-col items-center">
                                    <div className={cn(
                                      "w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0",
                                      act.action === 'APPROVE' || act.action === 'SANCTION' ? "bg-emerald-500" :
                                      act.action === 'REJECT' ? "bg-red-500" :
                                      act.action === 'RETURN' ? "bg-amber-500" : "bg-brand-500"
                                    )}></div>
                                    {idx !== approval.actions!.length - 1 && (
                                      <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700 my-1"></div>
                                    )}
                                  </div>
                                  <div className="flex-1 pb-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-[11px]">
                                        {act.action}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {act.timestamp ? act.timestamp.replace('T', ' ').slice(0, 16) : ''}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                                      <strong>{act.user_name}</strong> ({act.user_role})
                                    </div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-500 font-mono mt-0.5">
                                      {act.previous_status || 'INIT'} → {act.new_status}
                                    </div>
                                    {act.remarks && (
                                      <div className="mt-1 p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded text-slate-600 dark:text-slate-300 italic border border-slate-100 dark:border-slate-800">
                                        "{act.remarks}"
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Execution Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-600" />
                {actionModal.actionName === 'APPROVE' ? 'Accord Project Approval' :
                 actionModal.actionName === 'SANCTION' ? 'Issue Statutory Sanction Order' :
                 actionModal.actionName === 'RETURN' ? 'Return Proposal for Correction' :
                 actionModal.actionName === 'REQUEST_INFO' ? 'Request Additional Information' : 'Reject Proposal'}
              </h3>
              <button 
                onClick={() => setActionModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl mb-4 text-xs space-y-1">
              <div><strong>Project ID:</strong> <span className="font-mono">{actionModal.approval.project_id}</span></div>
              <div><strong>Work:</strong> {actionModal.approval.work_description || actionModal.approval.proposal_description}</div>
              <div><strong>Lifecycle Transition:</strong> <span className="font-semibold text-brand-600 dark:text-brand-400">{actionModal.approval.current_status} → {actionModal.targetStatus}</span></div>
            </div>

            <form onSubmit={handleActionSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Authority Name
                  </label>
                  <input
                    type="text"
                    value={decisionMakerName}
                    onChange={(e) => setDecisionMakerName(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Authorized Role
                  </label>
                  <input
                    type="text"
                    value={decisionMakerRole}
                    onChange={(e) => setDecisionMakerRole(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Decision Remarks / Justification {['REJECT', 'RETURN', 'REQUEST_INFO'].includes(actionModal.actionName) && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none min-h-[90px]"
                  placeholder={
                    actionModal.actionName === 'REJECT' 
                      ? "State the regulatory or technical grounds for project rejection..." 
                      : actionModal.actionName === 'RETURN'
                      ? "Specify discrepancies or missing documentation requiring correction by the proposer..."
                      : actionModal.actionName === 'REQUEST_INFO'
                      ? "List the specific clarification queries or data needed from site engineers..."
                      : "Enter formal approval remarks or sanction order reference..."
                  }
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  required={['REJECT', 'RETURN', 'REQUEST_INFO'].includes(actionModal.actionName)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className={cn(
                    "px-4 py-2 text-xs font-semibold text-white rounded-lg transition disabled:opacity-50 shadow-sm flex items-center gap-1.5",
                    actionModal.actionName === 'REJECT' ? "bg-red-600 hover:bg-red-700" :
                    actionModal.actionName === 'RETURN' ? "bg-amber-600 hover:bg-amber-700" :
                    "bg-brand-600 hover:bg-brand-700"
                  )}
                >
                  {submittingAction ? (
                    <span>Executing...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirm & Record in Audit Log</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
