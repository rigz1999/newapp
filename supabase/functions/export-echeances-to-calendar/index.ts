import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Echeance {
  id: string;
  date_echeance: string;
  montant_coupon: number;
  statut: string;
  souscription: {
    id_souscription: string;
    coupon_brut: number;
    coupon_net: number;
    montant_investi: number;
    investisseur: {
      nom_raison_sociale: string;
    };
    tranche: {
      id: string;
      tranche_name: string;
      projet: {
        id: string;
        projet: string;
      };
    };
  };
}

interface ExportSettings {
  includeUnpaidOnly: boolean;
  includePastDue: boolean;
  reminderMinutes: number;
}

interface EcheanceSnapshot {
  id: string;
  date_echeance: string;
  outlook_event_id: string;
}

interface DiffResult {
  toDelete: EcheanceSnapshot[];
  toCreate: Echeance[];
  toUpdate: Array<{ echeance: Echeance; snapshot: EcheanceSnapshot }>;
  unchanged: EcheanceSnapshot[];
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

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { projectId, trancheId, settings } = await req.json();

    if (!projectId && !trancheId) {
      throw new Error('Either projectId or trancheId must be provided');
    }

    const exportSettings: ExportSettings = {
      includeUnpaidOnly: settings?.includeUnpaidOnly ?? true,
      includePastDue: settings?.includePastDue ?? false,
      reminderMinutes: settings?.reminderMinutes ?? 10080, // 7 days default
    };

    // Fetch user's email connection
    const { data: connection, error: connError } = await supabaseClient
      .from('user_email_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      throw new Error('No email connection found. Please connect your email in settings.');
    }

    if (connection.provider !== 'microsoft') {
      throw new Error('Calendar export is only supported for Microsoft Outlook accounts.');
    }

    // Check if token needs refresh
    let accessToken = connection.access_token;
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt < fiveMinutesFromNow) {
      console.log('Token expiring soon, refreshing...');
      accessToken = await refreshAccessToken(
        connection.refresh_token,
        supabaseClient,
        user.id
      );
    }

    // Fetch echeances based on filters
    const echeances = await fetchEcheances(
      supabaseClient,
      projectId,
      trancheId,
      exportSettings
    );

    if (echeances.length === 0) {
      throw new Error('No echeances found matching the criteria');
    }

    // Get or create export record
    const { data: existingExport } = await supabaseClient
      .from('calendar_exports')
      .select('*')
      .eq('user_id', user.id)
      .eq(projectId ? 'project_id' : 'tranche_id', projectId || trancheId)
      .maybeSingle();

    // Perform smart diff
    const diff = computeDiff(
      existingExport?.echeances_snapshot || [],
      echeances
    );

    console.log('Smart diff result:', {
      toDelete: diff.toDelete.length,
      toCreate: diff.toCreate.length,
      toUpdate: diff.toUpdate.length,
      unchanged: diff.unchanged.length,
    });

    // Execute calendar operations
    const results = await executeCalendarOperations(
      accessToken,
      diff,
      echeances,
      exportSettings
    );

    // Build new snapshot with Outlook event IDs
    const newSnapshot: EcheanceSnapshot[] = [
      ...diff.unchanged,
      ...diff.toUpdate.map(u => ({
        id: u.echeance.id,
        date_echeance: u.echeance.date_echeance,
        outlook_event_id: u.snapshot.outlook_event_id, // Keep existing event ID
      })),
      ...results.created.map(r => ({
        id: r.echeance_id,
        date_echeance: r.date_echeance,
        outlook_event_id: r.outlook_event_id,
      })),
    ];

    // Save or update export record
    if (existingExport) {
      await supabaseClient
        .from('calendar_exports')
        .update({
          echeances_snapshot: newSnapshot,
          is_outdated: false,
          export_settings: exportSettings,
          exported_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingExport.id);
    } else {
      await supabaseClient
        .from('calendar_exports')
        .insert({
          user_id: user.id,
          project_id: projectId || null,
          tranche_id: trancheId || null,
          echeances_snapshot: newSnapshot,
          is_outdated: false,
          export_settings: exportSettings,
        });
    }

    // Update last_used_at for email connection
    await supabaseClient
      .from('user_email_connections')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: echeances.length,
          created: results.created.length,
          updated: results.updated.length,
          deleted: results.deleted.length,
          unchanged: diff.unchanged.length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in export-echeances-to-calendar:', error);
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

async function refreshAccessToken(
  refreshToken: string,
  supabaseClient: any,
  userId: string
): Promise<string> {
  try {
    const tenantId = Deno.env.get('MICROSOFT_TENANT_ID') || 'common';
    const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read offline_access',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Microsoft token');
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    // Update token in database
    await supabaseClient
      .from('user_email_connections')
      .update({
        access_token: data.access_token,
        token_expires_at: expiresAt,
        refresh_token: data.refresh_token || refreshToken,
      })
      .eq('user_id', userId);

    return data.access_token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw new Error('Failed to refresh access token. Please reconnect your email.');
  }
}

async function fetchEcheances(
  supabaseClient: any,
  projectId: string | null,
  trancheId: string | null,
  settings: ExportSettings
): Promise<Echeance[]> {
  let query = supabaseClient
    .from('coupons_echeances')
    .select(`
      id,
      date_echeance,
      montant_coupon,
      statut,
      souscription:souscriptions (
        id_souscription,
        coupon_brut,
        coupon_net,
        montant_investi,
        investisseur:investisseurs (
          nom_raison_sociale
        ),
        tranche:tranches (
          id,
          tranche_name,
          projet:projets (
            id,
            projet
          )
        )
      )
    `);

  // Filter by project or tranche
  if (projectId) {
    query = query.eq('souscription.tranche.projet.id', projectId);
  } else if (trancheId) {
    query = query.eq('souscription.tranche.id', trancheId);
  }

  // Filter by payment status
  if (settings.includeUnpaidOnly) {
    query = query.neq('statut', 'paye');
  }

  // Filter by date
  if (!settings.includePastDue) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    query = query.gte('date_echeance', today.toISOString().split('T')[0]);
  }

  const { data, error } = await query.order('date_echeance', { ascending: true });

  if (error) {
    console.error('Error fetching echeances:', error);
    throw new Error('Failed to fetch echeances');
  }

  return data as Echeance[];
}

function computeDiff(
  oldSnapshot: EcheanceSnapshot[],
  newEcheances: Echeance[]
): DiffResult {
  const oldMap = new Map(oldSnapshot.map(s => [s.id, s]));
  const newMap = new Map(newEcheances.map(e => [e.id, e]));

  const toDelete: EcheanceSnapshot[] = [];
  const toUpdate: Array<{ echeance: Echeance; snapshot: EcheanceSnapshot }> = [];
  const unchanged: EcheanceSnapshot[] = [];

  // Check old snapshot for deletions and updates
  for (const snapshot of oldSnapshot) {
    const newEcheance = newMap.get(snapshot.id);

    if (!newEcheance) {
      // Echeance was deleted
      toDelete.push(snapshot);
    } else if (newEcheance.date_echeance !== snapshot.date_echeance) {
      // Date changed, needs update
      toUpdate.push({ echeance: newEcheance, snapshot });
    } else {
      // Unchanged
      unchanged.push(snapshot);
    }
  }

  // Check new echeances for creations
  const toCreate: Echeance[] = [];
  for (const echeance of newEcheances) {
    if (!oldMap.has(echeance.id)) {
      toCreate.push(echeance);
    }
  }

  return { toDelete, toCreate, toUpdate, unchanged };
}

async function executeCalendarOperations(
  accessToken: string,
  diff: DiffResult,
  allEcheances: Echeance[],
  settings: ExportSettings
) {
  const created: Array<{ echeance_id: string; date_echeance: string; outlook_event_id: string }> = [];
  const updated: string[] = [];
  const deleted: string[] = [];

  // Delete removed echeances
  for (const snapshot of diff.toDelete) {
    try {
      await deleteCalendarEvent(accessToken, snapshot.outlook_event_id);
      deleted.push(snapshot.id);
    } catch (error) {
      console.error(`Failed to delete event ${snapshot.outlook_event_id}:`, error);
    }
  }

  // Update modified echeances
  for (const { echeance, snapshot } of diff.toUpdate) {
    try {
      await updateCalendarEvent(
        accessToken,
        snapshot.outlook_event_id,
        echeance,
        settings
      );
      updated.push(echeance.id);
    } catch (error) {
      console.error(`Failed to update event ${snapshot.outlook_event_id}:`, error);
    }
  }

  // Create new echeances
  for (const echeance of diff.toCreate) {
    try {
      const eventId = await createCalendarEvent(accessToken, echeance, settings);
      created.push({
        echeance_id: echeance.id,
        date_echeance: echeance.date_echeance,
        outlook_event_id: eventId,
      });
    } catch (error) {
      console.error(`Failed to create event for echeance ${echeance.id}:`, error);
    }
  }

  return { created, updated, deleted };
}

async function createCalendarEvent(
  accessToken: string,
  echeance: Echeance,
  settings: ExportSettings
): Promise<string> {
  const projectName = echeance.souscription.tranche.projet.projet;
  const trancheName = echeance.souscription.tranche.tranche_name;
  const dateEcheance = new Date(echeance.date_echeance);

  // Set event time to 9:00 AM on the due date
  const startDateTime = new Date(dateEcheance);
  startDateTime.setHours(9, 0, 0, 0);
  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(30); // 30-minute event

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const event = {
    subject: `Échéance - ${projectName} - ${trancheName}`,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'Europe/Paris',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'Europe/Paris',
    },
    body: {
      contentType: 'Text',
      content: `Date d'échéance: ${formatDate(echeance.date_echeance)}\nMontant du coupon: ${formatCurrency(echeance.montant_coupon)}\nStatut: ${echeance.statut}`,
    },
    isReminderOn: true,
    reminderMinutesBeforeStart: settings.reminderMinutes,
    categories: ['Finixar', 'Paiements'],
    showAs: 'tentative',
  };

  const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Microsoft Graph API error:', errorText);
    throw new Error('Failed to create calendar event');
  }

  const createdEvent = await response.json();
  return createdEvent.id;
}

async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  echeance: Echeance,
  settings: ExportSettings
): Promise<void> {
  const dateEcheance = new Date(echeance.date_echeance);
  const startDateTime = new Date(dateEcheance);
  startDateTime.setHours(9, 0, 0, 0);
  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(30);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const update = {
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'Europe/Paris',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'Europe/Paris',
    },
    body: {
      contentType: 'Text',
      content: `Date d'échéance: ${formatDate(echeance.date_echeance)}\nMontant du coupon: ${formatCurrency(echeance.montant_coupon)}\nStatut: ${echeance.statut}`,
    },
    reminderMinutesBeforeStart: settings.reminderMinutes,
  };

  const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(update),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Microsoft Graph API error:', errorText);
    throw new Error('Failed to update calendar event');
  }
}

async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    // 404 is OK - event already deleted
    const errorText = await response.text();
    console.error('Microsoft Graph API error:', errorText);
    throw new Error('Failed to delete calendar event');
  }
}
