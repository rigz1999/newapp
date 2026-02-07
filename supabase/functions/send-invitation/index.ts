import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = 'https://app.finixar.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvitationRequest {
  email: string
  firstName: string
  lastName: string
  role: 'member' | 'admin'
  orgId: string
  orgName: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')

    let user: { id: string; email: string }

    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid token format')
      }

      const payload = JSON.parse(atob(parts[1]))

      user = {
        id: payload.sub,
        email: payload.email,
      }

      if (!user.id || !user.email) {
        throw new Error('Invalid token payload')
      }

      console.log('User authenticated:', user.email)
    } catch (decodeError) {
      console.error('Token decode error:', decodeError)
      throw new Error('Invalid token')
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { email, firstName, lastName, role, orgId, orgName }: InvitationRequest = await req.json()

    const SUPER_ADMIN_EMAIL = 'zrig.ayman@gmail.com'
    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL

    if (!isSuperAdmin) {
      const { data: membership } = await supabaseAdmin
        .from('memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('org_id', orgId)
        .single()

      if (!membership || membership.role !== 'admin') {
        throw new Error('Not authorized to invite users to this organization')
      }
    }

    const token_string = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        org_id: orgId,
        role,
        token: token_string,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (invitationError) {
      throw new Error(`Failed to create invitation: ${invitationError.message}`)
    }

    const invitationLink = `${APP_URL}/invitation/accept?token=${token_string}`

    const roleLabel = role === 'admin' ? 'Administrateur' : 'Membre'
    const roleDescription = role === 'admin'
      ? 'Gestion compl\u00e8te de l\u2019organisation et des membres'
      : 'Consultation des projets et donn\u00e9es de l\u2019organisation'

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Finixar <support@finixar.com>',
        to: [email],
        subject: `${orgName} vous invite \u00e0 rejoindre Finixar`,
        text: `Bonjour ${firstName},\n\n${orgName} vous invite \u00e0 rejoindre son espace sur Finixar en tant que ${roleLabel}.\n\n${roleDescription}.\n\nAcceptez l\u2019invitation en suivant ce lien :\n${invitationLink}\n\nCe lien expire dans 7 jours.\n\nSi vous n\u2019attendiez pas cette invitation, vous pouvez ignorer cet email.\n\n--\nFinixar \u00b7 Plateforme de gestion d\u2019investissements\nsupport@finixar.com`,
        html: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <!--[if !mso]><!-->
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
  </style>
  <!--<![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader (hidden preview text) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${firstName}, ${orgName} vous attend sur Finixar \u2014 acceptez votre invitation.
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <!-- Container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color: #1e40af; padding: 40px 40px 36px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Rejoignez ${orgName}</h1>
              <p style="margin: 10px 0 0; font-size: 15px; color: rgba(255,255,255,0.9); font-weight: 400;">Invitation sur Finixar</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 40px 16px;">
              <p style="margin: 0 0 24px; font-size: 17px; color: #0f172a; font-weight: 500;">
                Bonjour ${firstName},
              </p>
              <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.7; color: #475569;">
                <strong style="color: #0f172a;">${orgName}</strong> vous invite \u00e0 rejoindre
                son espace sur Finixar.
              </p>

              <!-- Role -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-right: 14px; vertical-align: middle;">
                          <div style="display: inline-block; background-color: ${role === 'admin' ? '#7c3aed' : '#059669'}; color: #ffffff; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                            ${roleLabel}
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <span style="font-size: 14px; color: #475569;">${roleDescription}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.7; color: #475569;">
                Cliquez sur le bouton ci-dessous pour cr\u00e9er votre compte et rejoindre l\u2019\u00e9quipe :
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 16px 40px 32px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${invitationLink}" style="height:52px;v-text-anchor:middle;width:260px;" arcsize="15%" fillcolor="#2563eb" strokecolor="#2563eb" strokeweight="0">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:600;">Accepter l\u2019invitation</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${invitationLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3); mso-padding-alt: 0;">
                Accepter l\u2019invitation
              </a>
              <!--<![endif]-->
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding: 0 40px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
                    <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; font-weight: 500;">Ou copiez ce lien dans votre navigateur :</p>
                    <a href="${invitationLink}" style="font-size: 12px; color: #2563eb; text-decoration: none; word-break: break-all;">${invitationLink}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Expiry notice -->
          <tr>
            <td style="padding: 0 40px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #fff7ed; border: 1px solid #fed7aa; border-left: 4px solid #f97316; border-radius: 8px; padding: 14px 16px;">
                    <p style="margin: 0; font-size: 13px; color: #9a3412; line-height: 1.5;">
                      Cette invitation expire dans <strong>7 jours</strong>. Pass\u00e9 ce d\u00e9lai, demandez \u00e0 votre administrateur de vous renvoyer une invitation.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 28px 40px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #1e40af;">Finixar</p>
              <p style="margin: 0 0 16px; font-size: 13px; color: #64748b;">Plateforme de gestion d\u2019investissements</p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                Si vous n\u2019attendiez pas cette invitation, ignorez cet email.<br>
                Une question\u00a0? Contactez <a href="mailto:support@finixar.com" style="color: #64748b; text-decoration: underline;">support@finixar.com</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Container -->

      </td>
    </tr>
  </table>
</body>
</html>`,
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
          ...corsHeaders,
        },
      }
    )
  } catch (error) {
    console.error('Error in send-invitation:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
    })
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
    )
  }
})
