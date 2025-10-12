import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useOrganization } from './hooks/useOrganization';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Projects } from './components/Projects';
import { ProjectDetail } from './components/ProjectDetail';
import { Investors } from './components/Investors';
import { Tranches } from './components/Tranches';
import { Subscriptions } from './components/Subscriptions';
import { Coupons } from './components/Coupons';
import { supabase } from './lib/supabase';

type Page = 'dashboard' | 'projects' | 'project-detail' | 'investors' | 'investor-detail' | 'tranches' | 'subscriptions' | 'coupons';

function App() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { organization, loading: orgLoading } = useOrganization(user?.id);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string>('');
  const [selectedInvestorId, setSelectedInvestorId] = useState<string | null>(null);
  const [openCreateProjectModal, setOpenCreateProjectModal] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleNavigate = (page: Page, options?: { openCreateModal?: boolean }) => {
    setCurrentPage(page);
    if (page === 'projects' && options?.openCreateModal) {
      setTimeout(() => setOpenCreateProjectModal(true), 0);
    } else {
      setOpenCreateProjectModal(false);
    }
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentPage('project-detail');
  };

  const handleSelectInvestor = (investorId: string) => {
    setSelectedInvestorId(investorId);
    setCurrentPage('investor-detail');
  };

  const handleBackToInvestors = () => {
    setCurrentPage('investors');
    setSelectedInvestorId(null);
  };

  const handleBackToDashboard = () => {
    setCurrentPage('dashboard');
    setSelectedProjectId(null);
    setSelectedProjectName('');
  };

  const handleBackToProjects = () => {
    setCurrentPage('projects');
    setSelectedProjectId(null);
    setSelectedProjectName('');
  };

  if (authLoading || (!isAdmin && orgLoading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!isAdmin && !organization) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Aucune organisation</h2>
          <p className="text-slate-600 mb-6">
            Vous n'êtes membre d'aucune organisation. Contactez votre administrateur.
          </p>
          <button
            onClick={handleLogout}
            className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  const effectiveOrg = organization || { id: 'admin', name: 'Admin', role: 'admin' };

  if (currentPage === 'dashboard') {
    return (
      <Dashboard
        organization={effectiveOrg}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />
    );
  }

  if (currentPage === 'projects') {
    return (
      <Projects
        organization={effectiveOrg}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        onSelectProject={handleSelectProject}
        openCreateModal={openCreateProjectModal}
        onModalClose={() => setOpenCreateProjectModal(false)}
      />
    );
  }

  if (currentPage === 'project-detail' && selectedProjectId) {
    return (
      <ProjectDetail
        projectId={selectedProjectId}
        organization={effectiveOrg}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        onBack={handleBackToProjects}
      />
    );
  }

  if (currentPage === 'tranches' && selectedProjectId) {
    return (
      <Tranches
        projectId={selectedProjectId}
        projectName={selectedProjectName}
        organization={effectiveOrg}
        onBack={handleBackToProjects}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />
    );
  }

  if (currentPage === 'investors') {
    return (
      <Investors
        organization={effectiveOrg}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        onSelectInvestor={handleSelectInvestor}
      />
    );
  }

  if (currentPage === 'subscriptions') {
    return (
      <Subscriptions
        organization={effectiveOrg}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />
    );
  }

  if (currentPage === 'coupons') {
    return (
      <Coupons
        organization={effectiveOrg}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />
    );
  }

  return (
    <Dashboard
      organization={effectiveOrg}
      onLogout={handleLogout}
      onNavigate={handleNavigate}
    />
  );
}

export default App;
