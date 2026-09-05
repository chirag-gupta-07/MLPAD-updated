import React, { useState } from 'react';
import axios from 'axios';
import { Upload, X, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV, Excel, or Parquet file.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/data/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to process file. Ensure valid columns.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150 p-6 text-xs text-slate-700 dark:text-slate-300">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Ingest MPLADS Dataset</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Supports official CSV, Excel (.xlsx), and Parquet</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Zone */}
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition bg-slate-50">
          <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="font-semibold text-slate-700 mb-1">Click to select or drag and drop file</p>
          <p className="text-[11px] text-slate-500 mb-3">Automatic column mapping and instant ML evaluation</p>
          <input
            type="file"
            accept=".csv, .xlsx, .xls, .parquet"
            onChange={handleFileChange}
            className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
          />
        </div>

        {/* Selected File Name */}
        {file && (
          <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-emerald-900 font-medium">
            <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Notification */}
        {result && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1 text-emerald-900">
            <div className="flex items-center space-x-1.5 font-bold">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{result.message}</span>
            </div>
            <p className="text-[11px] text-emerald-700">
              Evaluated {result.records_processed} works. Master risk database refreshed.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50 transition flex items-center space-x-1.5"
          >
            {uploading ? (
              <>
                <div className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent mr-1"></div>
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Upload & Evaluate</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
