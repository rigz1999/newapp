// ============================================
// Settings Page - User Profile Management
// Path: src/components/Settings.tsx
// ============================================

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  User, Lock, Mail, Save, RefreshCw, CheckCircle, X, AlertCircle, Bell, Send, Check
} from 'lucide-react';
import { formatErrorMessage } from '../../utils/errorMessages';
import { CardSkeleton } from '../common/Skeleton';

export default function Settings() {
  const { user } = useAuth();
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

  // Reminder settings
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [remind7Days, setRemind7Days] = useState(false);
  const [remind14Days, setRemind14Days] = useState(false);
  const [remind30Days, setRemind30Days] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // Success/Error states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Password strength checker
  const checkPasswordRequirements = (password: string) => {
    return {
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
      hasMinLength: password.length >= 6
    };
  };

  const passwordRequirements = checkPasswordRequirements(newPassword);
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  // Scroll to error message when it appears
  useEffect(() => {
    if (errorMessage && errorMessageRef.current) {
      errorMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [errorMessage]);

  const fetchUserProfile = async () => {
    if (!user) return;

    setLoading(true);

    // Get user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

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
      .single();

    if (!reminderError && reminderSettings) {
      setRemindersEnabled(reminderSettings.enabled);
      setRemind7Days(reminderSettings.remind_7_days);
      setRemind14Days(reminderSettings.remind_14_days);
      setRemind30Days(reminderSettings.remind_30_days);
    }

    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

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
        updated_at: new Date().toISOString()
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
      setErrorMessage('Le nouveau mot de passe doit être différent de l\'ancien');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      // Get the current session to pass the auth token
      const { data: { session } } = await supabase.auth.getSession();

      console.log('Session check:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        tokenPreview: session?.access_token?.substring(0, 20) + '...'
      });

      if (!session) {
        setErrorMessage('Session expirée. Veuillez vous reconnecter.');
        setSaving(false);
        return;
      }

      console.log('Calling change-password function with Authorization header');

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

      console.log('Function response:', { data, error: functionError });

      setSaving(false);

      if (functionError) {
        setErrorMessage(functionError.message || 'Erreur lors du changement de mot de passe.');
        return;
      }

      if (data?.error) {
        setErrorMessage(data.error);
        return;
      }

      if (data?.success) {
        setSuccessMessage('Mot de passe changé avec succès');
        setShowSuccessModal(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMessage('Erreur lors du changement de mot de passe.');
      }
    } catch (err: any) {
      setSaving(false);
      setErrorMessage('Une erreur s\'est produite. Veuillez réessayer ou contacter le support.');
    }
  };

  const handleUpdateReminderSettings = async () => {
    if (!user) return;

    // Validate that at least one reminder period is selected if reminders are enabled
    if (remindersEnabled && !remind7Days && !remind14Days && !remind30Days) {
      setErrorMessage('Veuillez sélectionner au moins une période de rappel');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      // Upsert reminder settings
      const { error } = await supabase
        .from('user_reminder_settings')
        .upsert({
          user_id: user.id,
          enabled: remindersEnabled,
          remind_7_days: remind7Days,
          remind_14_days: remind14Days,
          remind_30_days: remind30Days,
          updated_at: new Date().toISOString()
        } as any, {
          onConflict: 'user_id'
        });

      setSaving(false);

      if (error) {
        setErrorMessage(formatErrorMessage(error));
      } else {
        setSuccessMessage('Préférences de rappel mises à jour avec succès');
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      setSaving(false);
      setErrorMessage(formatErrorMessage(err));
    }
  };

  const handleSendTestEmail = async () => {
    if (!user) return;

    setSendingTestEmail(true);
    setErrorMessage('');

    try {
      // Call the Edge Function directly for test email
      const { data, error } = await supabase.functions.invoke('send-coupon-reminders', {
        body: { testMode: true, userId: user.id }
      });

      setSendingTestEmail(false);

      if (error) {
        setErrorMessage(formatErrorMessage(error));
      } else if (data?.error) {
        setErrorMessage(data.error);
      } else {
        setSuccessMessage('Email de test envoyé avec succès ! Vérifiez votre boîte de réception.');
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      setSendingTestEmail(false);
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
        <div ref={errorMessageRef} className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-finixar-red flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-900 font-medium">Erreur</p>
            <p className="text-red-700 text-sm">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-finixar-red hover:text-red-800">
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
                Adresse email
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
              <p className="text-xs text-slate-500 mt-2">L'email ne peut pas être modifié</p>
            </div>

            {/* First Name */}
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

            {/* Last Name */}
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
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                  placeholder="••••••••"
                />
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
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                  placeholder="••••••••"
                />
              </div>

              {/* Password Requirements Visual Indicators */}
              {newPassword && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Critères de sécurité :</p>

                  <PasswordRequirement
                    met={passwordRequirements.hasMinLength}
                    text="Au moins 6 caractères"
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
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Change Password Button */}
            <div className="pt-4">
              <button
                onClick={handleChangePassword}
                disabled={saving || (newPassword && !isPasswordValid)}
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

        {/* Email Reminder Settings Card */}
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
              Recevez des rappels par email pour les coupons à échéance prochaine
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
                  onChange={(e) => setRemind7Days(e.target.checked)}
                  disabled={!remindersEnabled}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-finixar-brand-blue disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex-1">
                  <span className={`text-sm font-medium ${remindersEnabled ? 'text-slate-900' : 'text-slate-400'}`}>
                    7 jours avant l'échéance
                  </span>
                  <p className={`text-xs ${remindersEnabled ? 'text-slate-600' : 'text-slate-400'}`}>
                    Rappel une semaine avant la date de paiement
                  </p>
                </div>
              </label>

              {/* 14 days */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={remind14Days}
                  onChange={(e) => setRemind14Days(e.target.checked)}
                  disabled={!remindersEnabled}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-finixar-brand-blue disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex-1">
                  <span className={`text-sm font-medium ${remindersEnabled ? 'text-slate-900' : 'text-slate-400'}`}>
                    14 jours avant l'échéance
                  </span>
                  <p className={`text-xs ${remindersEnabled ? 'text-slate-600' : 'text-slate-400'}`}>
                    Rappel deux semaines avant la date de paiement
                  </p>
                </div>
              </label>

              {/* 30 days */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={remind30Days}
                  onChange={(e) => setRemind30Days(e.target.checked)}
                  disabled={!remindersEnabled}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-finixar-brand-blue disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex-1">
                  <span className={`text-sm font-medium ${remindersEnabled ? 'text-slate-900' : 'text-slate-400'}`}>
                    30 jours avant l'échéance
                  </span>
                  <p className={`text-xs ${remindersEnabled ? 'text-slate-600' : 'text-slate-400'}`}>
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
                    Les rappels sont envoyés automatiquement chaque jour à 7h00. Vous recevrez un email
                    listant tous les coupons correspondant aux périodes que vous avez sélectionnées.
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleUpdateReminderSettings}
                disabled={saving || !remindersEnabled}
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
                    Email test
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

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
          met
            ? 'bg-green-500 text-white'
            : 'bg-slate-300 text-slate-400'
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
  message
}: {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold text-slate-900 mb-3">
            Succès !
          </h3>

          {/* Message */}
          <p className="text-slate-600 mb-6">
            {message}
          </p>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-lg shadow-blue-500/30"
          >
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
}
