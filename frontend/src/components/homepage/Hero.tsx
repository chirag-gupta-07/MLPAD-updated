import React from 'react';
import { 
  ArrowRight, ShieldCheck, Activity, BrainCircuit, 
  Sparkles, CheckCircle2, TrendingUp, AlertTriangle, 
  Layers, ChevronRight, Eye
} from 'lucide-react';

interface HeroProps {
  onExplore: () => void;
  onViewIntelligence: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExplore, onViewIntelligence }) => {
  return (
    <section id="overview" className="relative pt-10 pb-16 md:pt-14 md:pb-24 overflow-hidden bg-slate-50/50">
      
      {/* Subtle National Tricolor Top Ambient Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 flex pointer-events-none">
        <div className="flex-1 bg-amber-500/80" />
        <div className="flex-1 bg-slate-200" />
        <div className="flex-1 bg-emerald-600/80" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* ================= LEFT SIDE: Hero Value Prop ================= */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            
            {/* Small Badge */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-2xs mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-[11px] font-bold tracking-wider text-slate-800 uppercase">
                MoSPI • MPLADS • AI GOVERNANCE
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-950 leading-[1.18] font-sans">
              AI-Powered Intelligence for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-800 to-emerald-700 underline decoration-emerald-500/30 decoration-wavy decoration-1">
                Transparent Public Development
              </span>
            </h1>

            {/* Supporting Paragraph */}
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl font-normal">
              An intelligent decision-support and governance platform that helps identify financial anomalies, project delays, duplicate works, procurement risks and emerging patterns across MPLADS allocations.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={onExplore}
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold shadow-xs hover:shadow transition-all group"
              >
                <span>Explore Platform</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={onViewIntelligence}
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-sm font-semibold transition-all shadow-2xs"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                <span>View Intelligence</span>
              </button>
            </div>

            {/* Trust Statement */}
            <div className="mt-6 flex items-center space-x-2 text-xs text-slate-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Built for evidence-based decision making, monitoring and audit readiness.</span>
            </div>

          </div>

          {/* ================= RIGHT SIDE: Abstract AI Governance Visualization ================= */}
          <div className="lg:col-span-5 w-full">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Card Surface */}
              <div className="relative rounded-2xl bg-white border border-slate-200 shadow-md shadow-slate-200/50 p-6 transition-all">
                
                {/* Header of Preview Box */}
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                      <BrainCircuit className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 tracking-tight">AI Governance Analysis</div>
                      <div className="text-[10px] text-slate-500">Project Ref: WS/MP334/2024-2025/144847</div>
                    </div>
                  </div>
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70 text-[10px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>Audit Monitored</span>
                  </div>
                </div>

                {/* 1. Risk Score Indicator & Project Status */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Composite Risk Score
                    </div>
                    <div className="flex items-baseline space-x-2 mt-1">
                      <span className="text-2xl font-black text-amber-600">32.4</span>
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        MODERATE
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1 mt-2 overflow-hidden">
                      <div className="bg-amber-500 h-1 rounded-full" style={{ width: '32.4%' }} />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Project Lifecycle
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1">
                      In Progress · 60%
                    </div>
                    <div className="flex items-center space-x-1 text-[10px] text-emerald-700 font-semibold mt-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Physical Milestones Validated</span>
                    </div>
                  </div>
                </div>

                {/* 2. Financial Anomaly Signal */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-600" />
                      <span>Financial Anomaly Signal</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50">
                      COMPLIANT (12.0)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Zero single-day fund spurts detected. Expenditure rate matches declared stage milestones under GFR 2017.
                  </p>
                </div>

                {/* 3. Network Relationship Signal & Geographic Indicators */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs mb-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Procurement & Cartel Graph</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">Degree: Low Concentration</span>
                  </div>
                  
                  {/* Abstract Network Graph Nodes representation */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px]">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      <span className="font-medium text-slate-700">Contractor Node</span>
                    </div>
                    <span className="text-slate-300">─────</span>
                    <div className="flex items-center space-x-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <span className="font-medium text-slate-700">Constituency</span>
                    </div>
                    <span className="text-slate-300">─────</span>
                    <div className="flex items-center space-x-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                      <span className="font-medium text-slate-700">DNO Agency</span>
                    </div>
                  </div>
                </div>

                {/* 4. AI Confidence Indicator footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Multi-Signal Confidence</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    94.8% Reliability
                  </span>
                </div>

              </div>

              {/* Decorative Subtle Ambient Backing */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/5 to-emerald-500/5 rounded-3xl -z-10 blur-md pointer-events-none" />

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
