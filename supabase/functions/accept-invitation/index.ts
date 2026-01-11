import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

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

    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();

    if (expiresAt < now) {
      await supabaseAdmin
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({ error: 'Cette invitation a expiré' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true,
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
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du profil' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: membershipError } = await supabaseAdmin
      .from('memberships')
      .insert({
        user_id: authData.user.id,
        org_id: invitation.org_id,
        role: invitation.role,
      });

    if (membershipError) {
      console.error('Error creating membership:', membershipError);
      await supabaseAdmin.from('profiles').delete().eq('id', authData.user.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'ajout à l\'organisation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invitation.role === 'emetteur' && invitation.projet_id && invitation.emetteur_name) {
      const { error: emetteurProjectError } = await supabaseAdmin
        .from('emetteur_projects')
        .insert({
          org_id: invitation.org_id,
          projet_id: invitation.projet_id,
          user_id: authData.user.id,
          emetteur_name: invitation.emetteur_name,
          assigned_by: invitation.invited_by,
        });

      if (emetteurProjectError) {
        console.error('Error creating emetteur_projects link:', emetteurProjectError);
        await supabaseAdmin.from('memberships').delete().match({ user_id: authData.user.id, org_id: invitation.org_id });
        await supabaseAdmin.from('profiles').delete().eq('id', authData.user.id);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

        return new Response(
          JSON.stringify({ error: 'Erreur lors de l\'assignation au projet' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    await supabaseAdmin
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.signInWithPassword({
      email: invitation.email,
      password: password,
    });

    if (sessionError || !sessionData.session) {
      console.error('Error creating session:', sessionError);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Compte créé avec succès. Veuillez vous connecter.',
          redirect: '/'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
