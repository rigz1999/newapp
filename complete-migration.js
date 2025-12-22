/**
 * ========================================
 * FINIXAR COMPLETE MIGRATION SCRIPT
 * US Region → Paris Region
 * ========================================
 *
 * This script handles:
 * ✅ Database data migration (all 14 tables)
 * ✅ Storage buckets and files migration
 * ✅ Verification and validation
 * ✅ Detailed progress reporting
 *
 * Prerequisites:
 * 1. Paris Supabase project created with schema already applied
 * 2. RLS policies already copied to Paris project
 * 3. npm install @supabase/supabase-js
 *
 * Usage:
 * 1. Update the configuration below with your credentials
 * 2. Run: node complete-migration.js
 */

import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

const CONFIG = {
  us: {
    url: 'https://YOUR_US_PROJECT_REF.supabase.co',
    serviceKey: 'YOUR_US_SERVICE_ROLE_KEY', // Settings → API → service_role
  },
  paris: {
    url: 'https://YOUR_PARIS_PROJECT_REF.supabase.co',
    serviceKey: 'YOUR_PARIS_SERVICE_ROLE_KEY', // Settings → API → service_role
  },
  options: {
    batchSize: 100, // Number of rows per batch
    delayBetweenBatches: 500, // milliseconds
    delayBetweenFiles: 200, // milliseconds
    migrateDatabase: true, // Set to false to skip database
    migrateStorage: true, // Set to false to skip storage
  }
};

// ============================================
// SUPABASE CLIENTS
// ============================================

const usDB = createClient(CONFIG.us.url, CONFIG.us.serviceKey);
const parisDB = createClient(CONFIG.paris.url, CONFIG.paris.serviceKey);

// ============================================
// UTILITY FUNCTIONS
// ============================================

function log(message, type = 'info') {
  const icons = {
    info: 'ℹ️ ',
    success: '✅',
    error: '❌',
    warning: '⚠️ ',
    progress: '📦',
    verify: '🔍',
    summary: '📊',
  };
  console.log(`${icons[type] || ''} ${message}`);
}

function separator(char = '=', length = 60) {
  console.log(char.repeat(length));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// DATABASE MIGRATION
// ============================================

/**
 * Migration order respects foreign key dependencies
 */
const TABLE_MIGRATION_ORDER = [
  // Base tables (no dependencies)
  'organizations',
  'app_config',

  // User tables (depend on auth.users)
  'profiles',
  'superadmin_users',
  'user_reminder_settings',

  // Membership tables
  'memberships',
  'invitations',

  // Business tables (in dependency order)
  'projets',
  'tranches',
  'investisseurs',
  'souscriptions',
  'paiements',
  'coupons_echeances',
  'payment_proofs',
];

/**
 * Migrate a single table with progress reporting
 */
async function migrateTable(tableName) {
  log(`Migrating table: ${tableName}`, 'progress');

  try {
    // Fetch all data from US
    const { data, error } = await usDB
      .from(tableName)
      .select('*');

    if (error) {
      log(`Error fetching ${tableName}: ${error.message}`, 'error');
      return { success: false, count: 0, error: error.message };
    }

    if (!data || data.length === 0) {
      log(`  No data found in ${tableName}`, 'warning');
      return { success: true, count: 0 };
    }

    log(`  Found ${data.length} rows`);

    // Insert into Paris in batches
    let successCount = 0;
    const totalBatches = Math.ceil(data.length / CONFIG.options.batchSize);

    for (let i = 0; i < data.length; i += CONFIG.options.batchSize) {
      const batch = data.slice(i, i + CONFIG.options.batchSize);
      const batchNum = Math.floor(i / CONFIG.options.batchSize) + 1;

      const { error: insertError } = await parisDB
        .from(tableName)
        .insert(batch);

      if (insertError) {
        log(`  Error in batch ${batchNum}/${totalBatches}: ${insertError.message}`, 'error');
        // Continue with next batch
      } else {
        successCount += batch.length;
        log(`  Batch ${batchNum}/${totalBatches}: ${batch.length} rows inserted`);
      }

      // Small delay to avoid rate limiting
      if (i + CONFIG.options.batchSize < data.length) {
        await sleep(CONFIG.options.delayBetweenBatches);
      }
    }

    const success = successCount === data.length;
    log(`Migrated ${successCount}/${data.length} rows from ${tableName}`, success ? 'success' : 'warning');

    return { success, count: successCount, total: data.length };

  } catch (error) {
    log(`Unexpected error in ${tableName}: ${error.message}`, 'error');
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Verify table row counts match
 */
async function verifyTable(tableName) {
  try {
    const { count: usCount, error: usError } = await usDB
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    const { count: parisCount, error: parisError } = await parisDB
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (usError || parisError) {
      log(`Error verifying ${tableName}`, 'error');
      return { tableName, usCount: 0, parisCount: 0, match: false, error: true };
    }

    const match = usCount === parisCount;
    const icon = match ? '✅' : '❌';

    console.log(`${icon} ${tableName.padEnd(25)} US: ${String(usCount).padStart(5)} | Paris: ${String(parisCount).padStart(5)}`);

    return { tableName, usCount, parisCount, match, error: false };

  } catch (error) {
    log(`Error verifying ${tableName}: ${error.message}`, 'error');
    return { tableName, usCount: 0, parisCount: 0, match: false, error: true };
  }
}

/**
 * Main database migration function
 */
async function migrateDatabaseData() {
  console.log('\n');
  separator();
  log('DATABASE MIGRATION', 'info');
  separator();

  const startTime = Date.now();
  const results = [];

  log(`Migration order: ${TABLE_MIGRATION_ORDER.length} tables`);
  console.log('  ' + TABLE_MIGRATION_ORDER.join(' → '));
  console.log('');

  // Migrate each table
  for (const tableName of TABLE_MIGRATION_ORDER) {
    const result = await migrateTable(tableName);
    results.push({ tableName, ...result });
    console.log(''); // Empty line between tables
  }

  // Verification
  separator();
  log('VERIFYING DATABASE MIGRATION', 'verify');
  separator();
  console.log('');

  const verifications = [];
  for (const tableName of TABLE_MIGRATION_ORDER) {
    const verification = await verifyTable(tableName);
    verifications.push(verification);
  }

  console.log('');
  separator();

  // Calculate summary
  const totalRows = results.reduce((sum, r) => sum + r.count, 0);
  const successfulTables = results.filter(r => r.success).length;
  const failedTables = results.filter(r => !r.success);
  const mismatchedTables = verifications.filter(v => !v.match);

  const duration = Math.round((Date.now() - startTime) / 1000);

  return {
    totalRows,
    successfulTables,
    totalTables: results.length,
    failedTables,
    mismatchedTables,
    duration,
    results,
    verifications,
  };
}

// ============================================
// STORAGE MIGRATION
// ============================================

/**
 * Migrate a single storage bucket
 */
async function migrateBucket(bucketName, isPublic = false) {
  log(`Migrating bucket: ${bucketName}`, 'progress');

  try {
    // 1. Create bucket in Paris
    log(`  Creating bucket in Paris...`);
    const { error: bucketError } = await parisDB.storage.createBucket(bucketName, {
      public: isPublic,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: null,
    });

    if (bucketError && !bucketError.message.includes('already exists')) {
      log(`  Error creating bucket: ${bucketError.message}`, 'error');
      return { success: false, fileCount: 0, error: bucketError.message };
    }

    log(`  Bucket ready`, 'success');

    // 2. List all files from US
    log(`  Fetching file list...`);
    const { data: files, error: listError } = await usDB.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      log(`  Error listing files: ${listError.message}`, 'error');
      return { success: false, fileCount: 0, error: listError.message };
    }

    if (!files || files.length === 0) {
      log(`  No files found`, 'warning');
      return { success: true, fileCount: 0 };
    }

    const actualFiles = files.filter(f => f.id !== null); // Filter out folders
    log(`  Found ${actualFiles.length} files`);

    // 3. Migrate each file
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < actualFiles.length; i++) {
      const file = actualFiles[i];

      try {
        // Download from US
        const { data: fileData, error: downloadError } = await usDB.storage
          .from(bucketName)
          .download(file.name);

        if (downloadError) {
          log(`  ❌ Download failed: ${file.name}`, 'error');
          failCount++;
          continue;
        }

        // Upload to Paris
        const { error: uploadError } = await parisDB.storage
          .from(bucketName)
          .upload(file.name, fileData, {
            contentType: file.metadata?.mimetype || 'application/octet-stream',
            upsert: true,
          });

        if (uploadError) {
          log(`  ❌ Upload failed: ${file.name}`, 'error');
          failCount++;
        } else {
          successCount++;
          const sizeKB = file.metadata?.size ? Math.round(file.metadata.size / 1024) : '?';
          log(`  ✅ [${i + 1}/${actualFiles.length}] ${file.name} (${sizeKB}KB)`);
        }

        // Rate limiting delay
        if (i < actualFiles.length - 1) {
          await sleep(CONFIG.options.delayBetweenFiles);
        }

      } catch (error) {
        log(`  ❌ Error with ${file.name}: ${error.message}`, 'error');
        failCount++;
      }
    }

    console.log('');
    log(`Bucket summary: ${successCount} succeeded, ${failCount} failed`, successCount === actualFiles.length ? 'success' : 'warning');

    return {
      success: failCount === 0,
      fileCount: successCount,
      total: actualFiles.length,
      failed: failCount
    };

  } catch (error) {
    log(`Unexpected error in bucket ${bucketName}: ${error.message}`, 'error');
    return { success: false, fileCount: 0, error: error.message };
  }
}

/**
 * Verify bucket file counts
 */
async function verifyBucket(bucketName) {
  try {
    const { data: usFiles } = await usDB.storage
      .from(bucketName)
      .list('', { limit: 1000 });

    const { data: parisFiles } = await parisDB.storage
      .from(bucketName)
      .list('', { limit: 1000 });

    const usCount = (usFiles || []).filter(f => f.id !== null).length;
    const parisCount = (parisFiles || []).filter(f => f.id !== null).length;

    const match = usCount === parisCount;
    const icon = match ? '✅' : '❌';

    console.log(`${icon} ${bucketName.padEnd(25)} US: ${String(usCount).padStart(5)} | Paris: ${String(parisCount).padStart(5)}`);

    return { bucketName, usCount, parisCount, match };

  } catch (error) {
    log(`Error verifying ${bucketName}: ${error.message}`, 'error');
    return { bucketName, usCount: 0, parisCount: 0, match: false, error: true };
  }
}

/**
 * Main storage migration function
 */
async function migrateStorageData() {
  console.log('\n');
  separator();
  log('STORAGE MIGRATION', 'info');
  separator();

  const startTime = Date.now();

  // List all buckets from US
  log('Fetching bucket list...');
  const { data: buckets, error } = await usDB.storage.listBuckets();

  if (error) {
    log(`Error fetching buckets: ${error.message}`, 'error');
    return {
      totalFiles: 0,
      successfulBuckets: 0,
      totalBuckets: 0,
      failedBuckets: [],
      duration: 0,
    };
  }

  if (!buckets || buckets.length === 0) {
    log('No storage buckets found', 'warning');
    return {
      totalFiles: 0,
      successfulBuckets: 0,
      totalBuckets: 0,
      failedBuckets: [],
      duration: 0,
    };
  }

  log(`Found ${buckets.length} buckets: ${buckets.map(b => b.name).join(', ')}`);
  console.log('');

  const results = [];

  // Migrate each bucket
  for (const bucket of buckets) {
    const result = await migrateBucket(bucket.name, bucket.public);
    results.push({ bucketName: bucket.name, ...result });
    console.log(''); // Empty line between buckets
  }

  // Verification
  separator();
  log('VERIFYING STORAGE MIGRATION', 'verify');
  separator();
  console.log('');

  const verifications = [];
  for (const bucket of buckets) {
    const verification = await verifyBucket(bucket.name);
    verifications.push(verification);
  }

  console.log('');
  separator();

  // Calculate summary
  const totalFiles = results.reduce((sum, r) => sum + r.fileCount, 0);
  const successfulBuckets = results.filter(r => r.success).length;
  const failedBuckets = results.filter(r => !r.success);
  const mismatchedBuckets = verifications.filter(v => !v.match);

  const duration = Math.round((Date.now() - startTime) / 1000);

  return {
    totalFiles,
    successfulBuckets,
    totalBuckets: results.length,
    failedBuckets,
    mismatchedBuckets,
    duration,
    results,
    verifications,
  };
}

// ============================================
// MAIN MIGRATION ORCHESTRATOR
// ============================================

async function runCompleteMigration() {
  const overallStartTime = Date.now();

  console.log('\n');
  separator('=', 70);
  console.log('🚀  FINIXAR COMPLETE MIGRATION: US → PARIS');
  separator('=', 70);
  console.log('');
  console.log('📍 Source:      US Region');
  console.log('📍 Destination: Paris Region (eu-central-1)');
  console.log('⏰ Started at:  ' + new Date().toLocaleString());
  console.log('');

  // Validate configuration
  if (CONFIG.us.url.includes('YOUR_') || CONFIG.paris.url.includes('YOUR_')) {
    log('❌ ERROR: Please update the configuration with your actual Supabase credentials!', 'error');
    log('Edit this file and replace YOUR_US_PROJECT_REF and YOUR_PARIS_PROJECT_REF', 'error');
    process.exit(1);
  }

  let databaseSummary = null;
  let storageSummary = null;

  // Database migration
  if (CONFIG.options.migrateDatabase) {
    databaseSummary = await migrateDatabaseData();
  } else {
    log('Database migration skipped (migrateDatabase = false)', 'warning');
  }

  // Storage migration
  if (CONFIG.options.migrateStorage) {
    storageSummary = await migrateStorageData();
  } else {
    log('Storage migration skipped (migrateStorage = false)', 'warning');
  }

  // ============================================
  // FINAL SUMMARY
  // ============================================

  console.log('\n');
  separator('=', 70);
  log('FINAL MIGRATION SUMMARY', 'summary');
  separator('=', 70);
  console.log('');

  // Database summary
  if (databaseSummary) {
    console.log('📊 DATABASE:');
    console.log(`   ✅ Successfully migrated: ${databaseSummary.successfulTables}/${databaseSummary.totalTables} tables`);
    console.log(`   📦 Total rows migrated:   ${databaseSummary.totalRows.toLocaleString()}`);
    console.log(`   ⏱️  Duration:              ${databaseSummary.duration}s`);

    if (databaseSummary.failedTables.length > 0) {
      console.log(`   ❌ Failed tables:         ${databaseSummary.failedTables.length}`);
      databaseSummary.failedTables.forEach(t => {
        console.log(`      - ${t.tableName}: ${t.error || 'Unknown error'}`);
      });
    }

    if (databaseSummary.mismatchedTables.length > 0) {
      console.log(`   ⚠️  Row count mismatches: ${databaseSummary.mismatchedTables.length}`);
      databaseSummary.mismatchedTables.forEach(v => {
        console.log(`      - ${v.tableName}: US=${v.usCount}, Paris=${v.parisCount}`);
      });
    }
    console.log('');
  }

  // Storage summary
  if (storageSummary && storageSummary.totalBuckets > 0) {
    console.log('💾 STORAGE:');
    console.log(`   ✅ Successfully migrated: ${storageSummary.successfulBuckets}/${storageSummary.totalBuckets} buckets`);
    console.log(`   📦 Total files migrated:  ${storageSummary.totalFiles.toLocaleString()}`);
    console.log(`   ⏱️  Duration:              ${storageSummary.duration}s`);

    if (storageSummary.failedBuckets.length > 0) {
      console.log(`   ❌ Failed buckets:        ${storageSummary.failedBuckets.length}`);
      storageSummary.failedBuckets.forEach(b => {
        console.log(`      - ${b.bucketName}: ${b.error || 'Unknown error'}`);
      });
    }

    if (storageSummary.mismatchedBuckets && storageSummary.mismatchedBuckets.length > 0) {
      console.log(`   ⚠️  File count mismatches: ${storageSummary.mismatchedBuckets.length}`);
      storageSummary.mismatchedBuckets.forEach(v => {
        console.log(`      - ${v.bucketName}: US=${v.usCount}, Paris=${v.parisCount}`);
      });
    }
    console.log('');
  }

  // Overall summary
  const overallDuration = Math.round((Date.now() - overallStartTime) / 1000);
  const minutes = Math.floor(overallDuration / 60);
  const seconds = overallDuration % 60;

  console.log('⏱️  TOTAL TIME: ' + (minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`));
  console.log('⏰ Completed at: ' + new Date().toLocaleString());
  console.log('');

  // Final status
  const hasErrors =
    (databaseSummary && (databaseSummary.failedTables.length > 0 || databaseSummary.mismatchedTables.length > 0)) ||
    (storageSummary && (storageSummary.failedBuckets.length > 0 || (storageSummary.mismatchedBuckets && storageSummary.mismatchedBuckets.length > 0)));

  if (!hasErrors) {
    console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update your application environment variables');
    console.log('2. Deploy your application with new Supabase URL and keys');
    console.log('3. Test all functionality thoroughly');
    console.log('4. Monitor for 24-48 hours before decommissioning US project');
  } else {
    console.log('⚠️  MIGRATION COMPLETED WITH WARNINGS');
    console.log('');
    console.log('Please review the errors above and:');
    console.log('1. Check failed tables/buckets');
    console.log('2. Verify data integrity');
    console.log('3. Re-run migration for failed items if needed');
    console.log('4. Test application before going live');
  }

  separator('=', 70);
  console.log('\n');
}

// ============================================
// RUN MIGRATION
// ============================================

runCompleteMigration().catch(error => {
  console.error('\n💥 FATAL ERROR:', error);
  console.error(error.stack);
  process.exit(1);
});
