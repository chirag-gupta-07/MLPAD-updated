import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileText, Plus, ShieldCheck, AlertTriangle, CheckCircle2,
  Users, Award, DollarSign, Calendar, Building2, Gavel, Search,
  RefreshCw, X, FileCheck
} from 'lucide-react';

interface Tender {
  id: string;
  work_id?: string;
  title: string;
  description?: string;
  department: string;
  state: string;
  district: string;
  estimated_cost: number;
  emd_amount: number;
  minimum_contractor_class: string;
  publication_date: string;
  submission_deadline: string;
  status: string;
  total_bids: number;
  awarded_contractor_id?: string;
  awarded_amount?: number;
}

export const TenderManagementPage: React.FC = () => {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTender, setSelectedTender] = useState<any | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [awardSuccess, setAwardSuccess] = useState<string | null>(null);

  // New Tender Form State
  const [formData, setFormData] = useState({
    title: '',
    department: 'Public Works Department (PWD)',
    work_id: '',
    estimated_cost: 2000000,
    minimum_contractor_class: 'Class-B',
    submission_days: 21
  });

  const fetchTenders = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/tenders');
      setTenders(res.data);
    } catch (e) {
      console.error('Failed to load tenders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenders();
  }, []);

  const openTenderDetail = async (tenderId: string) => {
    setEvalResult(null);
    setAwardSuccess(null);
    try {
      const token = localStorage.getItem('mplads_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get('/api/tenders/detail', { params: { tender_id: tenderId }, headers });
      setSelectedTender(res.data);
    } catch (e) {
      console.error('Failed to load tender details:', e);
    }
  };

  const handleRunAiEvaluation = async (tenderId: string) => {
    setEvaluating(true);
    try {
      const token = localStorage.getItem('mplads_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post('/api/tenders/evaluate', { tender_id: tenderId }, { headers });
      setEvalResult(res.data);
      openTenderDetail(tenderId);
    } catch (e: any) {
      alert('AI Evaluation error: ' + (e.response?.data?.detail || e.message));
    } finally {
      setEvaluating(false);
    }
  };

  const handleAwardL1 = async (tenderId: string) => {
    if (!window.confirm('Approve and award tender contract to the L1 Lowest Responsive Bidder?')) return;
    setAwarding(true);
    try {
      const token = localStorage.getItem('mplads_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post('/api/tenders/award', { tender_id: tenderId }, { headers });
      setAwardSuccess(res.data.message);
      fetchTenders();
      openTenderDetail(tenderId);
    } catch (e: any) {
      alert('Award error: ' + (e.response?.data?.detail || e.message));
    } finally {
      setAwarding(false);
    }
  };

  const handleCreateTender = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('mplads_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post('/api/tenders/create', formData, { headers });
      setShowCreateModal(false);
      fetchTenders();
    } catch (e: any) {
      alert('Tender creation error: ' + (e.response?.data?.detail || e.message));
    }
  };

  const formatLakhs = (amt: number) => {
    if (!amt) return '₹0';
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} Lakh`;
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-indigo-600 text-white shadow-sm">
              <Gavel className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">E-Procurement & Tender Management</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                GFR 2017 & CVC Compliant Two-Envelope Bidding · AI Cartel Detection · Automated L1 Awarding
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchTenders}
            className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Publish NIT Tender</span>
          </button>
        </div>
      </div>

      {/* Tenders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tenders.map((t) => (
          <div
            key={t.id}
            onClick={() => openTenderDetail(t.id)}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-[11px] font-mono font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/50">
                  {t.id}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  t.status === 'AWARDED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' :
                  t.status === 'EVALUATING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400' :
                  'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
                }`}>
                  {t.status}
                </span>
              </div>

              <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 mb-2">
                {t.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                {t.description || 'Public infrastructure development project under MPLADS scheme.'}
              </p>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="text-slate-500">Estimated Cost:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatLakhs(t.estimated_cost)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="text-slate-500">EMD (2%):</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatLakhs(t.emd_amount)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="text-slate-500">Bids Received:</span>
                <span className="inline-flex items-center space-x-1 font-semibold text-indigo-600 dark:text-indigo-400">
                  <Users className="w-3.5 h-3.5" />
                  <span>{t.total_bids} Bids</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                <span>Deadline: {t.submission_deadline}</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">View Bids →</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tender Detail & AI Evaluation Drawer */}
      {selectedTender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-4xl w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                    {selectedTender.tender.id}
                  </span>
                  <span className="text-xs text-slate-500">· {selectedTender.tender.department}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedTender.tender.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTender(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Key Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <div>
                  <span className="text-[11px] text-slate-500 block">Estimated Cost</span>
                  <span className="font-bold text-slate-900 dark:text-white text-base">
                    {formatLakhs(selectedTender.tender.estimated_cost)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Required EMD</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                    {formatLakhs(selectedTender.tender.emd_amount)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Contractor Class</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base">
                    {selectedTender.tender.minimum_contractor_class}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Status</span>
                  <span className="font-bold uppercase tracking-wider text-xs">
                    {selectedTender.tender.status}
                  </span>
                </div>
              </div>

              {/* Award Success Banner */}
              {awardSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 flex items-center space-x-3 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Contract Officially Awarded</p>
                    <p className="text-xs">{awardSuccess}</p>
                  </div>
                </div>
              )}

              {/* AI Cartel & Collusion Warning Banner */}
              {evalResult && evalResult.cartel_detected && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2">
                  <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span>AI Anti-Cartel Alert: Potential Bid-Rigging Detected</span>
                  </div>
                  <ul className="text-xs space-y-1 text-amber-900 dark:text-amber-300 pl-7 list-disc">
                    {evalResult.cartel_flags.map((cf: any, i: number) => (
                      <li key={i}>
                        <strong>{cf.type}:</strong> {cf.message} ({cf.rule})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Two-Envelope Submitted Bids Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Submitted Two-Envelope Bids ({selectedTender.bids.length})</span>
                  </h3>

                  {selectedTender.tender.status !== 'AWARDED' && (
                    <button
                      onClick={() => handleRunAiEvaluation(selectedTender.tender.id)}
                      disabled={evaluating || selectedTender.bids.length === 0}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center space-x-1.5 disabled:opacity-50 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{evaluating ? 'Analyzing...' : 'Run AI Scrutiny & Unseal Quotes'}</span>
                    </button>
                  )}
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                        <th className="p-3">Rank / Bid ID</th>
                        <th className="p-3">Contractor / Vendor</th>
                        <th className="p-3">Technical Score</th>
                        <th className="p-3">EMD Status</th>
                        <th className="p-3">Financial Quote</th>
                        <th className="p-3">Variance</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {selectedTender.bids.map((b: any) => {
                        const isL1 = b.financial_rank === 'L1';
                        return (
                          <tr
                            key={b.id}
                            className={`transition-colors ${
                              isL1
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 font-semibold'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <td className="p-3">
                              {b.financial_rank ? (
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  isL1
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}>
                                  {b.financial_rank}
                                </span>
                              ) : (
                                <span className="font-mono text-slate-500">{b.id}</span>
                              )}
                            </td>
                            <td className="p-3 font-medium text-slate-900 dark:text-white">
                              {b.firm_name}
                              {isL1 && (
                                <span className="ml-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                                  ★ Lowest Responsive (L1)
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                {b.technical_score}/100
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Paid</span>
                            </td>
                            <td className="p-3 font-mono font-bold">
                              {typeof b.quoted_amount === 'number'
                                ? formatLakhs(b.quoted_amount)
                                : <span className="text-slate-400 italic font-normal">🔒 Sealed in Envelope</span>}
                            </td>
                            <td className="p-3 font-mono text-[11px]">
                              {typeof b.quoted_amount === 'number' ? (
                                <span className={b.quoted_amount <= selectedTender.tender.estimated_cost ? 'text-emerald-600' : 'text-rose-600'}>
                                  {(((b.quoted_amount - selectedTender.tender.estimated_cost) / selectedTender.tender.estimated_cost) * 100).toFixed(1)}%
                                </span>
                              ) : '—'}
                            </td>
                            <td className="p-3 text-right">
                              {isL1 && selectedTender.tender.status !== 'AWARDED' && (
                                <button
                                  onClick={() => handleAwardL1(selectedTender.tender.id)}
                                  disabled={awarding}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-sm transition-colors"
                                >
                                  Award Contract
                                </button>
                              )}
                              {b.status === 'AWARDED_L1' && (
                                <span className="text-emerald-600 font-bold text-[11px]">Awarded ✓</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-between items-center text-xs">
              <span className="text-slate-500">
                Notice Inviting Tender verified under Central Vigilance Commission (CVC) Procurement Guidelines.
              </span>
              <button
                onClick={() => setSelectedTender(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Tender Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                <span>Publish Notice Inviting Tender (NIT)</span>
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTender} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Tender Title / Work Scope</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Construction of Community Center in Rohania"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option>Public Works Department (PWD)</option>
                    <option>UPNEDA (Renewable Energy)</option>
                    <option>Jal Nigam (Rural Water)</option>
                    <option>Rural Development Agency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Contractor Class</label>
                  <select
                    value={formData.minimum_contractor_class}
                    onChange={(e) => setFormData({ ...formData, minimum_contractor_class: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option>Class-A (Above ₹50 Lakh)</option>
                    <option>Class-B (₹15L - ₹50L)</option>
                    <option>Class-C (Up to ₹15 Lakh)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Bidding Period (Days)</label>
                  <input
                    type="number"
                    value={formData.submission_days}
                    onChange={(e) => setFormData({ ...formData, submission_days: parseInt(e.target.value) || 21 })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-300 text-[11px]">
                Calculated EMD (2%): <strong>{formatLakhs(formData.estimated_cost * 0.02)}</strong>. Requires active Class-3 DSC sign-off.
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Publish NIT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
