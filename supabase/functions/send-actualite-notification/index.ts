import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = 'https://app.finixar.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ActualiteNotificationRequest {
  actualiteId: string;
  projectId: string;
  orgId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { actualiteId, projectId, orgId }: ActualiteNotificationRequest = await req.json();

    const { data: actualite, error: actualiteError } = await supabaseAdmin
      .from('project_comments')
      .select(
        `
        id,
        user_id,
        comment_text,
        attachments,
        created_at,
        user:profiles!project_comments_user_id_fkey(full_name, email)
      `
      )
      .eq('id', actualiteId)
      .single();

    if (actualiteError || !actualite) {
      throw new Error('Actualité not found');
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from('projets')
      .select('projet, org_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }

    // Fetch org admins and members only (exclude emetteurs)
    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('memberships')
      .select(
        `
        user_id,
        role,
        profiles!memberships_user_id_fkey(email, full_name)
      `
      )
      .eq('org_id', orgId)
      .in('role', ['admin', 'member']);

    if (membershipsError || !memberships) {
      throw new Error('Failed to fetch organization members');
    }

    // Collect recipient emails, excluding the author
    const allUserEmails = new Map<string, string>();
    for (const m of memberships) {
      if (m.user_id !== actualite.user_id && m.profiles?.email) {
        allUserEmails.set(m.user_id, m.profiles.email);
      }
    }

    const recipients = Array.from(allUserEmails.values());

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No recipients to notify',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const actualiteUrl = `${APP_URL}/projets/${projectId}/actualites`;

    const hasAttachments = actualite.attachments && actualite.attachments.length > 0;
    const attachmentCount = hasAttachments ? actualite.attachments.length : 0;
    const imageCount = hasAttachments
      ? actualite.attachments.filter((a: any) => a.type === 'image').length
      : 0;
    const videoCount = hasAttachments
      ? actualite.attachments.filter((a: any) => a.type === 'video').length
      : 0;
    const docCount = hasAttachments
      ? actualite.attachments.filter((a: any) => a.type === 'document').length
      : 0;

    const attachmentSummary =
      attachmentCount > 0
        ? `
      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <svg width="20" height="20" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
          </svg>
          <strong style="color: #16a34a;">Fichiers joints (${attachmentCount})</strong>
        </div>
        <div style="color: #166534; font-size: 14px;">
          ${imageCount > 0 ? `📷 ${imageCount} image${imageCount > 1 ? 's' : ''}<br>` : ''}
          ${videoCount > 0 ? `🎥 ${videoCount} vidéo${videoCount > 1 ? 's' : ''}<br>` : ''}
          ${docCount > 0 ? `📄 ${docCount} document${docCount > 1 ? 's' : ''}<br>` : ''}
        </div>
      </div>
    `
        : '';

    const truncatedText =
      actualite.comment_text.length > 200
        ? actualite.comment_text.substring(0, 200) + '...'
        : actualite.comment_text;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Finixar <support@finixar.com>',
        to: recipients,
        subject: `Nouvelle actualité sur ${project.projet}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  line-height: 1.6;
                  color: #1e293b;
                  background-color: #f1f5f9;
                  padding: 40px 20px;
                  margin: 0;
                }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  background: white;
                  border-radius: 12px;
                  overflow: hidden;
                  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                }
                .header {
                  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
                  color: white;
                  padding: 40px;
                  text-align: center;
                }
                .header h1 {
                  font-size: 28px;
                  font-weight: 700;
                  margin: 0 0 8px 0;
                }
                .header p {
                  font-size: 16px;
                  opacity: 0.9;
                  margin: 0;
                }
                .content {
                  padding: 40px;
                }
                .author-info {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  margin-bottom: 24px;
                  padding-bottom: 24px;
                  border-bottom: 2px solid #e2e8f0;
                }
                .author-avatar {
                  width: 48px;
                  height: 48px;
                  border-radius: 50%;
                  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-weight: 700;
                  font-size: 20px;
                }
                .author-details {
                  flex: 1;
                }
                .author-name {
                  font-weight: 600;
                  font-size: 16px;
                  color: #0f172a;
                  margin: 0;
                }
                .post-time {
                  font-size: 14px;
                  color: #64748b;
                  margin: 4px 0 0 0;
                }
                .message-box {
                  background: #f8fafc;
                  border-left: 4px solid #3b82f6;
                  border-radius: 8px;
                  padding: 20px;
                  margin: 24px 0;
                  color: #334155;
                  font-size: 15px;
                  line-height: 1.7;
                }
                .project-badge {
                  display: inline-block;
                  background: #dbeafe;
                  color: #1e40af;
                  padding: 6px 14px;
                  border-radius: 6px;
                  font-size: 14px;
                  font-weight: 600;
                  margin-bottom: 16px;
                }
                .cta-button {
                  display: inline-block;
                  background: #2563eb;
                  color: #ffffff !important;
                  padding: 16px 32px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: 600;
                  font-size: 16px;
                  text-align: center;
                  margin: 24px 0;
                  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
                }
                .footer {
                  background: #f8fafc;
                  padding: 32px 40px;
                  text-align: center;
                  border-top: 1px solid #e2e8f0;
                  color: #64748b;
                  font-size: 14px;
                }
                .footer-logo {
                  font-size: 20px;
                  font-weight: 700;
                  color: #1e40af;
                  margin-bottom: 8px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📢 Nouvelle actualité</h1>
                  <p>Mise à jour sur votre projet</p>
                </div>

                <div class="content">
                  <div class="project-badge">
                    ${project.projet}
                  </div>

                  <div class="author-info">
                    <div class="author-avatar">
                      ${actualite.user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div class="author-details">
                      <p class="author-name">${actualite.user.full_name}</p>
                      <p class="post-time">A publié une actualité</p>
                    </div>
                  </div>

                  <div class="message-box">
                    ${truncatedText}
                  </div>

                  ${attachmentSummary}

                  <div style="text-align: center; margin-top: 32px;">
                    <a href="${actualiteUrl}" class="cta-button" style="color: #ffffff;">
                      Voir l'actualité complète
                    </a>
                  </div>
                </div>

                <div class="footer">
                  <div class="footer-logo">Finixar</div>
                  <p>Plateforme de gestion d'investissements</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Failed to send email:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailData = await emailResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailData.id,
        recipientCount: recipients.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in send-actualite-notification:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
        details: error.toString(),
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
