// ============================================
// SAFE Admin Panel - Avec Section "En Attente"
// Path: src/components/AdminPanel.tsx
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, Building2, UserPlus, Shield, RefreshCw, 
  CheckCircle, Trash2, Plus, AlertCircle,
  Search, UserX, ChevronDown, ChevronUp, Edit2, Clock
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

interface PendingUser {
  user_id: string;
  email: string;
  created_at: string;
  full_name?: string;
}

export default function AdminPanel() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [showEditOrgModal, setShowEditOrgModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['pending', 'super-admins', 'organizations']));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (orgsError) {
      console.error('Error fetching organizations:', orgsError);
    } else {
      setOrganizations(orgs || []);
    }

    // Fetch memberships
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

    // Fetch pending users (users without any membership with org_id)
    // We'll query the profiles table to get user info
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    } else {
      // Filter out users who already have an org membership
      const userIdsWithOrg = new Set(
        (membershipData || [])
          .filter(m => m.org_id !== null)
          .map(m => m.user_id)
      );

      const pending = (profilesData || [])
        .filter(profile => !userIdsWithOrg.has(profile.id))
        .map(profile => ({
          user_id: profile.id,
          email: profile.email || 'N/A',
          created_at: profile.created_at,
          full_name: profile.full_name
        }));

      setPendingUsers(pending);
    }

    setLoading(false);
  };

  const handleGrantAccess = async (userId: string, orgId: string, role: string) => {
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

  const handleEditOrganization = async () => {
    if (!editingOrg || !newOrgName.trim()) {
      alert('Le nom de l\'organisation est requis');
      return;
    }

    setCreating(true);

    const { error } = await supabase
      .from('organizations')
      .update({ name: newOrgName.trim() })
      .eq('id', editingOrg.id);

    if (error) {
      console.error('Error updating organization:', error);
      alert('Erreur: ' + error.message);
    } else {
      alert('✅ Organisation modifiée !');
      setNewOrgName('');
      setShowEditOrgModal(false);
      setEditingOrg(null);
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

  const handleRemoveMember = async (membershipId: string, userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer cet utilisateur ?')) {
      return;
    }

    const { error } = await supabase
      .from('memberships')
      .delete()
      .eq('id', membershipId);

    if (error) {
      console.error('Error removing member:', error);
      alert('Erreur: ' + error.message);
    } else {
      alert('✅ Utilisateur retiré');
      fetchData();
    }
  };

  const toggleOrgExpanded = (orgId: string) => {
    setExpandedOrgs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orgId)) {
        newSet.delete(orgId);
      } else {
        newSet.add(orgId);
      }
      return newSet;
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const openEditModal = (org: Organization) => {
    setEditingOrg(org);
    setNewOrgName(org.name);
    setShowEditOrgModal(true);
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <p className="text-sm text-slate-600 mb-1">En attente</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingUsers.length}</p>
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

      {/* Pending Users Section */}
      {pendingUsers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <button
            onClick={() => toggleSection('pending')}
            className="w-full p-6 bg-yellow-50 flex items-center justify-between hover:bg-yellow-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              {expandedSections.has('pending') ? (
                <ChevronUp className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              )}
              <Clock className="w-6 h-6 text-yellow-600" />
              <h2 className="text-xl font-bold text-slate-900">
                Utilisateurs en attente ({pendingUsers.length})
              </h2>
            </div>
          </button>
          
          {expandedSections.has('pending') && (
            <div className="divide-y divide-slate-200">
              {pendingUsers.map(user => (
                <PendingUserRow
                  key={user.user_id}
                  user={user}
                  organizations={organizations}
                  onGrantAccess={handleGrantAccess}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Super Admins Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <button
          onClick={() => toggleSection('super-admins')}
          className="w-full p-6 bg-purple-50 flex items-center justify-between hover:bg-purple-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            {expandedSections.has('super-admins') ? (
              <ChevronUp className="w-5 h-5 text-slate-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-600" />
            )}
            <Shield className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-slate-900">
              Super Administrateurs ({superAdmins.length})
            </h2>
          </div>
        </button>
        
        {expandedSections.has('super-admins') && (
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
        )}
      </div>

      {/* Organizations Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <button
          onClick={() => toggleSection('organizations')}
          className="w-full p-6 border-b border-slate-200 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            {expandedSections.has('organizations') ? (
              <ChevronUp className="w-5 h-5 text-slate-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-600" />
            )}
            <Building2 className="w-6 h-6 text-slate-900" />
            <h2 className="text-xl font-bold text-slate-900">
              Organisations ({filteredOrganizations.length})
            </h2>
          </div>
        </button>

        {expandedSections.has('organizations') && (
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
                const isExpanded = expandedOrgs.has(org.id);
                return (
                  <OrganizationRow
                    key={org.id}
                    organization={org}
                    memberships={orgMemberships}
                    isExpanded={isExpanded}
                    onToggle={() => toggleOrgExpanded(org.id)}
                    onEdit={() => openEditModal(org)}
                    onDelete={handleDeleteOrganization}
                    onRemoveMember={handleRemoveMember}
                  />
                );
              })
            )}
          </div>
        )}
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

      {/* Edit Organization Modal */}
      {showEditOrgModal && editingOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Modifier l'Organisation
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
                  setShowEditOrgModal(false);
                  setNewOrgName('');
                  setEditingOrg(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleEditOrganization}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {creating ? 'Modification...' : 'Modifier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Pending User Row Component
function PendingUserRow({ 
  user, 
  organizations,
  onGrantAccess
}: { 
  user: PendingUser;
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
    onGrantAccess(user.user_id, selectedOrg, selectedRole);
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">
                {user.full_name || 'Utilisateur'}
              </p>
              <p className="text-sm text-slate-600">{user.email}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 ml-13">
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

// Organization Row Component
function OrganizationRow({ 
  organization, 
  memberships,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onRemoveMember
}: { 
  organization: Organization;
  memberships: Membership[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: (orgId: string, orgName: string) => void;
  onRemoveMember: (membershipId: string, userId: string) => void;
}) {
  const memberCount = memberships.length;

  return (
    <div>
      {/* Organization Header */}
      <div className="p-6 hover:bg-slate-50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={onToggle}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              )}
            </button>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
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
            <button
              onClick={onEdit}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Modifier l'organisation"
            >
              <Edit2 className="w-4 h-4" />
            </button>
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

      {/* Members List (Expanded) */}
      {isExpanded && (
        <div className="bg-slate-50 border-t border-slate-200">
          {memberCount === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 text-sm">Aucun utilisateur dans cette organisation</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {memberships.map(membership => (
                <div key={membership.id} className="p-4 pl-20 flex items-center justify-between hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        User: {membership.user_id.substring(0, 12)}...
                      </p>
                      <p className="text-xs text-slate-600">
                        Rôle: <span className="font-medium capitalize">{membership.role}</span> • 
                        Ajouté le {new Date(membership.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveMember(membership.id, membership.user_id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Retirer cet utilisateur"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}