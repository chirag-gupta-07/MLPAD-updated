import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface ChartProps {
  summary: any;
}

// Government Risk Palette: High (#C62828), Medium (#D88900), Low (#16865A)
const RISK_COLORS = ['#C62828', '#D88900', '#16865A'];

export const RiskCharts: React.FC<ChartProps> = ({ summary }) => {
  if (!summary) return null;

  const totalMonitored = summary.total_works || (
    (summary.risk_breakdown?.high_risk_count || 0) +
    (summary.risk_breakdown?.medium_risk_count || 0) +
    (summary.risk_breakdown?.low_risk_count || 0)
  );

  const pieData = [
    { name: 'High Risk', value: summary.risk_breakdown?.high_risk_count || 0, code: 'HIGH' },
    { name: 'Medium Risk', value: summary.risk_breakdown?.medium_risk_count || 0, code: 'MEDIUM' },
    { name: 'Low Risk', value: summary.risk_breakdown?.low_risk_count || 0, code: 'LOW' }
  ];

  const sectorData = (summary.sector_risk_overview || []).slice(0, 6).map((s: any) => ({
    sector: s.sector.length > 22 ? s.sector.substring(0, 20) + '...' : s.sector,
    fullSector: s.sector,
    avg_risk: Math.round(s.avg_risk),
    high_risk: s.high_risk_count
  }));

  const maxSectorRisk = Math.max(...sectorData.map((d: any) => d.avg_risk), 0);

  const stateData = (summary.state_risk_overview || []).slice(0, 6).map((st: any) => ({
    state: st.state,
    high_risk: st.high_risk_count,
    total: st.total_works
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      
      {/* 1. National Risk Distribution (Donut with Centered Total) */}
      <div className="bg-white dark:bg-[#0E1E38] p-4 rounded-lg border border-[#D9E0E8] dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex flex-col justify-between">
        <div className="border-b border-[#D9E0E8] dark:border-slate-800 pb-2 mb-2">
          <h4 className="font-bold text-xs text-[#0B1F3A] dark:text-slate-100 uppercase tracking-wider">
            National Risk Distribution
          </h4>
          <p className="text-[11px] text-[#5F6F82] dark:text-slate-400 mt-0.5">
            Distribution of monitored projects by current risk priority
          </p>
        </div>

        <div className="relative h-48 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={54}
                outerRadius={74}
                paddingAngle={3}
                dataKey="value"
                stroke="#FFFFFF"
                strokeWidth={1}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any, name: any) => [`${Number(value).toLocaleString()} Projects`, name]} 
                contentStyle={{ 
                  backgroundColor: '#0B1F3A', 
                  border: '1px solid #1E293B', 
                  color: '#FFFFFF', 
                  borderRadius: '6px',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
                }} 
                itemStyle={{ color: '#FFFFFF' }}
                labelStyle={{ color: '#FFFFFF', fontWeight: 600 }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center Stat Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-base font-extrabold text-[#0B1F3A] dark:text-white font-mono leading-tight">
              {Number(totalMonitored).toLocaleString()}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#5F6F82] dark:text-slate-400">
              Monitored
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-[#D9E0E8] dark:border-slate-800 text-center text-xs">
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#C62828]" />
              <span className="text-[11px] font-semibold text-[#172033] dark:text-slate-200">High</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#C62828] mt-0.5">
              {(summary.risk_breakdown?.high_risk_count || 0).toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col items-center border-x border-[#D9E0E8] dark:border-slate-800">
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#D88900]" />
              <span className="text-[11px] font-semibold text-[#172033] dark:text-slate-200">Medium</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#D88900] mt-0.5">
              {(summary.risk_breakdown?.medium_risk_count || 0).toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#16865A]" />
              <span className="text-[11px] font-semibold text-[#172033] dark:text-slate-200">Low</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#16865A] mt-0.5">
              {(summary.risk_breakdown?.low_risk_count || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Risk Exposure by Sector (Professional Blue with Top-Exposure Accent) */}
      <div className="bg-white dark:bg-[#0E1E38] p-4 rounded-lg border border-[#D9E0E8] dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex flex-col justify-between">
        <div className="border-b border-[#D9E0E8] dark:border-slate-800 pb-2 mb-2">
          <h4 className="font-bold text-xs text-[#0B1F3A] dark:text-slate-100 uppercase tracking-wider">
            Risk Exposure by Sector
          </h4>
          <p className="text-[11px] text-[#5F6F82] dark:text-slate-400 mt-0.5">
            Average multi-signal risk index (0–100) across infrastructure sectors
          </p>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectorData} layout="vertical" margin={{ left: 5, right: 20, top: 4, bottom: 4 }}>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis 
                dataKey="sector" 
                type="category" 
                width={125} 
                tick={{ fontSize: 11, fill: '#5F6F82' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <Tooltip 
                formatter={(val: any, name: any, item: any) => [
                  `${val} / 100 (Avg Risk Index)`,
                  item.payload.fullSector || 'Sector'
                ]} 
                cursor={{ fill: 'rgba(21, 88, 166, 0.06)' }} 
                contentStyle={{ 
                  backgroundColor: '#0B1F3A', 
                  border: '1px solid #1E293B', 
                  color: '#FFFFFF', 
                  borderRadius: '6px',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
                }} 
                itemStyle={{ color: '#FFFFFF' }}
                labelStyle={{ color: '#FFFFFF', fontWeight: 600 }}
              />
              <Bar dataKey="avg_risk" fill="#1558A6" radius={[0, 3, 3, 0]} barSize={14}>
                {sectorData.map((entry: any, idx: number) => {
                  const isTopExposure = entry.avg_risk === maxSectorRisk && maxSectorRisk > 0;
                  return (
                    <Cell 
                      key={idx} 
                      fill={isTopExposure ? '#0B1F3A' : '#1558A6'} 
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#5F6F82] dark:text-slate-400 pt-2 border-t border-[#D9E0E8] dark:border-slate-800">
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2 bg-[#0B1F3A] rounded-[2px]" />
            <span>Highest Exposure</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2 bg-[#1558A6] rounded-[2px]" />
            <span>Sector Average</span>
          </span>
        </div>
      </div>

      {/* 3. State High-Risk Concentration (Projects Requiring Increased Monitoring) */}
      <div className="bg-white dark:bg-[#0E1E38] p-4 rounded-lg border border-[#D9E0E8] dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex flex-col justify-between">
        <div className="border-b border-[#D9E0E8] dark:border-slate-800 pb-2 mb-2">
          <h4 className="font-bold text-xs text-[#0B1F3A] dark:text-slate-100 uppercase tracking-wider">
            State High-Risk Concentration
          </h4>
          <p className="text-[11px] text-[#5F6F82] dark:text-slate-400 mt-0.5">
            Projects requiring increased monitoring and field audit scrutiny
          </p>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={stateData} 
              layout="vertical" 
              margin={{ left: 5, right: 20, top: 4, bottom: 4 }}
            >
              <XAxis type="number" hide />
              <YAxis 
                dataKey="state" 
                type="category" 
                width={110}
                tick={{ fontSize: 11, fill: '#5F6F82' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <Tooltip 
                formatter={(val: any) => [`${Number(val).toLocaleString()} High-Risk Works`, 'Audit Volume']} 
                cursor={{ fill: 'rgba(198, 40, 40, 0.05)' }} 
                contentStyle={{ 
                  backgroundColor: '#0B1F3A', 
                  border: '1px solid #1E293B', 
                  color: '#FFFFFF', 
                  borderRadius: '6px',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
                }} 
                itemStyle={{ color: '#FFFFFF' }}
                labelStyle={{ color: '#FFFFFF', fontWeight: 600 }}
              />
              <Bar dataKey="high_risk" fill="#C62828" radius={[0, 3, 3, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#5F6F82] dark:text-slate-400 pt-2 border-t border-[#D9E0E8] dark:border-slate-800">
          <span>Decision Support Indicator</span>
          <span className="font-mono font-semibold text-[#172033] dark:text-slate-300">
            {stateData.length} States Evaluated
          </span>
        </div>
      </div>

    </div>
  );
};

