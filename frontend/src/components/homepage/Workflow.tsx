import React from 'react';
import { Database, Cpu, FileCheck, CheckCircle, ArrowRight } from 'lucide-react';

export const Workflow: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Collect',
      description: 'Programme, financial, project and procurement data.',
      icon: Database,
    },
    {
      step: '02',
      title: 'Analyze',
      description: 'AI models identify anomalies, patterns and relationships.',
      icon: Cpu,
    },
    {
      step: '03',
      title: 'Verify',
      description: 'Cross-check signals using documents, images and contextual evidence.',
      icon: FileCheck,
    },
    {
      step: '04',
      title: 'Act',
      description: 'Generate explainable insights, alerts and audit-ready reports.',
      icon: CheckCircle,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-3">
            <span>Governance Methodology</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight">
            From data to defensible decisions
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            A standardized, repeatable 4-step pipeline designed for civil administrative oversight and multi-tier auditing.
          </p>
        </div>

        {/* 4-Step Horizontal Process with Connector Line */}
        <div className="relative">
          
          {/* Subtle Horizontal Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-7 left-[10%] right-[10%] h-0.5 bg-slate-200 -z-0" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {steps.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex flex-col items-center text-center group">
                  
                  {/* Numbered Circle Icon Container */}
                  <div className="w-14 h-14 rounded-full bg-white border-2 border-slate-300 group-hover:border-slate-900 group-hover:shadow-md flex items-center justify-center text-slate-700 group-hover:text-slate-900 transition-all duration-200 mb-5 relative">
                    <Icon className="w-6 h-6 text-blue-700" />
                    <span className="absolute -top-2 -right-2 bg-slate-900 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs font-normal">
                    {item.description}
                  </p>

                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
};
