import React from 'react';
import { ArrowRight, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface RiskIntelligenceProps {
  onExploreRisk: () => void;
}

export const RiskIntelligence: React.FC<RiskIntelligenceProps> = ({ onExploreRisk }) => {
  return (
    <section className="py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* LEFT: Simplified Example Risk-Analysis Interface */}
          <div className="lg:col-span-6 w-full">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-md shadow-slate-200/40 p-6 sm:p-7">
              
              {/* Top Meta */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Illustrative Work Inspection
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    Community Center & Solar Installation
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Project Risk</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    Moderate (44.2)
                  </span>
                </div>
              </div>

              {/* 4 Risk Dimensions */}
              <div className="space-y-3.5">
                
                {/* 1. Financial Anomaly - Green */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-800">Financial Anomaly</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Low Risk (14.2)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '14.2%' }} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Sanctioned vs expended ratios consistent with peer projects in the sector.
                  </p>
                </div>

                {/* 2. Project Delay - Amber */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-800">Project Delay</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      Moderate (48.6)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '48.6%' }} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Mild timeline lag observed; scheduled completion requires 30-day monitoring.
                  </p>
                </div>

                {/* 3. Procurement Pattern - Green */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-800">Procurement Pattern</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Low Risk (08.0)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '8%' }} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Competitive bidding compliant with GFR Rule 144. No single-bidder cartel flags.
                  </p>
                </div>

                {/* 4. Duplicate Asset - Amber */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-800">Duplicate Asset Risk</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      Moderate (42.0)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '42%' }} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Adjacent facility identified within 400m radius; flagged for physical verification.
                  </p>
                </div>

              </div>

              {/* Color Code Legend */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-[10px] text-slate-500">
                <span className="font-bold text-slate-600">Standard Thresholds:</span>
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span>0-39 Low</span></span>
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-amber-500" /><span>40-69 Moderate</span></span>
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-rose-500" /><span>70-100 High</span></span>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT: Explanatory Copy & CTA */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold uppercase tracking-wider mb-4">
              <span>Decision Support</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight leading-tight">
              Turn complex signals into clear decisions
            </h2>

            <p className="mt-4 text-base text-slate-600 leading-relaxed font-normal">
              The platform combines multiple independent signals to help decision-makers understand where attention is required and why.
            </p>

            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              Rather than automating administrative sanctions or conclusions, MLPAD equips District Authorities and MoSPI officials with structured, empirical evidence to guide manual inspection and statutory due diligence.
            </p>

            <button
              type="button"
              onClick={onExploreRisk}
              className="mt-8 inline-flex items-center space-x-2 text-sm font-bold text-blue-700 hover:text-blue-900 group"
            >
              <span>Explore Risk Intelligence</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

          </div>

        </div>

      </div>
    </section>
  );
};
