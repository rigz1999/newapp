// ============================================
// Settings Page - User Profile Management
// Path: src/components/Settings.tsx
// ============================================

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  User,
  Lock,
  Mail,
  Save,
  RefreshCw,
  CheckCircle,
  X,
  AlertCircle,
  Bell,
  Send,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { formatErrorMessage } from '../../utils/errorMessages';
import { CardSkeleton } from '../common/Skeleton';
import { logger } from '../../utils/logger';
import { MFASettings } from '../settings/MFASettings';
import { DataPrivacySettings } from '../settings/DataPrivacySettings';

export default function Settings() {
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const errorMessageRef = useRef<HTMLDivElement>(null);

  // Profile fields
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Reminder settings
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [remind7Days, setRemind7Days] = useState(false);
  const [remind14Days, setRemind14Days] = useState(false);
  const [remind30Days, setRemind30Days] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // Email connection settings
  const [emailConnection, setEmailConnection] = useState<{
    email_address: string;
    connected_at: string;
  } | null>(null);
  const [connectingEmail, setConnectingEmail] = useState(false);

  // Success/Error states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);

  // Password strength checker
  const checkPasswordRequirements = (password: string) => ({
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
    hasMinLength: password.length >= 12,
  });

  const passwordRequirements = checkPasswordRequirements(newPassword);
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  // Scroll to email connection section if hash is present
  useEffect(() => {
    if (window.location.hash === '#email-connection' && !loading) {
      setTimeout(() => {
        const element = document.getElementById('email-connection');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300); // Small delay to ensure content is rendered
    }
  }, [loading]);

  // Scroll to error message when it appears
  useEffect(() => {
    if (errorMessage && errorMessageRef.current) {
      errorMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [errorMessage]);

  const fetchUserProfile = async () => {
    if (!user) {
      return;
    }

    setLoading(true);

    // Get user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      // Error is silently ignored
    } else if (profile) {
      setEmail(profile.email || '');
      // Split full_name into first and last
      if (profile.full_name) {
        const names = profile.full_name.split(' ');
        setFirstName(names[0] || '');
        setLastName(names.slice(1).join(' ') || '');
      }
    }

    // Get reminder settings
    const { data: reminderSettings, error: reminderError } = await supabase
      .from('user_reminder_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!reminderError && reminderSettings) {
      setRemindersEnabled(reminderSettings.enabled);
      setRemind7Days(reminderSettings.remind_7_days);
      setRemind14Days(reminderSettings.remind_14_days);
      setRemind30Days(reminderSettings.remind_30_days);
    }

    // Get email connection
    const { data: emailConn, error: emailError } = await supabase
      .from('user_email_connections')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!emailError && emailConn) {
      setEmailConnection(emailConn);
    }

    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    if (!user) {
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Le prénom et le nom sont obligatoires');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      setErrorMessage(formatErrorMessage(error));
    } else {
      setSuccessMessage('Profil mis à jour avec succès');
      setShowSuccessModal(true);
      // Reload page to update name everywhere
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage('Veuillez remplir tous les champs');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Le mot de passe ne respecte pas tous les critères de sécurité');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage("Le nouveau mot de passe doit être différent de l'ancien");
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      logger.debug('Starting password change process');

      // Get the current session to pass the auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      logger.debug('Session check', { hasSession: !!session, userId: session?.user?.id });

      if (!session) {
        setErrorMessage('Session expirée. Veuillez vous reconnecter.');
        setSaving(false);
        return;
      }

      logger.debug('Calling change-password function');

      // Call the Edge Function to verify current password and update to new one
      const { data, error: functionError } = await supabase.functions.invoke('change-password', {
        body: {
          currentPassword: currentPassword,
          newPassword: newPassword,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      logger.debug('Function response', { data, functionError, dataType: typeof data });

      setSaving(false);

      if (functionError) {
        logger.error(new Error('Function error'), { error: functionError });

        // Fallback error handling
        const errorMsg =
          data?.error || functionError.message || 'Erreur lors du changement de mot de passe.';
        setErrorMessage(errorMsg);
        return;
      }

      if (data?.error) {
        logger.error(new Error('Data error'), { error: data.error });
        setErrorMessage(data.error);
        return;
      }

      if (data?.success) {
        logger.info('Password changed successfully');
        setSuccessMessage('Mot de passe changé avec succès');
        setShowSuccessModal(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        logger.error(new Error('Unexpected response'), { data });
        setErrorMessage('Erreur lors du changement de mot de passe.');
      }
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)));
      setSaving(false);
      setErrorMessage("Une erreur s'est produite. Veuillez réessayer ou contacter le support.");
    }
  };

  const handleUpdateReminderSettings = async () => {
    if (!user) {
      return;
    }

    // Validate that at least one reminder period is selected if reminders are enabled
    if (remindersEnabled && !remind7Days && !remind14Days && !remind30Days) {
      setErrorMessage('Veuillez sélectionner au moins une période de rappel');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      // Upsert reminder settings
      const { error } = await supabase.from('user_reminder_settings').upsert(
        {
          user_id: user.id,
          enabled: remindersEnabled,
          remind_7_days: remind7Days,
          remind_14_days: remind14Days,
          remind_30_days: remind30Days,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

      setSaving(false);

      if (error) {
        setErrorMessage(formatErrorMessage(error));
      } else {
        setSuccessMessage('Préférences de rappel mises à jour avec succès');
        setShowSuccessModal(true);
      }
    } catch (err) {
      setSaving(false);
      setErrorMessage(formatErrorMessage(err));
    }
  };

  const handleSendTestEmail = async () => {
    if (!user) {
      return;
    }

    setSendingTestEmail(true);
    setErrorMessage('');

    try {
      // Call the Edge Function directly for test email
      const { data, error } = await supabase.functions.invoke('send-coupon-reminders', {
        body: { testMode: true, userId: user.id },
      });

      setSendingTestEmail(false);

      if (error) {
        setErrorMessage(formatErrorMessage(error));
      } else if (data?.error) {
        setErrorMessage(data.error);
      } else {
        setSuccessMessage('E-mail de test envoyé avec succès ! Vérifiez votre boîte de réception.');
        setShowSuccessModal(true);
      }
    } catch (err) {
      setSendingTestEmail(false);
      setErrorMessage(formatErrorMessage(err));
    }
  };

  const handleConnectEmail = async () => {
    if (!user) {
      return;
    }

    setConnectingEmail(true);
    setErrorMessage('');

    try {
      // Build Microsoft OAuth URL (only provider supported)
      const provider = 'microsoft';
      const redirectUri = `${window.location.origin}/auth/callback/${provider}`;
      const state = encodeURIComponent(JSON.stringify({ provider }));

      const tenantId = import.meta.env.VITE_MICROSOFT_TENANT_ID || 'common';
      const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
      const scope = encodeURIComponent(
        'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read offline_access'
      );

      const authUrl =
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
        `client_id=${clientId}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_mode=query` +
        `&scope=${scope}` +
        `&state=${state}`;

      // Open Microsoft OAuth in new tab
      window.open(authUrl, '_blank', 'noopener,noreferrer');

      // Reset loading state since we're staying on current page
      setConnectingEmail(false);
    } catch (err) {
      setConnectingEmail(false);
      setErrorMessage(formatErrorMessage(err));
    }
  };

  const confirmDisconnectEmail = () => {
    setShowConfirmDisconnect(true);
  };

  const handleDisconnectEmail = async () => {
    if (!user) {
      return;
    }

    setShowConfirmDisconnect(false);
    setSaving(true);
    setErrorMessage('');

    try {
      const { error } = await supabase
        .from('user_email_connections')
        .delete()
        .eq('user_id', user.id);

      setSaving(false);

      if (error) {
        setErrorMessage(formatErrorMessage(error));
      } else {
        setEmailConnection(null);
        setSuccessMessage('E-mail déconnecté avec succès');
        setShowSuccessModal(true);
      }
    } catch (err) {
      setSaving(false);
      setErrorMessage(formatErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        </div>
        <div className="space-y-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-slate-900 rounded-xl">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Paramètres</h1>
            <p className="text-slate-600">Gérer votre profil et vos préférences</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div
          ref={errorMessageRef}
          className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-finixar-red flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-900 font-medium">Erreur</p>
            <p className="text-red-700 text-sm">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="text-finixar-red hover:text-red-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Information Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-slate-700" />
              <h2 className="text-xl font-bold text-slate-900">Informations du profil</h2>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">L'e-mail ne peut pas être modifié</p>
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Prénom *</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                placeholder="Jean"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nom *</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                placeholder="Dupont"
              />
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <button
                onClick={handleUpdateProfile}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-finixar-action-process text-white rounded-lg hover:bg-finixar-action-process-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Enregistrer les modifications
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-slate-700" />
              <h2 className="text-xl font-bold text-slate-900">Changer le mot de passe</h2>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mot de passe actuel *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nouveau mot de passe *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Requirements Visual Indicators */}
              {newPassword && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    Critères de sécurité :
                  </p>

                  <PasswordRequirement
                    met={passwordRequirements.hasMinLength}
                    text="Au moins 12 caractères"
                  />
                  <PasswordRequirement
                    met={passwordRequirements.hasLowercase}
                    text="Une lettre minuscule (a-z)"
                  />
                  <PasswordRequirement
                    met={passwordRequirements.hasUppercase}
                    text="Une lettre majuscule (A-Z)"
                  />
                  <PasswordRequirement
                    met={passwordRequirements.hasNumber}
                    text="Un chiffre (0-9)"
                  />
                  <PasswordRequirement
                    met={passwordRequirements.hasSpecial}
                    text="Un caractère spécial (!@#$%...)"
                  />

                  {isPasswordValid && (
                    <div className="pt-2 mt-2 border-t border-slate-300">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-semibold">Mot de passe sécurisé !</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirmer le nouveau mot de passe *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <PasswordRequirement
                    met={newPassword === confirmPassword}
                    text={
                      newPassword === confirmPassword
                        ? 'Les mots de passe correspondent'
                        : 'Les mots de passe ne correspondent pas'
                    }
                  />
                </div>
              )}
            </div>

            {/* Change Password Button */}
            <div className="pt-4">
              <button
                onClick={handleChangePassword}
                disabled={
                  saving ||
                  !!(newPassword && !isPasswordValid) ||
                  !!(confirmPassword && newPassword !== confirmPassword)
                }
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Changement...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Changer le mot de passe
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* MFA Security Settings */}
        <MFASettings />

        {/* Email Reminder Settings Card - Hidden for emetteur role */}
        {userRole !== 'emetteur' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-slate-700" />
                  <h2 className="text-xl font-bold text-slate-900">Rappels de paiements</h2>
                </div>
                {/* Master toggle */}
                <button
                  onClick={() => setRemindersEnabled(!remindersEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    remindersEnabled ? 'bg-finixar-teal' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      remindersEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-sm text-slate-600 mt-2">
                Recevez des rappels par e-mail pour les coupons à échéance prochaine
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Reminder periods */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Périodes de rappel
                </label>

                {/* 7 days */}
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={remind7Days}
                    onChange={e => setRemind7Days(e.target.checked)}
                    disabled={!remindersEnabled}
                    className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-finixar-brand-blue disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <span
                      className={`text-sm font-medium ${remindersEnabled ? 'text-slate-900' : 'text-slate-400'}`}
                    >
                      7 jours avant l'échéance
                    </span>
                    <p
                      className={`text-xs ${remindersEnabled ? 'text-slate-600' : 'text-slate-400'}`}
                    >
                      Rappel une semaine avant la date de paiement
                    </p>
                  </div>
                </label>

                {/* 14 days */}
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={remind14Days}
                    onChange={e => setRemind14Days(e.target.checked)}
                    disabled={!remindersEnabled}
                    className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-finixar-brand-blue disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <span
                      className={`text-sm font-medium ${remindersEnabled ? 'text-slate-900' : 'text-slate-400'}`}
                    >
                      14 jours avant l'échéance
                    </span>
                    <p
                      className={`text-xs ${remindersEnabled ? 'text-slate-600' : 'text-slate-400'}`}
                    >
                      Rappel deux semaines avant la date de paiement
                    </p>
                  </div>
                </label>

                {/* 30 days */}
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={remind30Days}
                    onChange={e => setRemind30Days(e.target.checked)}
                    disabled={!remindersEnabled}
                    className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-finixar-brand-blue disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <span
                      className={`text-sm font-medium ${remindersEnabled ? 'text-slate-900' : 'text-slate-400'}`}
                    >
                      30 jours avant l'échéance
                    </span>
                    <p
                      className={`text-xs ${remindersEnabled ? 'text-slate-600' : 'text-slate-400'}`}
                    >
                      Rappel un mois avant la date de paiement
                    </p>
                  </div>
                </label>
              </div>

              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Comment ça marche ?</p>
                    <p className="text-blue-800">
                      Les rappels sont envoyés automatiquement chaque jour à 7h00. Vous recevrez un
                      e-mail listant tous les coupons correspondant aux périodes que vous avez
                      sélectionnées.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateReminderSettings}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-finixar-action-process text-white rounded-lg hover:bg-finixar-action-process-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Enregistrer les préférences
                    </>
                  )}
                </button>

                <button
                  onClick={handleSendTestEmail}
                  disabled={sendingTestEmail || !remindersEnabled}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {sendingTestEmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      E-mail test
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data Privacy Settings (RGPD) */}
        <DataPrivacySettings />

        {/* Email Connection Card - Hidden for emetteur role */}
        {userRole !== 'emetteur' && (
          <div
            id="email-connection"
            className="bg-white rounded-xl shadow-sm border border-slate-200 scroll-mt-4"
          >
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-slate-700" />
                <h2 className="text-xl font-bold text-slate-900">Connexion E-mail</h2>
              </div>
              <p className="text-sm text-slate-600 mt-2">
                Connectez votre compte e-mail pour envoyer des rappels de paiement directement
                depuis votre boîte de réception
              </p>
            </div>

            <div className="p-6 space-y-6">
              {emailConnection ? (
                /* Connected State */
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-green-900 mb-1">Outlook connecté</p>
                        <div className="text-sm text-green-800 space-y-1">
                          <p>
                            <strong>Provider:</strong> Microsoft Outlook
                          </p>
                          <p>
                            <strong>Adresse:</strong> {emailConnection.email_address}
                          </p>
                          <p>
                            <strong>Connecté le:</strong>{' '}
                            {new Date(emailConnection.connected_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-900">
                        <p className="font-medium mb-1">Comment utiliser ?</p>
                        <p className="text-blue-800">
                          Dans la page Échéancier, cliquez sur le bouton "Envoyer rappel" à côté
                          d'un paiement impayé. Un brouillon d'e-mail sera automatiquement créé dans
                          votre Outlook avec toutes les informations pré-remplies.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={confirmDisconnectEmail}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium border border-red-200"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Déconnexion...
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        Déconnecter mon e-mail
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Not Connected State */
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Mail className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-blue-900 mb-1">
                          Connectez votre compte Microsoft Outlook
                        </p>
                        <p className="text-sm text-blue-800">
                          Utilisez votre compte Outlook/Microsoft 365 pour envoyer automatiquement
                          des rappels de paiement par e-mail
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="space-y-3 text-sm text-slate-700">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <p>Connexion sécurisée via OAuth 2.0</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <p>Vos identifiants ne sont jamais stockés</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <p>Permission uniquement pour créer des brouillons</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <p>Révocable à tout moment</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleConnectEmail}
                    disabled={connectingEmail}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-finixar-action-process text-white rounded-lg hover:bg-finixar-action-process-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {connectingEmail ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Connexion en cours...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-5 h-5" />
                        Connecter mon Outlook
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmDisconnect}
        onClose={() => setShowConfirmDisconnect(false)}
        onConfirm={handleDisconnectEmail}
        title="Déconnecter l'e-mail"
        message="Êtes-vous sûr de vouloir déconnecter votre e-mail ? Vous ne pourrez plus envoyer de rappels automatiques."
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />
    </div>
  );
}

// Password Requirement Component
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
          met ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-400'
        }`}
      >
        {met ? (
          <Check className="w-3 h-3" strokeWidth={3} />
        ) : (
          <X className="w-3 h-3" strokeWidth={3} />
        )}
      </div>
      <span
        className={`text-xs transition-colors duration-200 ${
          met ? 'text-green-700 font-medium' : 'text-slate-600'
        }`}
      >
        {text}
      </span>
    </div>
  );
}

// Success Modal Component
function SuccessModal({
  isOpen,
  onClose,
  message,
}: {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}) {
  // Handle ESC key
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold text-slate-900 mb-3">Succès !</h3>

          {/* Message */}
          <p className="text-slate-600">{message}</p>
        </div>
      </div>
    </div>
  );
}

// Confirm Modal Component
function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) {
  // Handle ESC key
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          {/* Warning Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/30">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold text-slate-900 mb-3">{title}</h3>

          {/* Message */}
          <p className="text-slate-600 mb-8">{message}</p>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
