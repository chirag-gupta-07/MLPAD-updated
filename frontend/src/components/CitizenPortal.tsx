import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users, MapPin, Camera, Search, CheckCircle2, AlertTriangle,
  Building, Compass, Send, ShieldCheck, HeartHandshake, X
} from 'lucide-react';

export const CitizenPortal: React.FC = () => {
  const [searchDistrict, setSearchDistrict] = useState('Varanasi');
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGrievanceModal, setShowGrievanceModal] = useState(false);
  const [grievanceSubmitted, setGrievanceSubmitted] = useState(false);

  const [grievanceForm, setGrievanceForm] = useState({
    work_id: '',
    category: 'Quality Defect / Poor Construction',
    description: '',
    location: 'Basantpur Village, Varanasi',
    citizen_name: 'Priya Sharma'
  });

  const searchPublicWorks = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/works', {
        params: { district: searchDistrict, page_size: 6 }
      });
      setWorks(res.data.items || []);
    } catch (e) {
      console.error('Failed to load public works:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchPublicWorks();
  }, []);

  const handleGrievanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGrievanceSubmitted(true);
    setTimeout(() => {
      setShowGrievanceModal(false);
      setGrievanceSubmitted(false);
    }, 1800);
  };

  const formatLakhs = (amt: number) => {
    if (!amt) return '₹0';
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} Lakh`;
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      {/* Citizen Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-emerald-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
            <HeartHandshake className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h1 className="text-xl font-bold">Jan Samwaad & Public Transparency Portal</h1>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-400/30">
                RTI COMPLIANT
              </span>
            </div>
            <p className="text-xs text-emerald-100/80">
              Direct Public Auditing · Track Taxpayer Fund Utilization · Submit Geo-Tagged Evidence
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowGrievanceModal(true)}
          className="px-5 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 font-bold rounded-xl text-xs shadow-md transition-colors flex items-center space-x-2 shrink-0"
        >
          <Camera className="w-4 h-4 text-emerald-700" />
          <span>Report an Issue / Upload Evidence</span>
        </button>
      </div>

      {/* Citizen Area Search Filter */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Filter My District:</span>
          <input
            type="text"
            value={searchDistrict}
            onChange={(e) => setSearchDistrict(e.target.value)}
            placeholder="e.g. Varanasi"
            className="p-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          />
          <button
            onClick={searchPublicWorks}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
          >
            Search
          </button>
        </div>

        <div className="text-[11px] text-slate-500">
          Under the DPDP Act 2023, contractor personal banking data is masked to protect privacy.
        </div>
      </div>

      {/* Public Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {works.map((w: any) => (
          <div
            key={w.work_id}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 mb-2">
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  {w.work_id}
                </span>
                <span className="font-medium">{w.sector || 'Public Infrastructure'}</span>
              </div>

              <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                {w.work_description}
              </h3>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Sanctioned Budget:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatLakhs(w.sanctioned_amount)}</span>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Reported Progress:</span>
                  <span className="font-bold text-emerald-600">{w.completion_percentage || 0}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full"
                    style={{ width: `${w.completion_percentage || 0}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                <span>Location: {w.district}, {w.state}</span>
                <button
                  onClick={() => {
                    setGrievanceForm({ ...grievanceForm, work_id: w.work_id });
                    setShowGrievanceModal(true);
                  }}
                  className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                >
                  Verify On-Site →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Citizen Grievance / Evidence Modal */}
      {showGrievanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Camera className="w-5 h-5 text-emerald-600" />
                <span>Submit Citizen Inspection Evidence</span>
              </h2>
              <button onClick={() => setShowGrievanceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {grievanceSubmitted ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Evidence Logged Successfully!</h3>
                <p className="text-xs text-slate-500">
                  Ticket #CIT-VAR-2026-881 generated. Routed directly to District Collector's vigilance queue.
                </p>
              </div>
            ) : (
              <form onSubmit={handleGrievanceSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Issue Category</label>
                  <select
                    value={grievanceForm.category}
                    onChange={(e) => setGrievanceForm({ ...grievanceForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option>Quality Defect / Poor Construction Material</option>
                    <option>Work Abandoned / No Workers on Ground</option>
                    <option>Asset Locked / Non-Functional</option>
                    <option>Road Broken within 6 Months</option>
                    <option>Ghost Work / No Asset Found at Location</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Work ID (Optional)</label>
                  <input
                    type="text"
                    value={grievanceForm.work_id}
                    onChange={(e) => setGrievanceForm({ ...grievanceForm, work_id: e.target.value })}
                    placeholder="e.g. WS/MP620/2024-2025/133166"
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Description / Observations</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe what you observed on site..."
                    value={grievanceForm.description}
                    onChange={(e) => setGrievanceForm({ ...grievanceForm, description: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Attach Geo-Tagged Site Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Hardware GPS metadata will be extracted for anti-fraud validation.</span>
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowGrievanceModal(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm flex items-center space-x-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Report</span>
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
