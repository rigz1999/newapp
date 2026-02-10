// ============================================
// Change Password Edge Function
// Verifies current password and updates to new password
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, getClientIp, rateLimitResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://finixar.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Rate limit: 5 attempts per 15 minutes per IP
    const ip = getClientIp(req);
    const rl = checkRateLimit(`change-password:${ip}`, { maxRequests: 5, windowSeconds: 900 });
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds, corsHeaders);
    }

    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { currentPassword, newPassword } = await req.json();

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Mot de passe actuel et nouveau mot de passe requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate new password (strong validation)
    if (newPassword.length < 12) {
      return new Response(
        JSON.stringify({ error: 'Le mot de passe doit contenir au moins 12 caractères' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    // Accept common special characters including: !@#$%^&*(),.?":{}|<>-_+=[]~`/\;'
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_+=\[\]~`/\\;']/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
      return new Response(
        JSON.stringify({ error: 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (currentPassword === newPassword) {
      return new Response(
        JSON.stringify({ error: 'Le nouveau mot de passe doit être différent de l\'ancien' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT cryptographically via Supabase auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Erreur lors du changement de mot de passe: ' + updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Mot de passe changé avec succès' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
