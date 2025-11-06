// Supabase Edge Function: send-coupon-reminders
// Purpose: Send email reminders for upcoming coupon payments
// Trigger: Daily at 7 AM via pg_cron
// Email Service: Resend

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface ReminderSettings {
  user_id: string;
  email: string;
  remind_7_days: boolean;
  remind_14_days: boolean;
  remind_30_days: boolean;
}

interface CouponReminder {
  id: string;
  echeance_date: string;
  montant_brut: number;
  montant_net: number;
  project_name: string;
  tranche_name: string;
  investor_name: string;
}

serve(async (req) => {
  try {
    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check if this is a test mode request
    const body = await req.json().catch(() => ({}));
    const testMode = body?.testMode === true;
    const testUserId = body?.userId;

    // Get all users with reminders enabled (or just test user)
    let query = supabase
      .from('user_reminder_settings')
      .select(`
        user_id,
        remind_7_days,
        remind_14_days,
        remind_30_days
      `)
      .eq('enabled', true);

    // If test mode, filter to specific user
    if (testMode && testUserId) {
      query = query.eq('user_id', testUserId);
    }

    const { data: settings, error: settingsError } = await query;

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return new Response(JSON.stringify({ error: settingsError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with reminders enabled' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Process each user
    const results = [];
    for (const userSettings of settings) {
      try {
        // Get user email
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
          userSettings.user_id
        );

        if (userError || !userData?.user?.email) {
          console.error(`Error getting user ${userSettings.user_id}:`, userError);
          continue;
        }

        // Get user's organization
        const { data: membership } = await supabase
          .from('memberships')
          .select('org_id')
          .eq('user_id', userSettings.user_id)
          .single();

        if (!membership?.org_id) {
          console.log(`User ${userSettings.user_id} has no organization`);
          continue;
        }

        // Collect coupons for all enabled reminder periods
        const allCoupons: CouponReminder[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check 7 days
        if (userSettings.remind_7_days) {
          const targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + 7);
          const coupons = await getCouponsForDate(supabase, membership.org_id, targetDate);
          allCoupons.push(...coupons);
        }

        // Check 14 days
        if (userSettings.remind_14_days) {
          const targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + 14);
          const coupons = await getCouponsForDate(supabase, membership.org_id, targetDate);
          allCoupons.push(...coupons);
        }

        // Check 30 days
        if (userSettings.remind_30_days) {
          const targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + 30);
          const coupons = await getCouponsForDate(supabase, membership.org_id, targetDate);
          allCoupons.push(...coupons);
        }

        // Remove duplicates (coupon might match multiple periods)
        const uniqueCoupons = Array.from(
          new Map(allCoupons.map(c => [c.id, c])).values()
        );

        // Send email if there are coupons (or if test mode, send anyway)
        if (uniqueCoupons.length > 0 || testMode) {
          await sendReminderEmail(
            userData.user.email,
            uniqueCoupons,
            userSettings,
            testMode
          );
          results.push({
            user_id: userSettings.user_id,
            email: userData.user.email,
            coupons_count: uniqueCoupons.length,
            status: 'sent',
          });
        } else {
          results.push({
            user_id: userSettings.user_id,
            email: userData.user.email,
            coupons_count: 0,
            status: 'no_coupons',
          });
        }
      } catch (error) {
        console.error(`Error processing user ${userSettings.user_id}:`, error);
        results.push({
          user_id: userSettings.user_id,
          status: 'error',
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to get coupons for a specific date
async function getCouponsForDate(supabase: any, orgId: string, targetDate: Date) {
  const dateStr = targetDate.toISOString().split('T')[0];

  const { data: coupons, error } = await supabase
    .from('payments')
    .select(`
      id,
      echeance_date,
      montant_brut,
      montant_net,
      subscription:subscriptions (
        investor:investors (
          nom,
          prenom
        ),
        tranche:tranches (
          nom,
          projet:projects (
            projet
          )
        )
      )
    `)
    .eq('subscription.tranche.projet.org_id', orgId)
    .gte('echeance_date', dateStr)
    .lt('echeance_date', `${dateStr}T23:59:59`)
    .neq('statut', 'paid');

  if (error) {
    console.error('Error fetching coupons:', error);
    return [];
  }

  return (coupons || []).map((c: any) => ({
    id: c.id,
    echeance_date: c.echeance_date,
    montant_brut: c.montant_brut,
    montant_net: c.montant_net,
    project_name: c.subscription?.tranche?.projet?.projet || 'N/A',
    tranche_name: c.subscription?.tranche?.nom || 'N/A',
    investor_name: `${c.subscription?.investor?.prenom || ''} ${c.subscription?.investor?.nom || ''}`.trim() || 'N/A',
  }));
}

// Helper function to send email via Resend
async function sendReminderEmail(
  toEmail: string,
  coupons: CouponReminder[],
  settings: any,
  testMode: boolean = false
) {
  const periods = [];
  if (settings.remind_7_days) periods.push('7 jours');
  if (settings.remind_14_days) periods.push('14 jours');
  if (settings.remind_30_days) periods.push('30 jours');

  // Format coupon list for email
  const couponsList = coupons.length > 0 ? coupons
    .map(
      (c) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDate(c.echeance_date)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${c.project_name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${c.tranche_name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${c.investor_name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatAmount(c.montant_brut)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatAmount(c.montant_net)}</td>
    </tr>
  `
    )
    .join('') : `
    <tr>
      <td colspan="6" style="padding: 20px; text-align: center; color: #6b7280;">
        Aucun coupon à échéance prochaine selon vos préférences de rappel.
      </td>
    </tr>
  `;

  const totalBrut = coupons.reduce((sum, c) => sum + c.montant_brut, 0);
  const totalNet = coupons.reduce((sum, c) => sum + c.montant_net, 0);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="max-width: 800px; margin: 40px auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); padding: 30px; border-radius: 8px 8px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">${testMode ? '🧪 Email de Test - ' : '📅 '}Rappel: Coupons à venir</h1>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      ${testMode ? `
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 20px; border-radius: 4px;">
        <p style="margin: 0; font-weight: 600; color: #92400e;">
          ⚠️ Ceci est un email de test
        </p>
        <p style="margin: 4px 0 0 0; font-size: 14px; color: #78350f;">
          Vos préférences de rappel sont configurées correctement. Les emails automatiques seront envoyés chaque jour à 7h00.
        </p>
      </div>
      ` : ''}

      <p style="font-size: 16px; margin-bottom: 20px;">
        Bonjour,
      </p>

      <p style="font-size: 16px; margin-bottom: 20px;">
        ${coupons.length > 0
          ? `Vous avez <strong>${coupons.length} coupon${coupons.length > 1 ? 's' : ''}</strong> à échéance prochaine selon vos préférences de rappel (${periods.join(', ')}).`
          : `Aucun coupon n'est à échéance prochaine selon vos préférences de rappel (${periods.join(', ')}).`
        }
      </p>

      <!-- Coupons Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 30px 0; font-size: 14px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Date d'échéance</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Projet</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Tranche</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Investisseur</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Montant Brut</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Montant Net</th>
          </tr>
        </thead>
        <tbody>
          ${couponsList}
        </tbody>
        ${coupons.length > 0 ? `
        <tfoot>
          <tr style="background-color: #f9fafb; font-weight: 600;">
            <td colspan="4" style="padding: 12px; text-align: right;">Total:</td>
            <td style="padding: 12px; text-align: right;">${formatAmount(totalBrut)}</td>
            <td style="padding: 12px; text-align: right;">${formatAmount(totalNet)}</td>
          </tr>
        </tfoot>
        ` : ''}
      </table>

      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
        Vous pouvez modifier vos préférences de rappel dans vos <a href="${SUPABASE_URL}/settings" style="color: #3b82f6; text-decoration: none;">paramètres</a>.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
        InvestFlow - Gestion d'investissements<br>
        Cet email a été envoyé automatiquement. Merci de ne pas répondre.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'InvestFlow Reminders <noreply@investflow.com>',
      to: toEmail,
      subject: testMode
        ? `🧪 [TEST] Rappel: Coupons à venir`
        : `📅 Rappel: ${coupons.length} coupon${coupons.length > 1 ? 's' : ''} à venir`,
      html: htmlContent,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Resend API error:', error);
    throw new Error(`Failed to send email: ${error}`);
  }

  return await response.json();
}

// Helper functions
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
