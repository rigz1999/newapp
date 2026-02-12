import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://finixar.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface MicrosoftUserInfo {
  mail: string;
  userPrincipalName: string;
}

interface GoogleUserInfo {
  email: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { code, provider } = await req.json();

    if (!code || !provider) {
      throw new Error('Missing code or provider');
    }

    if (provider !== 'microsoft' && provider !== 'google') {
      throw new Error('Invalid provider');
    }

    // Exchange code for tokens
    let tokenData;
    if (provider === 'microsoft') {
      tokenData = await exchangeMicrosoftCode(code);
    } else {
      tokenData = await exchangeGoogleCode(code);
    }

    return new Response(
      JSON.stringify({ data: tokenData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in exchange-oauth-code:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function exchangeMicrosoftCode(code: string) {
  const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
  const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
  const tenantId = Deno.env.get('MICROSOFT_TENANT_ID') || 'common';
  const redirectUri = Deno.env.get('MICROSOFT_REDIRECT_URI') || 'https://app.finixar.com/auth/callback/microsoft';

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured');
  }

  // Exchange code for tokens
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read offline_access',
  });

  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.text();
    console.error('Microsoft token exchange failed:', errorData);
    throw new Error('Failed to exchange Microsoft code for tokens');
  }

  const tokenData: MicrosoftTokenResponse = await tokenResponse.json();

  // Get user email from Microsoft Graph
  const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!userInfoResponse.ok) {
    throw new Error('Failed to fetch Microsoft user info');
  }

  const userInfo: MicrosoftUserInfo = await userInfoResponse.json();

  // Calculate expiration timestamp
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: expiresAt,
    scope: tokenData.scope,
    token_type: tokenData.token_type,
    email: userInfo.mail || userInfo.userPrincipalName,
  };
}

async function exchangeGoogleCode(code: string) {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI') || 'https://app.finixar.com/auth/callback/google';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  // Exchange code for tokens
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.text();
    console.error('Google token exchange failed:', errorData);
    throw new Error('Failed to exchange Google code for tokens');
  }

  const tokenData: GoogleTokenResponse = await tokenResponse.json();

  // Get user email from Google
  const userInfoResponse = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    }
  );

  if (!userInfoResponse.ok) {
    throw new Error('Failed to fetch Google user info');
  }

  const userInfo: GoogleUserInfo = await userInfoResponse.json();

  // Calculate expiration timestamp
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: expiresAt,
    scope: tokenData.scope,
    token_type: tokenData.token_type,
    email: userInfo.email,
  };
}
