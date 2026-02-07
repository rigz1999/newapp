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
      // Check if this project already has an emetteur assigned
      const { data: existingAssignment } = await supabaseAdmin
        .from('emetteur_projects')
        .select('id, user_id')
        .eq('projet_id', projetId)
        .single();

      if (existingAssignment) {
        if (existingAssignment.user_id === existingUser.id) {
          throw new Error('Cet utilisateur est déjà émetteur sur ce projet');
        }
        throw new Error('Ce projet a déjà un émetteur assigné. Veuillez d'abord retirer l'émetteur actuel.');
      }

      // Create membership if none exists — never overwrite existing roles
      const { data: existingMembership } = await supabaseAdmin
        .from('memberships')
        .select('id, role')
        .eq('user_id', existingUser.id)
        .eq('org_id', orgId)
        .single();

      if (!existingMembership) {
        await supabaseAdmin.from('memberships').insert({
          user_id: existingUser.id,
          org_id: orgId,
          role: 'emetteur',
        });
      }
      // If membership exists, keep their current role — don't downgrade

      await supabaseAdmin.from('emetteur_projects').insert({
        org_id: orgId,
        projet_id: projetId,
        user_id: existingUser.id,
        emetteur_name: emetteurName,
        assigned_by: user.id,
      });

      // Notify the emetteur they got access to a new project
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Finixar <support@finixar.com>',
          to: [email],
          subject: `${orgName} — nouvel accès au projet ${projetName}`,
          text: `Bonjour ${firstName},\n\n${orgName} vous a donné accès au projet ${projetName} sur Finixar.\n\nConnectez-vous pour y accéder :\n${APP_URL}\n\n--\nFinixar · Plateforme de gestion d'investissements\nsupport@finixar.com`,
          html: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if !mso]><!-->
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
  </style>
  <!--<![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${firstName}, vous avez accès au projet ${projetName} sur Finixar.
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color: #059669; padding: 28px 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">Nouvel accès projet</h1>
              <p style="margin: 6px 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">${orgName} sur Finixar</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #0f172a; font-weight: 500;">Bonjour ${firstName},</p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
                Vous avez désormais accès au projet <strong style="color: #0f172a;">${projetName}</strong> sur Finixar.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 32px 24px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${APP_URL}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="15%" fillcolor="#059669" strokecolor="#059669" strokeweight="0">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:600;">Accéder à Finixar</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${APP_URL}" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 8px rgba(5,150,105,0.3);">
                Accéder à Finixar
              </a>
              <!--<![endif]-->
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <img src="https://app.finixar.com/branding/logo/logo-full-blue.png" alt="Finixar" width="120" style="display: inline-block; width: 120px; height: auto; margin-bottom: 6px;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                <a href="mailto:support@finixar.com" style="color: #64748b; text-decoration: underline;">support@finixar.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        }),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Utilisateur existant ajouté au projet. Un email de notification a été envoyé.',
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

    // Check if project already has an emetteur assigned
    const { data: existingProjectEmetteur } = await supabaseAdmin
      .from('emetteur_projects')
      .select('id')
      .eq('projet_id', projetId)
      .single();

    if (existingProjectEmetteur) {
      throw new Error('Ce projet a déjà un émetteur assigné. Veuillez d'abord retirer l'émetteur actuel.');
    }

    // Check if there's already a pending invitation for this email + project
    const { data: existingInvitation } = await supabaseAdmin
      .from('invitations')
      .select('id')
      .eq('email', email)
      .eq('projet_id', projetId)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      throw new Error('Une invitation est déjà en attente pour cet email sur ce projet.');
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
        subject: `${orgName} vous invite à rejoindre Finixar`,
        text: `Bonjour ${firstName},\n\n${orgName} vous invite à rejoindre Finixar en tant qu'émetteur pour ${emetteurName}.\n\nVotre accès inclut :\n• Calendrier des paiements\n• Export des échéances (Excel & PDF)\n• Actualités des projets\n\nAcceptez l'invitation en suivant ce lien :\n${invitationLink}\n\nCe lien expire dans 7 jours.\n\nSi vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.\n\n--\nFinixar · Plateforme de gestion d'investissements\nsupport@finixar.com`,
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
    ${firstName}, ${orgName} vous invite à rejoindre Finixar en tant qu'émetteur pour ${emetteurName}.
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
            <td style="background-color: #059669; padding: 28px 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Rejoignez ${orgName}</h1>
              <p style="margin: 6px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); font-weight: 400;">Accès émetteur sur Finixar</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px 32px 0;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #0f172a; font-weight: 500;">Bonjour ${firstName},</p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
                <strong style="color: #0f172a;">${orgName}</strong> vous invite à rejoindre Finixar
                en tant qu'émetteur pour <strong style="color: #0f172a;">${emetteurName}</strong>.
              </p>

              <!-- Feature list -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px;">
                    <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #047857;">Votre accès inclut :</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr><td style="padding: 3px 0; font-size: 13px; color: #065f46;"><span style="color: #059669; font-weight: bold; margin-right: 6px;">✓</span> Calendrier des paiements</td></tr>
                      <tr><td style="padding: 3px 0; font-size: 13px; color: #065f46;"><span style="color: #059669; font-weight: bold; margin-right: 6px;">✓</span> Export des échéances (Excel &amp; PDF)</td></tr>
                      <tr><td style="padding: 3px 0; font-size: 13px; color: #065f46;"><span style="color: #059669; font-weight: bold; margin-right: 6px;">✓</span> Actualités des projets</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 4px 32px 20px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${invitationLink}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="15%" fillcolor="#059669" strokecolor="#059669" strokeweight="0">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:600;">Accepter l'invitation</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${invitationLink}" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3); mso-padding-alt: 0;">
                Accepter l'invitation
              </a>
              <!--<![endif]-->
            </td>
          </tr>

          <!-- Fallback link + expiry -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #64748b;">Ou copiez ce lien : <a href="${invitationLink}" style="color: #059669; text-decoration: none; word-break: break-all;">${invitationLink}</a></p>
              <p style="margin: 0; font-size: 11px; color: #9a3412;">Cette invitation expire dans <strong>7 jours</strong>.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <img src="https://app.finixar.com/branding/logo/logo-full-blue.png" alt="Finixar" width="120" style="display: inline-block; width: 120px; height: auto; margin-bottom: 6px;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #64748b;">Plateforme de gestion d'investissements</p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                Si vous n'attendiez pas cet accès, ignorez cet email.<br>
                Une question? <a href="mailto:support@finixar.com" style="color: #64748b; text-decoration: underline;">support@finixar.com</a>
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
