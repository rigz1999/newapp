// ============================================
// Payment Reminders Modal - Full Settings
// Path: src/components/coupons/PaymentRemindersModal.tsx
// ============================================

import { useState, useEffect, useRef } from 'react';
import { X, Bell, Save, Send, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { formatErrorMessage } from '../../utils/errorMessages';

interface PaymentRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: () => void;
}

export default function PaymentRemindersModal({
  isOpen,
  onClose,
  onSettingsUpdated
}: PaymentRemindersModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const errorMessageRef = useRef<HTMLDivElement>(null);

  // Reminder settings
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [remind7Days, setRemind7Days] = useState(false);
  const [remind14Days, setRemind14Days] = useState(false);
  const [remind30Days, setRemind30Days] = useState(false);

  // Success/Error states
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchReminderSettings();
    }
  }, [isOpen, user]);

  // Scroll to error message when it appears
  useEffect(() => {
    if (errorMessage && errorMessageRef.current) {
      errorMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [errorMessage]);

  const fetchReminderSettings = async () => {
    if (!user) return;

    setLoading(true);

    const { data: reminderSettings, error } = await supabase
      .from('user_reminder_settings')
      .select('*')
      .eq('user_id', user.id)
      .single() as any;

    if (!error && reminderSettings) {
      setRemindersEnabled(reminderSettings.enabled);
      setRemind7Days(reminderSettings.remind_7_days);
      setRemind14Days(reminderSettings.remind_14_days);
      setRemind30Days(reminderSettings.remind_30_days);
    }

    setLoading(false);
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
    setSuccessMessage('');

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
        setSuccessMessage('Préférences enregistrées avec succès !');
        if (onSettingsUpdated) {
          onSettingsUpdated();
        }
        // Auto-close after success
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 1500);
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
    setSuccessMessage('');

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
      }
    } catch (err: any) {
      setSendingTestEmail(false);
      setErrorMessage(formatErrorMessage(err));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Rappels de paiements</h2>
              <p className="text-sm text-slate-600 mt-1">
                Recevez des rappels par email pour les coupons à échéance prochaine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Error message */}
            {errorMessage && (
              <div ref={errorMessageRef} className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Success message */}
            {successMessage && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-800">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Master toggle */}
            <div className="mb-6 flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Activer les rappels</p>
                <p className="text-sm text-slate-600 mt-1">
                  Recevoir des emails de rappel automatiques
                </p>
              </div>
              <button
                onClick={() => setRemindersEnabled(!remindersEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  remindersEnabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    remindersEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Reminder periods */}
            <div className="space-y-4 mb-6">
              <label className="block text-sm font-medium text-slate-700">
                Périodes de rappel
              </label>

              {/* 7 days */}
              <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={remind7Days}
                  onChange={(e) => setRemind7Days(e.target.checked)}
                  disabled={!remindersEnabled}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={remind14Days}
                  onChange={(e) => setRemind14Days(e.target.checked)}
                  disabled={!remindersEnabled}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={remind30Days}
                  onChange={(e) => setRemind30Days(e.target.checked)}
                  disabled={!remindersEnabled}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
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
            <div className="flex gap-3">
              <button
                onClick={handleUpdateReminderSettings}
                disabled={saving || !remindersEnabled}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
        )}
      </div>
    </div>
  );
}
