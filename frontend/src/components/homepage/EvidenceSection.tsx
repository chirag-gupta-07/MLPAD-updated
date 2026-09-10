import React from 'react';
import { Sparkles, FileText, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export const EvidenceSection: React.FC = () => {
  return (
    <section className="py-20 bg-slate-50/60 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-200/70 text-slate-800 text-[11px] font-bold uppercase tracking-wider mb-3">
            <span>Traceable Audits</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight">
            Every insight should be explainable.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            AI-generated signals are supported by contextual evidence so authorized stakeholders can review, validate and act with confidence.
          </p>
        </div>

        {/* Elegant Document/Evidence Visualization Card */}
        <div className="max-w-3xl mx-auto rounded-2xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
          
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">AI Insight Trace</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium italic">
              Illustrative verification dossier (Non-operational demo sample)
            </span>
          </div>

          {/* Primary Flag Card */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-amber-950">
                  Potential project delay detected
                </div>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Pace of execution is lagging behind initial milestone milestones by 42 calendar days relative to comparable road construction projects in this district.
                </p>
              </div>
            </div>
          </div>

          {/* Evidence Checklist */}
          <div className="space-y-3 mb-6">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Underlying Evidence Factors:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Reported Completion</span>
                  <span className="text-[11px] text-slate-500 leading-tight">60% self-reported pace vs 38% physical benchmark.</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Historical Timeline</span>
                  <span className="text-[11px] text-slate-500 leading-tight">Zero progress logs recorded during last 75 calendar days.</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Project Image Evidence</span>
                  <span className="text-[11px] text-slate-500 leading-tight">CLIP zero-shot model classified site photo as Foundation stage.</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Financial Expenditure Pattern</span>
                  <span className="text-[11px] text-slate-500 leading-tight">First instalment fully drawn without milestone UC clearance.</span>
                </div>
              </div>

            </div>
          </div>

          {/* Footer Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 bg-slate-50/50 -mx-6 -mb-6 p-4 px-6 rounded-b-2xl">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span className="text-xs font-bold text-slate-800">
                Confidence: <span className="text-blue-700">87%</span>
              </span>
              <span className="text-[11px] text-slate-400">· SHAP Attributed</span>
            </div>

            <span className="text-[11px] text-slate-500 font-medium">
              Human In The Loop Verification Pending
            </span>
          </div>

        </div>

      </div>
    </section>
  );
};
