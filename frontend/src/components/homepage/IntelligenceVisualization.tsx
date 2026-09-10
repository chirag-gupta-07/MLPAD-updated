import React from 'react';
import { 
  TrendingUp, 
  Camera, 
  Network, 
  BookOpen, 
  BrainCircuit, 
  ShieldCheck 
} from 'lucide-react';

export const IntelligenceVisualization: React.FC = () => {
  const capabilities = [
    {
      title: 'Financial Intelligence',
      role: 'Isolation Forest & Benford Fraud Tests',
      icon: TrendingUp,
      pos: 'top-left',
    },
    {
      title: 'Computer Vision',
      role: 'pHash Reuse & CLIP Stage Verification',
      icon: Camera,
      pos: 'top-right',
    },
    {
      title: 'Graph Analytics',
      role: 'NetworkX Centrality & Cartel Clusters',
      icon: Network,
      pos: 'bottom-left',
    },
    {
      title: 'Document Intelligence',
      role: 'RAG Grounded in MPLADS Guidelines',
      icon: BookOpen,
      pos: 'bottom-right',
    },
    {
      title: 'Explainable AI',
      role: 'SHAP Feature Attributions & Evidence',
      icon: ShieldCheck,
      pos: 'bottom-center',
    },
  ];

  return (
    <section id="intelligence" className="py-20 bg-slate-50/70 border-b border-slate-200/80 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-200/70 text-slate-800 text-[11px] font-bold uppercase tracking-wider mb-3">
            <span>Modular AI Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight">
            Multiple intelligence systems. One governance view.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            Consolidated architecture interlinking independent analytical pipelines into a cohesive risk assessment record.
          </p>
        </div>

        {/* Central Connected Network Graphic */}
        <div className="relative max-w-4xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm">
          
          {/* Subtle connecting lines layer (SVG) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" xmlns="http://www.w3.org/2000/svg">
            {/* Center to Top-Left */}
            <line x1="50%" y1="50%" x2="25%" y2="22%" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" className="animate-pulse" />
            {/* Center to Top-Right */}
            <line x1="50%" y1="50%" x2="75%" y2="22%" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" className="animate-pulse" />
            {/* Center to Bottom-Left */}
            <line x1="50%" y1="50%" x2="22%" y2="78%" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" className="animate-pulse" />
            {/* Center to Bottom-Right */}
            <line x1="50%" y1="50%" x2="78%" y2="78%" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" className="animate-pulse" />
            {/* Center to Bottom-Center */}
            <line x1="50%" y1="50%" x2="50%" y2="86%" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" className="animate-pulse" />
          </svg>

          {/* Center Hub Node */}
          <div className="flex justify-center mb-10 md:mb-16">
            <div className="relative z-10 w-32 h-32 rounded-3xl bg-slate-950 text-white shadow-xl flex flex-col items-center justify-center p-3 border-4 border-white">
              <img src="/logo.png" alt="MPLAD" className="w-9 h-9 object-contain mb-1" />
              <div className="text-xs font-black tracking-tight">MPLADS AI</div>
              <div className="text-[9px] text-slate-400 font-medium">Core Engine</div>
              <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[8px] font-bold uppercase tracking-wider shadow-xs">
                Active
              </span>
            </div>
          </div>

          {/* 5 Connected Capability Cards in Balanced Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
            {capabilities.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50/90 hover:bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all flex items-start space-x-3.5"
                >
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                    <Icon className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {item.role}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Supplementary Summary Metric */}
            <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex items-center justify-between col-span-1 md:col-span-2 lg:col-span-1">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Audit Defense
                </div>
                <div className="text-xs font-bold text-white mt-0.5">
                  100% Traceable Attributions
                </div>
              </div>
              <BrainCircuit className="w-5 h-5 text-emerald-400" />
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
