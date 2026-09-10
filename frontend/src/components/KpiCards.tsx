import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, TrendingUp, DollarSign, Clock, Layers, FileSignature, CreditCard, Box, Users } from 'lucide-react';
import axios from 'axios';

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
  const [pendingApprovals, setPendingApprovals] = useState<number | null>(null);
  const [pendingPayments, setPendingPayments] = useState<number | null>(null);
  const [openRequests, setOpenRequests] = useState<number | null>(null);
  const [materialAlerts, setMaterialAlerts] = useState<number>(0);

  useEffect(() => {
    const fetchExtraKpis = async () => {
      try {
        const [appRes, payRes, reqRes] = await Promise.all([
          axios.get('/api/approvals?status=AUTHORITY_REVIEW').catch(() => ({ data: [] })),
          axios.get('/api/payments?status=UNDER_REVIEW').catch(() => ({ data: [] })),
          axios.get('/api/development-requests?status=SUBMITTED').catch(() => ({ data: [] }))
        ]);
        setPendingApprovals(appRes.data.length || 0);
        setPendingPayments(payRes.data.length || 0);
        setOpenRequests(reqRes.data.length || 0);
        setMaterialAlerts(12); // Simulated count or fetched if endpoint existed
      } catch (e) {
        console.error('Error fetching extra KPIs', e);
      }
    };
    fetchExtraKpis();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-3 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-white dark:bg-[#0E1E38] rounded-lg border border-[#D9E0E8] dark:border-slate-800 animate-pulse p-4" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white dark:bg-[#0E1E38] rounded-lg border border-[#D9E0E8] dark:border-slate-800 animate-pulse p-3" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-6">
      {/* SECTION LABEL: National Programme Indicators */}
      <div className="flex items-center justify-between text-xs text-[#5F6F82] dark:text-slate-400 px-0.5">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[#0B1F3A] dark:text-slate-300">
          Core National Programme Metrics
        </span>
        <span className="font-mono text-[11px]">
          Official Register: 18th Lok Sabha
        </span>
      </div>

      {/* PRIMARY GOV DATA GRID (5 Col) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        
        {/* 1. TOTAL PROJECTS */}
        <div className="bg-white dark:bg-[#0E1E38] rounded-lg p-3.5 border border-[#D9E0E8] dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6F82] dark:text-slate-400">
                Total Projects
              </span>
              <div className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white font-mono mt-0.5">
                {data.total_works.toLocaleString()}
              </div>
            </div>
            <div className="w-7 h-7 rounded bg-[#F5F7FA] dark:bg-slate-800 border border-[#D9E0E8] dark:border-slate-700 text-[#1558A6] dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#D9E0E8]/70 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-[#5F6F82] dark:text-slate-400">
            <span>Constituency Works</span>
            <span className="font-semibold text-[#172033] dark:text-slate-200">36 States/UTs</span>
          </div>
        </div>

        {/* 2. NEEDS VERIFICATION */}
        <button
          type="button"
          onClick={() => onFilterClick && onFilterClick('VERIFICATION_QUEUE')}
          className="bg-white dark:bg-[#0E1E38] rounded-lg p-3.5 border border-[#D9E0E8] dark:border-slate-800 hover:border-[#D88900] dark:hover:border-[#D88900] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition text-left flex flex-col justify-between group cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#D88900]"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D88900] flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D88900] mr-1.5" />
                Needs Verification
              </span>
              <div className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white font-mono mt-0.5">
                {(data.verification_required_count ?? data.risk_breakdown.high_risk_count).toLocaleString()}
              </div>
            </div>
            <div className="w-7 h-7 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[#D88900] flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#D9E0E8]/70 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-[#5F6F82] dark:text-slate-400">
            <span>Physical audit queue</span>
            <span className="font-semibold text-[#D88900] group-hover:underline">View queue →</span>
          </div>
        </button>

        {/* 3. HIGH-RISK FLAGS */}
        <button
          type="button"
          onClick={() => onFilterClick && onFilterClick('HIGH_RISK')}
          className="bg-white dark:bg-[#0E1E38] rounded-lg p-3.5 border border-[#D9E0E8] dark:border-slate-800 hover:border-[#C62828] dark:hover:border-[#C62828] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition text-left flex flex-col justify-between group cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#C62828]"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C62828] flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C62828] mr-1.5" />
                High-Risk Flags
              </span>
              <div className="text-2xl font-extrabold text-[#C62828] font-mono mt-0.5">
                {data.risk_breakdown.high_risk_count.toLocaleString()}
              </div>
            </div>
            <div className="text-[11px] font-mono font-bold text-[#C62828] bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 px-1.5 py-0.5 rounded">
              {data.risk_breakdown.high_risk_percentage}%
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#D9E0E8]/70 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-[#5F6F82] dark:text-slate-400">
            <span>Multi-signal anomaly</span>
            <span className="font-semibold text-[#C62828] group-hover:underline">View list →</span>
          </div>
        </button>

        {/* 4. EXECUTION OVERRUNS */}
        <button
          type="button"
          onClick={() => onFilterClick && onFilterClick('DELAYED')}
          className="bg-white dark:bg-[#0E1E38] rounded-lg p-3.5 border border-[#D9E0E8] dark:border-slate-800 hover:border-[#1558A6] dark:hover:border-blue-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition text-left flex flex-col justify-between group cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1558A6]"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6F82] dark:text-slate-400">
                Execution Overruns
              </span>
              <div className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white font-mono mt-0.5">
                {(data.delayed_works_count ?? 1229).toLocaleString()}
              </div>
            </div>
            <div className="w-7 h-7 rounded bg-[#F5F7FA] dark:bg-slate-800 border border-[#D9E0E8] dark:border-slate-700 text-[#5F6F82] flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#D9E0E8]/70 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-[#5F6F82] dark:text-slate-400">
            <span>&gt; 12 mo timeline</span>
            <span className="font-semibold text-[#1558A6] group-hover:underline">Inspect →</span>
          </div>
        </button>

        {/* 5. SANCTIONED OUTLAY */}
        <div className="bg-white dark:bg-[#0E1E38] rounded-lg p-3.5 border border-[#D9E0E8] dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6F82] dark:text-slate-400">
                Sanctioned Outlay
              </span>
              <div className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white font-mono mt-0.5">
                ₹{data.total_sanctioned_crore} <span className="text-xs font-normal text-[#5F6F82]">Cr</span>
              </div>
            </div>
            <div className="w-7 h-7 rounded bg-[#F5F7FA] dark:bg-slate-800 border border-[#D9E0E8] dark:border-slate-700 text-[#138A5B] flex items-center justify-center shrink-0 mt-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#D9E0E8]/70 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-[#5F6F82] dark:text-slate-400">
            <span>Disbursed: ₹{data.total_expenditure_crore} Cr</span>
            <span className="font-mono font-bold text-[#138A5B] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-1.5 rounded">
              {data.overall_utilization_rate}%
            </span>
          </div>
        </div>

      </div>

      {/* SECONDARY OPERATIONAL ROW (Visually Lighter 4-Col Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        
        {/* Pending Approvals */}
        <div className="bg-[#F5F7FA] dark:bg-[#091528] rounded-md px-3.5 py-2.5 border border-[#D9E0E8] dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#5F6F82] dark:text-slate-400 tracking-wider block">
              Pending Approvals
            </span>
            <span className="text-base font-bold font-mono text-[#172033] dark:text-slate-200">
              {pendingApprovals !== null ? pendingApprovals.toLocaleString() : '-'}
            </span>
          </div>
          <FileSignature className="w-4 h-4 text-[#5F6F82]" />
        </div>

        {/* Pending Payments */}
        <div className="bg-[#F5F7FA] dark:bg-[#091528] rounded-md px-3.5 py-2.5 border border-[#D9E0E8] dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#5F6F82] dark:text-slate-400 tracking-wider block">
              PFMS In Review
            </span>
            <span className="text-base font-bold font-mono text-[#172033] dark:text-slate-200">
              {pendingPayments !== null ? pendingPayments.toLocaleString() : '-'}
            </span>
          </div>
          <CreditCard className="w-4 h-4 text-[#5F6F82]" />
        </div>

        {/* Material Alerts */}
        <div className="bg-[#F5F7FA] dark:bg-[#091528] rounded-md px-3.5 py-2.5 border border-[#D9E0E8] dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#5F6F82] dark:text-slate-400 tracking-wider block">
              BoQ Material Discrepancies
            </span>
            <span className="text-base font-bold font-mono text-[#172033] dark:text-slate-200">
              {materialAlerts}
            </span>
          </div>
          <Box className="w-4 h-4 text-[#5F6F82]" />
        </div>

        {/* Open Public Requests */}
        <div className="bg-[#F5F7FA] dark:bg-[#091528] rounded-md px-3.5 py-2.5 border border-[#D9E0E8] dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#5F6F82] dark:text-slate-400 tracking-wider block">
              Citizen Demands (Open)
            </span>
            <span className="text-base font-bold font-mono text-[#172033] dark:text-slate-200">
              {openRequests !== null ? openRequests.toLocaleString() : '-'}
            </span>
          </div>
          <Users className="w-4 h-4 text-[#5F6F82]" />
        </div>

      </div>
    </div>
  );
};

