import React from 'react';
import { 
  TrendingUp, 
  Camera, 
  CopyCheck, 
  Network, 
  BookOpenCheck, 
  ShieldAlert 
} from 'lucide-react';

export const Capabilities: React.FC = () => {
  const cards = [
    {
      title: 'Financial Risk Intelligence',
      description: 'Detect unusual expenditure patterns, financial anomalies and high-risk transactions using explainable AI.',
      icon: TrendingUp,
      tag: 'Anomaly Isolation',
      accent: 'text-blue-700',
      bgAccent: 'bg-blue-50',
    },
    {
      title: 'Project Progress Verification',
      description: 'Use computer vision and project evidence to identify inconsistencies between reported and observed progress.',
      icon: Camera,
      tag: 'Computer Vision',
      accent: 'text-emerald-700',
      bgAccent: 'bg-emerald-50',
    },
    {
      title: 'Duplicate Work Detection',
      description: 'Identify potentially duplicated assets, projects and records using semantic and visual similarity.',
      icon: CopyCheck,
      tag: 'Vector Embeddings',
      accent: 'text-purple-700',
      bgAccent: 'bg-purple-50',
    },
    {
      title: 'Procurement Intelligence',
      description: 'Surface suspicious contractor relationships, concentration patterns and procurement risk signals.',
      icon: Network,
      tag: 'Graph Analytics',
      accent: 'text-amber-700',
      bgAccent: 'bg-amber-50',
    },
    {
      title: 'Statutory AI Copilot',
      description: 'Query official guidelines, rules and programme documents through grounded retrieval with evidence.',
      icon: BookOpenCheck,
      tag: 'RAG Retrieval',
      accent: 'text-indigo-700',
      bgAccent: 'bg-indigo-50',
    },
    {
      title: 'Explainable Risk Scoring',
      description: 'Convert complex signals into interpretable risk scores with supporting evidence for every decision.',
      icon: ShieldAlert,
      tag: 'SHAP Interpretability',
      accent: 'text-rose-700',
      bgAccent: 'bg-rose-50',
    },
  ];

  return (
    <section id="capabilities" className="py-20 bg-slate-50/70 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-14">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-200/70 text-slate-800 text-[11px] font-bold uppercase tracking-wider mb-3">
            <span>Enterprise AI Capabilities</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight leading-tight">
            One intelligence layer for the entire governance lifecycle
          </h2>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            From raw programme data to explainable risk signals and actionable decisions.
          </p>
        </div>

        {/* 3x2 Grid of Capability Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl ${card.bgAccent} flex items-center justify-center ${card.accent} border border-slate-100`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                      {card.tag}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight mb-2">
                    {card.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>System Engine · Verified</span>
                  <span className="font-mono">MOD-{idx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
