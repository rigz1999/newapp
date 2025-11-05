// ============================================
// Admin Panel - ONE ORG PER USER VERSION
// Path: src/components/AdminPanel.tsx
// Replace with this version that enforces one org per user
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, Building2, UserPlus, Shield, RefreshCw, 
  CheckCircle, XCircle, Trash2, Plus, AlertCircle,
  Search, UserX
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  created_at: string;
  raw_user_meta_data: any;
}

interface Organization {
  id: string;
  name: string;
  created_at: string;
}

interface UserWithAccess extends User {
  hasMembership: boolean;
  orgId?: string;
  orgName?: string;
  role?: string;
}

export function AdminPanel() {
  const [users, setUsers] = useState<UserWithAccess[]>([]);
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

    // Fetch all users from auth
    const { data: { users: authUsers }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      setLoading(false);
      return;
    }

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

    // Fetch all memberships
    const { data: memberships, error: membershipsError } = await supabase
      .from('memberships')
      .select(`
        user_id,
        role,
        org_id,
        organizations (
          name
        )
      `);

    if (membershipsError) {
      console.error('Error fetching memberships:', membershipsError);
    }

    // Combine data
    const usersWithAccess: UserWithAccess[] = (authUsers || []).map(user => {
      const membership = memberships?.find(m => m.user_id === user.id);
      return {
        ...user,
        hasMembership: !!membership,
        orgId: membership?.org_id || undefined,
        orgName: membership?.organizations?.name,
        role: membership?.role
      };
    });

    setUsers(usersWithAccess);
    setLoading(false);
  };

  const handleGrantAccess = async (userId: string, orgId: string, role: string = 'member') => {
    // Check if user already has an org membership (not super admin)
    const existingMembership = users.find(u => u.id === userId)?.hasMembership;
    
    if (existingMembership) {
      // User already has access - ask if they want to switch
      const confirmSwitch = confirm(
        'Cet utilisateur a déjà accès à une organisation. Voulez-vous changer son organisation?\n\n' +
        'Ceci supprimera son accès actuel et lui donnera accès à la nouvelle organisation.'
      );
      
      if (!confirmSwitch) return;
      
      // Delete old membership (only non-super-admin ones)
      await supabase
        .from('memberships')
        .delete()
        .eq('user_id', userId)
        .not('org_id', 'is', null); // Don't delete super admin membership
    }

    // Create new membership
    const { error } = await supabase
      .from('memberships')
      .insert({
        user_id: userId,
        org_id: orgId,
        role: role
      });

    if (error) {
      console.error('Error granting access:', error);
      alert('Erreur lors de l\'attribution de l\'accès: ' + error.message);
    } else {
      alert('✅ Accès accordé avec succès !');
      fetchData();
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer l\'accès de cet utilisateur ?')) {
      return;
    }

    // Only delete non-super-admin memberships
    const { error } = await supabase
      .from('memberships')
      .delete()
      .eq('user_id', userId)
      .not('org_id', 'is', null);

    if (error) {
      console.error('Error revoking access:', error);
      alert('Erreur lors de la révocation: ' + error.message);
    } else {
      alert('✅ Accès révoqué');
      fetchData();
    }
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

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.raw_user_meta_data?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate super admins, regular users with access, and users without access
  const superAdmins = filteredUsers.filter(u => u.role === 'super_admin' && !u.orgId);
  const usersWithAccess = filteredUsers.filter(u => u.hasMembership && !(u.role === 'super_admin' && !u.orgId));
  const usersWithoutAccess = filteredUsers.filter(u => !u.hasMembership);

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
            <p className="text-sm text-slate-600 mb-1">Total Utilisateurs</p>
            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Super Admins</p>
            <p className="text-2xl font-bold text-purple-600">{superAdmins.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Avec Accès</p>
            <p className="text-2xl font-bold text-green-600">{usersWithAccess.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">En attente</p>
            <p className="text-2xl font-bold text-yellow-600">{usersWithoutAccess.length}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>
      </div>

      {/* Super Admins */}
      {superAdmins.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="p-6 border-b border-slate-200 bg-purple-50">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600" />
              Super Administrateurs ({superAdmins.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {superAdmins.map(user => (
              <SuperAdminRow key={user.id} user={user} />
            ))}
          </div>
        </div>
      )}

      {/* Users Without Access */}
      {usersWithoutAccess.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              Utilisateurs en attente ({usersWithoutAccess.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {usersWithoutAccess.map(user => (
              <UserRow 
                key={user.id} 
                user={user} 
                organizations={organizations}
                onGrantAccess={handleGrantAccess}
              />
            ))}
          </div>
        </div>
      )}

      {/* Users With Access */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            Utilisateurs avec accès ({usersWithAccess.length})
          </h2>
        </div>
        <div className="divide-y divide-slate-200">
          {usersWithAccess.map(user => (
            <UserRowWithAccess
              key={user.id}
              user={user}
              organizations={organizations}
              onRevokeAccess={handleRevokeAccess}
              onGrantAccess={handleGrantAccess}
            />
          ))}
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

// Super Admin Row Component
function SuperAdminRow({ user }: { user: UserWithAccess }) {
  return (
    <div className="p-6 bg-purple-50/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">
              {user.raw_user_meta_data?.full_name || 'Utilisateur'}
            </p>
            <p className="text-sm text-slate-600">{user.email}</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
          Super Admin - Accès Total
        </div>
      </div>
    </div>
  );
}

// User Row Component (without access)
function UserRow({ 
  user, 
  organizations, 
  onGrantAccess 
}: { 
  user: UserWithAccess; 
  organizations: Organization[];
  onGrantAccess: (userId: string, orgId: string, role: string) => void;
}) {
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');

  const handleGrant = () => {
    if (!selectedOrg) {
      alert('Veuillez sélectionner une organisation');
      return;
    }
    onGrantAccess(user.id, selectedOrg, selectedRole);
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <UserX className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">
                {user.raw_user_meta_data?.full_name || 'Utilisateur'}
              </p>
              <p className="text-sm text-slate-600">{user.email}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Inscrit le {new Date(user.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>

        <div className="flex gap-3">
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="">Sélectionner organisation</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="member">Membre</option>
            <option value="admin">Admin</option>
            <option value="owner">Propriétaire</option>
          </select>

          <button
            onClick={handleGrant}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            Donner accès
          </button>
        </div>
      </div>
    </div>
  );
}

// User Row Component (with access)
function UserRowWithAccess({
  user,
  organizations,
  onRevokeAccess,
  onGrantAccess
}: {
  user: UserWithAccess;
  organizations: Organization[];
  onRevokeAccess: (userId: string) => void;
  onGrantAccess: (userId: string, orgId: string, role: string) => void;
}) {
  const [isChanging, setIsChanging] = useState(false);
  const [newOrg, setNewOrg] = useState('');

  const handleChange = () => {
    if (!newOrg) {
      alert('Veuillez sélectionner une organisation');
      return;
    }
    onGrantAccess(user.id, newOrg, user.role || 'member');
    setIsChanging(false);
  };

  if (isChanging) {
    return (
      <div className="p-6 bg-blue-50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">
                {user.raw_user_meta_data?.full_name || 'Utilisateur'}
              </p>
              <p className="text-sm text-slate-600">{user.email}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <select
              value={newOrg}
              onChange={(e) => setNewOrg(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Nouvelle organisation</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
            <button
              onClick={handleChange}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Changer
            </button>
            <button
              onClick={() => setIsChanging(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">
              {user.raw_user_meta_data?.full_name || 'Utilisateur'}
            </p>
            <p className="text-sm text-slate-600">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">{user.orgName}</p>
            <p className="text-xs text-slate-500">{user.role}</p>
          </div>
          <button
            onClick={() => setIsChanging(true)}
            className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
            title="Changer d'organisation"
          >
            Changer
          </button>
          <button
            onClick={() => onRevokeAccess(user.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Révoquer l'accès"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;