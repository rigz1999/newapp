// ============================================
// Accept Invitation Edge Function
// Handles invitation acceptance and account creation
// bypassing email confirmation since invitation verifies email
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

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse request body safely
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { token, password } = requestBody;

    if (!token || !password) {
      console.error('Missing required fields:', { hasToken: !!token, hasPassword: !!password });
      return new Response(
        JSON.stringify({ error: 'Token et mot de passe requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password requirements
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
    const hasMinLength = password.length >= 12;

    if (!hasMinLength || !hasLowercase || !hasUppercase || !hasNumber || !hasSpecial) {
      return new Response(
        JSON.stringify({ error: 'Le mot de passe doit contenir au moins 12 caractères, une minuscule, une majuscule, un chiffre et un caractère spécial' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role (admin privileges)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Initialize regular Supabase client for user session
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // 1. Fetch and validate invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('invitations')
      .select(`
        *,
        organizations:organizations(name)
      `)
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      return new Response(
        JSON.stringify({ error: 'Invitation introuvable ou invalide' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check invitation status
    if (invitation.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: 'Cette invitation a déjà été utilisée' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invitation.status === 'expired') {
      return new Response(
        JSON.stringify({ error: 'Cette invitation a expiré' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration date
    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();

    if (expiresAt < now) {
      // Mark as expired
      await supabaseAdmin
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({ error: 'Cette invitation a expiré' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email === invitation.email);

    if (userExists) {
      return new Response(
        JSON.stringify({
          error: 'Un compte existe déjà avec cet email. Veuillez vous connecter.',
          userExists: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Create user account using admin privileges (bypasses email confirmation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true, // Auto-confirm email since invitation verifies it
      user_metadata: {
        full_name: `${invitation.first_name} ${invitation.last_name}`,
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating user:', authError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du compte' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Create profile entry (required before creating membership due to foreign key constraint)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: invitation.email,
        full_name: `${invitation.first_name} ${invitation.last_name}`,
        is_superadmin: false,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Rollback: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du profil' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Create membership in organization
    const { error: membershipError } = await supabaseAdmin
      .from('memberships')
      .insert({
        user_id: authData.user.id,
        org_id: invitation.org_id,
        role: invitation.role,
      });

    if (membershipError) {
      console.error('Error creating membership:', membershipError);
      // Rollback: delete profile and user
      await supabaseAdmin.from('profiles').delete().eq('id', authData.user.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'ajout à l\'organisation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Mark invitation as accepted
    await supabaseAdmin
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    // 7. Create a session for the user
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.signInWithPassword({
      email: invitation.email,
      password: password,
    });

    if (sessionError || !sessionData.session) {
      console.error('Error creating session:', sessionError);
      // User is created but we couldn't log them in automatically
      // They can still log in manually
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Compte créé avec succès. Veuillez vous connecter.',
          redirect: '/'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Return success with session
    return new Response(
      JSON.stringify({
        success: true,
        session: sessionData.session,
        user: authData.user,
        organization: invitation.organizations?.name,
      }),
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
