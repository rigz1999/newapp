import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useOrganization } from './hooks/useOrganization';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Projects } from './components/Projects';
import { Coupons } from './components/Coupons';
import { supabase } from './lib/supabase';

function App() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { organization, loading: orgLoading } = useOrganization(user?.id);

  const handleLogout = async () => {
    await supabase.auth.signOut();
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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout organization={effectiveOrg} />}>
          <Route index element={<Dashboard organization={effectiveOrg} />} />
          <Route path="projets" element={<Projects organization={effectiveOrg} />} />
          <Route path="coupons" element={<Coupons organization={effectiveOrg} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
