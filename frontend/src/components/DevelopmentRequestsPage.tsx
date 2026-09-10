import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users,
  MapPin,
  Camera,
  MessageSquare,
  CheckCircle,
  Clock,
  Layers,
  Search,
  Filter,
  PlusCircle,
  X,
  AlertCircle,
  HelpCircle,
  FileCheck,
  Building2,
  FolderPlus,
  Link as LinkIcon,
  ShieldCheck,
  Compass,
  ArrowRight,
  TrendingUp,
  Send,
  ThumbsUp,
  Flame,
  FileText,
  Award,
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface NearbyProject {
  work_id: string;
  work_description: string;
  sector: string;
  work_status: string;
  sanctioned_amount: number;
  distance_km: number;
}

interface ClusterMember {
  id: number;
  request_id: string;
  citizen_name: string;
  citizen_contact: string | null;
  description: string;
  request_date: string;
  upvotes: number;
  status: string;
}

interface DemandCluster {
  cluster_id: string;
  category: string;
  suggested_title: string;
  location_description: string;
  latitude: number;
  longitude: number;
  petition_count: number;
  total_upvotes: number;
  consensus_score: number;
  status: string;
  estimated_cost: number;
  has_existing_nearby_work: boolean;
  linked_project_id: string | null;
  mp_notice_number: string | null;
  members: ClusterMember[];
}

interface DevelopmentRequest {
  id: number;
  request_id: string;
  category: string;
  location_description: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  photo_path: string | null;
  citizen_name: string | null;
  citizen_contact: string | null;
  request_date: string;
  status: string;
  linked_project_id: string | null;
  similar_request_count: number;
  repeated_demand_signal: string;
  signal_badge: string;
  upvotes?: number;
  mp_notice_number?: string | null;
  mp_recommended_date?: string | null;
  nearby_projects?: NearbyProject[];
  nearby_project_match?: {
    matched: boolean;
    project_id?: string;
    title?: string;
    status?: string;
    distance_km?: number;
    message: string;
  };
  decision_remarks?: string | null;
  decided_by?: string | null;
  decided_date?: string | null;
}

export const DevelopmentRequestsPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'citizen' | 'official'>('citizen');
  const [officialTab, setOfficialTab] = useState<'hotspots' | 'all_petitions'>('hotspots');
  
  // Standard categories specified in SIH requirements
  const categories = ['Road', 'Hospital/Health', 'School', 'Water', 'Drainage', 'Community Facility', 'Other'];

  // Citizen Form State
  const [formCategory, setFormCategory] = useState('Road');
  const [formLocation, setFormLocation] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [submittingCitizen, setSubmittingCitizen] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [feasibilityFeedback, setFeasibilityFeedback] = useState<any | null>(null);

  // Clusters & Official View State
  const [clusters, setClusters] = useState<DemandCluster[]>([]);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [requests, setRequests] = useState<DevelopmentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [catFilter, setCatFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReq, setSelectedReq] = useState<DevelopmentRequest | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<DemandCluster | null>(null);
  const [upvotingId, setUpvotingId] = useState<number | null>(null);

  // Decision Modal State
  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    request: DevelopmentRequest;
    decisionType: 'APPROVE_PROPOSAL' | 'LINK_EXISTING' | 'FEASIBILITY' | 'REJECT';
  } | null>(null);
  const [officialName, setOfficialName] = useState('District Planning Officer');
  const [officialRole, setOfficialRole] = useState('Authorized Authority / Decision Maker');
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [linkProjectId, setLinkProjectId] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchClusters = async () => {
    setLoadingClusters(true);
    try {
      const res = await axios.get('/api/development-requests/clusters');
      setClusters(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load demand clusters:', e);
    } finally {
      setLoadingClusters(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (catFilter !== 'ALL') params.category = catFilter;

      const res = await axios.get('/api/development-requests/', { params });
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load development requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'official') {
      fetchClusters();
      fetchRequests();
    }
  }, [viewMode, statusFilter, catFilter]);

  // Live Statutory Feasibility Check against Para 4.5
  useEffect(() => {
    if (!formDesc || formDesc.trim().length < 5) {
      setFeasibilityFeedback(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await axios.post('/api/development-requests/negative-list-check', {
          description: formDesc,
          category: formCategory
        });
        setFeasibilityFeedback(res.data);
      } catch (e) {
        // Fallback silently if offline
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [formDesc, formCategory]);

  const handleUpvote = async (reqId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setUpvotingId(reqId);
    try {
      await axios.post(`/api/development-requests/${reqId}/upvote`);
      // Refresh both
      fetchRequests();
      fetchClusters();
      setActionNotice(`Endorsement recorded! (+1 Citizen Upvote added to priority score)`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert('Upvote failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUpvotingId(null);
    }
  };

  const handleCitizenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCitizen(true);
    try {
      const res = await axios.post('/api/development-requests/', {
        category: formCategory,
        location_description: formLocation,
        description: formDesc,
        citizen_name: formName.trim() ? formName.trim() : 'Anonymous Citizen',
        citizen_contact: formContact.trim() ? formContact.trim() : undefined,
        latitude: 25.3176 + (Math.random() - 0.5) * 0.04,
        longitude: 82.9739 + (Math.random() - 0.5) * 0.04
      });

      setSubmissionResult(res.data);
    } catch (e: any) {
      console.error('Submission failed:', e);
      alert('Failed to submit request: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSubmittingCitizen(false);
    }
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionModal) return;

    setSubmittingDecision(true);
    try {
      let targetStatus = 'VALIDATED';
      if (decisionModal.decisionType === 'APPROVE_PROPOSAL') targetStatus = 'APPROVED';
      else if (decisionModal.decisionType === 'LINK_EXISTING') targetStatus = 'LINKED_TO_PROJECT';
      else if (decisionModal.decisionType === 'FEASIBILITY') targetStatus = 'FEASIBILITY';
      else if (decisionModal.decisionType === 'REJECT') targetStatus = 'REJECTED';

      const res = await axios.post(`/api/development-requests/${decisionModal.request.id}/decision`, {
        decided_by: officialName,
        user_role: officialRole,
        new_status: targetStatus,
        remarks: decisionRemarks.trim() ? decisionRemarks.trim() : `Decision accorded by ${officialRole}`,
        linked_project_id: decisionModal.decisionType === 'LINK_EXISTING' ? linkProjectId : undefined
      });

      setActionNotice(
        decisionModal.decisionType === 'APPROVE_PROPOSAL' 
          ? `Request #${decisionModal.request.request_id} approved! Created Project Proposal #${res.data.linked_project_id} in Approvals workflow.`
          : `Decision applied to Request #${decisionModal.request.request_id} (${targetStatus})`
      );
      setTimeout(() => setActionNotice(null), 5000);

      setDecisionModal(null);
      setDecisionRemarks('');
      setLinkProjectId('');
      await fetchRequests();
      await fetchClusters();
    } catch (e: any) {
      console.error('Decision failed:', e);
      alert('Failed to record decision: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSubmittingDecision(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'RECOMMENDED_BY_MP':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700"><Award className="w-3 h-3 mr-1 text-amber-600" /> Adopted by Hon'ble MP (Notice Issued)</span>;
      case 'APPROVED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"><CheckCircle className="w-3 h-3 mr-1" /> Approved (Proposal Created)</span>;
      case 'LINKED_TO_PROJECT':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800"><LinkIcon className="w-3 h-3 mr-1" /> Linked to Active Project</span>;
      case 'FEASIBILITY':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800"><Compass className="w-3 h-3 mr-1" /> Feasibility Scrutiny</span>;
      case 'VALIDATED':
      case 'UNDER_REVIEW':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><Clock className="w-3 h-3 mr-1" /> Under Review</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"><X className="w-3 h-3 mr-1" /> Rejected / Ineligible</span>;
      case 'SUBMITTED':
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 border border-sky-200 dark:border-sky-800"><MessageSquare className="w-3 h-3 mr-1" /> Submitted</span>;
    }
  };

  const filteredRequests = requests.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.request_id.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.location_description && r.location_description.toLowerCase().includes(q)) ||
      (r.citizen_name && r.citizen_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header & View Mode Switcher */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Jan Samwaad: Public Requests & Citizen Demands
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
              Unified Citizen & Public Voice
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            One unified portal for citizens to submit infrastructure needs, cluster recurring local demands, and enable Hon'ble MPs to issue official Recommendation Notices.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start md:self-auto">
          <button 
            onClick={() => setViewMode('citizen')}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition",
              viewMode === 'citizen' 
                ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Citizen Demand Portal
          </button>
          <button 
            onClick={() => setViewMode('official')}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition",
              viewMode === 'official' 
                ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Official Decision Cockpit
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs md:text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* =========================================================================
          MODE 1: CITIZEN DEMAND PORTAL (Feature 8)
          ========================================================================= */}
      {viewMode === 'citizen' ? (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            
            {/* Citizen Banner */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white text-center">
              <h3 className="text-2xl font-bold tracking-tight">WHAT DOES YOUR AREA NEED?</h3>
              <p className="text-brand-100 text-xs md:text-sm mt-1.5 max-w-md mx-auto">
                Report missing or required community infrastructure directly to the Member of Parliament and District Planning Cell.
              </p>
            </div>

            {/* Distinction Reminder */}
            <div className="px-6 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>
                <strong>Important:</strong> This module is for <em>missing infrastructure or new facilities</em>. For issues on ongoing projects, please use Citizen Evidence.
              </span>
            </div>

            {submissionResult ? (
              <div className="p-8 text-center space-y-4">
                {submissionResult.status === 'REJECTED' || submissionResult.is_feasible === false ? (
                  <>
                    <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
                      <X className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-rose-600 dark:text-rose-400">
                      Request Ineligible & Rejected
                    </h4>
                    <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 max-w-sm mx-auto text-left text-xs space-y-1.5">
                      <div><strong>Reference ID:</strong> <span className="font-mono font-bold text-rose-700 dark:text-rose-300">{submissionResult.request_id}</span></div>
                      <div><strong>Status:</strong> <span className="font-semibold text-rose-600">REJECTED / INELIGIBLE</span></div>
                      <div className="text-rose-800 dark:text-rose-200 text-[11px] pt-1.5 border-t border-rose-200 dark:border-rose-800 leading-relaxed">
                        <strong>AI Statutory Gate:</strong> {submissionResult.feasibility?.violates_para || 'Para 4.5 Negative List Violation'}
                      </div>
                      <div className="text-rose-700 dark:text-rose-300 text-[10px]">
                        {submissionResult.feasibility?.warning}
                      </div>
                      {submissionResult.feasibility?.suggestion && (
                        <div className="text-slate-600 dark:text-slate-400 text-[10px] italic pt-1 border-t border-rose-100 dark:border-rose-900">
                          Tip: {submissionResult.feasibility.suggestion}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      Development Need Registered!
                    </h4>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 max-w-sm mx-auto text-left text-xs space-y-1.5">
                      <div><strong>Reference ID:</strong> <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{submissionResult.request_id}</span></div>
                      <div><strong>Status:</strong> <span className="font-semibold text-emerald-600">{submissionResult.status}</span></div>
                      <div className="text-slate-500 text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700">
                        Your request has been routed to the District Scrutiny Engine for geospatial clustering and existing project matching.
                      </div>
                    </div>
                  </>
                )}

                <button 
                  onClick={() => {
                    setSubmissionResult(null);
                    setFormDesc('');
                    setFormLocation('');
                    setFormName('');
                    setFormContact('');
                  }} 
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  Submit Another Need
                </button>
              </div>
            ) : (
              <form onSubmit={handleCitizenSubmit} className="p-6 space-y-5 text-xs">
                
                {/* 1. Category Selection */}
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-2">
                    1. Select Infrastructure Category <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormCategory(cat)}
                        className={cn(
                          "px-3.5 py-2 rounded-full text-xs font-medium border transition-colors",
                          formCategory === cat
                            ? "bg-brand-50 dark:bg-brand-900/30 border-brand-500 text-brand-700 dark:text-brand-300 font-semibold shadow-sm"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Location */}
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    2. Location Description (Village / Ward / Landmark) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g., Ward 7, Rampur Village, Near Primary Health Post"
                      value={formLocation}
                      onChange={e => setFormLocation(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* 3. Problem Description */}
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    3. Describe the Problem & Specific Need <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe what is missing, how many residents are affected, and what kind of facility is requested..."
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {/* Live Statutory Pre-Check Feedback (Para 4.5 MPLADS Guidelines) */}
                  {feasibilityFeedback && (
                    <div className="mt-2 animate-in fade-in">
                      {!feasibilityFeedback.is_feasible ? (
                        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-lg text-[11px] text-red-800 dark:text-red-300 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-red-700 dark:text-red-400">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Statutory Guideline Alert: Prohibited Under MPLADS</span>
                          </div>
                          <p>{feasibilityFeedback.warning}</p>
                          {feasibilityFeedback.suggestion && (
                            <p className="text-red-600 dark:text-red-400/90 font-medium">
                              💡 <strong>Compliant Alternative:</strong> {feasibilityFeedback.suggestion}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>{feasibilityFeedback.suggestion}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Optional Photo Upload */}
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    4. Photograph of Ground Reality (Optional)
                  </label>
                  <div 
                    onClick={() => alert("Photo selection dialog: Attach geotagged site photo.")}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
                  >
                    <Camera className="w-6 h-6 mb-1 text-slate-400" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Click to upload photo of site</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">JPEG or PNG under 5MB</span>
                  </div>
                </div>

                {/* 5. Citizen Details (Optional) */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Your Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Chandra"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Contact Phone / Email (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={formContact}
                      onChange={e => setFormContact(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingCitizen}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submittingCitizen ? <span>Registering Need...</span> : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Development Need</span>
                    </>
                  )}
                </button>

              </form>
            )}

          </div>
        </div>
      ) : (

        /* =========================================================================
           MODE 2: OFFICIAL DECISION COCKPIT (Features 9 & 10)
           ========================================================================= */
        <div className="space-y-6">
          
          {/* Sub-View Switcher: Hotspots vs All Petitions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setOfficialTab('hotspots')}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5",
                  officialTab === 'hotspots'
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Flame className="w-3.5 h-3.5 text-amber-200" />
                <span>🔥 High-Demand Hotspots ({clusters.length})</span>
              </button>
              <button
                onClick={() => setOfficialTab('all_petitions')}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5",
                  officialTab === 'all_petitions'
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📋 All Citizen Petitions ({requests.length})</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Spatial radius: <strong>1.5 km</strong> · Consensus scoring enabled</span>
            </div>
          </div>

          {/* TAB 1: HIGH-DEMAND HOTSPOTS (CLUSTERS) */}
          {officialTab === 'hotspots' && (
            <div className="space-y-4">
              {loadingClusters ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-4"></div>
                  <p className="text-xs">Aggregating geographic demand clusters...</p>
                </div>
              ) : clusters.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <Flame className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="font-semibold text-sm">No active demand hotspots found</p>
                  <p className="text-xs mt-0.5">Citizen submissions will appear here once registered.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clusters.map(cluster => {
                    const isAdopted = cluster.status === 'RECOMMENDED_BY_MP' || cluster.mp_notice_number;
                    return (
                      <div
                        key={cluster.cluster_id}
                        className={cn(
                          "bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-sm transition space-y-3 relative overflow-hidden",
                          isAdopted
                            ? "border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10"
                            : cluster.petition_count >= 2
                            ? "border-orange-200 dark:border-orange-800/60"
                            : "border-slate-200 dark:border-slate-800"
                        )}
                      >
                        {/* Top Badge & Metric */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {cluster.category}
                            </span>
                            {isAdopted ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                                <Award className="w-3 h-3 text-amber-600" /> Adopted by MP
                              </span>
                            ) : cluster.petition_count >= 2 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border border-orange-300 flex items-center gap-1">
                                <Flame className="w-3 h-3 text-orange-600" /> Hotspot ({cluster.petition_count} Petitions)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Individual Need
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            <TrendingUp className="w-3 h-3" />
                            <span>{cluster.consensus_score}% Consensus</span>
                          </div>
                        </div>

                        {/* Title & Location */}
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                            {cluster.suggested_title}
                          </h4>
                          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs mt-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{cluster.location_description} ({cluster.latitude.toFixed(4)}, {cluster.longitude.toFixed(4)})</span>
                          </div>
                        </div>

                        {/* Estimated SOR Envelope & Upvotes */}
                        <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Est. Budget Envelope:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              ₹{(cluster.estimated_cost / 100000).toFixed(1)} Lakh (SOR)
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Community Endorsements:</span>
                            <span className="font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" /> {cluster.total_upvotes} Upvotes
                            </span>
                          </div>
                        </div>

                        {/* Official Notice Info if Adopted */}
                        {cluster.mp_notice_number && (
                          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-xs space-y-1">
                            <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center justify-between">
                              <span>Official MP Recommendation Notice:</span>
                              <span className="font-mono text-[11px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-amber-300">
                                {cluster.mp_notice_number}
                              </span>
                            </div>
                            {cluster.linked_project_id && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                Transmitted to DC · Project ID: <span className="font-mono font-semibold text-brand-600">{cluster.linked_project_id}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Underlying Petitions Snippets */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                            Underlying Citizen Petitions ({cluster.members.length}):
                          </span>
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {cluster.members.map(m => (
                              <div
                                key={m.id}
                                className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200/60 dark:border-slate-700/60 text-[11px] flex justify-between items-start gap-2"
                              >
                                <div className="space-y-0.5">
                                  <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                                    "{m.description}"
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    By {m.citizen_name} · Ref: <span className="font-mono">{m.request_id}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => handleUpvote(m.id, e)}
                                  disabled={upvotingId === m.id}
                                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 flex items-center gap-1 shrink-0"
                                  title="Endorse this petition"
                                >
                                  <ThumbsUp className="w-2.5 h-2.5" />
                                  <span>+{m.upvotes}</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALL CITIZEN PETITIONS */}
          {officialTab === 'all_petitions' && (
            <>
              {/* Filters Bar */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" /> Stage:
                  </span>
                  {['ALL', 'SUBMITTED', 'FEASIBILITY', 'LINKED_TO_PROJECT', 'APPROVED', 'REJECTED'].map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-medium transition",
                        statusFilter === st
                          ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-semibold border border-brand-200 dark:border-brand-700"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search requests, locations, needs..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Main Grid: Requests List (2 cols) & Demand Clustering / Project Matching Inspector (1 col) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left 2 Cols: Requests Cards */}
                <div className="lg:col-span-2 space-y-4">
                  {loading ? (
                    <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4"></div>
                      <p className="text-xs">Loading public requests...</p>
                    </div>
                  ) : filteredRequests.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold text-sm">No development requests in this queue</p>
                      <p className="text-xs mt-0.5">Try adjusting status filters.</p>
                    </div>
                  ) : (
                    filteredRequests.map(req => {
                      const isSelected = selectedReq?.id === req.id;
                      return (
                        <div 
                          key={req.id}
                          onClick={() => setSelectedReq(req)}
                          className={cn(
                            "bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4 transition cursor-pointer hover:border-brand-400 dark:hover:border-brand-600",
                            isSelected 
                              ? "border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/10 dark:bg-brand-950/10" 
                              : "border-slate-200 dark:border-slate-800"
                          )}
                        >
                          {/* Top Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">{req.request_id}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {req.category}
                              </span>
                              {getStatusBadge(req.status)}
                            </div>
                            
                            {/* Upvote Button */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => handleUpvote(req.id, e)}
                                disabled={upvotingId === req.id}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-slate-700 dark:text-slate-300 hover:text-brand-600 font-semibold text-[11px] border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition"
                                title="Endorse this public demand"
                              >
                                <ThumbsUp className="w-3 h-3 text-brand-500" />
                                <span>{req.upvotes || 1} Endorsements</span>
                              </button>
                              <span className="text-[11px] text-slate-400">{req.request_date}</span>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-medium mb-3 leading-relaxed">
                            {req.description}
                          </p>

                          {/* AI Statutory Rejection / Ineligibility Notice */}
                          {req.status === 'REJECTED' && req.decision_remarks && (
                            <div className="mb-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg text-[11px] text-rose-800 dark:text-rose-300 space-y-1">
                              <div className="font-bold flex items-center gap-1.5 text-rose-900 dark:text-rose-200">
                                <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>Statutory Ineligibility (Para 4.5 MPLADS Guidelines 2016)</span>
                              </div>
                              <p className="text-[10px] text-rose-700 dark:text-rose-400 leading-relaxed">
                                {req.decision_remarks}
                              </p>
                              {req.decided_by && (
                                <div className="text-[9px] text-rose-500 dark:text-rose-400/80 pt-0.5">
                                  Flagged by: {req.decided_by}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Official MP Notice link if present */}
                          {req.mp_notice_number && (
                            <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Adopted under Official MP Recommendation Notice: <strong>{req.mp_notice_number}</strong></span>
                            </div>
                          )}

                          {/* Feature 9: AI Demand Signal Warning */}
                          <div className="mb-3">
                            {req.signal_badge === 'HIGH_DEMAND' ? (
                              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                                <TrendingUp className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                <span>{req.repeated_demand_signal}</span>
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <MessageSquare className="w-3 h-3 text-slate-400" />
                                <span>{req.repeated_demand_signal}</span>
                              </div>
                            )}
                          </div>

                          {/* Feature 10: Existing Project Match Notice */}
                          {req.nearby_project_match && (
                            <div className="mb-3">
                              {req.nearby_project_match.matched ? (
                                <div className="p-2.5 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 rounded-lg text-[11px] text-sky-800 dark:text-sky-300 space-y-1">
                                  <div className="font-semibold flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-sky-600" />
                                    <span>Related Active Project Found Nearby ({req.nearby_project_match.distance_km} km away):</span>
                                  </div>
                                  <p className="text-slate-600 dark:text-slate-400 text-[10px] line-clamp-1">
                                    {req.nearby_project_match.title}
                                  </p>
                                </div>
                              ) : (
                                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                                  <span>{req.nearby_project_match.message}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Footer Actions */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                            <div className="flex items-center gap-1 text-slate-500">
                              <MapPin className="w-3 h-3" />
                              <span>{req.location_description || 'District Center'}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {req.status === 'SUBMITTED' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDecisionModal({ isOpen: true, request: req, decisionType: 'APPROVE_PROPOSAL' });
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-sm transition flex items-center gap-1"
                                  >
                                    <FolderPlus className="w-3 h-3" />
                                    Approve → Proposal
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDecisionModal({ isOpen: true, request: req, decisionType: 'LINK_EXISTING' });
                                    }}
                                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-[11px] font-medium rounded-md transition flex items-center gap-1"
                                  >
                                    <LinkIcon className="w-3 h-3" />
                                    Link to Work
                                  </button>
                                </>
                              )}

                              {req.linked_project_id && (
                                <span className="font-mono text-[10px] text-brand-600 dark:text-brand-400 font-semibold">
                                  Linked: {req.linked_project_id}
                                </span>
                              )}
                            </div>
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>

            {/* Right Col: Intelligent Demand Hotspots & Project Match Inspector */}
            <div className="space-y-4 text-xs">
              
              {/* Hotspots Card */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                  <Layers className="w-4 h-4 text-brand-600" />
                  <span>Geospatial Need Hotspots (AI Clustered)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Algorithmic clustering groups recurring public demands to guide MP sanction prioritization:
                </p>

                <div className="space-y-2">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800/40">
                    <div className="flex justify-between items-center font-semibold text-amber-900 dark:text-amber-300">
                      <span>Road & Connectivity Gap</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900/60">8 Demands</span>
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                      Cluster located in Block 4 rural approaches. No sanction recorded since FY2023.
                    </p>
                  </div>

                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800/40">
                    <div className="flex justify-between items-center font-semibold text-blue-900 dark:text-blue-300">
                      <span>Drinking Water Pipeline Extension</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-200 dark:bg-blue-900/60">5 Demands</span>
                    </div>
                    <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                      Sub-center settlements reporting dry ground wells during summer.
                    </p>
                  </div>
                </div>
              </div>

              {/* Inspector Card for Selected Request */}
              {selectedReq ? (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-brand-200 dark:border-brand-800/60 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Selected Request Inspection</span>
                    <span className="font-mono text-[11px] text-brand-600">{selectedReq.request_id}</span>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div><strong>Citizen:</strong> {selectedReq.citizen_name || 'Anonymous Resident'}</div>
                    <div><strong>Location:</strong> {selectedReq.location_description}</div>
                    <div><strong>Category:</strong> {selectedReq.category}</div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded text-slate-600 dark:text-slate-300 italic">
                      "{selectedReq.description}"
                    </div>
                  </div>

                  {/* Nearby Projects List */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">
                      Existing Projects in Proximity:
                    </span>
                    {(!selectedReq.nearby_projects || selectedReq.nearby_projects.length === 0) ? (
                      <p className="text-slate-400 italic">No existing works found within 3 km.</p>
                    ) : (
                      selectedReq.nearby_projects.slice(0, 3).map((prj, i) => (
                        <div key={i} className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 text-[10px] space-y-0.5">
                          <div className="font-mono font-semibold text-brand-600">{prj.work_id}</div>
                          <div className="text-slate-700 dark:text-slate-300 truncate">{prj.work_description}</div>
                          <div className="flex justify-between text-slate-400 pt-0.5">
                            <span>Status: {prj.work_status}</span>
                            <span>{prj.distance_km} km</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              ) : (
                <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-400">
                  <Compass className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p>Click any request to inspect spatial proximity and nearby projects.</p>
                </div>
              )}

            </div>

          </div>
            </>
          )}

        </div>
      )}

      {/* Decision Execution Modal */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-600" />
                {decisionModal.decisionType === 'APPROVE_PROPOSAL' ? 'Convert to Project Proposal' :
                 decisionModal.decisionType === 'LINK_EXISTING' ? 'Link Request to Existing Project' :
                 decisionModal.decisionType === 'FEASIBILITY' ? 'Forward for Feasibility Scrutiny' : 'Reject Public Request'}
              </h4>
              <button 
                onClick={() => setDecisionModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl mb-4 text-xs space-y-1">
              <div><strong>Request ID:</strong> <span className="font-mono">{decisionModal.request.request_id}</span></div>
              <div><strong>Category:</strong> {decisionModal.request.category}</div>
              <div className="text-slate-600 dark:text-slate-400 truncate">"{decisionModal.request.description}"</div>
            </div>

            <form onSubmit={handleDecisionSubmit} className="space-y-3.5 text-xs">
              
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Acting Official Name
                  </label>
                  <input
                    type="text"
                    value={officialName}
                    onChange={e => setOfficialName(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Official Role
                  </label>
                  <input
                    type="text"
                    value={officialRole}
                    onChange={e => setOfficialRole(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {decisionModal.decisionType === 'LINK_EXISTING' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Project ID to Link <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. WS/MP498/2024-2025/133447"
                    value={linkProjectId}
                    onChange={e => setLinkProjectId(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {decisionModal.request.nearby_projects && decisionModal.request.nearby_projects.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="text-[10px] text-slate-400">Nearby suggestions:</span>
                      {decisionModal.request.nearby_projects.slice(0, 2).map(p => (
                        <button
                          key={p.work_id}
                          type="button"
                          onClick={() => setLinkProjectId(p.work_id)}
                          className="font-mono text-[10px] text-brand-600 hover:underline"
                        >
                          {p.work_id}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Decision Remarks / Administrative Justification
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none min-h-[75px]"
                  placeholder={
                    decisionModal.decisionType === 'APPROVE_PROPOSAL'
                      ? "State reasons for sanctioning a new project proposal against this citizen demand..."
                      : decisionModal.decisionType === 'LINK_EXISTING'
                      ? "Specify how the existing project scope addresses this citizen request..."
                      : "Enter technical or feasibility notes..."
                  }
                  value={decisionRemarks}
                  onChange={e => setDecisionRemarks(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDecisionModal(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDecision}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition shadow-sm",
                    decisionModal.decisionType === 'REJECT' ? "bg-red-600 hover:bg-red-700" :
                    decisionModal.decisionType === 'APPROVE_PROPOSAL' ? "bg-emerald-600 hover:bg-emerald-700" :
                    "bg-brand-600 hover:bg-brand-700"
                  )}
                >
                  {submittingDecision ? 'Executing...' : 'Confirm Decision'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
