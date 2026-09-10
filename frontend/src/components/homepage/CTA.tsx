import React from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';

interface CTAProps {
  onExplore: () => void;
  onLearnMore: () => void;
}

export const CTA: React.FC<CTAProps> = ({ onExplore, onLearnMore }) => {
  return (
    <section className="py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-tight">
          Make every signal count.
        </h2>

        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Bring financial, project and procurement intelligence together to strengthen monitoring, transparency and evidence-based decision making.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold shadow-sm hover:shadow transition-all group"
          >
            <span>Explore the Platform</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            type="button"
            onClick={onLearnMore}
            className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition-all"
          >
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span>Learn More</span>
          </button>
        </div>

      </div>
    </section>
  );
};
