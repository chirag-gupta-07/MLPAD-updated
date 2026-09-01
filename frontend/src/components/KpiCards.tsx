import React from 'react';
import { AlertTriangle, CheckCircle2, TrendingUp, DollarSign, Clock, Layers } from 'lucide-react';

interface KpiSummary {
  total_works: number;
  total_sanctioned_crore: number;
  total_expenditure_crore: number;
  overall_utilization_rate: number;
  risk_breakdown: {
    high_risk_count: number;
    high_risk_percentage: number;
    medium_risk_count: number;
    medium_risk_percentage: number;
    low_risk_count: number;
    low_risk_percentage: number;
  };
}

export const KpiCards: React.FC<{ data: KpiSummary | null; loading: boolean }> = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white rounded-xl shadow-sm border border-slate-200 animate-pulse p-4" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* Total Works Analyzed */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Works Analyzed</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{data.total_works.toLocaleString()}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs text-slate-500">
          <span className="text-emerald-600 font-semibold flex items-center mr-1">
            <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> 100%
          </span>
          <span>Coverage across 36 States & UTs</span>
        </div>
      </div>

      {/* Budget & Utilization */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sanctioned vs Expenditure</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">₹{data.total_sanctioned_crore} <span className="text-sm font-normal text-slate-500">Cr</span></h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs text-slate-500 justify-between">
          <span>Expended: ₹{data.total_expenditure_crore} Cr</span>
          <span className="font-semibold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
            {data.overall_utilization_rate}% Utilized
          </span>
        </div>
      </div>

      {/* High Risk Flags */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-red-200/80 bg-gradient-to-br from-white to-red-50/30 hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider flex items-center">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> High-Risk Flags
            </p>
            <h3 className="text-2xl font-bold text-red-700 mt-1">{data.risk_breakdown.high_risk_count}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
            {data.risk_breakdown.high_risk_percentage}%
          </div>
        </div>
        <div className="mt-3 text-xs text-red-600 font-medium">
          Requires urgent on-site verification & audit
        </div>
      </div>

      {/* Compliant / Normal Works */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Compliant Works</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{data.risk_breakdown.low_risk_count}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
            {data.risk_breakdown.low_risk_percentage}%
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs text-slate-500">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1" />
          <span>Medium Risk: {data.risk_breakdown.medium_risk_count} ({data.risk_breakdown.medium_risk_percentage}%)</span>
        </div>
      </div>

    </div>
  );
};
