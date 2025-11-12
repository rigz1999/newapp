// ============================================
// Admin Panel - Avec Modals & Vue Détail Utilisateur
// Path: src/components/AdminPanel.tsx
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  Users, Building2, UserPlus, Shield,
  Trash2, Plus, AlertCircle,
  Search, ChevronDown, ChevronUp, Edit2, Clock, Eye, X, Mail, Calendar,
  Send, RefreshCw
} from 'lucide-react';
import { AlertModal } from '../common/Modals';
import { TableSkeleton } from '../common/Skeleton';

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
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

interface Invitation {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  org_id: string;
  organizations?: {
    name: string;
  };
}

interface UserDetail {
  user_id: string;
  email: string;
  full_name?: string;
  created_at: string;
  org_name?: string;
  role?: string;
  is_superadmin?: boolean;
}

export default function AdminPanel() {
  const { isSuperAdmin } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [showEditOrgModal, setShowEditOrgModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRemoveUserModal, setShowRemoveUserModal] = useState(false);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successEmail, setSuccessEmail] = useState('');

  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'org' | 'user' | 'pending_user'; id: string; name: string } | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetail | null>(null);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['invitations', 'pending', 'super-admins', 'organizations']));

  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', type: 'info' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchInvitations = async () => {
    setLoadingInvitations(true);
    const { data, error } = await supabase
      .from('invitations')
      .select(`
        *,
        organizations (
          name
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    console.log('fetchInvitations result:', { data, error, count: data?.length });

    if (error) {
      console.error('Error fetching invitations:', error);
      setAlertModalConfig({
        title: 'Erreur',
        message: 'Erreur lors du chargement des invitations: ' + error.message,
        type: 'error'
      });
      setShowAlertModal(true);
    } else {
      setInvitations(data || []);
    }
    setLoadingInvitations(false);
  };

  const fetchData = async () => {
    setLoading(true);

    // Fetch invitations
    await fetchInvitations();

    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (orgsError) {
      // Error is silently ignored - user can still see other data
    } else {
      setOrganizations(orgs || []);
    }

    const { data: membershipData, error: membershipsError } = await supabase
      .from('memberships')
      .select(`
        *,
        organizations (
          name
        ),
        profiles:user_id (
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (membershipsError) {
      console.error('Error loading memberships:', membershipsError);
    } else {
      console.log('Loaded memberships with profiles:', membershipData);
      setMemberships((membershipData || []) as Membership[]);
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      // Error is silently ignored - user can still see other data
    } else {
      // Trouver tous les user_ids qui ont un membership avec une organisation
      const memberships = (membershipData || []) as Membership[];
      const userIdsWithOrg = new Set(
        memberships
          .filter((m: Membership) => m.org_id !== null)
          .map((m: Membership) => m.user_id)
      );

    }

    setLoading(false);
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      setAlertModalConfig({
        title: 'Erreur',
        message: 'Erreur lors de l\'annulation de l\'invitation: ' + error.message,
        type: 'error'
      });
      setShowAlertModal(true);
    } else {
      fetchInvitations();
    }
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      return;
    }

    setCreating(true);

    const { error } = await supabase
      .from('organizations')
      .insert({
        name: newOrgName.trim()
      });

    if (error) {
      setAlertModalConfig({
        title: 'Erreur',
        message: 'Erreur: ' + error.message,
        type: 'error'
      });
      setShowAlertModal(true);
    } else {
      setNewOrgName('');
      setShowNewOrgModal(false);
      fetchData();
    }

    setCreating(false);
  };

  const handleEditOrganization = async () => {
    if (!editingOrg || !newOrgName.trim()) {
      return;
    }

    setCreating(true);

    const { error } = await supabase
      .from('organizations')
      .update({ name: newOrgName.trim() } as never)
      .eq('id', editingOrg.id);

    if (error) {
      setAlertModalConfig({
        title: 'Erreur',
        message: 'Erreur: ' + error.message,
        type: 'error'
      });
      setShowAlertModal(true);
    } else {
      setNewOrgName('');
      setShowEditOrgModal(false);
      setEditingOrg(null);
      fetchData();
    }

    setCreating(false);
  };

  const confirmDeleteOrganization = (orgId: string, orgName: string) => {
    const hasMemberships = memberships.some(m => m.org_id === orgId);
    
    if (hasMemberships) {
      setAlertModalConfig({
        title: 'Suppression impossible',
        message: 'Impossible de supprimer cette organisation car elle contient des utilisateurs.',
        type: 'warning'
      });
      setShowAlertModal(true);
      return;
    }

    setDeletingItem({ type: 'org', id: orgId, name: orgName });
    setShowDeleteModal(true);
  };

  const handleDeleteOrganization = async () => {
    if (!deletingItem || deletingItem.type !== 'org') return;

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', deletingItem.id);

    if (error) {
      setAlertModalConfig({
        title: 'Erreur',
        message: 'Erreur: ' + error.message,
        type: 'error'
      });
      setShowAlertModal(true);
    } else {
      setShowDeleteModal(false);
      setDeletingItem(null);
      fetchData();
    }
  };

  const confirmRemoveMember = (membershipId: string, userId: string) => {
    setDeletingItem({ type: 'user', id: membershipId, name: userId });
    setShowRemoveUserModal(true);
  };

  const handleRemoveMember = async () => {
    if (!deletingItem || deletingItem.type !== 'user') return;

    console.log('Attempting to remove member (AdminPanel):', deletingItem);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('delete-pending-user', {
        body: { userId: deletingItem.name }
      });

      if (funcError) throw funcError;
      if (data?.error) throw new Error(data.error);

      console.log('Member and user account deleted successfully (AdminPanel)');
      setShowRemoveUserModal(false);
      setDeletingItem(null);
      fetchData();

      setAlertModalConfig({
        title: 'Membre supprimé',
        message: 'Le membre et son compte ont été supprimés avec succès.',
        type: 'success'
      });
      setShowAlertModal(true);
    } catch (error) {
      console.error('Error removing member (AdminPanel):', error);
      setAlertModalConfig({
        title: 'Erreur de suppression',
        message: `Impossible de supprimer ce membre: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        type: 'error'
      });
      setShowAlertModal(true);
    }
  };

  const showUserDetail = async (userId: string) => {
    const membership = memberships.find(m => m.user_id === userId);
    if (membership) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const org = organizations.find(o => o.id === membership.org_id);

      setSelectedUserDetail({
        user_id: userId,
        email: profile?.email || 'N/A',
        full_name: profile?.full_name,
        created_at: profile?.created_at || membership.created_at,
        org_name: org?.name,
        role: membership.role,
        is_superadmin: profile?.is_superadmin || false
      });
      setShowUserDetailModal(true);
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

  // Super admin count (always 1 - the email defined in env)
  const superAdminCount = 1; // There is only one super admin
  const regularMemberships = memberships; // All memberships are regular (admin/member roles only)

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-24 mb-4"></div>
              <div className="h-8 bg-slate-200 rounded w-16"></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-24 mb-4"></div>
              <div className="h-8 bg-slate-200 rounded w-16"></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-24 mb-4"></div>
              <div className="h-8 bg-slate-200 rounded w-16"></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <TableSkeleton rows={10} columns={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>
              <p className="text-slate-600">Gérer les utilisateurs et les organisations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Inviter un Membre
            </button>
            <button
              onClick={() => setShowNewOrgModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Organisation
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Organisations</p>
            <p className="text-2xl font-bold text-slate-900">{organizations.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Super Admins</p>
            <p className="text-2xl font-bold text-purple-600">{superAdminCount}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Utilisateurs</p>
            <p className="text-2xl font-bold text-finixar-green">{regularMemberships.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Invitations</p>
            <p className="text-2xl font-bold text-blue-600">{invitations.length}</p>
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

      {/* Invitations Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="w-full p-6 bg-blue-50 flex items-center justify-between">
          <button
            onClick={() => toggleSection('invitations')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {expandedSections.has('invitations') ? (
              <ChevronUp className="w-5 h-5 text-slate-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-600" />
            )}
            <Send className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">
              Invitations en attente ({invitations.length})
            </h2>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchInvitations();
            }}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Rafraîchir"
            disabled={loadingInvitations}
          >
            <RefreshCw className={`w-4 h-4 ${loadingInvitations ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {expandedSections.has('invitations') && (
          <div className="divide-y divide-slate-200">
            {invitations.length === 0 ? (
              <div className="p-12 text-center">
                <Send className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">Aucune invitation en attente</p>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="text-blue-900 hover:underline text-sm"
                >
                  Inviter un membre
                </button>
              </div>
            ) : (
              invitations.map(invitation => (
                <div key={invitation.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-lg">
                        {invitation.first_name} {invitation.last_name}
                      </p>
                      <p className="text-sm text-slate-600">{invitation.email}</p>
                      {invitation.organizations?.name && (
                        <p className="text-sm text-blue-600 font-medium mt-1">
                          Organisation : {invitation.organizations.name}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        Invité le {new Date(invitation.created_at).toLocaleDateString('fr-FR')} •
                        Expire le {new Date(invitation.expires_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                        invitation.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {invitation.role === 'admin' ? 'Administrateur' : 'Membre'}
                      </span>
                      <button
                        onClick={() => handleCancelInvitation(invitation.id)}
                        className="p-2 text-finixar-red hover:bg-red-50 rounded-lg transition-colors"
                        title="Annuler l'invitation"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

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
              Super Administrateur ({superAdminCount})
            </h2>
          </div>
        </button>
        
        {expandedSections.has('super-admins') && (
          <div className="divide-y divide-slate-200">
            <div className="p-6 bg-purple-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Super Administrateur Système</p>
                    <p className="text-sm text-slate-600">Accès total à toutes les organisations</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                    Super Admin - Accès Total
                  </div>
                </div>
              </div>
            </div>
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
                    onDelete={confirmDeleteOrganization}
                    onRemoveMember={confirmRemoveMember}
                    onViewUser={showUserDetail}
                  />
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <NewOrgModal 
        isOpen={showNewOrgModal}
        onClose={() => {
          setShowNewOrgModal(false);
          setNewOrgName('');
        }}
        orgName={newOrgName}
        setOrgName={setNewOrgName}
        onCreate={handleCreateOrganization}
        creating={creating}
      />

      <EditOrgModal
        isOpen={showEditOrgModal}
        onClose={() => {
          setShowEditOrgModal(false);
          setNewOrgName('');
          setEditingOrg(null);
        }}
        orgName={newOrgName}
        setOrgName={setNewOrgName}
        onEdit={handleEditOrganization}
        creating={creating}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingItem(null);
        }}
        onConfirm={handleDeleteOrganization}
        title="Supprimer l'organisation"
        message={`Êtes-vous sûr de vouloir supprimer "${deletingItem?.name}" ? Cette action est irréversible.`}
      />

      <DeleteConfirmModal
        isOpen={showRemoveUserModal}
        onClose={() => {
          setShowRemoveUserModal(false);
          setDeletingItem(null);
        }}
        onConfirm={handleRemoveMember}
        title="Supprimer l'utilisateur"
        message="⚠️ Êtes-vous sûr de vouloir supprimer cet utilisateur ? Le compte sera définitivement supprimé. Cette action est irréversible."
      />

      <UserDetailModal
        isOpen={showUserDetailModal}
        onClose={() => {
          setShowUserDetailModal(false);
          setSelectedUserDetail(null);
        }}
        user={selectedUserDetail}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        type={alertModalConfig.type}
      />

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        organizations={organizations}
        onSuccess={(email: string) => {
          setShowInviteModal(false);
          setSuccessEmail(email);
          setShowSuccessModal(true);
          // Reload invitations immediately after successful invite
          fetchInvitations();
        }}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        email={successEmail}
      />
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
  onRemoveMember,
  onViewUser
}: { 
  organization: Organization;
  memberships: Membership[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: (orgId: string, orgName: string) => void;
  onRemoveMember: (membershipId: string, userId: string) => void;
  onViewUser: (userId: string) => void;
}) {
  const memberCount = memberships.length;

  return (
    <div>
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
                className="p-2 text-finixar-red hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer l'organisation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

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
                      <Users className="w-4 h-4 text-finixar-green" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {membership.profiles?.full_name || 'Utilisateur'}
                      </p>
                      <p className="text-xs text-slate-600">
                        {membership.profiles?.email || membership.user_id.substring(0, 20) + '...'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Rôle: <span className="font-medium capitalize">{membership.role}</span> •
                        Ajouté le {new Date(membership.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewUser(membership.user_id)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Voir détails"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRemoveMember(membership.id, membership.user_id)}
                      className="p-1.5 text-finixar-red hover:bg-red-50 rounded transition-colors"
                      title="Retirer cet utilisateur"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Modal Components
function NewOrgModal({ isOpen, onClose, orgName, setOrgName, onCreate, creating }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900">Nouvelle Organisation</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded transition-colors">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Nom de l'organisation
          </label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
            placeholder="Acme Corp"
            autoFocus
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onCreate}
            disabled={creating}
            className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {creating ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditOrgModal({ isOpen, onClose, orgName, setOrgName, onEdit, creating }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900">Modifier l'Organisation</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded transition-colors">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Nom de l'organisation
          </label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
            placeholder="Acme Corp"
            autoFocus
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onEdit}
            disabled={creating}
            className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {creating ? 'Modification...' : 'Modifier'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm, title, message }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-finixar-red" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-600">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-finixar-action-delete text-white rounded-lg hover:bg-finixar-action-delete-hover transition-colors"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

function UserDetailModal({ isOpen, onClose, user }: { isOpen: boolean; onClose: () => void; user: UserDetail | null }) {
  if (!isOpen || !user) return null;

  // Déterminer le statut de l'utilisateur
  const isSuperAdmin = user.is_superadmin || false;
  const hasOrganization = !!user.org_name;
  const isPending = !hasOrganization && !isSuperAdmin;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">Détails de l'utilisateur</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded transition-colors">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
              isSuperAdmin ? 'bg-gradient-to-br from-purple-500 to-pink-600' : 
              hasOrganization ? 'bg-gradient-to-br from-blue-500 to-cyan-600' : 
              'bg-gradient-to-br from-yellow-500 to-orange-600'
            }`}>
              {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-semibold text-slate-900 truncate">{user.full_name || 'Utilisateur'}</h4>
              <p className="text-sm text-slate-600">
                {isSuperAdmin ? 'Super Admin' : 
                 user.role ? `Rôle: ${user.role}` : 
                 'En attente d\'approbation'}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-1">Email</p>
                <p className="text-sm font-medium text-slate-900 break-words">{user.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-1">Date d'inscription</p>
                <p className="text-sm font-medium text-slate-900">
                  {new Date(user.created_at).toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
            </div>

            {hasOrganization && (
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 mb-1">Organisation</p>
                  <p className="text-sm font-medium text-slate-900 truncate">{user.org_name}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-1">User ID</p>
                <p className="text-xs font-mono text-slate-700 break-all">{user.user_id}</p>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          {isPending && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <Clock className="w-5 h-5 text-finixar-amber flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                <strong>En attente :</strong> Cet utilisateur n'a pas encore été assigné à une organisation.
              </p>
            </div>
          )}
          
          {isSuperAdmin && (
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-start gap-2">
              <Shield className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-purple-800">
                <strong>Super Admin :</strong> Accès complet à toutes les organisations et fonctionnalités.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// Invite Member Modal Component
function InviteMemberModal({
  isOpen,
  onClose,
  organizations,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  organizations: Organization[];
  onSuccess: (email: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [sending, setSending] = useState(false);

  // Alert modal state
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', type: 'info' });

  if (!isOpen) return null;

  const handleSendInvitation = async () => {
    if (!email || !firstName || !lastName || !selectedOrgId) {
      setAlertConfig({
        title: 'Champs manquants',
        message: 'Veuillez remplir tous les champs',
        type: 'warning'
      });
      setShowAlert(true);
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAlertConfig({
        title: 'Email invalide',
        message: 'Veuillez entrer une adresse email valide',
        type: 'error'
      });
      setShowAlert(true);
      return;
    }

    setSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Session expirée');
      }

      const selectedOrg = organizations.find(o => o.id === selectedOrgId);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email,
            firstName,
            lastName,
            role,
            orgId: selectedOrgId,
            orgName: selectedOrg?.name || 'Organisation',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi de l\'invitation');
      }

      // Success - reset form and trigger success modal
      const invitedEmail = email;
      setEmail('');
      setFirstName('');
      setLastName('');
      setSelectedOrgId('');
      setRole('member');
      onSuccess(invitedEmail);
    } catch (error: any) {
      setAlertConfig({
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'envoi de l\'invitation',
        type: 'error'
      });
      setShowAlert(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-900">Inviter un Membre</h3>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded transition-colors">
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Organisation *
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
              >
                <option value="">Sélectionner une organisation</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                placeholder="exemple@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Prénom *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                placeholder="Jean"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                placeholder="Dupont"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rôle *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
              >
                <option value="member">Membre</option>
                <option value="admin">Administrateur</option>
              </select>
              <p className="text-xs text-slate-500 mt-2">
                {role === 'admin'
                  ? 'Peut gérer les membres et accéder à toutes les données'
                  : 'Peut accéder et modifier les données de l\'organisation'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={sending}
            >
              Annuler
            </button>
            <button
              onClick={handleSendInvitation}
              disabled={sending}
              className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </>
  );
}

// Success Modal Component
function SuccessModal({
  isOpen,
  onClose,
  email
}: {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold text-slate-900 mb-3">
            Invitation envoyée !
          </h3>

          {/* Message */}
          <p className="text-slate-600 mb-2">
            Un email d'invitation a été envoyé à
          </p>
          <p className="text-lg font-semibold text-blue-600 mb-6">
            {email}
          </p>

          {/* Info Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-blue-900 leading-relaxed">
              <strong className="flex items-center gap-2 mb-2">
                <span className="text-lg">📧</span>
                Prochaines étapes :
              </strong>
              <span className="block ml-7">• L'utilisateur recevra un email d'invitation</span>
              <span className="block ml-7">• Il pourra créer son compte en cliquant sur le lien</span>
              <span className="block ml-7">• L'invitation expire dans 7 jours</span>
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
          >
            Parfait ! 🎉
          </button>
        </div>
      </div>
    </div>
  );
}