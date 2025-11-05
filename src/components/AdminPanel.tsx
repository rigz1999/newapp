// ============================================
// SAFE Admin Panel - No Service Role Key Needed
// Path: src/components/AdminPanel.tsx
// Replace your AdminPanel.tsx with this
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, Building2, UserPlus, Shield, RefreshCw, 
  CheckCircle, Trash2, Plus, AlertCircle,
  Search, UserX
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  created_at: string;
}

interface Membership {
  id: string;
  user_id: string;
  org_id: string | null;
  role: string;
  created_at: string;
}

interface UserWithAccess {
  user_id: string;
  hasMembership: boolean;
  orgId?: string;
  orgName?: string;
  role?: string;
}

export default function AdminPanel() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch all organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (orgsError) {
      console.error('Error fetching organizations:', orgsError);
    } else {
      setOrganizations(orgs || []);
    }

    // Fetch all memberships with organization names
    const { data: membershipData, error: membershipsError } = await supabase
      .from('memberships')
      .select(`
        *,
        organizations (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (membershipsError) {
      console.error('Error fetching memberships:', membershipsError);
    } else {
      setMemberships(membershipData || []);
    }

    setLoading(false);
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      alert('Le nom de l\'organisation est requis');
      return;
    }

    setCreating(true);

    const { error } = await supabase
      .from('organizations')
      .insert({
        name: newOrgName.trim(),
        owner_id: null
      });

    if (error) {
      console.error('Error creating organization:', error);
      alert('Erreur: ' + error.message);
    } else {
      alert('✅ Organisation créée !');
      setNewOrgName('');
      setShowNewOrgModal(false);
      fetchData();
    }

    setCreating(false);
  };

  const handleDeleteOrganization = async (orgId: string, orgName: string) => {
    const hasMemberships = memberships.some(m => m.org_id === orgId);
    
    if (hasMemberships) {
      alert('⚠️ Impossible de supprimer cette organisation car elle contient des utilisateurs. Veuillez d\'abord retirer tous les utilisateurs.');
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${orgName}" ?`)) {
      return;
    }

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId);

    if (error) {
      console.error('Error deleting organization:', error);
      alert('Erreur: ' + error.message);
    } else {
      alert('✅ Organisation supprimée');
      fetchData();
    }
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate super admins and regular users
  const superAdmins = memberships.filter(m => m.role === 'super_admin' && !m.org_id);
  const regularMemberships = memberships.filter(m => !(m.role === 'super_admin' && !m.org_id));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-12 h-12 text-slate-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 rounded-xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>
              <p className="text-slate-600">Gérer les utilisateurs et les organisations</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewOrgModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Organisation
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Organisations</p>
            <p className="text-2xl font-bold text-slate-900">{organizations.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Super Admins</p>
            <p className="text-2xl font-bold text-purple-600">{superAdmins.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Utilisateurs</p>
            <p className="text-2xl font-bold text-green-600">{regularMemberships.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Total Membres</p>
            <p className="text-2xl font-bold text-blue-600">{memberships.length}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher une organisation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>
      </div>

      {/* Super Admins Section */}
      {superAdmins.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="p-6 border-b border-slate-200 bg-purple-50">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600" />
              Super Administrateurs ({superAdmins.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {superAdmins.map(membership => (
              <div key={membership.id} className="p-6 bg-purple-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">User ID: {membership.user_id.substring(0, 8)}...</p>
                      <p className="text-sm text-slate-600">Créé le {new Date(membership.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                    Super Admin - Accès Total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Organizations List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-slate-900" />
            Organisations ({filteredOrganizations.length})
          </h2>
        </div>
        <div className="divide-y divide-slate-200">
          {filteredOrganizations.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">Aucune organisation trouvée</p>
              <button
                onClick={() => setShowNewOrgModal(true)}
                className="text-slate-900 hover:underline text-sm"
              >
                Créer une organisation
              </button>
            </div>
          ) : (
            filteredOrganizations.map(org => {
              const orgMemberships = memberships.filter(m => m.org_id === org.id);
              return (
                <OrganizationRow
                  key={org.id}
                  organization={org}
                  memberCount={orgMemberships.length}
                  onDelete={handleDeleteOrganization}
                />
              );
            })
          )}
        </div>
      </div>

      {/* New Organization Modal */}
      {showNewOrgModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Nouvelle Organisation
            </h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom de l'organisation
              </label>
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Acme Corp"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNewOrgModal(false);
                  setNewOrgName('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateOrganization}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {creating ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Organization Row Component
function OrganizationRow({ 
  organization, 
  memberCount,
  onDelete 
}: { 
  organization: Organization;
  memberCount: number;
  onDelete: (orgId: string, orgName: string) => void;
}) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900 text-lg">{organization.name}</p>
            <p className="text-sm text-slate-600">
              {memberCount} utilisateur{memberCount !== 1 ? 's' : ''} • Créée le {new Date(organization.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
            {memberCount} membre{memberCount !== 1 ? 's' : ''}
          </div>
          {memberCount === 0 && (
            <button
              onClick={() => onDelete(organization.id, organization.name)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer l'organisation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}