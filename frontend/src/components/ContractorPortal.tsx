import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Briefcase, Award, CheckCircle2, Clock, Upload, Camera,
  FileText, ShieldCheck, DollarSign, Send, ArrowRight,
  AlertCircle, RefreshCw, X, MapPin
} from 'lucide-react';

export const ContractorPortal: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'tenders' | 'my-bids' | 'work-orders'>('tenders');
  const [tenders, setTenders] = useState<any[]>([]);
  const [myBids, setMyBids] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply Bid Modal State
  const [selectedTenderForBid, setSelectedTenderForBid] = useState<any | null>(null);
  const [bidForm, setBidForm] = useState({
    technical_proposal: '',
    equipment_details: '',
    proposed_duration_days: 150,
    quoted_amount: 0,
    emd_paid: true
  });
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);

  // Milestone Progress Update
  const [updatingWoId, setUpdatingWoId] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState<number>(50);

  // Photo Verification State
  const [verifyingPhoto, setVerifyingPhoto] = useState<string | null>(null);
  const [photoResult, setPhotoResult] = useState<any | null>(null);

  // Bid PDF Document Scrutiny Pre-Check State
  const [verifyingDoc, setVerifyingDoc] = useState(false);
  const [docPreCheckResult, setDocPreCheckResult] = useState<any | null>(null);

  const handleSelfCheckDoc = async (file: File) => {
    setVerifyingDoc(true);
    setDocPreCheckResult(null);
    try {
      const data = new FormData();
      data.append('file', file);
      if (selectedTenderForBid?.id) data.append('tender_id', selectedTenderForBid.id);
      if (selectedTenderForBid?.estimated_cost) data.append('estimated_cost', selectedTenderForBid.estimated_cost.toString());
      const res = await axios.post('/api/tenders/verify-documents', data, {
        headers: { 'Content-Type': 'multipart/form-data', ...getHeaders() }
      });
      setDocPreCheckResult(res.data);
    } catch (e: any) {
      alert('Document verification error: ' + (e.response?.data?.detail || e.message));
    } finally {
      setVerifyingDoc(false);
    }
  };


  const getHeaders = () => {
    const token = localStorage.getItem('mplads_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const headers = getHeaders();
      const [tRes, bRes, wRes] = await Promise.all([
        axios.get('/api/tenders', { headers }),
        axios.get('/api/contractors/my-bids', { headers }),
        axios.get('/api/contractors/my-work-orders', { headers })
      ]);
      setTenders(tRes.data);
      setMyBids(bRes.data);
      setWorkOrders(wRes.data);
    } catch (e) {
      console.error('Failed to load contractor portal data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleOpenBidModal = (tender: any) => {
    setSelectedTenderForBid(tender);
    setBidForm({
      technical_proposal: 'Comprehensive execution plan with experienced site engineers, daily quality assurance, and tested aggregate materials.',
      equipment_details: '2 Concrete Mixers, 1 Road Roller, 3 Dumper Trucks owned and stationed at district depot.',
      proposed_duration_days: 120,
      quoted_amount: Math.round(tender.estimated_cost * 0.96), // Pre-fill sensible competitive quote (4% below)
      emd_paid: true
    });
    setBidSuccess(null);
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenderForBid) return;
    setSubmittingBid(true);
    try {
      const headers = getHeaders();
      const res = await axios.post(
        `/api/tenders/bids/${selectedTenderForBid.id}`,
        bidForm,
        { headers }
      );
      setBidSuccess(res.data.message);
      loadAllData();
      setTimeout(() => {
        setSelectedTenderForBid(null);
        setActiveSubTab('my-bids');
      }, 1500);
    } catch (e: any) {
      alert('Bid submission error: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleUpdateProgress = async (woId: string) => {
    try {
      const headers = getHeaders();
      await axios.post(
        `/api/contractors/work-orders/${woId}/update-progress`,
        { progress_percentage: progressValue },
        { headers }
      );
      setUpdatingWoId(null);
      loadAllData();
    } catch (e: any) {
      alert('Progress update error: ' + (e.response?.data?.detail || e.message));
    }
  };

  const handlePhotoUpload = async (woId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setVerifyingPhoto(woId);
    setPhotoResult(null);

    try {
      const headers = { ...getHeaders(), 'Content-Type': 'multipart/form-data' };
      const res = await axios.post(
        `/api/contractors/work-orders/${woId}/verify-photo`,
        formData,
        { headers }
      );
      setPhotoResult(res.data.verification_result);
    } catch (e: any) {
      alert('Photo verification error: ' + (e.response?.data?.detail || e.message));
    } finally {
      setVerifyingPhoto(null);
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
      {/* Contractor Identity & Reputation Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-700/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Briefcase className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h1 className="text-xl font-bold">Gandhi Construction And Supplier</h1>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>KYC VERIFIED</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Enlisted Class-A PWD Vendor · GSTIN: 09AAACG1234F1Z5 · Varanasi Division
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-6 shrink-0 bg-white/5 px-5 py-3 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">AI Reliability Rating</span>
            <div className="flex items-center space-x-1.5">
              <span className="text-2xl font-black text-amber-400">91.2</span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold">★ Gold Class Partner</span>
          </div>

          <div className="h-10 w-[1px] bg-slate-700" />

          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Completed Works</span>
            <span className="text-2xl font-black text-white">48</span>
            <span className="text-[10px] text-slate-400 block">On-Time Rate: 94%</span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('tenders')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-2 ${
            activeSubTab === 'tenders'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Live NIT Tenders ({tenders.filter(t => t.status === 'PUBLISHED').length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('my-bids')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-2 ${
            activeSubTab === 'my-bids'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>My Submitted Bids ({myBids.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('work-orders')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-2 ${
            activeSubTab === 'work-orders'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Awarded Work Orders ({workOrders.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: LIVE NIT TENDERS */}
      {activeSubTab === 'tenders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tenders.map((t) => (
            <div
              key={t.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900">
                    {t.id}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Eligible: {t.minimum_contractor_class}+</span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 mb-2">
                  {t.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                  {t.description || 'Public development work under MPLADS fund allocation.'}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sanctioned Budget:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatLakhs(t.estimated_cost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Earnest Money (EMD):</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatLakhs(t.emd_amount)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Submission Closes:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{t.submission_deadline}</span>
                </div>

                <button
                  onClick={() => handleOpenBidModal(t)}
                  disabled={t.status !== 'PUBLISHED'}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center space-x-1.5"
                >
                  <span>Apply & Submit Sealed Bid</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 2: MY SUBMITTED BIDS */}
      {activeSubTab === 'my-bids' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white">
            Bid Status & Sealed Financial Quotes
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <th className="p-3">Bid ID</th>
                <th className="p-3">Tender Title</th>
                <th className="p-3">Department</th>
                <th className="p-3">My Sealed Quote</th>
                <th className="p-3">Technical Scrutiny</th>
                <th className="p-3">Financial Rank</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {myBids.map((b) => (
                <tr key={b.bid_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-mono font-medium text-indigo-600 dark:text-indigo-400">{b.bid_id}</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white max-w-xs truncate">{b.tender_title}</td>
                  <td className="p-3 text-slate-500">{b.department}</td>
                  <td className="p-3 font-bold font-mono text-slate-900 dark:text-white">{formatLakhs(b.quoted_amount)}</td>
                  <td className="p-3">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{b.technical_status}</span>
                    </span>
                  </td>
                  <td className="p-3">
                    {b.financial_rank ? (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        b.financial_rank === 'L1' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
                      }`}>
                        {b.financial_rank}
                      </span>
                    ) : 'Awaiting Opening'}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-TAB 3: AWARDED WORK ORDERS */}
      {activeSubTab === 'work-orders' && (
        <div className="space-y-4">
          {workOrders.map((wo) => (
            <div
              key={wo.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 mr-2">
                    {wo.id}
                  </span>
                  <span className="text-xs text-slate-500">Target Date: {wo.target_completion_date}</span>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                    {wo.project_title}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">Sanctioned Value</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-base">
                    {formatLakhs(wo.sanctioned_amount)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Physical Execution Progress</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{wo.current_progress_pct}% Completed</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${wo.current_progress_pct}%` }}
                  />
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs">
                {/* Milestone Progress Updater */}
                <div className="flex items-center space-x-2">
                  {updatingWoId === wo.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={progressValue}
                        onChange={(e) => setProgressValue(parseFloat(e.target.value) || 0)}
                        className="w-16 p-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-bold"
                      />
                      <span>%</span>
                      <button
                        onClick={() => handleUpdateProgress(wo.id)}
                        className="px-3 py-1 bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setUpdatingWoId(null)}
                        className="px-2 py-1 text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setUpdatingWoId(wo.id); setProgressValue(wo.current_progress_pct); }}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
                    >
                      Update Milestone %
                    </button>
                  )}
                </div>

                {/* Anti-Tamper EXIF Photo Upload */}
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg font-medium flex items-center space-x-1.5 transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{verifyingPhoto === wo.id ? 'Scanning GPS...' : 'Upload Geo-Tagged Site Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(wo.id, e)}
                    />
                  </label>
                </div>
              </div>

              {/* Photo Verification Result Banner */}
              {photoResult && (
                <div className={`p-3 rounded-lg text-xs flex items-center space-x-2 border ${
                  photoResult.verified
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}>
                  {photoResult.verified ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <div>
                    <p className="font-bold">{photoResult.status}: {photoResult.message}</p>
                    {photoResult.distance_meters !== null && (
                      <p className="text-[11px] opacity-80">Measured distance from sanctioned coordinate: {photoResult.distance_meters} meters.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sealed Bid Submission Modal */}
      {selectedTenderForBid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {selectedTenderForBid.id}
                </span>
                <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                  Submit Two-Envelope Bid (Technical & Financial)
                </h2>
              </div>
              <button onClick={() => setSelectedTenderForBid(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bidSuccess ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Bid Sealed & Submitted!</h3>
                <p className="text-xs text-slate-500">{bidSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitBid} className="space-y-4 text-xs">
                {/* Envelope 1: Technical */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Envelope 1: Technical Bid</span>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">Execution Methodology</label>
                    <textarea
                      required
                      rows={2}
                      value={bidForm.technical_proposal}
                      onChange={(e) => setBidForm({ ...bidForm, technical_proposal: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">Equipment & Machineries Stationed</label>
                    <input
                      type="text"
                      value={bidForm.equipment_details}
                      onChange={(e) => setBidForm({ ...bidForm, equipment_details: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Mandatory Statutory Technical Bid PDF Upload */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                      Statutory Eligibility Dossier (PDF - Form T-1 & T-2)
                    </label>
                    <label className="cursor-pointer border border-dashed border-indigo-300 dark:border-indigo-800 rounded-lg p-2.5 flex items-center justify-between bg-white dark:bg-slate-900 hover:bg-indigo-50/50 transition-colors">
                      <div className="flex items-center space-x-2">
                        <Upload className="w-4 h-4 text-indigo-600" />
                        <span className="text-[11px] text-slate-700 dark:text-slate-300">
                          {verifyingDoc ? 'Running Gemini 3.6 Flash Pre-Check...' : 'Upload & Pre-Validate PDF Dossier'}
                        </span>
                      </div>
                      <span className="text-[10px] text-indigo-600 font-bold">Browse PDF</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        disabled={verifyingDoc}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleSelfCheckDoc(f);
                        }}
                      />
                    </label>

                    {/* Pre-Check Feedback Alert */}
                    {docPreCheckResult && (
                      <div className={`mt-2 p-2.5 rounded-lg text-[11px] border ${
                        docPreCheckResult.overall_verdict === 'QUALIFIED'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800 dark:text-rose-300'
                      }`}>
                        <div className="flex items-center justify-between font-bold">
                          <span>AI Pre-Check: {docPreCheckResult.overall_verdict} (Score: {docPreCheckResult.score || 0}/100)</span>
                          <span>UDIN: {docPreCheckResult.ca_udin || 'N/A'}</span>
                        </div>
                        <p className="mt-1 opacity-90">{docPreCheckResult.audit_summary}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Envelope 2: Sealed Financial Quote */}
                <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900 space-y-3">
                  <div className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center space-x-1.5">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                    <span>Envelope 2: Sealed Financial Quote (Client-Side Encrypted)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1">Quoted Price (₹)</label>
                      <input
                        type="number"
                        required
                        value={bidForm.quoted_amount}
                        onChange={(e) => setBidForm({ ...bidForm, quoted_amount: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 font-mono font-bold text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1">Duration (Days)</label>
                      <input
                        type="number"
                        value={bidForm.proposed_duration_days}
                        onChange={(e) => setBidForm({ ...bidForm, proposed_duration_days: parseInt(e.target.value) || 120 })}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500">
                    Govt Estimate: {formatLakhs(selectedTenderForBid.estimated_cost)}. Your quote will remain encrypted until official unsealing date.
                  </p>
                </div>

                {/* EMD Payment Simulation */}
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900 flex justify-between items-center text-emerald-900 dark:text-emerald-300">
                  <div>
                    <span className="font-bold block">Earnest Money Deposit (EMD)</span>
                    <span className="text-[11px] opacity-80">{formatLakhs(selectedTenderForBid.emd_amount)} (2% of estimate)</span>
                  </div>
                  <span className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-full">
                    ✓ Verified Paid
                  </span>
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedTenderForBid(null)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingBid}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm flex items-center space-x-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingBid ? 'Encrypting & Submitting...' : 'Seal & Submit Bid'}</span>
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
