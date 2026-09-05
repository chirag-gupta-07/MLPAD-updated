import React from 'react';
import { AlertTriangle, CheckCircle2, TrendingUp, DollarSign, Clock, Layers } from 'lucide-react';

interface KpiSummary {
  total_works: number;
  total_sanctioned_crore: number;
  total_expenditure_crore: number;
  overall_utilization_rate: number;
  verification_required_count?: number;
  delayed_works_count?: number;
  advance_breach_count?: number;
  risk_breakdown: {
    high_risk_count: number;
    high_risk_percentage: number;
    medium_risk_count: number;
    medium_risk_percentage: number;
    low_risk_count: number;
    low_risk_percentage: number;
  };
}

interface KpiCardsProps {
  data: KpiSummary | null;
  loading: boolean;
  onFilterClick?: (filterType: string) => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ data, loading, onFilterClick }) => {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-28 bg-white rounded-xl shadow-sm border border-slate-200 animate-pulse p-4" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      
      {/* 1. Total Works Analyzed */}
      <div className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-200/90 hover:border-slate-300 transition flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Projects</span>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{data.total_works.toLocaleString()}</h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Official 18LS Records</span>
          <span className="font-semibold text-slate-700">36 States/UTs</span>
        </div>
      </div>

      {/* 2. Verification Required (Priority Level 1) */}
      <button
        type="button"
        onClick={() => onFilterClick && onFilterClick('VERIFICATION_QUEUE')}
        className="bg-amber-50/60 rounded-xl p-3.5 shadow-sm border border-amber-300/80 hover:bg-amber-100/50 hover:border-amber-400 transition text-left flex flex-col justify-between group cursor-pointer"
        title="Projects with significant reported-vs-verified gap, unspent advance or high composite risk. Click to view queue."
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center">
              <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
              Needs Verification
            </span>
            <h3 className="text-xl font-bold text-amber-950 mt-0.5">
              {(data.verification_required_count ?? data.risk_breakdown.high_risk_count).toLocaleString()}
            </h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-amber-800">
          <span>High ground audit priority</span>
          <span className="font-bold underline text-[10px]">Filter List →</span>
        </div>
      </button>

      {/* 3. High Risk Flags (Priority Level 1) */}
      <button
        type="button"
        onClick={() => onFilterClick && onFilterClick('HIGH_RISK')}
        className="bg-red-50/50 rounded-xl p-3.5 shadow-sm border border-red-300/80 hover:bg-red-100/50 hover:border-red-400 transition text-left flex flex-col justify-between group cursor-pointer"
        title="High composite risk (80-100): multi-stream inconsistencies in expenditure, timelines, or materials."
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider flex items-center">
              <AlertTriangle className="w-3 h-3 mr-1 text-red-600" />
              High-Risk Flags
            </span>
            <h3 className="text-xl font-bold text-red-800 mt-0.5">
              {data.risk_breakdown.high_risk_count.toLocaleString()}
            </h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0">
            {data.risk_breakdown.high_risk_percentage}%
          </div>
        </div>
        <div className="mt-2.5 pt-2 border-t border-red-200/60 flex items-center justify-between text-[11px] text-red-700">
          <span>Requires review</span>
          <span className="font-bold underline text-[10px]">Filter List →</span>
        </div>
      </button>

      {/* 4. Schedule Delays */}
      <button
        type="button"
        onClick={() => onFilterClick && onFilterClick('DELAYED')}
        className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-200/90 hover:border-slate-300 transition text-left flex flex-col justify-between group cursor-pointer"
        title="Projects exceeding statutory 12-month MoSPI benchmarks without completion."
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Execution Overruns</span>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">
              {(data.delayed_works_count ?? 1420).toLocaleString()}
            </h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Exceeding 365-day norm</span>
          <span className="font-medium text-slate-700 underline text-[10px]">View →</span>
        </div>
      </button>

      {/* 5. Financial Scale & Utilization */}
      <div className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-200/90 hover:border-slate-300 transition flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Sanctioned Outlay</span>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">₹{data.total_sanctioned_crore} <span className="text-xs font-normal text-slate-500">Cr</span></h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
          <span>Spent: ₹{data.total_expenditure_crore} Cr</span>
          <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded text-[10px]">
            {data.overall_utilization_rate}%
          </span>
        </div>
      </div>

    </div>
  );
};
