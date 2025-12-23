#!/usr/bin/env node

/**
 * Supabase Migration Script: Apply all migrations to Paris project
 * This script reads migration files and applies them to the new Paris database
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Paris project credentials
const PARIS_URL = 'https://nyyneivgrwksesgsmpjm.supabase.co';
const PARIS_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eW5laXZncndrc2VzZ3NtcGptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3NjQ2OSwiZXhwIjoyMDgxOTUyNDY5fQ.Qtc2K2ZQO8llizfQVA-IiKNRBo2ylDQw_E4NKxpTpy0';

// Create Supabase client
const supabase = createClient(PARIS_URL, PARIS_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migrations directory
const MIGRATIONS_DIR = path.join(__dirname, 'supabase', 'migrations');

async function executeSql(sql, filename) {
  try {
    // Use the REST API to execute raw SQL
    const response = await fetch(`${PARIS_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': PARIS_SERVICE_KEY,
        'Authorization': `Bearer ${PARIS_SERVICE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // If exec_sql doesn't exist, we need to create it first or use a different approach
      // Let's try using the SQL endpoint directly
      const postgrestResponse = await fetch(`${PARIS_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': PARIS_SERVICE_KEY,
          'Authorization': `Bearer ${PARIS_SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: sql })
      });

      if (!postgrestResponse.ok) {
        const errorText = await postgrestResponse.text();
        throw new Error(`HTTP ${postgrestResponse.status}: ${errorText}`);
      }
    }

    console.log(`✅ Applied: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed: ${filename}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function applyMigrations() {
  console.log('🚀 Starting migration to Paris project...\n');
  console.log(`Target: ${PARIS_URL}\n`);

  // Read all migration files
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Sort alphabetically (they have timestamps in filenames)

  console.log(`Found ${files.length} migration files\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`Applying: ${file}...`);

    const success = await executeSql(sql, file);
    if (success) {
      successCount++;
    } else {
      failCount++;
      // Continue with other migrations even if one fails
      // This allows us to see all failures
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Migration Summary:`);
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  📊 Total: ${files.length}`);
  console.log('='.repeat(60));

  if (failCount > 0) {
    console.log('\n⚠️  Some migrations failed. Check errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All migrations applied successfully!');
  }
}

// Run the migration
applyMigrations().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
