import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Navbar } from './components/Navbar';
import { KpiCards } from './components/KpiCards';
import { RiskCharts } from './components/RiskCharts';
import { WorksTable } from './components/WorksTable';
import { GisMap } from './components/GisMap';
import { AiAssistant } from './components/AiAssistant';
import { CitizenEvidenceTab } from './components/CitizenEvidenceTab';
import { UploadModal } from './components/UploadModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'works' | 'gis' | 'assistant' | 'evidence'>('overview');
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchSummary = async () => {
    try {
      const res = await axios.get('/api/risk/summary');
      setSummary(res.data);
    } catch (e) {
      console.error('Failed to load risk summary:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openUploadModal={() => setShowUploadModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Tab 1: Executive Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top KPI Cards */}
            <KpiCards data={summary} loading={loading} />

            {/* Visual Risk Charts */}
            <RiskCharts summary={summary} />

            {/* High-Risk Quick Grid */}
            <WorksTable />
          </div>
        )}

        {/* Tab 2: Full Risk Inspector Grid */}
        {activeTab === 'works' && (
          <div className="animate-in fade-in duration-150">
            <WorksTable />
          </div>
        )}

        {/* Tab 3: Interactive Leaflet GIS Map */}
        {activeTab === 'gis' && (
          <div className="animate-in fade-in duration-150">
            <GisMap />
          </div>
        )}

        {/* Tab 4: Citizen Evidence & Ground Reality Signals (Feature 7.6) */}
        {activeTab === 'evidence' && (
          <div className="animate-in fade-in duration-150">
            <CitizenEvidenceTab />
          </div>
        )}

        {/* Tab 5: AI Insights Assistant */}
        {activeTab === 'assistant' && (
          <div className="animate-in fade-in duration-150">
            <AiAssistant />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Smart India Hackathon 2026 · Problem Statement <strong>SIH26102</strong></span>
          <span>Ministry of Statistics and Programme Implementation (MoSPI) · DIID</span>
          <span className="font-semibold text-emerald-700">AI Risk Intelligence & Decision Support Platform v1.0</span>
        </div>
      </footer>

      {/* Upload File Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchSummary();
          }}
        />
      )}

    </div>
  );
};

export default App;
