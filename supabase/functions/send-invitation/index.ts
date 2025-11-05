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
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                  color: white;
                  padding: 30px;
                  border-radius: 8px 8px 0 0;
                  text-align: center;
                }
                .content {
                  background: #f8fafc;
                  padding: 30px;
                  border-radius: 0 0 8px 8px;
                }
                .button {
                  display: inline-block;
                  background: #1e293b;
                  color: white;
                  padding: 14px 28px;
                  text-decoration: none;
                  border-radius: 6px;
                  margin: 20px 0;
                  font-weight: 600;
                }
                .info-box {
                  background: white;
                  border-left: 4px solid #3b82f6;
                  padding: 15px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .footer {
                  text-align: center;
                  color: #64748b;
                  font-size: 14px;
                  margin-top: 30px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1 style="margin: 0;">🎉 Invitation à InvestFlow</h1>
              </div>
              <div class="content">
                <p>Bonjour <strong>${firstName} ${lastName}</strong>,</p>

                <p>Vous avez été invité(e) à rejoindre <strong>${orgName}</strong> sur InvestFlow en tant que <strong>${role === 'admin' ? 'Administrateur' : 'Membre'}</strong>.</p>

                <div class="info-box">
                  <p style="margin: 0;"><strong>📧 Email:</strong> ${email}</p>
                  <p style="margin: 10px 0 0 0;"><strong>🏢 Organisation:</strong> ${orgName}</p>
                  <p style="margin: 10px 0 0 0;"><strong>👤 Rôle:</strong> ${role === 'admin' ? 'Administrateur' : 'Membre'}</p>
                </div>

                <p>Cliquez sur le bouton ci-dessous pour créer votre compte et définir votre mot de passe :</p>

                <div style="text-align: center;">
                  <a href="${invitationLink}" class="button">
                    Activer mon compte
                  </a>
                </div>

                <p style="color: #64748b; font-size: 14px;">
                  Ou copiez ce lien dans votre navigateur :<br>
                  <a href="${invitationLink}" style="color: #3b82f6; word-break: break-all;">${invitationLink}</a>
                </p>

                <p style="color: #ef4444; font-size: 14px;">
                  ⚠️ Cette invitation expire dans 7 jours.
                </p>
              </div>
              <div class="footer">
                <p>Cet email a été envoyé par InvestFlow</p>
                <p>Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.</p>
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
