import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, ShieldAlert, AlertTriangle, CheckCircle, FileText, MapPin, DollarSign, Clock, Layers, Copy, CheckSquare, ShieldCheck, Camera, PlusCircle, Check } from 'lucide-react';
import { CitizenEvidenceModal } from './CitizenEvidenceModal';

interface WorkDetailModalProps {
  work: any;
  onClose: () => void;
}

export const WorkDetailModal: React.FC<WorkDetailModalProps> = ({ work, onClose }) => {
  if (!work) return null;

  const [citizenEvidence, setCitizenEvidence] = useState<any[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const fetchCitizenEvidence = async () => {
    if (!work?.work_id) return;
    setLoadingEvidence(true);
    try {
      const res = await axios.get(`/api/citizen-evidence/work/${work.work_id}`);
      setCitizenEvidence(res.data.evidence || []);
    } catch (e) {
      console.error('Failed to load citizen evidence for work:', e);
    } finally {
      setLoadingEvidence(false);
    }
  };

  useEffect(() => {
    fetchCitizenEvidence();
  }, [work?.work_id]);

  let riskFactors: any[] = [];
  let recommendedActions: string[] = [];
  let duplicateMatches: any[] = [];

  try {
    if (typeof work.risk_factors_json === 'string') {
      riskFactors = JSON.parse(work.risk_factors_json);
    } else if (Array.isArray(work.risk_factors_json)) {
      riskFactors = work.risk_factors_json;
    }
  } catch (e) {}

  try {
    if (typeof work.recommended_actions_json === 'string') {
      recommendedActions = JSON.parse(work.recommended_actions_json);
    } else if (Array.isArray(work.recommended_actions_json)) {
      recommendedActions = work.recommended_actions_json;
    }
  } catch (e) {}

  try {
    if (typeof work.duplicate_matches_json === 'string') {
      duplicateMatches = JSON.parse(work.duplicate_matches_json);
    } else if (Array.isArray(work.duplicate_matches_json)) {
      duplicateMatches = work.duplicate_matches_json;
    }
  } catch (e) {}

  const getSeverityBadge = (severity: string) => {
    if (severity === 'HIGH') return 'bg-red-100 text-red-800 border-red-200';
    if (severity === 'MEDIUM') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold tracking-tight font-mono">{work.work_id}</h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  work.risk_level === 'HIGH' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                  work.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}>
                  {work.risk_level} RISK ({work.composite_risk_score}/100)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{work.sector} · {work.district}, {work.state}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          
          {/* Work Description & Data Quality Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">Work Description</h4>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">
                  Data Quality: {work.data_quality_score || 95}%
                </span>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Confidence: {work.model_confidence || 'HIGH'}
                </span>
              </div>
            </div>
            <p className="text-slate-800 text-sm leading-relaxed">{work.work_description}</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-200">
              <div>
                <span className="text-slate-500 block text-[11px]">Hon'ble MP</span>
                <span className="font-semibold text-slate-800">{work.mp_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Implementing Agency</span>
                <span className="font-semibold text-slate-800 truncate block">{work.implementing_agency || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Sanction Date</span>
                <span className="font-semibold text-slate-800">{work.sanction_date || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Physical Progress</span>
                <span className="font-semibold text-slate-800">{work.completion_percentage}% ({work.status})</span>
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
                  <span className="text-red-700">{work.financial_anomaly_score}/100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: `${work.financial_anomaly_score}%` }}></div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Relative cost unusualness against state & sectoral peer baselines</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex justify-between font-semibold mb-1">
                  <span>2. Schedule Delay Risk</span>
                  <span className="text-amber-700">{work.delay_risk_score}/100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${work.delay_risk_score}%` }}></div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Predicted probability of delay based on pre-kickoff parameters</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex justify-between font-semibold mb-1">
                  <span>3. Semantic Duplicate Score</span>
                  <span className="text-purple-700">{work.duplicate_risk_score}/100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${work.duplicate_risk_score}%` }}></div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Multi-modal vector similarity on text, spatial radius & budget</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex justify-between font-semibold mb-1">
                  <span>4. Fund Utilization Irregularity</span>
                  <span className="text-blue-700">{work.utilization_anomaly_score}/100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${work.utilization_anomaly_score}%` }}></div>
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
              <h4 className="font-bold text-purple-900 text-xs uppercase tracking-wider mb-2 flex items-center">
                <Copy className="w-3.5 h-3.5 mr-1 text-purple-600" />
                Potential Duplicate Work Pairs Detected ({duplicateMatches.length})
              </h4>
              <div className="space-y-2">
                {duplicateMatches.map((dm, idx) => (
                  <div key={idx} className="p-2.5 bg-white rounded-lg border border-purple-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-purple-950 font-mono text-xs">{dm.paired_work_id}</span>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Distance: <span className="font-semibold">{dm.distance_km} km</span> ({dm.spatial_resolution || 'District approximation'}) · Cost Match: <span className="font-semibold">{dm.cost_similarity}%</span> · Date Gap: <span className="font-semibold">{dm.date_difference_days} days</span>
                      </div>
                    </div>
                    <span className="font-bold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full text-xs">
                      {dm.similarity_score}% Similar
                    </span>
                  </div>
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

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
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
          prefilledWork={work}
          onSuccess={() => {
            fetchCitizenEvidence();
          }}
        />

      </div>
    </div>
  );
};
