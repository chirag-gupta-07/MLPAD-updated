import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Landmark, Plus, CheckCircle2, Clock, MapPin, IndianRupee,
  FileCheck, AlertCircle, ArrowUpRight, TrendingUp, Users, Send, X,
  Flame, Award, FileText, Sparkles, Check, ChevronRight, ThumbsUp
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
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

export const MpDashboard: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    sector: 'Drinking Water & Sanitation',
    estimated_cost: 1500000,
    description: 'Installation of high-capacity RO drinking water facility and pipe network.',
    district: 'Varanasi',
    state: 'Uttar Pradesh',
    constituency: 'Varanasi Lok Sabha'
  });

  const [recommendedWorks, setRecommendedWorks] = useState<any[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);

  // Jan Samwaad Hotspots State
  const [clusters, setClusters] = useState<DemandCluster[]>([]);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [adoptingCluster, setAdoptingCluster] = useState<DemandCluster | null>(null);
  const [customNoticeTitle, setCustomNoticeTitle] = useState('');
  const [customNoticeCost, setCustomNoticeCost] = useState(1500000);
  const [customNoticeMemo, setCustomNoticeMemo] = useState('');
  const [submittingNotice, setSubmittingNotice] = useState(false);
  const [noticeResult, setNoticeResult] = useState<any | null>(null);

  const fetchProposals = async () => {
    setLoadingProposals(true);
    try {
      const token = localStorage.getItem('mplads_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get('/api/works/mp-proposals', { headers });
      if (Array.isArray(res.data)) {
        setRecommendedWorks(res.data);
      }
    } catch (e) {
      console.error('Failed to load MP proposals:', e);
    } finally {
      setLoadingProposals(false);
    }
  };

  const fetchClusters = async () => {
    setLoadingClusters(true);
    try {
      const res = await axios.get('/api/development-requests/clusters');
      if (Array.isArray(res.data)) {
        setClusters(res.data);
      }
    } catch (e) {
      console.error('Failed to load clusters:', e);
    } finally {
      setLoadingClusters(false);
    }
  };

  useEffect(() => {
    fetchProposals();
    fetchClusters();
  }, []);

  const totalRecommended = recommendedWorks.reduce((acc, curr) => acc + (curr.cost || 0), 0);
  const totalSanctioned = recommendedWorks
    .filter(w => ['SANCTIONED', 'TENDER_PUBLISHED', 'EVALUATING', 'AWARDED', 'IN_PROGRESS', 'COMPLETED'].includes(w.status))
    .reduce((acc, curr) => acc + (curr.cost || 0), 0);
  const annualAllocation = 50000000; // ₹5.00 Crore statutory
  const unspentPurse = Math.max(0, annualAllocation - totalRecommended);

  const handleRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('mplads_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post('/api/works/recommend', formData, { headers });
      setSuccessMsg(res.data.message);
      fetchProposals();
      setTimeout(() => {
        setShowModal(false);
        setSuccessMsg(null);
      }, 1500);
    } catch (e: any) {
      alert('Recommendation failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenNoticeModal = (cl: DemandCluster) => {
    setAdoptingCluster(cl);
    setCustomNoticeTitle(cl.suggested_title);
    setCustomNoticeCost(cl.estimated_cost);
    setCustomNoticeMemo(
      `Pursuant to Para 4.1 of the MPLADS Guidelines 2016 and following verified community demand (${cl.petition_count} citizen representations with ${cl.consensus_score}% consensus), ` +
      `I hereby recommend the execution of "${cl.suggested_title}" at ${cl.location_description}. ` +
      `The District Authority is requested to accord administrative & technical sanction within statutory 75 days.`
    );
    setNoticeResult(null);
  };

  const handleDispatchNotice = async () => {
    if (!adoptingCluster) return;
    setSubmittingNotice(true);
    try {
      const token = localStorage.getItem('mplads_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        `/api/development-requests/clusters/${adoptingCluster.cluster_id}/recommend-by-mp`,
        {
          title: customNoticeTitle,
          estimated_cost: customNoticeCost,
          official_notice_memo: customNoticeMemo,
          district: 'Varanasi',
          constituency: 'Varanasi Lok Sabha',
          state: 'Uttar Pradesh',
          sector: adoptingCluster.category
        },
        { headers }
      );
      setNoticeResult(res.data);
      fetchProposals();
      fetchClusters();
    } catch (e: any) {
      alert('Failed to issue MP Notice: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSubmittingNotice(false);
    }
  };

  const formatLakhs = (amt: number) => {
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} Lakh`;
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      {/* MP Constituency Profile Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Landmark className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h1 className="text-xl font-bold">Constituency Development Command</h1>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30">
                18th LOK SABHA
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Hon'ble Member of Parliament · Varanasi Constituency, Uttar Pradesh
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-colors flex items-center space-x-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Recommend New Work to DC</span>
        </button>
      </div>

      {/* Annual ₹5 Crore Purse Hierarchy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Annual Entitlement</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">₹5.00 Cr</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">Statutory Annual Allocation</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Recommended</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{formatLakhs(totalRecommended)}</span>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-2 block">
            {((totalRecommended / annualAllocation) * 100).toFixed(1)}% of Total Quota
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sanctioned by Collector</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatLakhs(totalSanctioned)}</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">Tenders Issued & Ground Execution</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 shadow-sm">
          <span className="text-xs text-amber-800 dark:text-amber-400 font-bold">Unspent Purse Balance</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-300">{formatLakhs(unspentPurse)}</span>
          </div>
          <span className="text-[11px] text-amber-800 dark:text-amber-400 mt-2 block">Available for New Recommendations</span>
        </div>
      </div>

      {/* Jan Samwaad: Clustered Citizen Demands & Hotspots */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <span>Jan Samwaad: Clustered Citizen Demands</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                Para 4.1 Recommendation Queue
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Geospatially clustered petitions across Varanasi. Review community consensus and adopt directly into an official MP Recommendation Notice.
            </p>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            {loadingClusters ? (
              <span className="text-amber-500 animate-pulse">Clustering demands...</span>
            ) : (
              <span className="font-semibold text-slate-600 dark:text-slate-400">{clusters.length} Active Hotspots</span>
            )}
          </div>
        </div>

        {clusters.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No citizen demand hotspots registered yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {clusters.slice(0, 6).map(cl => {
              const isAdopted = cl.status === 'RECOMMENDED_BY_MP' || cl.mp_notice_number;
              return (
                <div
                  key={cl.cluster_id}
                  className={cn(
                    "rounded-xl border p-4 space-y-3 transition flex flex-col justify-between",
                    isAdopted
                      ? "bg-amber-50/30 dark:bg-amber-950/10 border-amber-300 dark:border-amber-800"
                      : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <span className="px-2 py-0.5 rounded font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        {cl.category}
                      </span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {cl.consensus_score}% Consensus
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                      {cl.suggested_title}
                    </h4>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{cl.location_description}</span>
                    </div>

                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Citizen Petitions:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{cl.petition_count} Representations</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Upvotes / Backers:</span>
                        <span className="font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                          <ThumbsUp className="w-2.5 h-2.5" /> {cl.total_upvotes}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400">Est. SOR Budget:</span>
                        <span className="font-bold font-mono text-slate-900 dark:text-white">
                          ₹{(cl.estimated_cost / 100000).toFixed(1)} L
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    {isAdopted ? (
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg border border-amber-300 text-[11px] font-bold text-amber-900 dark:text-amber-200 text-center flex items-center justify-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        <span>Adopted · {cl.mp_notice_number || 'Notice Dispatched'}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenNoticeModal(cl)}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-sm transition flex items-center justify-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Adopt & Issue Recommendation Notice</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recommendations Tracker Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Constituency Work Recommendations</h3>
            <p className="text-xs text-slate-500">Official proposals submitted to District Magistrate & Nodal Officer</p>
          </div>
          <div className="flex items-center space-x-2">
            {loadingProposals && <span className="text-xs text-amber-500 animate-pulse">Refreshing...</span>}
            <span className="text-xs font-semibold text-slate-500">{recommendedWorks.length} Proposals Logged</span>
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
              <th className="p-3">Reference ID</th>
              <th className="p-3">Project Title</th>
              <th className="p-3">Sector</th>
              <th className="p-3">Proposed Cost</th>
              <th className="p-3">Current Administrative Stage</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {recommendedWorks.map((rw) => (
              <tr key={rw.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="p-3 font-mono font-medium text-amber-600 dark:text-amber-400">{rw.id}</td>
                <td className="p-3 font-semibold text-slate-900 dark:text-white">{rw.title}</td>
                <td className="p-3 text-slate-500">{rw.sector}</td>
                <td className="p-3 font-bold font-mono text-slate-900 dark:text-white">{formatLakhs(rw.cost)}</td>
                <td className="p-3">
                  <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{rw.stage}</span>
                  </div>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    rw.status === 'SANCTIONED'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                      : rw.status === 'IN_PROGRESS'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : rw.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : rw.status === 'TENDER_PUBLISHED'
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {rw.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recommend Work Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Landmark className="w-5 h-5 text-amber-500" />
                <span>Submit Work Recommendation to DC</span>
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {successMsg ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Recommendation Submitted!</h3>
                <p className="text-xs text-slate-500">{successMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleRecommend} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Project Title / Asset Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Construction of Community Hall in Ward 14"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Development Sector</label>
                    <select
                      value={formData.sector}
                      onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option>Drinking Water & Sanitation</option>
                      <option>Roads & Pathways</option>
                      <option>Education & Schools</option>
                      <option>Healthcare & Clinics</option>
                      <option>Renewable Energy / Solar</option>
                      <option>Community Infrastructure</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Recommended Cost (₹)</label>
                    <input
                      type="number"
                      required
                      value={formData.estimated_cost}
                      onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Justification & Public Benefit</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-300 text-[11px]">
                  Per Section 3.1 of MPLADS Guidelines, MPs submit proposals to the District Collector. The DC conducts technical scrutiny and awards tenders.
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-bold shadow-sm flex items-center space-x-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Submitting to DC...' : 'Submit Recommendation'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Official MP Recommendation Notice Letterhead Modal */}
      {adoptingCluster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-2xl w-full rounded-2xl border border-amber-300 dark:border-amber-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Parliament Emblem Letterhead Header */}
            <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 border border-white/30">
                  <Landmark className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-amber-200 font-bold">
                    Parliament of India · Lok Sabha
                  </div>
                  <h3 className="text-base font-bold">
                    Official Recommendation Notice (Para 4.1)
                  </h3>
                  <div className="text-xs text-amber-100">
                    MPLAD Scheme · Hon'ble Member of Parliament, Varanasi
                  </div>
                </div>
              </div>

              <button
                onClick={() => setAdoptingCluster(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notice Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-800 dark:text-slate-200">
              {noticeResult ? (
                <div className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Recommendation Notice Dispatched!
                  </h4>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 max-w-md mx-auto text-left text-xs space-y-2">
                    <div><strong>Official Notice No:</strong> <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{noticeResult.notice_number}</span></div>
                    <div><strong>Project Proposal ID:</strong> <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{noticeResult.work_id}</span></div>
                    <div><strong>Citizen Petitions Adopted:</strong> <span className="font-semibold text-slate-700 dark:text-slate-300">{noticeResult.petitions_adopted} Representations</span></div>
                    <div className="text-slate-500 text-[11px] pt-2 border-t border-slate-200 dark:border-slate-700">
                      Proposal has been formally transmitted to the <strong>District Collector & District Magistrate (Approvals inbox)</strong> for technical scrutiny and sanction within 75 days.
                    </div>
                  </div>

                  <button
                    onClick={() => setAdoptingCluster(null)}
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition shadow-md"
                  >
                    Done & Return to Dashboard
                  </button>
                </div>
              ) : (
                <>
                  {/* Formal Letterhead Metadata */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px]">
                    <div>
                      <span className="text-slate-400 block font-medium">To:</span>
                      <strong className="text-slate-900 dark:text-slate-100">The District Magistrate & District Authority</strong>
                      <span className="text-slate-500 block">District Planning & MPLADS Cell, Varanasi, U.P.</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Statutory Clause:</span>
                      <strong className="text-amber-600 dark:text-amber-400">MPLADS Guidelines 2016 — Para 4.1</strong>
                      <span className="text-slate-500 block">75-Day Mandatory Sanction Window</span>
                    </div>
                  </div>

                  {/* Editable Proposed Title */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Formal Work Title (to be entered into Government Gazette / Sanction Register)
                    </label>
                    <input
                      type="text"
                      value={customNoticeTitle}
                      onChange={e => setCustomNoticeTitle(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Budget & Sector */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Recommended Cost (₹ INR)
                      </label>
                      <input
                        type="number"
                        value={customNoticeCost}
                        onChange={e => setCustomNoticeCost(parseFloat(e.target.value) || 0)}
                        required
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono font-bold text-slate-900 dark:text-white"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Schedule of Rates (SOR) benchmark: ₹{(adoptingCluster.estimated_cost / 100000).toFixed(1)} L
                      </span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Constituency & Category
                      </label>
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 font-medium">
                        {adoptingCluster.category} · Varanasi Lok Sabha
                      </div>
                    </div>
                  </div>

                  {/* Citizen Backing Citation Box */}
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-amber-600" />
                        <span>Public Demand Justification ({adoptingCluster.petition_count} Petitions · {adoptingCluster.consensus_score}% Consensus)</span>
                      </span>
                      <span className="font-bold text-brand-600 dark:text-brand-400">
                        {adoptingCluster.total_upvotes} Citizen Endorsements
                      </span>
                    </div>
                    
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {adoptingCluster.members.map((m, idx) => (
                        <div key={idx} className="text-[10px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <ChevronRight className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          <span className="truncate font-medium">"{m.description}"</span>
                          <span className="text-slate-400 shrink-0">— {m.citizen_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Formal Official Memo Text */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Official Recommendation Letter Memo
                    </label>
                    <textarea
                      rows={4}
                      value={customNoticeMemo}
                      onChange={e => setCustomNoticeMemo(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white leading-relaxed text-xs"
                    />
                  </div>

                  {/* Dispatch Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAdoptingCluster(null)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleDispatchNotice}
                      disabled={submittingNotice}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl shadow-lg transition flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{submittingNotice ? 'Dispatching to District Collector...' : 'Issue & Dispatch Official Notice to DC'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
