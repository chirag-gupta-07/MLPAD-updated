import React from 'react';
import { HomeNavbar } from './HomeNavbar';
import { Hero } from './Hero';
import { TrustStrip } from './TrustStrip';
import { Capabilities } from './Capabilities';
import { Workflow } from './Workflow';
import { IntelligenceVisualization } from './IntelligenceVisualization';
import { RiskIntelligence } from './RiskIntelligence';
import { EvidenceSection } from './EvidenceSection';
import { GovernanceSection } from './GovernanceSection';
import { CTA } from './CTA';
import { HomeFooter } from './HomeFooter';

interface HomePageProps {
  onAccessPlatform: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onAccessPlatform }) => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -72;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* 1. Navbar */}
      <HomeNavbar onAccessPlatform={onAccessPlatform} />

      {/* 2. Hero Section */}
      <Hero
        onExplore={onAccessPlatform}
        onViewIntelligence={() => scrollToSection('intelligence')}
      />

      {/* 3. Trust / Impact Strip */}
      <TrustStrip />

      {/* 4. Core Capabilities (3x2 Grid) */}
      <Capabilities />

      {/* 5. How It Works (4-Step Workflow) */}
      <Workflow />

      {/* 6. Intelligence Layer Visualization */}
      <IntelligenceVisualization />

      {/* 7. Risk Intelligence Split Section */}
      <RiskIntelligence onExploreRisk={onAccessPlatform} />

      {/* 8. Evidence + Explainability Section */}
      <EvidenceSection />

      {/* 9. Governance & Security Navy Section */}
      <GovernanceSection />

      {/* 10. Final CTA */}
      <CTA
        onExplore={onAccessPlatform}
        onLearnMore={() => scrollToSection('capabilities')}
      />

      {/* 11. Footer */}
      <HomeFooter
        onNavigateSection={scrollToSection}
        onAccessPlatform={onAccessPlatform}
      />

    </div>
  );
};
