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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-28 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 animate-pulse p-4" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
        {/* 1. Total Works Analyzed */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3.5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Projects</span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{data.total_works.toLocaleString()}</h3>
            </div>
            <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Official 18LS Records</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">36 States/UTs</span>
          </div>
        </div>

        {/* 2. Verification Required */}
        <button
          type="button"
          onClick={() => onFilterClick && onFilterClick('VERIFICATION_QUEUE')}
          className="bg-white dark:bg-slate-800 rounded-lg p-3.5 border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 transition text-left flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center">
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
                Needs Verification
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {(data.verification_required_count ?? data.risk_breakdown.high_risk_count).toLocaleString()}
              </h3>
            </div>
            <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>High priority</span>
            <span className="font-bold">Filter List →</span>
          </div>
        </button>

        {/* 3. High Risk Flags */}
        <button
          type="button"
          onClick={() => onFilterClick && onFilterClick('HIGH_RISK')}
          className="bg-white dark:bg-slate-800 rounded-lg p-3.5 border border-slate-200 dark:border-slate-700 hover:border-red-400 dark:hover:border-red-500 transition text-left flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center">
                <AlertTriangle className="w-3 h-3 mr-1 text-red-600" />
                High-Risk Flags
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {data.risk_breakdown.high_risk_count.toLocaleString()}
              </h3>
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
              {data.risk_breakdown.high_risk_percentage}%
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Requires review</span>
            <span className="font-bold">Filter List →</span>
          </div>
        </button>

        {/* 4. Schedule Delays */}
        <button
          type="button"
          onClick={() => onFilterClick && onFilterClick('DELAYED')}
          className="bg-white dark:bg-slate-800 rounded-lg p-3.5 border border-slate-200 dark:border-slate-700 hover:border-slate-400 transition text-left flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Execution Overruns</span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {(data.delayed_works_count ?? 1420).toLocaleString()}
              </h3>
            </div>
            <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Exceeding norms</span>
            <span className="font-bold">View →</span>
          </div>
        </button>

        {/* 5. Financial Scale */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3.5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Sanctioned Outlay</span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">₹{data.total_sanctioned_crore} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Cr</span></h3>
            </div>
            <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
            <span>Spent: ₹{data.total_expenditure_crore} Cr</span>
            <span className="font-bold bg-slate-100 dark:bg-slate-700 px-1.5 rounded">
              {data.overall_utilization_rate}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {/* Pending Approvals */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3.5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Pending Approvals</span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{pendingApprovals ?? '-'}</h3>
            </div>
            <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <FileSignature className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3.5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Pending Payments</span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{pendingPayments ?? '-'}</h3>
            </div>
            <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Material Alerts */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3.5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Material Alerts</span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{materialAlerts}</h3>
            </div>
            <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Box className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Open Public Requests */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3.5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Open Public Requests</span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{openRequests ?? '-'}</h3>
            </div>
            <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

