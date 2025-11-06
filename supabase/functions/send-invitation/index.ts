import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173'

interface InvitationRequest {
  email: string
  firstName: string
  lastName: string
  role: 'member' | 'admin'
  orgId: string
  orgName: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const { email, firstName, lastName, role, orgId, orgName }: InvitationRequest = await req.json()

    // Verify user is admin of the organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .single()

    if (!membership || (membership.role !== 'admin' && membership.role !== 'super_admin')) {
      throw new Error('Not authorized to invite users to this organization')
    }

    // Generate secure token
    const token_string = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')

    // Set expiration to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation in database
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        org_id: orgId,
        role,
        invited_by: user.id,
        token: token_string,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (invitationError) {
      throw new Error(`Failed to create invitation: ${invitationError.message}`)
    }

    // Create invitation link
    const invitationLink = `${APP_URL}/invitation/${token_string}`

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'InvestFlow <onboarding@resend.dev>', // Change this to your verified domain
        to: [email],
        subject: `Invitation à rejoindre ${orgName}`,
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
                  background: #1e40af;
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
                  background: ${role === 'admin' ? '#7c3aed' : '#059669'};
                  color: white;
                  padding: 8px 18px;
                  border-radius: 6px;
                  font-size: 14px;
                  font-weight: 600;
                  margin-left: 4px;
                }
                .cta-container {
                  text-align: center;
                  margin: 40px 0;
                }
                .button {
                  display: inline-block;
                  background: #2563eb;
                  color: #ffffff !important;
                  padding: 18px 48px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: 600;
                  font-size: 16px;
                  box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.39);
                  transition: all 0.3s ease;
                }
                .button:hover {
                  background: #1d4ed8;
                  box-shadow: 0 6px 20px 0 rgba(37, 99, 235, 0.5);
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
                  color: #2563eb;
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
                  color: #1e40af;
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
                <!-- Header -->
                <div class="header">
                  <h1>Bienvenue sur InvestFlow</h1>
                  <p>Invitation à rejoindre une organisation</p>
                </div>

                <!-- Content -->
                <div class="content">
                  <div class="greeting">
                    Bonjour <strong>${firstName} ${lastName}</strong>,
                  </div>

                  <div class="message">
                    Vous avez été invité(e) à rejoindre <strong>${orgName}</strong> sur la plateforme InvestFlow avec le rôle de<span class="role-badge">${role === 'admin' ? 'Administrateur' : 'Membre'}</span>
                  </div>

                  <!-- Info Card -->
                  <div class="info-card">
                    <div class="info-item">
                      <svg class="info-icon" fill="none" stroke="#3b82f6" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                      </svg>
                      <span class="info-label">Email :</span>
                      <span class="info-value">${email}</span>
                    </div>
                    <div class="info-item">
                      <svg class="info-icon" fill="none" stroke="#3b82f6" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                      </svg>
                      <span class="info-label">Organisation :</span>
                      <span class="info-value">${orgName}</span>
                    </div>
                    <div class="info-item">
                      <svg class="info-icon" fill="none" stroke="#3b82f6" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                      <span class="info-label">Rôle :</span>
                      <span class="info-value">${role === 'admin' ? 'Administrateur - Accès complet à la gestion' : 'Membre - Accès aux données de l\'organisation'}</span>
                    </div>
                  </div>

                  <div class="message">
                    Pour activer votre compte et définir votre mot de passe, veuillez cliquer sur le bouton ci-dessous :
                  </div>

                  <!-- CTA Button -->
                  <div class="cta-container">
                    <a href="${invitationLink}" class="button" style="color: #ffffff;">
                      Activer mon compte
                    </a>
                  </div>

                  <!-- Alternative Link -->
                  <div class="link-box">
                    <p>Ou copiez ce lien dans votre navigateur :</p>
                    <a href="${invitationLink}">${invitationLink}</a>
                  </div>

                  <!-- Expiry Notice -->
                  <div class="expiry-notice">
                    <div class="expiry-notice-content">
                      <svg class="expiry-icon" fill="none" stroke="#f97316" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <div class="expiry-text">
                        <strong>Important :</strong> Cette invitation expire dans 7 jours. Veuillez activer votre compte rapidement.
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Footer -->
                <div class="footer">
                  <div class="footer-logo">InvestFlow</div>
                  <p>Plateforme de gestion d'investissements</p>
                  <p style="margin-top: 18px; color: #94a3b8;">Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email en toute sécurité.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      throw new Error(`Failed to send email: ${errorText}`)
    }

    const emailData = await emailResponse.json()

    return new Response(
      JSON.stringify({
        success: true,
        invitation,
        emailId: emailData.id,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
