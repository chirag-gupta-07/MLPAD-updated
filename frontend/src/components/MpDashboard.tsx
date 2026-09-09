import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Landmark, Plus, CheckCircle2, Clock, MapPin, IndianRupee,
  FileCheck, AlertCircle, ArrowUpRight, TrendingUp, Users, Send, X
} from 'lucide-react';

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

  useEffect(() => {
    fetchProposals();
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
    </div>
  );
};
