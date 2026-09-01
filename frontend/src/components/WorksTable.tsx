import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, AlertCircle, ChevronLeft, ChevronRight, Eye, ShieldAlert, ArrowUpDown } from 'lucide-react';
import { WorkDetailModal } from './WorkDetailModal';

export const WorksTable: React.FC = () => {
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Filters
  const [riskLevel, setRiskLevel] = useState<string>('');
  const [sector, setSector] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('composite_risk_score');
  const [sortOrder, setSortOrder] = useState<string>('desc');

  // Selected work for modal
  const [selectedWork, setSelectedWork] = useState<any | null>(null);

  const fetchWorks = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/works', {
        params: {
          page,
          page_size: 15,
          risk_level: riskLevel || undefined,
          sector: sector || undefined,
          search: search || undefined,
          sort_by: sortBy,
          sort_order: sortOrder
        }
      });
      setWorks(res.data.works);
      setTotalPages(res.data.total_pages);
      setTotalRecords(res.data.total_records);
    } catch (e) {
      console.error('Error fetching works:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorks();
  }, [page, riskLevel, sector, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchWorks();
  };

  const getRiskBadge = (level: string, score: number) => {
    if (level === 'HIGH') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1.5"></span>
          HIGH ({score.toFixed(0)})
        </span>
      );
    } else if (level === 'MEDIUM') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5"></span>
          MEDIUM ({score.toFixed(0)})
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
          LOW ({score.toFixed(0)})
        </span>
      );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      
      {/* Header & Controls */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center">
              <ShieldAlert className="w-4 h-4 text-emerald-600 mr-2" />
              MPLADS Works Risk Inspector
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {totalRecords.toLocaleString()} audited infrastructure works ranked by multi-signal risk severity
            </p>
          </div>

          {/* Search bar & filter dropdowns */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search ID, MP, District, Keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </form>

            <select
              value={riskLevel}
              onChange={(e) => { setRiskLevel(e.target.value); setPage(1); }}
              className="text-xs py-1.5 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Risk Tiers</option>
              <option value="HIGH">🔴 High Risk Only</option>
              <option value="MEDIUM">🟡 Medium Risk</option>
              <option value="LOW">🟢 Low Risk / Compliant</option>
            </select>

            <select
              value={sector}
              onChange={(e) => { setSector(e.target.value); setPage(1); }}
              className="text-xs py-1.5 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-[160px] truncate"
            >
              <option value="">All Sectors</option>
              <option value="Roads, Pathways & Bridges">Roads & Bridges</option>
              <option value="Drinking Water Infrastructure">Drinking Water</option>
              <option value="Public Health & Sanitation">Public Health</option>
              <option value="Education & School Infrastructure">Education</option>
              <option value="Community Halls & Public Assets">Community Halls</option>
              <option value="Rural Electrification & Solar Lighting">Solar Lighting</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100/70 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Work ID & Description</th>
              <th className="px-4 py-3">Location (State/District)</th>
              <th className="px-4 py-3">Sector</th>
              <th className="px-4 py-3 text-right">Sanctioned (₹)</th>
              <th className="px-4 py-3 text-right">Expended (₹)</th>
              <th className="px-4 py-3 text-center">Status / Progress</th>
              <th className="px-4 py-3 text-center">Risk Tier</th>
              <th className="px-4 py-3 text-center">Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent mb-2"></div>
                  <p>Evaluating multi-dimensional risk scores...</p>
                </td>
              </tr>
            ) : works.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No works found matching your filter criteria.
                </td>
              </tr>
            ) : (
              works.map((w) => (
                <tr key={w.work_id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-bold text-slate-900 font-mono text-[11px]">{w.work_id}</div>
                    <div className="text-slate-600 truncate mt-0.5 text-xs" title={w.work_description}>
                      {w.work_description}
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-slate-800">{w.district}</div>
                    <div className="text-[11px] text-slate-500">{w.state}</div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                    {w.sector}
                  </td>

                  <td className="px-4 py-3 text-right font-medium text-slate-900 whitespace-nowrap">
                    ₹{(w.sanctioned_amount / 1e5).toFixed(2)} L
                  </td>

                  <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    <span className={w.total_expenditure > w.sanctioned_amount ? 'text-red-600 font-bold' : 'text-slate-800'}>
                      ₹{(w.total_expenditure / 1e5).toFixed(2)} L
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className="text-[11px] font-semibold text-slate-700 block">{w.status}</span>
                    <div className="w-16 bg-slate-200 rounded-full h-1.5 mx-auto mt-1 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          w.completion_percentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${w.completion_percentage}%` }}
                      ></div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {getRiskBadge(w.risk_level, w.composite_risk_score)}
                  </td>

                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => setSelectedWork(w)}
                      className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                      title="Inspect Explainable AI Audit Profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Page <span className="font-semibold text-slate-700">{page}</span> of{' '}
          <span className="font-semibold text-slate-700">{totalPages}</span>
        </span>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedWork && (
        <WorkDetailModal
          work={selectedWork}
          onClose={() => setSelectedWork(null)}
        />
      )}

    </div>
  );
};
