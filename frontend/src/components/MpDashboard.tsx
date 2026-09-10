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
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* 1. MP Constituency Profile Banner (Refined Dark Navy Banner ~120-140px) */}
      <div className="bg-[#0B1F3A] text-white rounded-xl p-6 border border-[#1558A6]/40 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-lg bg-white/5 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Landmark className="w-7 h-7 text-[#F28C28]" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5 mb-1">
              <h1 className="text-xl font-bold font-sans tracking-tight text-white">
                Constituency Development Command
              </h1>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/40 uppercase tracking-wide">
                18th LOK SABHA
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Hon'ble Member of Parliament · Varanasi Constituency, Uttar Pradesh
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-[#F28C28] hover:bg-[#d9771e] text-slate-950 font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center space-x-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Recommend New Work to DC</span>
        </button>
      </div>

      {/* 2. Annual ₹5 Crore Purse Hierarchy (4-Tier Government Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Annual Entitlement */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-[#D9E0E8] dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs text-[#5F6F82] dark:text-slate-400 font-medium">Annual Entitlement</span>
            <div className="text-2xl font-black text-[#0B1F3A] dark:text-white font-sans mt-1">
              ₹5.00 Cr
            </div>
          </div>
          <span className="text-[11px] text-[#5F6F82] dark:text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 block">
            Statutory Annual Allocation
          </span>
        </div>

        {/* Card 2: Total Recommended */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-[#D9E0E8] dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs text-[#5F6F82] dark:text-slate-400 font-medium">Total Recommended</span>
            <div className="text-2xl font-black text-[#1558A6] dark:text-blue-400 font-sans mt-1">
              {formatLakhs(totalRecommended)}
            </div>
          </div>
          <span className="text-[11px] text-[#138A5B] dark:text-emerald-400 font-semibold mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 block">
            {((totalRecommended / annualAllocation) * 100).toFixed(1)}% of Total Quota
          </span>
        </div>

        {/* Card 3: Sanctioned by Collector */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-[#D9E0E8] dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs text-[#5F6F82] dark:text-slate-400 font-medium">Sanctioned by Collector</span>
            <div className="text-2xl font-black text-[#138A5B] dark:text-emerald-400 font-sans mt-1">
              {formatLakhs(totalSanctioned)}
            </div>
          </div>
          <span className="text-[11px] text-[#5F6F82] dark:text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 block">
            Tenders Issued & Ground Execution
          </span>
        </div>

        {/* Card 4: Unspent Purse Balance */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-[#F28C28]/40 dark:border-amber-900/60 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs text-[#d9771e] dark:text-amber-400 font-bold">Unspent Purse Balance</span>
            <div className="text-2xl font-black text-[#d9771e] dark:text-amber-300 font-sans mt-1">
              {formatLakhs(unspentPurse)}
            </div>
          </div>
          <span className="text-[11px] text-[#d9771e] dark:text-amber-400 mt-3 pt-2 border-t border-amber-100 dark:border-amber-950/40 block">
            Available for New Recommendations
          </span>
        </div>
      </div>

      {/* 3. Jan Samwaad: Clustered Citizen Demands & Hotspots */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-[#D9E0E8] dark:border-slate-800 shadow-xs space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9E0E8] dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-[#0B1F3A] dark:text-white flex items-center gap-2 font-sans">
                <Flame className="w-4 h-4 text-[#F28C28]" />
                <span>Jan Samwaad: Clustered Citizen Demands</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Para 4.1 Recommendation Queue
              </span>
            </div>
            <p className="text-xs text-[#5F6F82] dark:text-slate-400 mt-0.5">
              Geospatially clustered petitions across Varanasi. Review community consensus and adopt directly into an official MP Recommendation Notice.
            </p>
          </div>

          <div className="text-xs text-[#5F6F82] dark:text-slate-400 flex items-center gap-2">
            {loadingClusters ? (
              <span className="text-amber-600 animate-pulse">Clustering demands...</span>
            ) : (
              <span className="font-semibold text-[#0B1F3A] dark:text-slate-300 font-mono">{clusters.length} Active Hotspots</span>
            )}
          </div>
        </div>

        {clusters.length === 0 ? (
          <div className="p-8 text-center text-[#5F6F82] text-xs">
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
                    "rounded-lg border p-4 space-y-3 transition flex flex-col justify-between shadow-2xs",
                    isAdopted
                      ? "bg-amber-50/20 dark:bg-amber-950/10 border-amber-300 dark:border-amber-800"
                      : "bg-white dark:bg-slate-850 border-[#D9E0E8] dark:border-slate-700 hover:border-[#1558A6]"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <span className="px-2 py-0.5 rounded font-semibold bg-[#F5F7FA] dark:bg-slate-800 border border-[#D9E0E8] dark:border-slate-700 text-[#0B1F3A] dark:text-slate-200">
                        {cl.category}
                      </span>
                      <span className="font-bold text-[#d9771e] dark:text-amber-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {cl.consensus_score}% Consensus
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[#0B1F3A] dark:text-white line-clamp-2">
                      {cl.suggested_title}
                    </h4>

                    <div className="flex items-center gap-1 text-[11px] text-[#5F6F82] dark:text-slate-400">
                      <MapPin className="w-3 h-3 text-[#5F6F82] shrink-0" />
                      <span className="truncate">{cl.location_description}</span>
                    </div>

                    <div className="p-2.5 bg-[#F5F7FA] dark:bg-slate-900 rounded border border-[#D9E0E8] dark:border-slate-800 text-[11px] space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#5F6F82] dark:text-slate-400">Citizen Petitions:</span>
                        <span className="font-bold text-[#0B1F3A] dark:text-slate-200">{cl.petition_count} Representations</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5F6F82] dark:text-slate-400">Upvotes / Backers:</span>
                        <span className="font-bold text-[#138A5B] dark:text-emerald-400 flex items-center gap-1">
                          <ThumbsUp className="w-2.5 h-2.5" /> {cl.total_upvotes}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-[#D9E0E8] dark:border-slate-800">
                        <span className="text-[#5F6F82] dark:text-slate-400">Est. SOR Budget:</span>
                        <span className="font-bold font-mono text-[#0B1F3A] dark:text-white">
                          ₹{(cl.estimated_cost / 100000).toFixed(1)} L
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    {isAdopted ? (
                      <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-300 dark:border-amber-800 text-[11px] font-bold text-[#d9771e] dark:text-amber-300 text-center flex items-center justify-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-[#d9771e]" />
                        <span>Adopted · {cl.mp_notice_number || 'Notice Dispatched'}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenNoticeModal(cl)}
                        className="w-full py-2 bg-[#F28C28] hover:bg-[#d9771e] text-slate-950 font-bold rounded text-xs shadow-2xs transition flex items-center justify-center gap-1.5"
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

      {/* 4. Recommendations Tracker Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-[#D9E0E8] dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#D9E0E8] dark:border-slate-800 bg-[#F5F7FA] dark:bg-slate-850 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-[#0B1F3A] dark:text-white font-sans">
              Constituency Work Recommendations
            </h3>
            <p className="text-xs text-[#5F6F82] dark:text-slate-400 mt-0.5">
              Official proposals submitted to District Magistrate & Nodal Officer
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {loadingProposals && <span className="text-xs text-[#1558A6] animate-pulse">Refreshing...</span>}
            <span className="text-xs font-mono font-semibold text-[#0B1F3A] dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded border border-[#D9E0E8] dark:border-slate-700">
              {recommendedWorks.length} Proposals Logged
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F5F7FA] dark:bg-slate-850 text-[#0B1F3A] dark:text-slate-200 font-bold uppercase tracking-wider border-b border-[#D9E0E8] dark:border-slate-700 text-[11px]">
                <th className="p-3">Reference ID</th>
                <th className="p-3">Project Title</th>
                <th className="p-3">Sector</th>
                <th className="p-3">Proposed Cost</th>
                <th className="p-3">Current Administrative Stage</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E0E8] dark:divide-slate-800">
              {recommendedWorks.map((rw) => (
                <tr key={rw.id} className="hover:bg-[#F5F7FA]/70 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 font-mono font-semibold text-[#1558A6] dark:text-blue-400">{rw.id}</td>
                  <td className="p-3 font-semibold text-[#0B1F3A] dark:text-white">{rw.title}</td>
                  <td className="p-3 text-[#5F6F82] dark:text-slate-400">{rw.sector}</td>
                  <td className="p-3 font-bold font-mono text-[#0B1F3A] dark:text-white">{formatLakhs(rw.cost)}</td>
                  <td className="p-3">
                    <div className="flex items-center space-x-1.5 text-[#0B1F3A] dark:text-slate-300 font-medium">
                      <Clock className="w-3.5 h-3.5 text-[#1558A6]" />
                      <span>{rw.stage}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border ${
                      rw.status === 'SANCTIONED'
                        ? 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                        : rw.status === 'IN_PROGRESS'
                        ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                        : rw.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                        : rw.status === 'TENDER_PUBLISHED'
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {rw.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommend Work Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-lg border border-[#D9E0E8] dark:border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#D9E0E8] dark:border-slate-800 pb-3">
              <h2 className="font-bold text-sm sm:text-base text-[#0B1F3A] dark:text-white flex items-center space-x-2 font-sans">
                <Landmark className="w-5 h-5 text-[#F28C28]" />
                <span>Submit Work Recommendation to DC</span>
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[#5F6F82] hover:text-[#0B1F3A] dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {successMsg ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-[#138A5B] mx-auto" />
                <h3 className="font-bold text-base text-[#0B1F3A] dark:text-white">Recommendation Submitted!</h3>
                <p className="text-xs text-[#5F6F82] dark:text-slate-400">{successMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleRecommend} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#0B1F3A] dark:text-slate-300 font-semibold mb-1">Project Title / Asset Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Construction of Community Hall in Ward 14"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-2 text-xs rounded border border-[#D9E0E8] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0B1F3A] dark:text-white focus:ring-1 focus:ring-[#1558A6] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#0B1F3A] dark:text-slate-300 font-semibold mb-1">Development Sector</label>
                    <select
                      value={formData.sector}
                      onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                      className="w-full p-2 text-xs rounded border border-[#D9E0E8] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0B1F3A] dark:text-white focus:ring-1 focus:ring-[#1558A6] outline-none"
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
                    <label className="block text-[#0B1F3A] dark:text-slate-300 font-semibold mb-1">Recommended Cost (₹)</label>
                    <input
                      type="number"
                      required
                      value={formData.estimated_cost}
                      onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 text-xs rounded border border-[#D9E0E8] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0B1F3A] dark:text-white font-mono font-bold focus:ring-1 focus:ring-[#1558A6] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#0B1F3A] dark:text-slate-300 font-semibold mb-1">Justification & Public Benefit</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2 text-xs rounded border border-[#D9E0E8] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0B1F3A] dark:text-white focus:ring-1 focus:ring-[#1558A6] outline-none"
                  />
                </div>

                <div className="p-2.5 bg-[#F5F7FA] dark:bg-slate-800 rounded border border-[#D9E0E8] dark:border-slate-700 text-[#5F6F82] dark:text-slate-300 text-[11px] leading-relaxed">
                  Per Section 3.1 of MPLADS Guidelines, MPs submit proposals to the District Collector. The DC conducts technical scrutiny and awards tenders.
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-[#D9E0E8] dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3 py-1.5 bg-[#F5F7FA] hover:bg-slate-200 dark:bg-slate-800 text-[#0B1F3A] dark:text-slate-300 rounded font-semibold border border-[#D9E0E8] dark:border-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-3.5 py-1.5 bg-[#1558A6] hover:bg-[#0B1F3A] text-white rounded font-semibold shadow-xs flex items-center space-x-1.5 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 max-w-[800px] w-full rounded-xl border border-[#D9E1EA] dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            
            {/* Dark Navy Parliament Emblem Header (105-110px tall) */}
            <div className="bg-[#0B1F3A] text-white px-6 py-5 flex items-center justify-between border-b border-white/10 shrink-0 min-h-[105px]">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg bg-white/5 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
                  <Landmark className="w-6 h-6 text-[#E88126]" />
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-widest text-[#E88126] font-bold font-mono">
                    PARLIAMENT OF INDIA · LOK SABHA
                  </div>
                  <h3 className="text-lg font-bold font-sans text-white tracking-tight mt-0.5">
                    Official Recommendation Notice (Para 4.1)
                  </h3>
                  <div className="text-xs text-slate-300 mt-0.5">
                    MPLAD Scheme · Hon'ble Member of Parliament, Varanasi
                  </div>
                </div>
              </div>

              <button
                onClick={() => setAdoptingCluster(null)}
                className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Close Notice Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notice Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#172033] dark:text-slate-200">
              {noticeResult ? (
                <div className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 text-[#138A5B] dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-[#138A5B]/20">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-bold text-[#0B1F3A] dark:text-slate-100">
                    Recommendation Notice Dispatched!
                  </h4>
                  <div className="p-4 bg-[#F8FAFC] dark:bg-slate-800/80 rounded-xl border border-[#D9E1EA] dark:border-slate-700 max-w-md mx-auto text-left text-xs space-y-2">
                    <div><strong>Official Notice No:</strong> <span className="font-mono font-bold text-[#D88900] dark:text-amber-400">{noticeResult.notice_number}</span></div>
                    <div><strong>Project Proposal ID:</strong> <span className="font-mono font-bold text-[#1558A6] dark:text-indigo-400">{noticeResult.work_id}</span></div>
                    <div><strong>Citizen Petitions Adopted:</strong> <span className="font-semibold text-slate-700 dark:text-slate-300">{noticeResult.petitions_adopted} Representations</span></div>
                    <div className="text-slate-500 text-[11px] pt-2 border-t border-[#D9E1EA] dark:border-slate-700">
                      Proposal has been formally transmitted to the <strong>District Collector & District Magistrate (Approvals inbox)</strong> for technical scrutiny and sanction within statutory 75 days.
                    </div>
                  </div>

                  <button
                    onClick={() => setAdoptingCluster(null)}
                    className="px-6 py-2.5 bg-[#E88126] hover:bg-[#D47119] text-[#0B1F3A] dark:text-slate-950 text-xs font-bold rounded-lg transition-all shadow-xs"
                  >
                    Done & Return to Dashboard
                  </button>
                </div>
              ) : (
                <>
                  {/* Recipient / Statutory Information Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F8FAFC] dark:bg-slate-800/60 rounded-xl border border-[#D9E1EA] dark:border-slate-700 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-slate-500 font-medium text-[11px] block">To:</span>
                      <strong className="text-[#0B1F3A] dark:text-white font-bold block">
                        The District Magistrate & District Authority
                      </strong>
                      <span className="text-slate-500 block text-[11px]">
                        District Planning & MPLADS Cell, Varanasi, U.P.
                      </span>
                    </div>
                    <div className="space-y-0.5 sm:border-l sm:border-[#D9E1EA] sm:dark:border-slate-700 sm:pl-4">
                      <span className="text-slate-500 font-medium text-[11px] block">Statutory Clause:</span>
                      <strong className="text-[#D88900] dark:text-amber-400 font-bold block">
                        MPLADS Guidelines 2016 — Para 4.1
                      </strong>
                      <span className="text-slate-500 block text-[11px]">
                        75-Day Mandatory Sanction Window
                      </span>
                    </div>
                  </div>

                  {/* Field 1: Formal Work Title */}
                  <div>
                    <label className="block font-bold text-xs text-[#0B1F3A] dark:text-slate-200 mb-1.5">
                      Formal Work Title (to be entered into Government Gazette / Sanction Register)
                    </label>
                    <input
                      type="text"
                      value={customNoticeTitle}
                      onChange={e => setCustomNoticeTitle(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-lg border border-[#D9E1EA] dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-[#0B1F3A] dark:text-white font-medium focus:ring-2 focus:ring-[#1558A6] focus:border-[#1558A6] outline-hidden shadow-2xs transition-all"
                    />
                  </div>

                  {/* Field 2: Budget & Constituency/Category (Two-Column Row) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-xs text-[#0B1F3A] dark:text-slate-200 mb-1.5">
                        Recommended Cost (₹ INR)
                      </label>
                      <input
                        type="number"
                        value={customNoticeCost}
                        onChange={e => setCustomNoticeCost(parseFloat(e.target.value) || 0)}
                        required
                        className="w-full p-2.5 rounded-lg border border-[#D9E1EA] dark:border-slate-700 bg-white dark:bg-slate-950 font-mono font-bold text-xs text-[#0B1F3A] dark:text-white focus:ring-2 focus:ring-[#1558A6] focus:border-[#1558A6] outline-hidden shadow-2xs transition-all"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Schedule of Rates (SOR) benchmark: ₹{(adoptingCluster.estimated_cost / 100000).toFixed(1)} L
                      </span>
                    </div>

                    <div>
                      <label className="block font-bold text-xs text-[#0B1F3A] dark:text-slate-200 mb-1.5">
                        Constituency & Category
                      </label>
                      <div className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-[#D9E1EA] dark:border-slate-700 text-xs text-[#0B1F3A] dark:text-slate-200 font-medium h-[38px] flex items-center shadow-2xs">
                        {adoptingCluster.category} · Varanasi Lok Sabha
                      </div>
                    </div>
                  </div>

                  {/* Public Demand Justification Panel */}
                  <div className="p-3.5 bg-[#FFFBEB] dark:bg-amber-950/20 rounded-xl border border-[#FDE68A] dark:border-amber-800/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#92400E] dark:text-amber-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#D88900]" />
                        <span>Public Demand Justification ({adoptingCluster.petition_count} Petitions · {adoptingCluster.consensus_score}% Consensus)</span>
                      </span>
                      <span className="font-bold text-[#138A5B] dark:text-emerald-400">
                        {adoptingCluster.total_upvotes} Citizen Endorsements
                      </span>
                    </div>
                    
                    <div className="space-y-1.5 max-h-24 overflow-y-auto">
                      {adoptingCluster.members && adoptingCluster.members.length > 0 ? (
                        adoptingCluster.members.map((m, idx) => (
                          <div key={idx} className="text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <ChevronRight className="w-3 h-3 text-[#D88900] shrink-0" />
                            <span className="font-medium">"{m.description}"</span>
                            <span className="text-slate-400 shrink-0">— {m.citizen_name}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <ChevronRight className="w-3 h-3 text-[#D88900] shrink-0" />
                          <span className="font-medium">"Need better facilities"</span>
                          <span className="text-slate-400 shrink-0">— Citizen</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Official Recommendation Letter Memo */}
                  <div>
                    <label className="block font-bold text-xs text-[#0B1F3A] dark:text-slate-200 mb-1.5">
                      Official Recommendation Letter Memo
                    </label>
                    <textarea
                      rows={4}
                      value={customNoticeMemo}
                      onChange={e => setCustomNoticeMemo(e.target.value)}
                      className="w-full p-3 rounded-lg border border-[#D9E1EA] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#172033] dark:text-slate-200 leading-relaxed text-xs focus:ring-2 focus:ring-[#1558A6] focus:border-[#1558A6] outline-hidden shadow-2xs transition-all font-normal"
                    />
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-3.5 border-t border-[#D9E1EA] dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAdoptingCluster(null)}
                      className="px-4 py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#475569] dark:text-slate-300 rounded-lg text-xs font-semibold border border-[#D9E1EA] dark:border-slate-700 transition-colors"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleDispatchNotice}
                      disabled={submittingNotice}
                      className="px-5 py-2.5 bg-[#E88126] hover:bg-[#D47119] text-[#0B1F3A] dark:text-slate-950 text-xs font-bold rounded-lg shadow-xs hover:shadow-sm transition-all flex items-center space-x-2 border border-amber-600/20 active:translate-y-px disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 text-[#0B1F3A] dark:text-slate-950" />
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
