import { Home, Receipt, FolderOpen, Users, TrendingUp, FileText } from 'lucide-react';

interface SidebarProps {
  organization: { id: string; name: string; role: string };
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function Sidebar({ organization, activePage, onNavigate, onLogout }: SidebarProps) {
  return (
    <aside className="w-64 bg-finixar-navy text-white flex flex-col fixed h-screen">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-finixar-teal p-3 rounded-xl">
            <TrendingUp className="w-10 h-10" />
          </div>
          <span className="text-2xl font-bold">Finixar</span>
        </div>

        <nav className="space-y-2">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activePage === 'dashboard'
                ? 'bg-finixar-purple text-white'
                : 'text-slate-300 hover:bg-finixar-purple hover:text-white'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Tableau de bord</span>
          </button>
          <button
            onClick={() => onNavigate('coupons')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activePage === 'coupons'
                ? 'bg-finixar-purple text-white'
                : 'text-slate-300 hover:bg-finixar-purple hover:text-white'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span>Tous les coupons</span>
          </button>
          <button
            onClick={() => onNavigate('projects')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activePage === 'projects'
                ? 'bg-finixar-purple text-white'
                : 'text-slate-300 hover:bg-finixar-purple hover:text-white'
            }`}
          >
            <FolderOpen className="w-5 h-5" />
            <span>Projets</span>
          </button>
          <button
            onClick={() => onNavigate('investors')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activePage === 'investors'
                ? 'bg-finixar-purple text-white'
                : 'text-slate-300 hover:bg-finixar-purple hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Investisseurs</span>
          </button>
          <button
            onClick={() => onNavigate('subscriptions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activePage === 'subscriptions'
                ? 'bg-finixar-purple text-white'
                : 'text-slate-300 hover:bg-finixar-purple hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>Souscriptions</span>
          </button>
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-finixar-teal rounded-full flex items-center justify-center font-semibold">
            {organization.role === 'admin' ? 'AM' : organization.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {organization.role === 'admin' ? 'Admin' : organization.name}
            </p>
            <p className="text-sm text-slate-400 capitalize">
              {organization.role === 'admin' ? 'Manager' : organization.role}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-finixar-purple rounded-lg transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
