import React from 'react';
import { ShieldCheck, BrainCircuit, FileCheck2, Scale } from 'lucide-react';

export const TrustStrip: React.FC = () => {
  const metrics = [
    {
      title: 'AI Risk Detection',
      description: 'Multi-signal mathematical & statistical anomaly models',
      icon: BrainCircuit,
    },
    {
      title: 'Project Intelligence',
      description: 'Zero-shot computer vision & milestone reality checks',
      icon: ShieldCheck,
    },
    {
      title: 'Evidence-Backed Insights',
      description: 'SHAP-attributed transparency & traceable source records',
      icon: FileCheck2,
    },
    {
      title: 'Audit-Ready Governance',
      description: 'GFR 2017 compliance & public interest defensibility',
      icon: Scale,
    },
  ];

  return (
    <div className="border-y border-slate-200/80 bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {metrics.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex items-start space-x-3.5 p-3.5 rounded-xl hover:bg-slate-50/80 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-800 border border-slate-200/60">
                  <Icon className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
