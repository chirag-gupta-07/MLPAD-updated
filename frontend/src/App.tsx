import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Navbar, TabType } from './components/Navbar';
import { KpiCards } from './components/KpiCards';
import { RiskCharts } from './components/RiskCharts';
import { WorksTable } from './components/WorksTable';
import { GisMap } from './components/GisMap';
import { AiAssistant } from './components/AiAssistant';
import { CitizenEvidenceTab } from './components/CitizenEvidenceTab';
import { UploadModal } from './components/UploadModal';
import { ThemeProvider } from './components/ThemeProvider';
import { ApprovalsPage } from './components/ApprovalsPage';
import { PaymentsPage } from './components/PaymentsPage';
import { DevelopmentRequestsPage } from './components/DevelopmentRequestsPage';
import { ProjectDetailPage } from './components/ProjectDetailPage';
import { TenderManagementPage } from './components/TenderManagementPage';
import { ContractorPortal } from './components/ContractorPortal';
import { MpDashboard } from './components/MpDashboard';
import { CitizenPortal } from './components/CitizenPortal';
import { AuthPage } from './components/AuthPage';
import { IntroSplash } from './components/IntroSplash';

export const App: React.FC = () => {
  const [introCompleted, setIntroCompleted] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('mplads_token') && localStorage.getItem('mplads_user'));
  });
  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    const u = localStorage.getItem('mplads_user');
    return u ? JSON.parse(u) : null;
  });

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const stored = localStorage.getItem('mplads_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.role === 'MP') return 'mp-dashboard';
        if (u.role === 'CONTRACTOR') return 'contractor';
        if (u.role === 'CITIZEN') return 'citizen-portal';
        if (u.role === 'DISTRICT_COLLECTOR') return 'tenders';
        if (u.role === 'VIGILANCE') return 'evidence';
      } catch (e) {}
    }
    return 'overview';
  });

  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

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
    const token = localStorage.getItem('mplads_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchSummary();
    }
  }, [isAuthenticated]);

  const handleAuthSuccess = (user: any, token: string, landingTab: TabType) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setActiveTab(landingTab);
    fetchSummary();
  };

  const handleLogout = () => {
    localStorage.removeItem('mplads_token');
    localStorage.removeItem('mplads_user');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSelectedProject(null);
  };

  const [tableVerificationQueue, setTableVerificationQueue] = useState(false);
  const [tableRiskFilter, setTableRiskFilter] = useState('');

  const handleKpiFilterClick = (filterType: string) => {
    if (filterType === 'VERIFICATION_QUEUE') {
      setTableVerificationQueue(true);
      setTableRiskFilter('');
    } else if (filterType === 'HIGH_RISK') {
      setTableRiskFilter('HIGH');
      setTableVerificationQueue(false);
    } else if (filterType === 'DELAYED') {
      setTableVerificationQueue(true);
      setTableRiskFilter('');
    }
  };

  const handleOpenProject = (work: any) => {
    setSelectedProject(work);
  };

  // 0. Show Intro Splash Animation before anything else when user opens the site
  if (!introCompleted) {
    return <IntroSplash onComplete={() => setIntroCompleted(true)} />;
  }

  // 1. If not authenticated, show official Authorization Gateway Page
  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
        
        {/* Top Navbar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          openUploadModal={() => setShowUploadModal(true)}
          onLogout={handleLogout}
          onRoleChange={(newRole) => {
            if (currentUser) {
              setCurrentUser({ ...currentUser, role: newRole });
            }
          }}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
          {selectedProject ? (
            <div className="animate-in fade-in duration-150 flex-1">
              <ProjectDetailPage work={selectedProject} onClose={() => setSelectedProject(null)} />
            </div>
          ) : (
            <>
              {/* Tab 1: Executive Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Top Operational KPI Hierarchy (Level 1: Critical) */}
                  <KpiCards
                    data={summary}
                    loading={loading}
                    onFilterClick={handleKpiFilterClick}
                  />

                  {/* Visual Risk Charts */}
                  <RiskCharts summary={summary} />

                  {/* High-Risk Quick Grid with connected active filters */}
                  <WorksTable
                    initialVerificationQueue={tableVerificationQueue}
                    initialRiskLevel={tableRiskFilter}
                    onOpenProject={handleOpenProject}
                  />
                </div>
              )}

              {/* Tab 2: Full Risk Inspector Grid */}
              {activeTab === 'works' && (
                <div className="animate-in fade-in duration-150">
                  <WorksTable onOpenProject={handleOpenProject} />
                </div>
              )}

              {/* MP Constituency Command Tab */}
              {activeTab === 'mp-dashboard' && (
                <div className="animate-in fade-in duration-150">
                  <MpDashboard />
                </div>
              )}

              {/* Citizen Transparency & Jan Samwaad Tab */}
              {activeTab === 'citizen-portal' && (
                <div className="animate-in fade-in duration-150">
                  <CitizenPortal />
                </div>
              )}

              {/* Tenders & Procurement Tab */}
              {activeTab === 'tenders' && (
                <div className="animate-in fade-in duration-150">
                  <TenderManagementPage />
                </div>
              )}


              {/* Contractor Portal Tab */}
              {activeTab === 'contractor' && (
                <div className="animate-in fade-in duration-150">
                  <ContractorPortal />
                </div>
              )}

              {/* Approvals Tab */}
              {activeTab === 'approvals' && (
                <div className="animate-in fade-in duration-150">
                  <ApprovalsPage />
                </div>
              )}


              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className="animate-in fade-in duration-150">
                  <PaymentsPage />
                </div>
              )}

              {/* Public Requests Tab */}
              {activeTab === 'public-requests' && (
                <div className="animate-in fade-in duration-150">
                  <DevelopmentRequestsPage />
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
                <div className="animate-in fade-in duration-150 h-full max-h-[800px]">
                  <AiAssistant />
                </div>
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <img src="/logo.png" alt="MLPAD" className="w-5 h-5 object-contain" />
              <span>Smart India Hackathon 2026 · Problem Statement <strong>SIH26102</strong></span>
            </div>
            <span>Ministry of Statistics and Programme Implementation (MoSPI) · DIID</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-500">AI Risk Intelligence & Decision Support Platform v1.0</span>
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
    </ThemeProvider>
  );
};

export default App;
