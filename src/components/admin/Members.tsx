// ============================================
// Members Management - For Organization Admins
// Path: src/components/Members.tsx
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useOrganization } from '../../hooks/useOrganization';
import {
  Users, UserPlus, Trash2, RefreshCw,
  Mail, Calendar, Edit2, X, AlertCircle, Clock, Send
} from 'lucide-react';
import { formatErrorMessage } from '../../utils/errorMessages';
import { AlertModal } from '../common/Modals';
import { logger } from '../../utils/logger';
import { TableSkeleton } from '../common/Skeleton';
import { isValidEmail } from '../../utils/validators';

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successEmail, setSuccessEmail] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', type: 'info' });

  useEffect(() => {
    if (organization) {
      fetchMembers();
      fetchInvitations();
    } else if (!orgLoading) {
      setLoading(false);
    }
  }, [organization, orgLoading]);

  const fetchMembers = async () => {
    if (!organization) return;

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
      setAlertModalConfig({
        title: 'Erreur',
        message: formatErrorMessage(error),
        type: 'error'
      });
      setShowAlertModal(true);
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  };

  const fetchInvitations = async () => {
    if (!organization) return;

    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('org_id', organization.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      // Log error but don't block the UI - invitations are not critical
      logger.error(error, {
        context: 'fetchInvitations',
        organizationId: organization.id,
      });
      // User can still see members even if invitations fail
    } else {
      setInvitations(data || []);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    const { error } = await supabase
      .from('memberships')
      .delete()
      .eq('id', selectedMember.id);

    if (error) {
      setAlertModalConfig({
        title: 'Erreur',
        message: formatErrorMessage(error),
        type: 'error'
      });
      setShowAlertModal(true);
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
      .update({ role: newRole as 'member' | 'admin' | 'super_admin' })
      .eq('id', selectedMember.id);

    if (error) {
      setAlertModalConfig({
        title: 'Erreur',
        message: formatErrorMessage(error),
        type: 'error'
      });
      setShowAlertModal(true);
    } else {
      setShowRoleModal(false);
      setSelectedMember(null);
      fetchMembers();
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      setAlertModalConfig({
        title: 'Erreur',
        message: formatErrorMessage(error),
        type: 'error'
      });
      setShowAlertModal(true);
    } else {
      fetchInvitations();
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
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Membres</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <TableSkeleton rows={8} columns={4} />
        </div>
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

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

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
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Inviter un Membre
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
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
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Invitations</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingInvitations.length}</p>
          </div>
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 mb-6 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            Invitations en attente ({pendingInvitations.length})
          </h2>
          <div className="space-y-3">
            {pendingInvitations.map(inv => (
              <div key={inv.id} className="bg-white rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{inv.first_name} {inv.last_name}</p>
                  <p className="text-sm text-slate-600">{inv.email}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Invité le {new Date(inv.created_at).toLocaleDateString('fr-FR')} • 
                    Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    inv.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {inv.role === 'admin' ? 'Administrateur' : 'Membre'}
                  </span>
                  <button
                    onClick={() => handleCancelInvitation(inv.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Annuler l'invitation"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              onClick={() => setShowInviteModal(true)}
              className="text-blue-900 hover:underline text-sm"
            >
              Inviter le premier membre
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

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        organization={organization}
        userId={user?.id}
        onSuccess={(email: string) => {
          fetchInvitations();
          setShowInviteModal(false);
          setSuccessEmail(email);
          setShowSuccessModal(true);
        }}
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

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        email={successEmail}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        type={alertModalConfig.type}
      />
    </div>
  );
}

// Invite Member Modal Component
function InviteMemberModal({
  isOpen,
  onClose,
  organization,
  userId,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  organization: any;
  userId: string | undefined;
  onSuccess: (email: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
    if (!email || !firstName || !lastName) {
      setAlertConfig({
        title: 'Champs manquants',
        message: 'Veuillez remplir tous les champs',
        type: 'warning'
      });
      setShowAlert(true);
      return;
    }

    // Validate email format
    if (!isValidEmail(email)) {
      setAlertConfig({
        title: 'Email invalide',
        message: 'Veuillez entrer une adresse email valide (ex: nom@exemple.com)',
        type: 'error'
      });
      setShowAlert(true);
      return;
    }

    if (!userId) {
      setAlertConfig({
        title: 'Erreur',
        message: 'Utilisateur non connecté',
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
            orgId: organization.id,
            orgName: organization.name,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi de l\'invitation');
      }

      // Success - trigger success modal
      const invitedEmail = email;
      setEmail('');
      setFirstName('');
      setLastName('');
      setRole('member');
      onSuccess(invitedEmail);
    } catch (error: any) {
      setAlertConfig({
        title: 'Erreur',
        message: formatErrorMessage(error),
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
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

  // Alert modal state
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', type: 'info' });

  useEffect(() => {
    if (member) {
      setNewRole(member.role);
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleConfirm = () => {
    if (newRole === member.role) {
      setAlertConfig({
        title: 'Aucun changement',
        message: 'Le rôle est déjà ' + (newRole === 'admin' ? 'Administrateur' : 'Membre'),
        type: 'info'
      });
      setShowAlert(true);
      return;
    }
    onConfirm(newRole);
  };

  return (
    <>
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