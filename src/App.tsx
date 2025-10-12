import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useOrganization } from './hooks/useOrganization';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Projects } from './components/Projects';
import { Tranches } from './components/Tranches';
import { Subscriptions } from './components/Subscriptions';
import { Coupons } from './components/Coupons';
import { supabase } from './lib/supabase';

type Page = 'dashboard' | 'projects' | 'tranches' | 'subscriptions' | 'coupons';

function App() {
  const { user, loading: authLoading } = useAuth();
  const { organization, loading: orgLoading } = useOrganization(user?.id);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string>('');

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
  };

  const handleSelectProject = (projectId: string) => {
    supabase
      .from('projects')
      .select('project_name')
      .eq('id', projectId)
      .single()
      .then(({ data }) => {
        if (data) {
          setSelectedProjectId(projectId);
          setSelectedProjectName(data.project_name);
          setCurrentPage('tranches');
        }
      });
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

  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!organization) {
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

  if (currentPage === 'dashboard') {
    return (
      <Dashboard
        organization={organization}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />
    );
  }

  if (currentPage === 'projects') {
    return (
      <Projects
        organization={organization}
        onBack={handleBackToDashboard}
        onSelectProject={handleSelectProject}
      />
    );
  }

  if (currentPage === 'tranches' && selectedProjectId) {
    return (
      <Tranches
        projectId={selectedProjectId}
        projectName={selectedProjectName}
        organizationId={organization.id}
        onBack={handleBackToProjects}
      />
    );
  }

  if (currentPage === 'subscriptions') {
    return (
      <Subscriptions
        organizationId={organization.id}
        onBack={handleBackToDashboard}
      />
    );
  }

  if (currentPage === 'coupons') {
    return (
      <Coupons
        organizationId={organization.id}
        onBack={handleBackToDashboard}
      />
    );
  }

  return (
    <Dashboard
      organization={organization}
      onLogout={handleLogout}
      onNavigate={handleNavigate}
    />
  );
}

export default App;
