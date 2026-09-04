import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Camera,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Filter,
  Search,
  PlusCircle,
  Eye,
  FileText,
  UserCheck,
  AlertCircle,
  Check,
  XCircle,
  Layers,
  Trash2
} from 'lucide-react';
import { CitizenEvidenceModal } from './CitizenEvidenceModal';

export const CitizenEvidenceTab: React.FC = () => {
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [issueFilter, setIssueFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Verification state update modal / inline
  const [reviewingItem, setReviewingItem] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string>('SUPERVISORY_VERIFIED');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        axios.get('/api/citizen-evidence', {
          params: {
            verification_status: statusFilter !== 'ALL' ? statusFilter : undefined,
            issue_type: issueFilter !== 'ALL' ? issueFilter : undefined,
            limit: 100
          }
        }),
        axios.get('/api/citizen-evidence/stats')
      ]);
      setEvidenceList(listRes.data.evidence || []);
      setStats(statsRes.data);
    } catch (e) {
      console.error('Failed to load citizen evidence:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, [statusFilter, issueFilter]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingItem) return;
    setSubmittingReview(true);
    try {
      await axios.patch(`/api/citizen-evidence/${reviewingItem.id}/verify`, {
        status: reviewStatus,
        admin_notes: reviewNotes.trim() || undefined,
        verified_by: 'District Nodal Officer (Collectorate)'
      });
      setReviewingItem(null);
      fetchEvidence();
    } catch (err) {
      console.error('Failed to update verification status:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete evidence report #${evidenceId}?`)) {
      return;
    }
    setDeletingId(evidenceId);
    try {
      await axios.delete(`/api/citizen-evidence/${evidenceId}`);
      await fetchEvidence();
    } catch (err) {
      console.error('Failed to delete evidence report:', err);
      alert('Failed to delete evidence report. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter evidence list by search query
  const filteredList = evidenceList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.work_id && item.work_id.toLowerCase().includes(q)) ||
      (item.citizen_name && item.citizen_name.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.district && item.district.toLowerCase().includes(q)) ||
      (item.state && item.state.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUPERVISORY_VERIFIED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Check className="w-3 h-3 mr-1" /> Supervisory Verified
          </span>
        );
      case 'FIELD_INSPECTION_SCHEDULED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Clock className="w-3 h-3 mr-1" /> Field Inspection Scheduled
          </span>
        );
      case 'REJECTED_UNVERIFIABLE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
            <XCircle className="w-3 h-3 mr-1" /> Rejected / Unverifiable
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertCircle className="w-3 h-3 mr-1" /> Pending Field Review
          </span>
        );
    }
  };

  const getProximityBadge = (flag: string, distKm?: number) => {
    const kmText = distKm !== undefined ? `(${distKm} km)` : '';
    if (flag === 'HIGH_PROXIMITY') {
      return (
        <span className="inline-flex items-center text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          <MapPin className="w-3 h-3 mr-1 text-emerald-600" /> On-Site {kmText}
        </span>
      );
    } else if (flag === 'MODERATE_PROXIMITY') {
      return (
        <span className="inline-flex items-center text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          <MapPin className="w-3 h-3 mr-1 text-amber-600" /> Vicinity {kmText}
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center text-[11px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
          <AlertTriangle className="w-3 h-3 mr-1 text-red-600" /> Location Mismatch {kmText}
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                MoSPI · SIH Feature 7.6
              </span>
              <span className="text-slate-400 text-xs">Crowdsourced Social Audit & Early Warning</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight mt-1 flex items-center gap-2">
              <Camera className="w-6 h-6 text-indigo-400" />
              Citizen Evidence & Ground Reality Signals
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Citizens submit geo-tagged photographs and progress reports for MPLADS projects. Location, timestamp, and project association serve as supporting signals to triage physical supervisory inspections.
            </p>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-medium text-xs shadow-lg shadow-indigo-600/30 transition shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit Citizen Evidence</span>
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Submissions</span>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{stats.total_reports}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Crowdsourced reports</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">Pending Review</span>
            <div className="text-2xl font-bold text-amber-700 mt-1 font-mono">{stats.pending_verification}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Awaiting field audit</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">Inspections Ordered</span>
            <div className="text-2xl font-bold text-blue-700 mt-1 font-mono">{stats.inspection_scheduled}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Field teams assigned</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">Supervisory Verified</span>
            <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">{stats.supervisory_verified}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Discrepancy confirmed</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">High Proximity (&lt;1km)</span>
            <div className="text-2xl font-bold text-indigo-700 mt-1 font-mono">{stats.high_proximity_reports}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">On-site GPS match</span>
          </div>

        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        
        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search work ID, citizen, district..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center space-x-1 text-slate-500 text-xs">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white"
          >
            <option value="ALL">All Verification Statuses</option>
            <option value="PENDING_VERIFICATION">Pending Field Review</option>
            <option value="FIELD_INSPECTION_SCHEDULED">Field Inspection Scheduled</option>
            <option value="SUPERVISORY_VERIFIED">Supervisory Verified</option>
            <option value="REJECTED_UNVERIFIABLE">Rejected / Unverifiable</option>
          </select>

          <select
            value={issueFilter}
            onChange={(e) => setIssueFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white"
          >
            <option value="ALL">All Issue Types</option>
            <option value="WORK_NOT_STARTED">Work Not Started / Ghost Work</option>
            <option value="PROGRESS_DELAYED">Stalled / Delayed</option>
            <option value="SUBSTANDARD_WORK">Substandard Quality</option>
            <option value="ABANDONED_SITE">Abandoned Site</option>
            <option value="COMPLETED_OPERATIONAL">Asset Completed</option>
          </select>
        </div>

      </div>

      {/* Evidence Cards Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
          <p>Loading citizen ground evidence...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
          <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700 text-sm">No Citizen Evidence Found</p>
          <p className="text-slate-400 mt-1">Try changing your filters or submit a new ground report.</p>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition"
          >
            Submit First Ground Report
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition"
            >
              
              {/* Card Header */}
              <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2 bg-slate-50/60">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-900 text-xs">{item.work_id}</span>
                    {getStatusBadge(item.verification_status)}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {item.work_description || `${item.district || ''}, ${item.state || ''}`}
                  </p>
                </div>
              </div>

              {/* Photo Preview / Fallback */}
              <div className="relative bg-slate-100 h-44 flex items-center justify-center overflow-hidden border-b border-slate-100">
                {item.photo_url || item.photo_filename ? (
                  <img
                    src={item.photo_url || `/api/citizen-evidence/photo/${item.photo_filename}`}
                    alt="Ground Evidence"
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition duration-300"
                    onClick={() => setSelectedPhoto(item.photo_url || `/api/citizen-evidence/photo/${item.photo_filename}`)}
                    onError={(e) => {
                      if (item.photo_filename && !e.currentTarget.src.includes('/api/citizen-evidence/photo/')) {
                        e.currentTarget.src = `/api/citizen-evidence/photo/${item.photo_filename}`;
                      }
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Camera className="w-8 h-8 mb-1" />
                    <span className="text-[10px]">No Photo Attached</span>
                  </div>
                )}

                {/* Spatial Proximity Overlay */}
                <div className="absolute top-2 left-2">
                  {getProximityBadge(item.proximity_flag, item.distance_from_site_km)}
                </div>

                {/* Discrepancy Pill */}
                {item.progress_gap > 0 && (
                  <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded font-mono font-semibold">
                    Portal: {item.official_progress}% vs Claimed: {item.claimed_progress}%
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3 text-xs">
                
                {/* Issue Type & Narrative */}
                <div>
                  <span className="inline-block bg-slate-100 text-slate-700 font-semibold text-[10px] px-2 py-0.5 rounded mb-1.5">
                    {item.issue_type.replace(/_/g, ' ')}
                  </span>
                  <p className="text-slate-700 line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Administrative Notes if any */}
                {item.admin_notes && (
                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-[11px] text-blue-900 space-y-0.5">
                    <span className="font-bold flex items-center">
                      <ShieldCheck className="w-3 h-3 mr-1 text-blue-600" />
                      Supervisory Field Note:
                    </span>
                    <p>{item.admin_notes}</p>
                    {item.verified_by && (
                      <span className="text-[10px] text-blue-600 block mt-1">
                        — {item.verified_by}
                      </span>
                    )}
                  </div>
                )}

                {/* Submitter & Timestamp */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate max-w-[140px]">By: {item.citizen_name || 'Anonymous'}</span>
                  <span>{item.submission_timestamp?.slice(0, 10)}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => {
                      setReviewingItem(item);
                      setReviewStatus(item.verification_status);
                      setReviewNotes(item.admin_notes || '');
                    }}
                    className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition shadow-sm"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Review</span>
                  </button>

                  <button
                    onClick={() => handleDeleteEvidence(item.id)}
                    disabled={deletingId === item.id}
                    title="Delete this evidence report"
                    className="py-1.5 px-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-medium flex items-center justify-center transition disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="ml-1">{deletingId === item.id ? 'Deleting...' : 'Delete'}</span>
                  </button>
                </div>

              </div>

            </div>
          ))}
        </div>
      )}

      {/* Administrative Review Modal */}
      {reviewingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Supervisory Action Review</h3>
                <span className="text-xs text-slate-500 font-mono">Work ID: {reviewingItem.work_id}</span>
              </div>
              <button onClick={() => setReviewingItem(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Update Status</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="SUPERVISORY_VERIFIED">Supervisory Verified (Ground Discrepancy Confirmed)</option>
                  <option value="FIELD_INSPECTION_SCHEDULED">Field Inspection Scheduled</option>
                  <option value="PENDING_VERIFICATION">Pending Verification</option>
                  <option value="REJECTED_UNVERIFIABLE">Rejected / Unverifiable</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Official Findings / Inspection Notes</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record observations from site visit or actions taken by District Monitoring Cell..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const idToDelete = reviewingItem.id;
                    setReviewingItem(null);
                    handleDeleteEvidence(idToDelete);
                  }}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-medium flex items-center space-x-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Report</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setReviewingItem(null)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow transition disabled:opacity-50"
                  >
                    {submittingReview ? 'Saving...' : 'Save Audit Decision'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-3xl max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto} alt="Zoomed Evidence" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl" />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-1.5 shadow-lg hover:bg-red-700"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      <CitizenEvidenceModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onSuccess={() => {
          fetchEvidence();
        }}
      />

    </div>
  );
};
