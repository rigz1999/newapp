import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

type OAuthProvider = 'microsoft' | 'google';

export function EmailOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Check for OAuth errors
        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Code ou state manquant dans la réponse OAuth');
        }

        // Parse state to get provider
        const stateData = JSON.parse(decodeURIComponent(state));
        const provider: OAuthProvider = stateData.provider;

        if (provider !== 'microsoft' && provider !== 'google') {
          throw new Error('Provider invalide');
        }

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error('Utilisateur non authentifié');
        }

        // Exchange code for tokens via edge function
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error('Session non trouvée');
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exchange-oauth-code`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ code, provider }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Échec de l\'échange du code OAuth');
        }

        const { data: tokenData } = await response.json();

        // Store tokens in database
        const { error: insertError } = await supabase
          .from('user_email_connections')
          .upsert({
            user_id: user.id,
            provider,
            email_address: tokenData.email,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            token_expires_at: tokenData.expires_at,
            scope: tokenData.scope,
            token_type: tokenData.token_type || 'Bearer',
            connected_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (insertError) {
          throw new Error('Échec de la sauvegarde de la connexion email');
        }

        setStatus('success');

        // Redirect to settings after 2 seconds
        setTimeout(() => {
          navigate('/parametres');
        }, 2000);

      } catch (err) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setErrorMessage(
          err instanceof Error ? err.message : 'Une erreur est survenue'
        );

        // Redirect to settings after 3 seconds
        setTimeout(() => {
          navigate('/parametres');
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-finixar-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {status === 'loading' && (
            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                <Loader2 className="w-12 h-12 text-finixar-brand-blue animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-finixar-text mb-2">
                Connexion en cours...
              </h2>
              <p className="text-slate-600 text-sm">
                Nous configurons votre connexion email
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-finixar-text mb-2">
                Connexion réussie !
              </h2>
              <p className="text-slate-600 text-sm">
                Votre email a été connecté avec succès. Redirection...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-red-100 p-3 rounded-full">
                  <XCircle className="w-12 h-12 text-red-600" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-finixar-text mb-2">
                Erreur de connexion
              </h2>
              <p className="text-slate-600 text-sm mb-4">
                {errorMessage}
              </p>
              <p className="text-slate-500 text-xs">
                Redirection vers les paramètres...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
