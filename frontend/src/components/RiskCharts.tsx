import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface ChartProps {
  summary: any;
}

const RISK_COLORS = ['#ef4444', '#f59e0b', '#10b981'];

export const RiskCharts: React.FC<ChartProps> = ({ summary }) => {
  if (!summary) return null;

  const pieData = [
    { name: 'High Risk', value: summary.risk_breakdown?.high_risk_count || 0 },
    { name: 'Medium Risk', value: summary.risk_breakdown?.medium_risk_count || 0 },
    { name: 'Low Risk', value: summary.risk_breakdown?.low_risk_count || 0 }
  ];

  const sectorData = (summary.sector_risk_overview || []).slice(0, 6).map((s: any) => ({
    sector: s.sector.length > 20 ? s.sector.substring(0, 18) + '...' : s.sector,
    avg_risk: Math.round(s.avg_risk),
    high_risk: s.high_risk_count
  }));

  const stateData = (summary.state_risk_overview || []).slice(0, 6).map((st: any) => ({
    state: st.state,
    high_risk: st.high_risk_count,
    total: st.total_works
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      
      {/* 1. National Risk Tier Ratio (Donut) */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition">
        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">National Risk Distribution</h4>
        <div className="h-52 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={50}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [`${value} Works`, 'Count']} contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#f8fafc', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-around text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700">
          <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5"></span>High</span>
          <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1.5"></span>Medium</span>
          <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5"></span>Low</span>
        </div>
      </div>

      {/* 2. Sector Risk Distribution */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition">
        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">Top Sectors by Average Risk Score</h4>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectorData} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis dataKey="sector" type="category" width={110} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(val: any) => [`${val}/100`, 'Avg Risk Score']} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#f8fafc', borderRadius: '8px' }} />
              <Bar dataKey="avg_risk" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                {sectorData.map((entry: any, idx: number) => (
                  <Cell key={idx} fill={entry.avg_risk > 50 ? '#ef4444' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Top States by High-Risk Concentration */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition">
        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">State High-Risk Concentration</h4>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stateData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
              <XAxis dataKey="state" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(val: any) => [`${val} High-Risk Works`, 'Count']} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#f8fafc', borderRadius: '8px' }} />
              <Bar dataKey="high_risk" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

