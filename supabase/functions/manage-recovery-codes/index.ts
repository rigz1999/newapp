import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as hexEncode } from 'https://deno.land/std@0.168.0/encoding/hex.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://finixar.com',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a random recovery code (8 chars, alphanumeric)
function generateCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return new TextDecoder().decode(hexEncode(bytes)).toUpperCase();
}

// Hash a code using SHA-256
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return new TextDecoder().decode(hexEncode(hashArray));
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create authenticated client to get user
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action } = await req.json();

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (action === 'generate') {
      // Generate 8 new recovery codes
      const codes: string[] = [];
      const rows = [];

      for (let i = 0; i < 8; i++) {
        const code = generateCode();
        const hash = await hashCode(code);
        codes.push(code);
        rows.push({
          user_id: user.id,
          code_hash: hash,
        });
      }

      // Delete old codes
      await supabaseAdmin.from('mfa_recovery_codes').delete().eq('user_id', user.id);

      // Insert new codes
      const { error: insertError } = await supabaseAdmin.from('mfa_recovery_codes').insert(rows);

      if (insertError) {
        throw insertError;
      }

      // Return plaintext codes (shown ONCE to user)
      return new Response(JSON.stringify({ codes }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify') {
      const { code } = await req.json();
      if (!code) {
        return new Response(JSON.stringify({ error: 'Code requis' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const codeHash = await hashCode(code.toUpperCase().trim());

      // Find matching unused code
      const { data: match, error: matchError } = await supabaseAdmin
        .from('mfa_recovery_codes')
        .select('id')
        .eq('user_id', user.id)
        .eq('code_hash', codeHash)
        .is('used_at', null)
        .maybeSingle();

      if (matchError || !match) {
        return new Response(JSON.stringify({ error: 'Code de récupération invalide' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Mark code as used
      await supabaseAdmin
        .from('mfa_recovery_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', match.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'count') {
      // Return number of remaining unused codes
      const { count, error: countError } = await supabaseAdmin
        .from('mfa_recovery_codes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('used_at', null);

      if (countError) {
        throw countError;
      }

      return new Response(JSON.stringify({ remaining: count || 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Action invalide' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Recovery codes error:', error);
    return new Response(JSON.stringify({ error: 'Erreur interne' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
