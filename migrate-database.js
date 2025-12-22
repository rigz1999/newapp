/**
 * Supabase Database Migration Script
 * Migrates data from US region to Paris region
 *
 * Usage:
 * 1. Install dependencies: npm install @supabase/supabase-js
 * 2. Update the credentials below
 * 3. Run: node migrate-database.js
 */

import { createClient } from '@supabase/supabase-js';

// ============= CONFIGURATION =============
// Update these with your actual credentials

// US Project (source)
const US_URL = 'https://YOUR_US_PROJECT.supabase.co';
const US_SERVICE_KEY = 'your-us-service-role-key'; // Settings → API → service_role (secret)

// Paris Project (destination)
const PARIS_URL = 'https://YOUR_PARIS_PROJECT.supabase.co';
const PARIS_SERVICE_KEY = 'your-paris-service-role-key'; // Settings → API → service_role (secret)

// ============= CLIENTS =============
const usDB = createClient(US_URL, US_SERVICE_KEY);
const parisDB = createClient(PARIS_URL, PARIS_SERVICE_KEY);

// ============= MIGRATION FUNCTIONS =============

/**
 * Migrate a single table
 */
async function migrateTable(tableName, batchSize = 100) {
  console.log(`\n📦 Migrating table: ${tableName}`);

  try {
    // Fetch all data from US
    const { data, error } = await usDB
      .from(tableName)
      .select('*');

    if (error) {
      console.error(`❌ Error fetching ${tableName}:`, error.message);
      return { success: false, count: 0 };
    }

    if (!data || data.length === 0) {
      console.log(`⚠️  No data found in ${tableName}`);
      return { success: true, count: 0 };
    }

    console.log(`   Found ${data.length} rows`);

    // Insert into Paris in batches
    let successCount = 0;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      const { error: insertError } = await parisDB
        .from(tableName)
        .insert(batch);

      if (insertError) {
        console.error(`❌ Error inserting batch into ${tableName}:`, insertError.message);
        console.error(`   Failed batch range: ${i} to ${i + batch.length}`);
        // Continue with next batch instead of stopping
      } else {
        successCount += batch.length;
      }
    }

    console.log(`✅ Migrated ${successCount}/${data.length} rows from ${tableName}`);
    return { success: true, count: successCount };

  } catch (error) {
    console.error(`❌ Unexpected error in ${tableName}:`, error.message);
    return { success: false, count: 0 };
  }
}

/**
 * Verify row counts match
 */
async function verifyTable(tableName) {
  const { count: usCount } = await usDB
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  const { count: parisCount } = await parisDB
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  const match = usCount === parisCount;
  const icon = match ? '✅' : '❌';

  console.log(`${icon} ${tableName}: US=${usCount}, Paris=${parisCount}`);

  return { tableName, usCount, parisCount, match };
}

/**
 * Main migration function
 * Tables are ordered to respect foreign key dependencies
 */
async function migrate() {
  console.log('🚀 Starting Finixar Database Migration');
  console.log('📍 From: US Region');
  console.log('📍 To: Paris Region');
  console.log('⏰ Started at:', new Date().toLocaleString());

  const startTime = Date.now();
  const results = [];

  // Migration order respects foreign key dependencies
  const migrationOrder = [
    // Base tables (no dependencies)
    'organizations',
    'app_config',

    // User tables (depend on auth.users, which we'll handle separately)
    'profiles',
    'superadmin_users',
    'user_reminder_settings',

    // Membership tables
    'memberships',
    'invitations',

    // Business tables
    'projets',
    'tranches',
    'investisseurs',
    'souscriptions',
    'paiements',
    'coupons_echeances',
    'payment_proofs',
  ];

  console.log('\n📋 Migration order:', migrationOrder.join(' → '));
  console.log('\n' + '='.repeat(60));

  // Migrate each table in order
  for (const tableName of migrationOrder) {
    const result = await migrateTable(tableName);
    results.push({ tableName, ...result });

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Verification
  console.log('\n' + '='.repeat(60));
  console.log('\n🔍 Verifying migration...\n');

  const verifications = [];
  for (const tableName of migrationOrder) {
    const verification = await verifyTable(tableName);
    verifications.push(verification);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 MIGRATION SUMMARY\n');

  const totalRows = results.reduce((sum, r) => sum + r.count, 0);
  const successfulTables = results.filter(r => r.success).length;
  const failedTables = results.filter(r => !r.success);
  const mismatchedTables = verifications.filter(v => !v.match);

  console.log(`✅ Successfully migrated: ${successfulTables}/${results.length} tables`);
  console.log(`📦 Total rows migrated: ${totalRows}`);

  if (failedTables.length > 0) {
    console.log(`\n❌ Failed tables (${failedTables.length}):`);
    failedTables.forEach(t => console.log(`   - ${t.tableName}`));
  }

  if (mismatchedTables.length > 0) {
    console.log(`\n⚠️  Row count mismatches (${mismatchedTables.length}):`);
    mismatchedTables.forEach(v => {
      console.log(`   - ${v.tableName}: US=${v.usCount}, Paris=${v.parisCount}`);
    });
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n⏱️  Total time: ${duration}s`);
  console.log('⏰ Completed at:', new Date().toLocaleString());

  if (failedTables.length === 0 && mismatchedTables.length === 0) {
    console.log('\n🎉 Migration completed successfully!');
  } else {
    console.log('\n⚠️  Migration completed with warnings. Please review the errors above.');
  }
}

// ============= RUN MIGRATION =============
migrate().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
