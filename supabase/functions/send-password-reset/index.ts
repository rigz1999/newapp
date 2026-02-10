import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = 'https://app.finixar.com';

interface PasswordResetRequest {
  email: string;
}

serve(async req => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://finixar.com',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    console.log('=== Password reset function invoked ===');

    // Create admin client for database operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    const { email }: PasswordResetRequest = await req.json();

    console.log('Processing password reset request');

    if (!email) {
      throw new Error('Email is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Check if user exists with this email
    // Use getUserByEmail which is more efficient than listing all users
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    // Log for debugging (will show in Supabase logs)
    console.log('User lookup result:', {
      email,
      userFound: !!user,
      errorCode: userError?.code,
      errorMessage: userError?.message,
    });

    const userExists = !!user && !userError;

    // For security, we don't reveal if user exists or not
    // We always return success but only send email if user exists

    if (userExists) {
      // Generate secure token
      const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');

      // Set expiration to 1 hour from now (shorter than invitations for security)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Create password reset token in database
      const { error: tokenError } = await supabaseAdmin.from('password_reset_tokens').insert({
        email,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      });

      if (tokenError) {
        console.error('Failed to create reset token:', tokenError);
        throw new Error('Failed to create reset token');
      }

      // Create reset link
      const resetLink = `${APP_URL}/reset-password?token=${token}`;

      // Send email via Resend
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Finixar <support@finixar.com>',
          to: [email],
          subject: 'Réinitialisation de votre mot de passe Finixar',
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
                  .security-notice {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-left: 4px solid #dc2626;
                    border-radius: 8px;
                    padding: 18px;
                    margin: 28px 0;
                  }
                  .security-notice-content {
                    display: flex;
                    align-items: flex-start;
                  }
                  .security-icon {
                    width: 20px;
                    height: 20px;
                    margin-right: 12px;
                    margin-top: 2px;
                    flex-shrink: 0;
                  }
                  .security-text {
                    color: #991b1b;
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
                    <h1>Réinitialisation de mot de passe</h1>
                    <p>Finixar - Sécurité de votre compte</p>
                  </div>

                  <!-- Content -->
                  <div class="content">
                    <div class="greeting">
                      Bonjour,
                    </div>

                    <div class="message">
                      Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Finixar associé à cette adresse email.
                    </div>

                    <div class="message">
                      Pour créer un nouveau mot de passe, veuillez cliquer sur le bouton ci-dessous :
                    </div>

                    <!-- CTA Button -->
                    <div class="cta-container">
                      <a href="${resetLink}" class="button" style="color: #ffffff;">
                        Réinitialiser mon mot de passe
                      </a>
                    </div>

                    <!-- Alternative Link -->
                    <div class="link-box">
                      <p>Ou copiez ce lien dans votre navigateur :</p>
                      <a href="${resetLink}">${resetLink}</a>
                    </div>

                    <!-- Expiry Notice -->
                    <div class="expiry-notice">
                      <div class="expiry-notice-content">
                        <svg class="expiry-icon" fill="none" stroke="#f97316" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <div class="expiry-text">
                          <strong>Important :</strong> Ce lien expire dans 1 heure. Si vous n'avez pas le temps de réinitialiser votre mot de passe maintenant, vous devrez faire une nouvelle demande.
                        </div>
                      </div>
                    </div>

                    <!-- Security Notice -->
                    <div class="security-notice">
                      <div class="security-notice-content">
                        <svg class="security-icon" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        <div class="security-text">
                          <strong>Sécurité :</strong> Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email. Votre mot de passe actuel reste inchangé et sécurisé.
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div class="footer">
                    <div class="footer-logo">Finixar</div>
                    <p>Plateforme de gestion d'investissements</p>
                    <p style="margin-top: 18px; color: #94a3b8;">Cet email a été envoyé automatiquement par le système Finixar.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('Resend API error:', {
          status: emailResponse.status,
          statusText: emailResponse.statusText,
          error: errorText,
          email: email,
          hasApiKey: !!RESEND_API_KEY,
        });
        throw new Error('Failed to send email');
      }

      const emailData = await emailResponse.json();
      console.log('Password reset email sent successfully:', emailData.id);
    } else {
      console.log('Password reset requested for non-existent user');
    }

    // Always return success (don't reveal if user exists)
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://finixar.com',
        },
      }
    );
  } catch (error) {
    console.error('Error in send-password-reset:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://finixar.com',
        },
      }
    );
  }
});
