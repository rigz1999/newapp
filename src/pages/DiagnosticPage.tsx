import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function DiagnosticPage() {
  const [diagnostics, setDiagnostics] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    const results: Record<string, unknown> = {};

    try {
      // 1. Check session
      const { data: sessionData } = await supabase.auth.getSession();
      results.session = {
        userId: sessionData.session?.user?.id,
        email: sessionData.session?.user?.email,
      };

      // 2. Check super admin status
      const { data: isSuperAdmin, error: superAdminError } = await supabase.rpc(
        'check_super_admin_status'
      );
      results.superAdmin = { isSuperAdmin, error: superAdminError?.message };

      // 3. Check memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('memberships')
        .select('org_id, role, organizations(name)');
      results.memberships = { data: memberships, error: membershipsError?.message };

      // 4. Try to select projets
      const { data: projets, error: projetsError } = await supabase
        .from('projets')
        .select('id, projet, org_id')
        .limit(5);
      results.projets = {
        data: projets,
        error: projetsError?.message,
        code: projetsError?.code,
        details: projetsError?.details,
        hint: projetsError?.hint,
      };

      // 5. Try to insert a test projet
      const testProjet = {
        projet: 'TEST DIAGNOSTIC',
        emetteur: 'TEST',
        org_id: memberships?.[0]?.org_id,
      };
      const { data: insertResult, error: insertError } = await supabase
        .from('projets')
        .insert(testProjet)
        .select()
        .single();
      results.insertTest = {
        data: insertResult,
        error: insertError?.message,
        code: insertError?.code,
        details: insertError?.details,
        hint: insertError?.hint,
      };

      // Clean up test projet if it was created
      if (insertResult?.id) {
        await supabase.from('projets').delete().eq('id', insertResult.id);
      }
    } catch (error: unknown) {
      results.unexpectedError = error instanceof Error ? error.message : String(error);
    }

    setDiagnostics(results);
    setLoading(false);
  };

  if (loading) {
    return <div className="p-8">Running diagnostics...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Database Diagnostics</h1>

      <div className="space-y-6">
        {Object.entries(diagnostics).map(([key, value]) => (
          <div key={key} className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2 capitalize">{key}</h2>
            <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      <button
        onClick={runDiagnostics}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Run Diagnostics Again
      </button>
    </div>
  );
}
