// ============================================
// Members Management - For Organization Admins
// Path: src/components/Members.tsx
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useOrganization } from '../hooks/useOrganization';
import {
  Users, UserPlus, Trash2, RefreshCw, Shield,
  Mail, Calendar, Edit2, X, AlertCircle, CheckCircle, Clock
} from 'lucide-react';

interface Member {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles: {
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
}

export default function Members() {
  const { user } = useAuth();
  const { organization, loading: orgLoading } = useOrganization(user?.id);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    console.log('Members useEffect - organization:', organization);
    console.log('Members useEffect - orgLoading:', orgLoading);

    if (organization) {
      fetchMembers();
      fetchInvitations();
    } else if (!orgLoading) {
      // Organization is null but we're done loading - stop showing spinner
      setLoading(false);
    }
  }, [organization, orgLoading]);

  const fetchMembers = async () => {
    if (!organization) {
      console.log('No organization, skipping fetchMembers');
      return;
    }

    console.log('Fetching members for org:', organization.id);
    setLoading(true);

    const { data, error } = await supabase
      .from('memberships')
      .select(`
        id,
        user_id,
        role,
        created_at,
        profiles (
          email,
          full_name
        )
      `)
      .eq('org_id', organization.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching members:', error);
      alert('Erreur lors du chargement des membres: ' + error.message);
    } else {
      console.log('Members fetched:', data);
      setMembers(data || []);
    }
    setLoading(false);
  };

  const fetchPendingUsers = async () => {
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    // Get all memberships to filter out users who already have org access
    const { data: allMemberships, error: membershipsError } = await supabase
      .from('memberships')
      .select('user_id, org_id, role');

    if (membershipsError) {
      console.error('Error fetching memberships:', membershipsError);
      return;
    }

    // Filter out users who have org memberships or are super admins
    const userIdsWithOrg = new Set(
      (allMemberships || [])
        .filter(m => m.org_id !== null)
        .map(m => m.user_id)
    );

    const superAdminIds = new Set(
      (allMemberships || [])
        .filter(m => m.role === 'super_admin' && !m.org_id)
        .map(m => m.user_id)
    );

    const pending = (profiles || [])
      .filter(profile => !userIdsWithOrg.has(profile.id) && !superAdminIds.has(profile.id))
      .map(profile => ({
        user_id: profile.id,
        email: profile.email || 'N/A',
        full_name: profile.full_name,
        created_at: profile.created_at
      }));

    setPendingUsers(pending);
  };

  const handleAddMember = async (userId: string, role: string) => {
    if (!organization) return;

    const { error } = await supabase
      .from('memberships')
      .insert({
        user_id: userId,
        org_id: organization.id,
        role: role
      });

    if (error) {
      console.error('Error adding member:', error);
      alert('Erreur lors de l\'ajout du membre: ' + error.message);
    } else {
      setShowAddModal(false);
      fetchMembers();
      fetchPendingUsers();
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    const { error } = await supabase
      .from('memberships')
      .delete()
      .eq('id', selectedMember.id);

    if (error) {
      console.error('Error removing member:', error);
      alert('Erreur: ' + error.message);
    } else {
      setShowRemoveModal(false);
      setSelectedMember(null);
      fetchMembers();
    }
  };

  const handleChangeRole = async (newRole: string) => {
    if (!selectedMember) return;

    const { error } = await supabase
      .from('memberships')
      .update({ role: newRole })
      .eq('id', selectedMember.id);

    if (error) {
      console.error('Error changing role:', error);
      alert('Erreur: ' + error.message);
    } else {
      setShowRoleModal(false);
      setSelectedMember(null);
      fetchMembers();
    }
  };

  const openRemoveModal = (member: Member) => {
    setSelectedMember(member);
    setShowRemoveModal(true);
  };

  const openRoleModal = (member: Member) => {
    setSelectedMember(member);
    setShowRoleModal(true);
  };

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-12 h-12 text-slate-600 animate-spin" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">Vous devez appartenir à une organisation pour gérer les membres.</p>
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
            <div className="p-3 bg-blue-900 rounded-xl">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Gestion des Membres</h1>
              <p className="text-slate-600">{organization.name}</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Ajouter un Membre
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Total Membres</p>
            <p className="text-2xl font-bold text-slate-900">{members.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Administrateurs</p>
            <p className="text-2xl font-bold text-blue-600">
              {members.filter(m => m.role === 'admin').length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Membres</p>
            <p className="text-2xl font-bold text-green-600">
              {members.filter(m => m.role === 'member').length}
            </p>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Membres de l'Organisation</h2>
        </div>

        {members.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">Aucun membre dans cette organisation</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-blue-900 hover:underline text-sm"
            >
              Ajouter le premier membre
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {members.map(member => (
              <div key={member.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold ${
                      member.role === 'admin' ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-green-500 to-teal-600'
                    }`}>
                      {member.profiles?.full_name?.charAt(0) || member.profiles?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {member.profiles?.full_name || 'Utilisateur'}
                      </p>
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        {member.profiles?.email}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        Ajouté le {new Date(member.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                      member.role === 'admin'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {member.role === 'admin' ? 'Administrateur' : 'Membre'}
                    </span>
                    <button
                      onClick={() => openRoleModal(member)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Changer le rôle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openRemoveModal(member)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Retirer ce membre"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        pendingUsers={pendingUsers}
        onAdd={handleAddMember}
      />

      {/* Remove Member Modal */}
      <RemoveMemberModal
        isOpen={showRemoveModal}
        onClose={() => {
          setShowRemoveModal(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        onConfirm={handleRemoveMember}
      />

      {/* Change Role Modal */}
      <ChangeRoleModal
        isOpen={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        onConfirm={handleChangeRole}
      />
    </div>
  );
}

// Add Member Modal Component
function AddMemberModal({
  isOpen,
  onClose,
  pendingUsers,
  onAdd
}: {
  isOpen: boolean;
  onClose: () => void;
  pendingUsers: PendingUser[];
  onAdd: (userId: string, role: string) => void;
}) {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!selectedUser) {
      alert('Veuillez sélectionner un utilisateur');
      return;
    }
    onAdd(selectedUser, selectedRole);
    setSelectedUser('');
    setSelectedRole('member');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900">Ajouter un Membre</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded transition-colors">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">Aucun utilisateur en attente</p>
            <p className="text-sm text-slate-500 mt-2">
              Les nouveaux utilisateurs qui s'inscrivent apparaîtront ici.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sélectionner un utilisateur
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choisir un utilisateur --</option>
                {pendingUsers.map(user => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.full_name || user.email} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rôle
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="member">Membre</option>
                <option value="admin">Administrateur</option>
              </select>
              <p className="text-xs text-slate-500 mt-2">
                {selectedRole === 'admin'
                  ? 'Peut gérer les membres et accéder à toutes les données'
                  : 'Peut accéder et modifier les données de l\'organisation'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
              >
                Ajouter
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Remove Member Modal Component
function RemoveMemberModal({
  isOpen,
  onClose,
  member,
  onConfirm
}: {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onConfirm: () => void;
}) {
  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Retirer le Membre</h3>
            <p className="text-slate-600">
              Êtes-vous sûr de vouloir retirer <strong>{member.profiles?.full_name || member.profiles?.email}</strong> de l'organisation ?
              Cette personne perdra l'accès immédiatement.
            </p>
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
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

// Change Role Modal Component
function ChangeRoleModal({
  isOpen,
  onClose,
  member,
  onConfirm
}: {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onConfirm: (newRole: string) => void;
}) {
  const [newRole, setNewRole] = useState('member');

  useEffect(() => {
    if (member) {
      setNewRole(member.role);
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleConfirm = () => {
    if (newRole === member.role) {
      alert('Le rôle est déjà ' + (newRole === 'admin' ? 'Administrateur' : 'Membre'));
      return;
    }
    onConfirm(newRole);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900">Changer le Rôle</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded transition-colors">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-slate-600 mb-4">
            Modifier le rôle de <strong>{member.profiles?.full_name || member.profiles?.email}</strong>
          </p>

          <label className="block text-sm font-medium text-slate-700 mb-2">
            Nouveau rôle
          </label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="member">Membre</option>
            <option value="admin">Administrateur</option>
          </select>
          <p className="text-xs text-slate-500 mt-2">
            {newRole === 'admin'
              ? 'Peut gérer les membres et accéder à toutes les données'
              : 'Peut accéder et modifier les données de l\'organisation'}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
