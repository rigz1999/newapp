// ============================================
// Change Password Edge Function
// Verifies current password and updates to new password
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== Change Password Function Start ===');

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader) {
      console.log('ERROR: No authorization header');
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { currentPassword, newPassword } = await req.json();
    console.log('Request body parsed:', {
      hasCurrentPassword: !!currentPassword,
      hasNewPassword: !!newPassword,
      currentPasswordLength: currentPassword?.length,
      newPasswordLength: newPassword?.length
    });

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
    console.log('Getting environment variables...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      urlPreview: supabaseUrl?.substring(0, 30) + '...'
    });

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    console.log('Extracted token preview:', token.substring(0, 30) + '...');

    console.log('Creating Supabase client with user token...');
    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseAnonKey ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );
    console.log('Supabase client created with auth header');

    // Get current user using the authenticated client
    console.log('Attempting to get user...');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

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
    console.log('Verifying current password by sign in attempt...');
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    console.log('Sign in verification result:', {
      hasError: !!signInError,
      errorMessage: signInError?.message,
      errorStatus: signInError?.status
    });

    if (signInError) {
      console.log('ERROR: Current password verification failed');
      return new Response(
        JSON.stringify({ error: 'Mot de passe actuel incorrect' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to update password (bypasses current password check)
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    console.log('Service role key present:', !!supabaseServiceRoleKey);

    const supabaseAdmin = createClient(
      supabaseUrl ?? '',
      supabaseServiceRoleKey ?? ''
    );

    console.log('Attempting to update user password...');
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    console.log('Password update result:', {
      hasError: !!updateError,
      errorMessage: updateError?.message
    });

    if (updateError) {
      console.log('ERROR: Password update failed');
      return new Response(
        JSON.stringify({ error: 'Erreur lors du changement de mot de passe: ' + updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('SUCCESS: Password changed successfully');
    return new Response(
      JSON.stringify({ success: true, message: 'Mot de passe changé avec succès' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.log('ERROR: Unexpected error in change-password function');
    console.error('Error details:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
