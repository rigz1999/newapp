import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = 'https://app.finixar.com';

interface EmetteurInvitationRequest {
  email: string;
  firstName: string;
  lastName: string;
  emetteurName: string;
  projetId: string;
  projetName: string;
  orgId: string;
  orgName: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    let user: { id: string; email: string };

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = JSON.parse(atob(parts[1]));

      user = {
        id: payload.sub,
        email: payload.email,
      };

      if (!user.id || !user.email) {
        throw new Error('Invalid token payload');
      }

      console.log('User authenticated:', user.email);
    } catch (decodeError) {
      console.error('Token decode error:', decodeError);
      throw new Error('Invalid token');
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      email,
      firstName,
      lastName,
      emetteurName,
      projetId,
      projetName,
      orgId,
      orgName,
    }: EmetteurInvitationRequest = await req.json();

    const SUPER_ADMIN_EMAIL = 'zrig.ayman@gmail.com';
    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;

    if (!isSuperAdmin) {
      const { data: membership } = await supabaseAdmin
        .from('memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('org_id', orgId)
        .single();

      if (!membership || membership.role !== 'admin') {
        throw new Error('Not authorized to invite emetteurs to this organization');
      }
    }

    const tokenString = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      const { data: existingMembership } = await supabaseAdmin
        .from('memberships')
        .select('id')
        .eq('user_id', existingUser.id)
        .eq('org_id', orgId)
        .single();

      if (!existingMembership) {
        await supabaseAdmin.from('memberships').insert({
          user_id: existingUser.id,
          org_id: orgId,
          role: 'emetteur',
        });
      } else {
        await supabaseAdmin
          .from('memberships')
          .update({ role: 'emetteur' })
          .eq('id', existingMembership.id);
      }

      await supabaseAdmin.from('emetteur_projects').insert({
        org_id: orgId,
        projet_id: projetId,
        user_id: existingUser.id,
        emetteur_name: emetteurName,
        assigned_by: user.id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'User already exists, added to project',
          userId: existingUser.id,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        org_id: orgId,
        role: 'emetteur',
        token: tokenString,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        emetteur_name: emetteurName,
        projet_id: projetId,
        projet_name: projetName,
      })
      .select()
      .single();

    if (invitationError) {
      throw new Error(`Failed to create invitation: ${invitationError.message}`);
    }

    const invitationLink = `${APP_URL}/invitation/accept?token=${tokenString}`;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Finixar <support@finixar.com>',
        to: [email],
        subject: `Accès émetteur - ${projetName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #1e293b;
                  background-color: #f1f5f9;
                  padding: 40px 20px;
                }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  background: white;
                  border-radius: 12px;
                  overflow: hidden;
                  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                }
                .header {
                  background: linear-gradient(135deg, #059669 0%, #047857 100%);
                  color: white;
                  padding: 48px 40px;
                  text-align: center;
                }
                .header h1 {
                  font-size: 32px;
                  font-weight: 700;
                  margin-bottom: 12px;
                  letter-spacing: -0.5px;
                }
                .header p {
                  font-size: 16px;
                  opacity: 0.95;
                  font-weight: 400;
                }
                .content {
                  padding: 48px 40px;
                }
                .greeting {
                  font-size: 18px;
                  color: #0f172a;
                  margin-bottom: 24px;
                  font-weight: 500;
                }
                .message {
                  font-size: 16px;
                  color: #475569;
                  margin-bottom: 32px;
                  line-height: 1.7;
                }
                .info-card {
                  background: #f8fafc;
                  border: 2px solid #e2e8f0;
                  border-radius: 10px;
                  padding: 28px;
                  margin: 32px 0;
                }
                .info-item {
                  display: flex;
                  align-items: flex-start;
                  margin-bottom: 16px;
                  font-size: 15px;
                }
                .info-item:last-child {
                  margin-bottom: 0;
                }
                .info-icon {
                  width: 20px;
                  height: 20px;
                  margin-right: 14px;
                  margin-top: 2px;
                  flex-shrink: 0;
                }
                .info-label {
                  font-weight: 600;
                  color: #0f172a;
                  margin-right: 8px;
                  min-width: 110px;
                }
                .info-value {
                  color: #475569;
                  flex: 1;
                }
                .role-badge {
                  display: inline-block;
                  background: #059669;
                  color: white;
                  padding: 8px 18px;
                  border-radius: 6px;
                  font-size: 14px;
                  font-weight: 600;
                  margin-left: 4px;
                }
                .feature-list {
                  background: #f0fdf4;
                  border: 2px solid #bbf7d0;
                  border-radius: 10px;
                  padding: 28px;
                  margin: 32px 0;
                }
                .feature-list h3 {
                  color: #047857;
                  font-size: 16px;
                  margin-bottom: 16px;
                  font-weight: 600;
                }
                .feature-list ul {
                  list-style: none;
                  padding: 0;
                }
                .feature-list li {
                  color: #065f46;
                  font-size: 14px;
                  padding: 8px 0;
                  padding-left: 24px;
                  position: relative;
                }
                .feature-list li:before {
                  content: "✓";
                  position: absolute;
                  left: 0;
                  color: #059669;
                  font-weight: bold;
                }
                .cta-container {
                  text-align: center;
                  margin: 40px 0;
                }
                .button {
                  display: inline-block;
                  background: #059669;
                  color: #ffffff !important;
                  padding: 18px 48px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: 600;
                  font-size: 16px;
                  box-shadow: 0 4px 14px 0 rgba(5, 150, 105, 0.39);
                  transition: all 0.3s ease;
                }
                .button:hover {
                  background: #047857;
                  box-shadow: 0 6px 20px 0 rgba(5, 150, 105, 0.5);
                }
                .link-box {
                  background: #f8fafc;
                  border: 1px solid #e2e8f0;
                  border-radius: 8px;
                  padding: 18px;
                  margin: 28px 0;
                }
                .link-box p {
                  color: #64748b;
                  font-size: 13px;
                  margin-bottom: 10px;
                  font-weight: 500;
                }
                .link-box a {
                  color: #059669;
                  word-break: break-all;
                  font-size: 13px;
                  text-decoration: none;
                }
                .expiry-notice {
                  background: #fff7ed;
                  border: 1px solid #fed7aa;
                  border-left: 4px solid #f97316;
                  border-radius: 8px;
                  padding: 18px;
                  margin: 28px 0;
                }
                .expiry-notice-content {
                  display: flex;
                  align-items: flex-start;
                }
                .expiry-icon {
                  width: 20px;
                  height: 20px;
                  margin-right: 12px;
                  margin-top: 2px;
                  flex-shrink: 0;
                }
                .expiry-text {
                  color: #9a3412;
                  font-size: 14px;
                  line-height: 1.6;
                }
                .footer {
                  background: #f8fafc;
                  padding: 36px 40px;
                  text-align: center;
                  border-top: 1px solid #e2e8f0;
                }
                .footer-logo {
                  font-size: 24px;
                  font-weight: 700;
                  color: #059669;
                  margin-bottom: 8px;
                }
                .footer p {
                  color: #64748b;
                  font-size: 14px;
                  margin-bottom: 6px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Accès Émetteur</h1>
                  <p>Plateforme Finixar</p>
                </div>

                <div class="content">
                  <div class="greeting">
                    Bonjour <strong>${firstName} ${lastName}</strong>,
                  </div>

                  <div class="message">
                    Vous avez été invité(e) à accéder au projet <strong>${projetName}</strong> sur la plateforme Finixar en tant qu'<span class="role-badge">Émetteur</span>
                  </div>

                  <div class="info-card">
                    <div class="info-item">
                      <svg class="info-icon" fill="none" stroke="#059669" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                      </svg>
                      <span class="info-label">Organisation :</span>
                      <span class="info-value">${orgName}</span>
                    </div>
                    <div class="info-item">
                      <svg class="info-icon" fill="none" stroke="#059669" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      <span class="info-label">Projet :</span>
                      <span class="info-value">${projetName}</span>
                    </div>
                    <div class="info-item">
                      <svg class="info-icon" fill="none" stroke="#059669" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                      </svg>
                      <span class="info-label">Email :</span>
                      <span class="info-value">${email}</span>
                    </div>
                  </div>

                  <div class="feature-list">
                    <h3>Votre accès inclut :</h3>
                    <ul>
                      <li>Visualisation du calendrier des paiements</li>
                      <li>Export des échéances (Excel & PDF)</li>
                      <li>Publication et consultation des actualités du projet</li>
                      <li>Notifications des échéances à venir</li>
                    </ul>
                  </div>

                  <div class="message">
                    Pour activer votre accès et définir votre mot de passe, veuillez cliquer sur le bouton ci-dessous :
                  </div>

                  <div class="cta-container">
                    <a href="${invitationLink}" class="button" style="color: #ffffff;">
                      Activer mon accès
                    </a>
                  </div>

                  <div class="link-box">
                    <p>Ou copiez ce lien dans votre navigateur :</p>
                    <a href="${invitationLink}">${invitationLink}</a>
                  </div>

                  <div class="expiry-notice">
                    <div class="expiry-notice-content">
                      <svg class="expiry-icon" fill="none" stroke="#f97316" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <div class="expiry-text">
                        <strong>Important :</strong> Cette invitation expire dans 7 jours. Veuillez activer votre accès rapidement.
                      </div>
                    </div>
                  </div>
                </div>

                <div class="footer">
                  <div class="footer-logo">Finixar</div>
                  <p>Plateforme de gestion d'investissements</p>
                  <p style="margin-top: 18px; color: #94a3b8;">Si vous n'avez pas demandé cet accès, vous pouvez ignorer cet email en toute sécurité.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailData = await emailResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        invitation,
        emailId: emailData.id,
        message: 'Invitation sent successfully. Emetteur will be assigned to project upon acceptance.',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Error in invite-emetteur:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
        details: error.toString(),
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
