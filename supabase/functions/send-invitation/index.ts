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
                  border-radius: 16px;
                  overflow: hidden;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }
                .header {
                  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                  color: white;
                  padding: 48px 40px;
                  text-align: center;
                }
                .header h1 {
                  font-size: 28px;
                  font-weight: 700;
                  margin-bottom: 8px;
                }
                .header p {
                  font-size: 16px;
                  opacity: 0.9;
                }
                .content {
                  padding: 40px;
                }
                .greeting {
                  font-size: 18px;
                  color: #1e293b;
                  margin-bottom: 24px;
                }
                .message {
                  font-size: 16px;
                  color: #475569;
                  margin-bottom: 28px;
                  line-height: 1.7;
                }
                .info-card {
                  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                  border: 2px solid #3b82f6;
                  border-radius: 12px;
                  padding: 24px;
                  margin: 28px 0;
                }
                .info-item {
                  display: flex;
                  align-items: center;
                  margin-bottom: 12px;
                  font-size: 15px;
                }
                .info-item:last-child {
                  margin-bottom: 0;
                }
                .info-icon {
                  font-size: 20px;
                  margin-right: 12px;
                  min-width: 24px;
                }
                .info-label {
                  font-weight: 600;
                  color: #1e40af;
                  margin-right: 8px;
                }
                .info-value {
                  color: #1e293b;
                }
                .role-badge {
                  display: inline-block;
                  background: ${role === 'admin' ? 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)' : 'linear-gradient(135deg, #059669 0%, #34d399 100%)'};
                  color: white;
                  padding: 6px 16px;
                  border-radius: 20px;
                  font-size: 14px;
                  font-weight: 600;
                  margin-left: 4px;
                }
                .cta-container {
                  text-align: center;
                  margin: 36px 0;
                }
                .button {
                  display: inline-block;
                  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                  color: white;
                  padding: 16px 40px;
                  text-decoration: none;
                  border-radius: 10px;
                  font-weight: 600;
                  font-size: 16px;
                  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -1px rgba(59, 130, 246, 0.2);
                  transition: all 0.3s ease;
                }
                .button:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 6px 8px -1px rgba(59, 130, 246, 0.4), 0 3px 5px -1px rgba(59, 130, 246, 0.3);
                }
                .link-box {
                  background: #f8fafc;
                  border: 1px solid #e2e8f0;
                  border-radius: 8px;
                  padding: 16px;
                  margin: 24px 0;
                }
                .link-box p {
                  color: #64748b;
                  font-size: 13px;
                  margin-bottom: 8px;
                }
                .link-box a {
                  color: #3b82f6;
                  word-break: break-all;
                  font-size: 13px;
                  text-decoration: none;
                }
                .expiry-notice {
                  background: #fef3c7;
                  border-left: 4px solid #f59e0b;
                  border-radius: 8px;
                  padding: 16px;
                  margin: 24px 0;
                }
                .expiry-notice p {
                  color: #92400e;
                  font-size: 14px;
                  margin: 0;
                  display: flex;
                  align-items: center;
                }
                .expiry-notice .icon {
                  font-size: 20px;
                  margin-right: 10px;
                }
                .footer {
                  background: #f8fafc;
                  padding: 32px 40px;
                  text-align: center;
                  border-top: 1px solid #e2e8f0;
                }
                .footer p {
                  color: #64748b;
                  font-size: 14px;
                  margin-bottom: 8px;
                }
                .footer-logo {
                  font-size: 24px;
                  font-weight: 700;
                  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
                  margin-bottom: 8px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <!-- Header -->
                <div class="header">
                  <h1>✨ Bienvenue sur InvestFlow</h1>
                  <p>Vous avez été invité à rejoindre une organisation</p>
                </div>

                <!-- Content -->
                <div class="content">
                  <div class="greeting">
                    Bonjour <strong>${firstName} ${lastName}</strong>,
                  </div>

                  <div class="message">
                    Vous avez été invité(e) à rejoindre <strong>${orgName}</strong> sur la plateforme InvestFlow avec le rôle de<span class="role-badge">${role === 'admin' ? '👨‍💼 Administrateur' : '👤 Membre'}</span>
                  </div>

                  <!-- Info Card -->
                  <div class="info-card">
                    <div class="info-item">
                      <span class="info-icon">📧</span>
                      <span class="info-label">Email:</span>
                      <span class="info-value">${email}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-icon">🏢</span>
                      <span class="info-label">Organisation:</span>
                      <span class="info-value">${orgName}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-icon">🎯</span>
                      <span class="info-label">Rôle:</span>
                      <span class="info-value">${role === 'admin' ? 'Administrateur - Accès complet à la gestion' : 'Membre - Accès aux données de l\'organisation'}</span>
                    </div>
                  </div>

                  <div class="message">
                    Pour activer votre compte et définir votre mot de passe, cliquez sur le bouton ci-dessous :
                  </div>

                  <!-- CTA Button -->
                  <div class="cta-container">
                    <a href="${invitationLink}" class="button">
                      🚀 Activer mon compte
                    </a>
                  </div>

                  <!-- Alternative Link -->
                  <div class="link-box">
                    <p>Ou copiez ce lien dans votre navigateur :</p>
                    <a href="${invitationLink}">${invitationLink}</a>
                  </div>

                  <!-- Expiry Notice -->
                  <div class="expiry-notice">
                    <p>
                      <span class="icon">⏰</span>
                      <strong>Important :</strong> Cette invitation expire dans 7 jours. Pensez à activer votre compte rapidement.
                    </p>
                  </div>
                </div>

                <!-- Footer -->
                <div class="footer">
                  <div class="footer-logo">InvestFlow</div>
                  <p>Plateforme de gestion d'investissements</p>
                  <p style="margin-top: 16px;">Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email en toute sécurité.</p>
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
