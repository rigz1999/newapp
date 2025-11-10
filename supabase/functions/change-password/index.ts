// ============================================
// Change Password Edge Function
// Verifies current password and updates to new password
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header received:', {
      hasAuthHeader: !!authHeader,
      authHeaderPreview: authHeader?.substring(0, 30) + '...'
    });

    if (!authHeader) {
      console.log('ERROR: No auth header provided');
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { currentPassword, newPassword } = await req.json();
    console.log('Request body received:', {
      hasCurrentPassword: !!currentPassword,
      hasNewPassword: !!newPassword
    });

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
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

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

    // Initialize Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      urlPreview: supabaseUrl?.substring(0, 30) + '...'
    });

    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseAnonKey ?? ''
    );

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    console.log('Extracted token preview:', token.substring(0, 30) + '...');

    // Get current user by passing JWT directly
    console.log('Attempting to get user with JWT...');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    console.log('getUser result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      hasError: !!userError,
      errorMessage: userError?.message,
      errorStatus: userError?.status
    });

    if (userError || !user) {
      console.log('ERROR: getUser failed - returning 401');
      return new Response(
        JSON.stringify({ error: 'Non autorisé', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify current password by attempting to sign in
    console.log('Verifying current password for user:', user.email);
    const verifyClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      console.log('ERROR: Password verification failed:', signInError.message);
      return new Response(
        JSON.stringify({ error: 'Mot de passe actuel incorrect' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Password verification successful');

    // Initialize admin client to update password
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    console.log('Admin client check:', {
      hasServiceRoleKey: !!serviceRoleKey
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey ?? ''
    );

    // Update password using admin client
    console.log('Updating password for user:', user.id);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('ERROR: Password update failed:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la mise à jour du mot de passe' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('SUCCESS: Password updated successfully');
    return new Response(
      JSON.stringify({ success: true, message: 'Mot de passe changé avec succès' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Une erreur inattendue s\'est produite' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
