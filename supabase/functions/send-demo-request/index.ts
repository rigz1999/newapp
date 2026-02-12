import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

interface DemoRequest {
  name: string
  email: string
  company: string
  role: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://finixar.com',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'content-type, authorization',
      },
    })
  }

  try {
    // Parse request body
    const { name, email, company, role }: DemoRequest = await req.json()

    // Validate required fields
    if (!name || !email || !company || !role) {
      throw new Error('Missing required fields')
    }

    // Send notification email to support@finixar.com
    const notificationResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Finixar <support@finixar.com>',
        to: ['support@finixar.com'],
        subject: '🎯 Nouvelle demande de démonstration',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  line-height: 1.6;
                  color: #1e293b;
                  background-color: #f1f5f9;
                  padding: 20px;
                }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  background: white;
                  border-radius: 12px;
                  overflow: hidden;
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }
                .header {
                  background: #2563eb;
                  color: white;
                  padding: 32px;
                  text-align: center;
                }
                .header h1 {
                  font-size: 24px;
                  font-weight: 700;
                  margin: 0;
                }
                .content {
                  padding: 32px;
                }
                .info-row {
                  display: flex;
                  margin-bottom: 16px;
                  padding-bottom: 16px;
                  border-bottom: 1px solid #e2e8f0;
                }
                .info-row:last-child {
                  border-bottom: none;
                }
                .info-label {
                  font-weight: 600;
                  color: #0f172a;
                  min-width: 120px;
                }
                .info-value {
                  color: #475569;
                }
                .footer {
                  background: #f8fafc;
                  padding: 24px;
                  text-align: center;
                  color: #64748b;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎯 Nouvelle demande de démonstration</h1>
                </div>
                <div class="content">
                  <p style="margin-bottom: 24px; font-size: 16px;">
                    Un nouveau prospect souhaite voir une démonstration de Finixar.
                  </p>
                  <div class="info-row">
                    <div class="info-label">Nom :</div>
                    <div class="info-value">${name}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Email :</div>
                    <div class="info-value"><a href="mailto:${email}">${email}</a></div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Entreprise :</div>
                    <div class="info-value">${company}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Poste :</div>
                    <div class="info-value">${role}</div>
                  </div>
                </div>
                <div class="footer">
                  <p>Répondez rapidement pour maximiser vos chances de conversion!</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    })

    if (!notificationResponse.ok) {
      const errorText = await notificationResponse.text()
      throw new Error(`Failed to send notification email: ${errorText}`)
    }

    // Send confirmation email to user
    const confirmationResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Finixar <support@finixar.com>',
        to: [email],
        subject: 'Demande de démonstration reçue - Finixar',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  line-height: 1.6;
                  color: #1e293b;
                  background-color: #f1f5f9;
                  padding: 20px;
                }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  background: white;
                  border-radius: 12px;
                  overflow: hidden;
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }
                .header {
                  background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
                  color: white;
                  padding: 48px 32px;
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
                  padding: 40px 32px;
                }
                .greeting {
                  font-size: 18px;
                  color: #0f172a;
                  margin-bottom: 20px;
                  font-weight: 500;
                }
                .message {
                  font-size: 16px;
                  color: #475569;
                  margin-bottom: 24px;
                  line-height: 1.7;
                }
                .info-box {
                  background: #f8fafc;
                  border: 2px solid #e2e8f0;
                  border-radius: 10px;
                  padding: 24px;
                  margin: 24px 0;
                }
                .info-box h3 {
                  font-size: 16px;
                  font-weight: 600;
                  color: #0f172a;
                  margin: 0 0 16px 0;
                }
                .info-box ul {
                  margin: 0;
                  padding: 0;
                  list-style: none;
                }
                .info-box li {
                  padding: 8px 0;
                  color: #475569;
                  display: flex;
                  align-items: flex-start;
                }
                .info-box li:before {
                  content: "✓";
                  color: #10b981;
                  font-weight: bold;
                  margin-right: 12px;
                  font-size: 18px;
                }
                .cta {
                  background: #ecfdf5;
                  border-left: 4px solid #10b981;
                  padding: 20px;
                  margin: 24px 0;
                  border-radius: 6px;
                }
                .cta p {
                  margin: 0;
                  color: #065f46;
                  font-size: 14px;
                  line-height: 1.6;
                }
                .footer {
                  background: #f8fafc;
                  padding: 32px;
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
                  margin: 4px 0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✅ Demande bien reçue !</h1>
                  <p>Merci pour votre intérêt</p>
                </div>
                <div class="content">
                  <div class="greeting">
                    Bonjour <strong>${name}</strong>,
                  </div>
                  <div class="message">
                    Nous avons bien reçu votre demande de démonstration pour <strong>${company}</strong>.
                  </div>
                  <div class="info-box">
                    <h3>📅 Prochaines étapes</h3>
                    <ul>
                      <li>Notre équipe vous contactera sous 24 heures</li>
                      <li>Nous préparerons une démonstration personnalisée</li>
                      <li>Vous recevrez un lien de visioconférence</li>
                    </ul>
                  </div>
                  <div class="message">
                    En attendant, n'hésitez pas à nous contacter si vous avez des questions ou des besoins spécifiques à aborder lors de la démonstration.
                  </div>
                  <div class="cta">
                    <p><strong>💡 Astuce :</strong> Préparez une liste de vos cas d'usage principaux pour maximiser la valeur de notre échange !</p>
                  </div>
                </div>
                <div class="footer">
                  <div class="footer-logo">Finixar</div>
                  <p>Plateforme de gestion d'actifs</p>
                  <p style="margin-top: 16px;">
                    <a href="mailto:support@finixar.com" style="color: #2563eb; text-decoration: none;">support@finixar.com</a>
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    })

    if (!confirmationResponse.ok) {
      const errorText = await confirmationResponse.text()
      console.error('Failed to send confirmation email:', errorText)
      // Don't throw - notification was sent successfully
    }

    const notificationData = await notificationResponse.json()
    const confirmationData = confirmationResponse.ok ? await confirmationResponse.json() : null

    return new Response(
      JSON.stringify({
        success: true,
        notificationId: notificationData.id,
        confirmationId: confirmationData?.id,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://finixar.com',
        },
      }
    )
  } catch (error) {
    console.error('Error in send-demo-request:', error)
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
    )
  }
})
