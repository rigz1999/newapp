import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, getClientIp, rateLimitResponse } from '../_shared/rate-limit.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// Password validation function
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 12) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins 12 caractères' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins une majuscule' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins une minuscule' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins un chiffre' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins un caractère spécial' };
  }

  return { valid: true };
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
    // Rate limit: 5 attempts per 15 minutes per IP
    const ip = getClientIp(req);
    const rl = checkRateLimit(`reset-password:${ip}`, { maxRequests: 5, windowSeconds: 900 });
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds, {
        'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://finixar.com',
      });
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    const { token, newPassword }: ResetPasswordRequest = await req.json();

    if (!token || !newPassword) {
      throw new Error('Token et nouveau mot de passe requis');
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.error!);
    }

    // Get reset token from database
    const { data: resetToken, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (tokenError || !resetToken) {
      throw new Error('Token invalide ou expiré');
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(resetToken.expires_at);

    if (now > expiresAt) {
      // Mark token as expired
      await supabaseAdmin
        .from('password_reset_tokens')
        .update({ status: 'expired' })
        .eq('id', resetToken.id);

      throw new Error('Ce lien a expiré. Veuillez faire une nouvelle demande de réinitialisation.');
    }

    // Get user by email
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();

    if (userError) {
      throw new Error("Erreur lors de la recherche de l'utilisateur");
    }

    const user = users.users.find(u => u.email === resetToken.email);

    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    // Update user's password using Supabase Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error('Failed to update password:', updateError);
      throw new Error('Échec de la mise à jour du mot de passe');
    }

    // Mark token as used
    await supabaseAdmin
      .from('password_reset_tokens')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
      })
      .eq('id', resetToken.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mot de passe réinitialisé avec succès',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://finixar.com',
        },
      }
    );
  } catch (error) {
    console.error('Error in reset-password:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Erreur inconnue',
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
