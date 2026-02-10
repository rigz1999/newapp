import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://finixar.com',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { confirmation } = await req.json();

    if (confirmation !== 'SUPPRIMER MON COMPTE') {
      return new Response(
        JSON.stringify({
          error: 'Confirmation invalide. Tapez exactement "SUPPRIMER MON COMPTE".',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`=== Account deletion requested by user ${user.id} (${user.email}) ===`);

    // RGPD: Anonymize audit logs instead of deleting (financial records must be kept 10 years)
    await supabaseAdmin
      .from('audit_logs')
      .update({
        user_email: 'utilisateur-supprime@anonymise.local',
        user_name: 'Utilisateur supprimé',
      })
      .eq('user_id', user.id);

    // The CASCADE deletes on auth.users will handle:
    // - profiles
    // - memberships
    // - user_reminder_settings
    // - mfa_recovery_codes
    // - consent_records (with user_id)
    // - invitations (as inviter)
    // - user_email_connections
    // etc.

    // Delete the auth user (triggers all cascades)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Failed to delete user:', deleteError);
      throw deleteError;
    }

    console.log(`=== User ${user.id} successfully deleted ===`);

    return new Response(JSON.stringify({ success: true, message: 'Compte supprimé avec succès' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return new Response(JSON.stringify({ error: 'Erreur lors de la suppression du compte' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
