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

    // Get user from token
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

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

    // Collect all user data (RGPD Article 20 - Right to Data Portability)
    const exportData: Record<string, unknown> = {
      export_date: new Date().toISOString(),
      export_format: 'JSON (RGPD Article 20)',
      user_id: user.id,
    };

    // 1. Profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    exportData.profile = profile;

    // 2. Memberships & Organizations
    const { data: memberships } = await supabaseAdmin
      .from('memberships')
      .select('role, created_at, organizations(name)')
      .eq('user_id', user.id);
    exportData.memberships = memberships;

    // 3. Reminder settings
    const { data: reminderSettings } = await supabaseAdmin
      .from('user_reminder_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    exportData.reminder_settings = reminderSettings;

    // 4. Email connections
    const { data: emailConnections } = await supabaseAdmin
      .from('user_email_connections')
      .select('email_address, connected_at')
      .eq('user_id', user.id);
    exportData.email_connections = emailConnections;

    // 5. Consent records
    const { data: consents } = await supabaseAdmin
      .from('consent_records')
      .select('purpose_slug, status, source, recorded_at')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false });
    exportData.consent_history = consents;

    // 6. Audit logs (user's own actions)
    const { data: auditLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('action, entity_type, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500);
    exportData.audit_logs = auditLogs;

    // 7. Invitations received
    const { data: invitations } = await supabaseAdmin
      .from('invitations')
      .select('email, role, status, created_at, expires_at')
      .eq('email', user.email);
    exportData.invitations = invitations;

    // Return as JSON download
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="finixar-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Data export error:', error);
    return new Response(JSON.stringify({ error: "Erreur lors de l'export des données" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
