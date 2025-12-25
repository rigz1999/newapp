import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Echeance {
  id: string;
  date_echeance: string;
  montant_coupon: number;
  statut: string;
  souscription: {
    id_souscription: string;
    coupon_brut: number;
    coupon_net: number;
    investisseur: {
      nom_raison_sociale: string;
      id_investisseur: string;
    };
    tranche: {
      tranche_name: string;
      projet: {
        projet: string;
        email_representant: string;
      };
    };
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { echeanceIds, projectId } = await req.json();

    if (!echeanceIds || !Array.isArray(echeanceIds) || echeanceIds.length === 0) {
      throw new Error('Missing or invalid echeanceIds');
    }

    if (!projectId) {
      throw new Error('Missing projectId');
    }

    // Fetch user's email connection
    const { data: connection, error: connError } = await supabaseClient
      .from('user_email_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      throw new Error('No email connection found. Please connect your email in settings.');
    }

    // Check if token needs refresh
    let accessToken = connection.access_token;
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt < fiveMinutesFromNow) {
      console.log('Token expiring soon, refreshing...');
      accessToken = await refreshAccessToken(
        connection.provider,
        connection.refresh_token,
        supabaseClient,
        user.id
      );
    }

    // Fetch all écheances data with all relations
    const { data: echeancesData, error: echeanceError } = await supabaseClient
      .from('coupons_echeances')
      .select(`
        id,
        date_echeance,
        montant_coupon,
        statut,
        souscription:souscriptions (
          id_souscription,
          coupon_brut,
          coupon_net,
          montant_investi,
          investisseur:investisseurs (
            nom_raison_sociale,
            id_investisseur
          ),
          tranche:tranches (
            tranche_name,
            projet:projets (
              projet,
              email_representant
            )
          )
        )
      `)
      .in('id', echeanceIds);

    if (echeanceError || !echeancesData || echeancesData.length === 0) {
      throw new Error('Écheances not found');
    }

    const echeances = echeancesData as unknown as Echeance[];

    // Get project info from first echeance
    const firstEcheance = echeances[0];
    const emailRepresentant = firstEcheance.souscription?.tranche?.projet?.email_representant;
    const projectName = firstEcheance.souscription?.tranche?.projet?.projet;
    const trancheName = firstEcheance.souscription?.tranche?.tranche_name;
    const dateEcheance = firstEcheance.date_echeance;

    // Validate email recipient
    if (!emailRepresentant) {
      throw new Error('No email address found for project representative');
    }

    // Generate grouped email content
    const emailContent = generateGroupedEmailContent(echeances, projectName, trancheName, dateEcheance);

    // Create draft via appropriate API
    if (connection.provider === 'microsoft') {
      await createMicrosoftDraft(accessToken, emailContent);
    } else {
      await createGmailDraft(accessToken, emailContent);
    }

    // Update last_used_at
    await supabaseClient
      .from('user_email_connections')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-invoice-email-draft:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function refreshAccessToken(
  provider: string,
  refreshToken: string,
  supabaseClient: any,
  userId: string
): Promise<string> {
  try {
    if (provider === 'microsoft') {
      const tenantId = Deno.env.get('MICROSOFT_TENANT_ID') || 'common';
      const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
      const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');

      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
      const params = new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/Mail.ReadWrite offline_access',
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh Microsoft token');
      }

      const data = await response.json();
      const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      // Update token in database
      await supabaseClient
        .from('user_email_connections')
        .update({
          access_token: data.access_token,
          token_expires_at: expiresAt,
          refresh_token: data.refresh_token || refreshToken,
        })
        .eq('user_id', userId);

      return data.access_token;
    } else {
      // Google
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

      const tokenUrl = 'https://oauth2.googleapis.com/token';
      const params = new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh Google token');
      }

      const data = await response.json();
      const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      // Update token in database
      await supabaseClient
        .from('user_email_connections')
        .update({
          access_token: data.access_token,
          token_expires_at: expiresAt,
        })
        .eq('user_id', userId);

      return data.access_token;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw new Error('Failed to refresh access token. Please reconnect your email.');
  }
}

function generateGroupedEmailContent(echeances: Echeance[], projectName: string, trancheName: string, dateEcheance: string) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Calculate total amounts
  const totalBrut = echeances.reduce((sum, e) => sum + e.souscription.coupon_brut, 0);
  const totalNet = echeances.reduce((sum, e) => sum + e.souscription.coupon_net, 0);

  // Get email recipient (same for all echeances in a project)
  const emailTo = echeances[0].souscription.tranche.projet.email_representant;

  // Check if payments are overdue
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const echeanceDate = new Date(dateEcheance);
  echeanceDate.setHours(0, 0, 0, 0);
  const isOverdue = echeanceDate < now;

  // Different subject and header based on status
  const subject = isOverdue
    ? `⚠️ URGENT - Paiements en retard depuis le ${formatDate(dateEcheance)} - ${projectName}`
    : `Rappel: Paiements de coupons à échoir le ${formatDate(dateEcheance)} - ${projectName}`;

  const headerColor = isOverdue ? '#dc2626' : '#667eea'; // Red for overdue, purple for upcoming
  const headerGradient = isOverdue
    ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  const headerText = isOverdue ? '⚠️ Paiements en retard' : 'Rappel de paiement de coupons';
  const introText = isOverdue
    ? `Nous constatons que les paiements de coupons suivants n'ont pas été effectués à la date prévue du ${formatDate(dateEcheance)}. Nous vous remercions de procéder au règlement dans les plus brefs délais :`
    : `Nous vous rappelons que les paiements de coupons suivants sont à échoir le ${formatDate(dateEcheance)} :`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #333;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: ${headerGradient};
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px 20px;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid ${headerColor};
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box strong {
      color: ${headerColor};
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background-color: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #dee2e6;
      font-size: 14px;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #dee2e6;
      font-size: 14px;
    }
    .amount {
      font-size: 16px;
      font-weight: 600;
      color: ${headerColor};
    }
    .footer {
      padding: 20px;
      background-color: #f8f9fa;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${headerText}</h1>
    </div>

    <div class="content">
      <p>Bonjour,</p>

      <p>${introText}</p>

      <div class="info-box">
        <p style="margin: 0 0 8px 0;"><strong>Projet :</strong> ${projectName}</p>
        <p style="margin: 0 0 8px 0;"><strong>Tranche :</strong> ${trancheName}</p>
        <p style="margin: 0;"><strong>Date d'échéance :</strong> ${formatDate(dateEcheance)}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Investisseur</th>
            <th style="text-align: right;">Coupon brut</th>
            <th style="text-align: right;">Coupon net</th>
          </tr>
        </thead>
        <tbody>
          ${echeances.map(echeance => `
          <tr>
            <td>${echeance.souscription.investisseur.nom_raison_sociale}</td>
            <td style="text-align: right;" class="amount">${formatCurrency(echeance.souscription.coupon_brut)}</td>
            <td style="text-align: right;" class="amount">${formatCurrency(echeance.souscription.coupon_net)}</td>
          </tr>
          `).join('')}
          <tr style="background-color: #f8f9fa; font-weight: 600;">
            <td style="text-align: right; padding-top: 15px;">TOTAL :</td>
            <td style="text-align: right; padding-top: 15px;" class="amount">${formatCurrency(totalBrut)}</td>
            <td style="text-align: right; padding-top: 15px;" class="amount">${formatCurrency(totalNet)}</td>
          </tr>
        </tbody>
      </table>

      <p>${isOverdue ? 'Nous vous remercions de procéder aux paiements dans les meilleurs délais.' : 'Merci de procéder aux paiements avant la date d\'échéance.'}</p>

      <p>Cordialement,</p>
    </div>

    <div class="footer">
      <p>Cet e-mail a été généré automatiquement via Finixar</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return {
    to: emailTo,
    subject,
    html,
  };
}

async function createMicrosoftDraft(accessToken: string, content: { to: string; subject: string; html: string }) {
  // Create the message
  const response = await fetch('https://graph.microsoft.com/v1.0/me/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject: content.subject,
      body: {
        contentType: 'HTML',
        content: content.html,
      },
      toRecipients: [
        {
          emailAddress: {
            address: content.to,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Microsoft Graph API error:', errorText);
    throw new Error('Failed to create draft in Outlook');
  }

  const message = await response.json();

  // Move to drafts folder
  await fetch(`https://graph.microsoft.com/v1.0/me/messages/${message.id}/move`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      destinationId: 'drafts',
    }),
  });
}

async function createGmailDraft(accessToken: string, content: { to: string; subject: string; html: string }) {
  // Create RFC 2822 email
  const email = [
    `To: ${content.to}`,
    `Subject: ${content.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    content.html,
  ].join('\r\n');

  // Base64url encode
  const encodedEmail = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        raw: encodedEmail,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gmail API error:', errorText);
    throw new Error('Failed to create draft in Gmail');
  }
}
