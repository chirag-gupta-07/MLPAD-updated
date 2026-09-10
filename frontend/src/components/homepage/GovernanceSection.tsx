import React from 'react';
import { Shield, FileCheck, BrainCircuit, UserCheck } from 'lucide-react';

export const GovernanceSection: React.FC = () => {
  const pillars = [
    {
      title: 'Secure',
      description: 'Controlled role-based access for MoSPI, District Authorities, and MPs.',
      icon: Shield,
    },
    {
      title: 'Evidence-Based',
      description: 'Every risk score is backed by verified ground data, photographs, and records.',
      icon: FileCheck,
    },
    {
      title: 'Explainable',
      description: 'Transparent AI model decisions with SHAP attributions instead of black-box outputs.',
      icon: BrainCircuit,
    },
    {
      title: 'Human-in-the-Loop',
      description: 'Civil administrative authorities retain final decision authority on all interventions.',
      icon: UserCheck,
    },
  ];

  return (
    <section id="governance" className="py-20 bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] font-bold uppercase tracking-wider mb-4 border border-slate-700">
            <span>Public Sector AI Governance</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Built for responsible public-sector AI
          </h2>
          <p className="mt-4 text-base text-slate-400 leading-relaxed font-normal">
            Designed around controlled access, traceable evidence, explainable intelligence and human review.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 mb-5 border border-slate-700">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Pillar {idx + 1}</span>
                  <span className="text-emerald-500">Active Standard</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
