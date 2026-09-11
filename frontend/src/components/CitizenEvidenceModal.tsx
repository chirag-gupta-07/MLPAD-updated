import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  X,
  Camera,
  MapPin,
  Upload,
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  Navigation,
  Crosshair,
  Target,
  Sparkles,
  Building2,
  Info,
  Loader2
} from 'lucide-react';

interface CitizenEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledWork?: {
    work_id: string;
    work_description?: string;
    latitude?: number;
    longitude?: number;
    completion_percentage?: number;
    district?: string;
    state?: string;
  } | null;
  onSuccess?: () => void;
}

const ISSUE_TYPES = [
  { value: 'WORK_NOT_STARTED', label: 'Work Not Started / Ghost Work' },
  { value: 'PROGRESS_DELAYED', label: 'Stalled / Severe Delay in Construction' },
  { value: 'SUBSTANDARD_WORK', label: 'Substandard Materials / Structural Defects' },
  { value: 'ABANDONED_SITE', label: 'Abandoned Site / Incomplete Structure' },
  { value: 'COMPLETED_OPERATIONAL', label: 'Asset Completed & In Public Use' },
  { value: 'CORRUPTION_OVERBILLING', label: 'Discrepancy in Expenditure vs Ground Reality' },
  { value: 'OTHER', label: 'Other Ground Observation' }
];

const DISTRICT_PRESETS = [
  { label: 'Select District Preset...', lat: null, lon: null },
  { label: 'Varanasi, Uttar Pradesh', lat: 25.3176, lon: 82.9739 },
  { label: 'Lucknow, Uttar Pradesh', lat: 26.8467, lon: 80.9462 },
  { label: 'Ghaziabad, Uttar Pradesh', lat: 28.6692, lon: 77.4538 },
  { label: 'Noida / Greater Noida, UP', lat: 28.5355, lon: 77.3910 },
  { label: 'Kanpur, Uttar Pradesh', lat: 26.4499, lon: 80.3319 },
  { label: 'Prayagraj (Allahabad), UP', lat: 25.4358, lon: 81.8463 },
  { label: 'Gorakhpur, Uttar Pradesh', lat: 26.7606, lon: 83.3732 },
  { label: 'Agra, Uttar Pradesh', lat: 27.1767, lon: 78.0081 },
  { label: 'New Delhi / Central Delhi', lat: 28.6139, lon: 77.2090 },
  { label: 'Pune, Maharashtra', lat: 18.5204, lon: 73.8567 },
  { label: 'Mumbai, Maharashtra', lat: 19.0760, lon: 72.8777 },
  { label: 'Nagpur, Maharashtra', lat: 21.1458, lon: 79.0882 },
  { label: 'Bengaluru Urban, Karnataka', lat: 12.9716, lon: 77.5946 },
  { label: 'Dharwad, Karnataka', lat: 15.4589, lon: 75.0078 },
  { label: 'Chennai, Tamil Nadu', lat: 13.0827, lon: 80.2707 },
  { label: 'Patna, Bihar', lat: 25.5941, lon: 85.1376 },
  { label: 'Nalanda, Bihar', lat: 25.2016, lon: 85.5186 },
  { label: 'Jaipur, Rajasthan', lat: 26.9124, lon: 75.7873 },
  { label: 'Kolkata, West Bengal', lat: 22.5726, lon: 88.3639 },
  { label: 'Ahmedabad, Gujarat', lat: 23.0225, lon: 72.5714 },
  { label: 'Hyderabad, Telangana', lat: 17.3850, lon: 78.4867 },
  { label: 'Bhopal, Madhya Pradesh', lat: 23.2599, lon: 77.4126 },
  { label: 'Visakhapatnam, Andhra Pradesh', lat: 17.6868, lon: 83.2185 },
  { label: 'Guwahati, Assam', lat: 26.1445, lon: 91.7362 },
  { label: 'Srinagar, Jammu & Kashmir', lat: 34.0837, lon: 74.7973 }
];

const computeDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

export const CitizenEvidenceModal: React.FC<CitizenEvidenceModalProps> = ({
  isOpen,
  onClose,
  prefilledWork,
  onSuccess
}) => {
  const [workId, setWorkId] = useState('');
  const [issueType, setIssueType] = useState('WORK_NOT_STARTED');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<string>('20.5937');
  const [longitude, setLongitude] = useState<string>('78.9629');
  const [claimedProgress, setClaimedProgress] = useState<number>(0);
  const [citizenName, setCitizenName] = useState('');
  const [citizenContact, setCitizenContact] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // AI Real-time Vision Analysis
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    classified_stage: string;
    confidence: number;
    estimated_progress: number;
    summary: string;
    method: string;
  } | null>(null);

  const [geoLocating, setGeoLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // Work site lookup info
  const [workSiteInfo, setWorkSiteInfo] = useState<any | null>(null);

  // Lookup work details when workId changes
  const lookupWork = async (idToLookup: string) => {
    if (!idToLookup.trim()) {
      setWorkSiteInfo(null);
      return;
    }
    try {
      const res = await axios.get(`/api/works/${idToLookup.trim()}`);
      if (res.data) {
        setWorkSiteInfo(res.data);
        if (!prefilledWork && res.data.latitude && res.data.longitude) {
          // If user hasn't manually adjusted, auto-snap to work site
          setLatitude(parseFloat(res.data.latitude).toFixed(5));
          setLongitude(parseFloat(res.data.longitude).toFixed(5));
          setLocationNotice(
            `Aligned to project site: ${res.data.district || ''}, ${res.data.state || ''}`
          );
        }
      }
    } catch {
      setWorkSiteInfo(null);
    }
  };

  useEffect(() => {
    if (prefilledWork) {
      setWorkId(prefilledWork.work_id);
      if (prefilledWork.latitude && prefilledWork.longitude) {
        setLatitude(prefilledWork.latitude.toFixed(5));
        setLongitude(prefilledWork.longitude.toFixed(5));
      }
      if (typeof prefilledWork.completion_percentage === 'number') {
        setClaimedProgress(Math.max(0, prefilledWork.completion_percentage - 20));
      }
      setWorkSiteInfo(prefilledWork);
    }
  }, [prefilledWork]);

  useEffect(() => {
    if (workId.trim() && (!prefilledWork || prefilledWork.work_id !== workId)) {
      const timer = setTimeout(() => {
        lookupWork(workId);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [workId]);

  if (!isOpen) return null;

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLocating(true);
    setErrorMsg(null);
    setLocationNotice('Requesting GPS lock from device sensors...');

    // Tier 1: Try fast Wi-Fi / cell triangulation first (instant on Windows/laptops)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(5);
        const lon = position.coords.longitude.toFixed(5);
        setLatitude(lat);
        setLongitude(lon);
        setGeoLocating(false);
        setLocationNotice(
          `✅ GPS locked: ${lat}, ${lon} (Accuracy: ±${Math.round(position.coords.accuracy)}m)`
        );
      },
      (fastErr) => {
        console.warn('Fast geolocation timed out, trying high accuracy...', fastErr);
        // Tier 2: Try with high accuracy
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude.toFixed(5);
            const lon = position.coords.longitude.toFixed(5);
            setLatitude(lat);
            setLongitude(lon);
            setGeoLocating(false);
            setLocationNotice(
              `✅ High-accuracy GPS locked (Accuracy: ±${Math.round(position.coords.accuracy)}m)`
            );
          },
          (highErr) => {
            setGeoLocating(false);
            setLocationNotice(null);
            let reason = 'Could not access device GPS.';
            if (highErr.code === 1) {
              reason =
                'Browser location permission was denied. Please allow location in your browser URL bar.';
            } else if (highErr.code === 2) {
              reason =
                'Location is turned off in Windows Settings (Settings > Privacy > Location).';
            } else if (highErr.code === 3) {
              reason = 'Device GPS request timed out.';
            }
            setErrorMsg(
              `${reason} You can click "Snap to Site Location" or select your District below.`
            );
          },
          { timeout: 7000, enableHighAccuracy: true }
        );
      },
      { timeout: 4500, enableHighAccuracy: false, maximumAge: 300000 }
    );
  };

  const handleSnapToSite = () => {
    const siteLat = workSiteInfo?.latitude || prefilledWork?.latitude;
    const siteLon = workSiteInfo?.longitude || prefilledWork?.longitude;
    if (siteLat && siteLon) {
      setLatitude(parseFloat(siteLat).toFixed(5));
      setLongitude(parseFloat(siteLon).toFixed(5));
      setLocationNotice(
        `📍 Snapped to project site centroid: ${workSiteInfo?.district || prefilledWork?.district || ''}, ${workSiteInfo?.state || prefilledWork?.state || ''}`
      );
      setErrorMsg(null);
    } else {
      setErrorMsg('No official site coordinates recorded for this Work ID yet.');
    }
  };

  const handleSelectDistrictPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = DISTRICT_PRESETS.find((p) => p.label === e.target.value);
    if (selected && selected.lat !== null && selected.lon !== null) {
      setLatitude(selected.lat.toFixed(5));
      setLongitude(selected.lon.toFixed(5));
      setLocationNotice(`📍 Location set to ${selected.label}`);
      setErrorMsg(null);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPreviewUrl(URL.createObjectURL(file));

      // Trigger automatic AI Vision analysis
      setAnalyzingPhoto(true);
      setAiAnalysis(null);
      try {
        const formData = new FormData();
        formData.append('photo', file);
        if (workId.trim()) formData.append('work_id', workId.trim());

        const res = await axios.post('/api/citizen-evidence/analyze-photo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data?.analysis) {
          const analysis = res.data.analysis;
          setAiAnalysis(analysis);

          // Auto-set the progress slider to AI estimated progress
          if (typeof analysis.estimated_progress === 'number') {
            setClaimedProgress(Math.round(analysis.estimated_progress));
          }

          // If empty site detected, select Work Not Started / Ghost Work
          if (analysis.classified_stage === 'EMPTY_SITE') {
            setIssueType('WORK_NOT_STARTED');
          }

          // If description is empty or short, auto-populate with AI summary
          if (analysis.summary && description.trim().length < 10) {
            setDescription(analysis.summary);
          }
        }
      } catch (err) {
        console.warn('AI photo analysis skipped:', err);
      } finally {
        setAnalyzingPhoto(false);
      }
    }
  };

  // Compute live distance if site coordinates exist
  const siteLat = workSiteInfo?.latitude || prefilledWork?.latitude;
  const siteLon = workSiteInfo?.longitude || prefilledWork?.longitude;
  const curLat = parseFloat(latitude);
  const curLon = parseFloat(longitude);
  const liveDist =
    siteLat && siteLon && !isNaN(curLat) && !isNaN(curLon)
      ? computeDistanceKm(curLat, curLon, parseFloat(siteLat), parseFloat(siteLon))
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!workId.trim()) {
      setErrorMsg('Please enter or select a valid Work ID.');
      return;
    }
    if (description.trim().length < 10) {
      setErrorMsg('Please provide a descriptive observation (at least 10 characters).');
      return;
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    if (isNaN(latNum) || isNaN(lonNum)) {
      setErrorMsg('Please enter valid numeric latitude and longitude coordinates.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('work_id', workId.trim());
      formData.append('issue_type', issueType);
      formData.append('description', description.trim());
      formData.append('latitude', latNum.toString());
      formData.append('longitude', lonNum.toString());
      formData.append('claimed_progress', claimedProgress.toString());

      if (aiAnalysis?.summary) {
        formData.append('ai_summary', aiAnalysis.summary);
      }
      if (aiAnalysis && typeof aiAnalysis.estimated_progress === 'number') {
        formData.append('ai_estimated_progress', aiAnalysis.estimated_progress.toString());
      }

      if (!isAnonymous && citizenName.trim()) {
        formData.append('citizen_name', citizenName.trim());
      }
      if (!isAnonymous && citizenContact.trim()) {
        formData.append('citizen_contact', citizenContact.trim());
      }

      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await axios.post('/api/citizen-evidence', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccessMsg(res.data.message || 'Evidence submitted successfully.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1600);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to submit citizen evidence. Please try again.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold tracking-tight">Citizen Ground Evidence</h3>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded font-mono uppercase tracking-wider border border-indigo-400/30">
                  Feature 7.6
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Submit photographic proof & ground observations for MPLADS works
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Advisory Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-start space-x-2 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Supervisory Early Warning Mandate:</strong> Citizen evidence acts as a supporting early-warning signal to trigger supervisory field verification. Reports do not constitute final administrative proof without field validation.
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {locationNotice && (
            <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="font-medium">{locationNotice}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* Associated Work ID */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Associated Work ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={workId}
              onChange={(e) => setWorkId(e.target.value)}
              placeholder="e.g. TEST_UP_001, MPLADS-18LS-UP-01898, etc."
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {workSiteInfo && (
              <div className="mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-[11px] text-slate-700">
                <span className="truncate max-w-sm">
                  <strong>{workSiteInfo.work_id}:</strong> {workSiteInfo.work_description || `${workSiteInfo.district || ''}, ${workSiteInfo.state || ''}`}
                </span>
                {workSiteInfo.latitude && workSiteInfo.longitude && (
                  <button
                    type="button"
                    onClick={handleSnapToSite}
                    className="ml-2 px-2 py-0.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded font-semibold text-[10px] shrink-0 transition"
                  >
                    📍 Snap to Site
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Issue Category */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Ground Observation Category <span className="text-red-500">*</span>
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              {ISSUE_TYPES.map((it) => (
                <option key={it.value} value={it.value}>
                  {it.label}
                </option>
              ))}
            </select>
          </div>

          {/* Photo Upload & Preview */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Photographic Proof from Ground
            </label>
            <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-4 text-center transition bg-slate-50/50">
              {previewUrl ? (
                <div className="relative inline-block">
                  <img
                    src={previewUrl}
                    alt="Ground Evidence Preview"
                    className="max-h-40 rounded-lg shadow-sm object-cover mx-auto"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center space-y-1">
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-indigo-600 font-semibold hover:underline">
                    Click to capture or upload on-site photograph
                  </span>
                  <span className="text-[10px] text-slate-500">Supports JPG, PNG, WebP (Max 10MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* AI Real-time Vision Summary & Stage Analysis */}
            {analyzingPhoto && (
              <div className="mt-2.5 p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center space-x-2 text-indigo-800 text-xs animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span className="font-medium">AI Computer Vision (Gemini 3.6 Flash) analyzing site image...</span>
              </div>
            )}

            {aiAnalysis && !analyzingPhoto && (
              <div className="mt-2.5 p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/90 to-purple-50/60 border border-indigo-200 text-xs text-indigo-950 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-indigo-900">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>AI Computer Vision Ground Analysis</span>
                  </div>
                  <span className="text-[10px] bg-indigo-600 text-white font-mono font-semibold px-2.5 py-0.5 rounded-full shadow-xs">
                    {aiAnalysis.classified_stage.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white/90 p-2 rounded-lg border border-indigo-100 shadow-xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">AI Estimated Progress</span>
                    <strong className="text-indigo-700 font-mono text-sm font-bold">{aiAnalysis.estimated_progress}%</strong>
                  </div>
                  <div className="bg-white/90 p-2 rounded-lg border border-indigo-100 shadow-xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Model Confidence</span>
                    <strong className="text-emerald-700 font-mono text-sm font-bold">{aiAnalysis.confidence}%</strong>
                  </div>
                </div>

                {aiAnalysis.summary && (
                  <div className="bg-white/95 p-3 rounded-lg border border-indigo-100 text-[11px] space-y-1.5 shadow-xs">
                    <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">
                      AI Visual Ground Summary
                    </span>
                    <p className="text-slate-700 leading-relaxed italic">
                      "{aiAnalysis.summary}"
                    </p>
                    <button
                      type="button"
                      onClick={() => setDescription(aiAnalysis.summary)}
                      className="mt-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition underline"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Use this AI summary as observation report
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* GPS Coordinates & Geolocation Capture */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-slate-800 flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                Reporting Location (GPS Coordinates) <span className="text-red-500 ml-0.5">*</span>
              </span>

              {/* Location Action Buttons */}
              <div className="flex items-center space-x-1.5">
                {(workSiteInfo?.latitude || prefilledWork?.latitude) && (
                  <button
                    type="button"
                    onClick={handleSnapToSite}
                    className="flex items-center space-x-1 text-[11px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2 py-1 rounded font-semibold border border-emerald-300 transition"
                    title="Set coordinates directly to the official project site"
                  >
                    <Target className="w-3 h-3 text-emerald-700" />
                    <span>Snap to Site</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={geoLocating}
                  className="flex items-center space-x-1 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded font-semibold shadow-sm transition disabled:opacity-50"
                  title="Detect GPS coordinates using your device"
                >
                  <Navigation className={`w-3 h-3 ${geoLocating ? 'animate-spin' : ''}`} />
                  <span>{geoLocating ? 'Detecting GPS...' : 'Auto-Detect Location'}</span>
                </button>
              </div>
            </div>

            {/* District Quick-Picker Dropdown */}
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">
                District / City Quick-Picker (if device GPS unavailable)
              </label>
              <select
                onChange={handleSelectDistrictPreset}
                defaultValue="Select District Preset..."
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:ring-1 focus:ring-indigo-500"
              >
                {DISTRICT_PRESETS.map((p, idx) => (
                  <option key={idx} value={p.label}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Latitude & Longitude Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 block">Latitude</label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  required
                  placeholder="e.g. 25.3176"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block">Longitude</label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  required
                  placeholder="e.g. 82.9739"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Real-time Proximity Feedback */}
            {liveDist !== null && (
              <div
                className={`p-2 rounded-lg text-[11px] font-medium flex items-center justify-between border ${
                  liveDist <= 1.0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : liveDist <= 5.0
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                <span>
                  {liveDist <= 1.0
                    ? `🟢 High Proximity: ${liveDist} km from recorded work site (On-Site Match)`
                    : liveDist <= 5.0
                    ? `🟡 Vicinity: ${liveDist} km from recorded work site`
                    : `🔴 Location Mismatch: ${liveDist} km from recorded work site`}
                </span>
                {liveDist > 1.0 && (
                  <button
                    type="button"
                    onClick={handleSnapToSite}
                    className="text-[10px] font-bold text-indigo-700 hover:underline ml-2 shrink-0"
                  >
                    Align to Site
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Claimed Physical Completion Percentage */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-bold text-slate-800 flex items-center flex-wrap gap-1.5">
                <span>Observed Physical Progress on Site:</span>
                <span className="text-indigo-600 font-mono font-bold">{claimedProgress}%</span>
                {aiAnalysis && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-300">
                    <Sparkles className="w-3 h-3 text-emerald-600" /> Auto-Detected by AI
                  </span>
                )}
              </label>
              {(workSiteInfo?.completion_percentage !== undefined ||
                prefilledWork?.completion_percentage !== undefined) && (
                <span className="text-[11px] text-slate-500">
                  Official Portal Claims:{' '}
                  <strong>
                    {workSiteInfo?.completion_percentage ?? prefilledWork?.completion_percentage}%
                  </strong>
                </span>
              )}
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={claimedProgress}
              onChange={(e) => setClaimedProgress(parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>0% (Not Started)</span>
              <span>25% (Foundation)</span>
              <span>50% (Structural)</span>
              <span>75% (Finishing)</span>
              <span>100% (Completed)</span>
            </div>
          </div>

          {/* Narrative Report */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Detailed Observation Report <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe physical conditions, visible machinery, structural cracks, lack of laborers, or functioning status..."
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Citizen Reporter Info */}
          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800">Reporter Information</span>
              <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Submit Anonymously</span>
              </label>
            </div>

            {!isAnonymous && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 block">Name</label>
                  <input
                    type="text"
                    value={citizenName}
                    onChange={(e) => setCitizenName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block">Phone or Email (Optional)</label>
                  <input
                    type="text"
                    value={citizenContact}
                    onChange={(e) => setCitizenContact(e.target.value)}
                    placeholder="For official verification follow-up"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-600/20 disabled:opacity-50 transition flex items-center space-x-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting Signal...' : 'Submit Ground Evidence'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
