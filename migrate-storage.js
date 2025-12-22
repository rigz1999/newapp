/**
 * Supabase Storage Migration Script
 * Migrates storage buckets and files from US to Paris region
 *
 * Usage:
 * 1. Install dependencies: npm install @supabase/supabase-js
 * 2. Update the credentials below
 * 3. Run: node migrate-storage.js
 */

import { createClient } from '@supabase/supabase-js';

// ============= CONFIGURATION =============

// US Project (source)
const US_URL = 'https://YOUR_US_PROJECT.supabase.co';
const US_SERVICE_KEY = 'your-us-service-role-key';

// Paris Project (destination)
const PARIS_URL = 'https://YOUR_PARIS_PROJECT.supabase.co';
const PARIS_SERVICE_KEY = 'your-paris-service-role-key';

// ============= CLIENTS =============
const usDB = createClient(US_URL, US_SERVICE_KEY);
const parisDB = createClient(PARIS_URL, PARIS_SERVICE_KEY);

// ============= STORAGE MIGRATION =============

/**
 * Migrate a storage bucket and all its files
 */
async function migrateBucket(bucketName, isPublic = false) {
  console.log(`\n📦 Migrating bucket: ${bucketName}`);

  try {
    // 1. Create bucket in Paris (if it doesn't exist)
    console.log(`   Creating bucket in Paris...`);
    const { data: bucket, error: bucketError } = await parisDB.storage.createBucket(bucketName, {
      public: isPublic,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: null, // Allow all types
    });

    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error(`   ❌ Error creating bucket:`, bucketError.message);
      return { success: false, fileCount: 0 };
    }

    console.log(`   ✅ Bucket ready in Paris`);

    // 2. List all files in US bucket
    console.log(`   Fetching file list from US...`);
    const { data: files, error: listError } = await usDB.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      console.error(`   ❌ Error listing files:`, listError.message);
      return { success: false, fileCount: 0 };
    }

    if (!files || files.length === 0) {
      console.log(`   ⚠️  No files found in bucket`);
      return { success: true, fileCount: 0 };
    }

    console.log(`   Found ${files.length} files`);

    // 3. Download and upload each file
    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      // Skip folders
      if (file.id === null) {
        continue;
      }

      try {
        // Download from US
        const { data: fileData, error: downloadError } = await usDB.storage
          .from(bucketName)
          .download(file.name);

        if (downloadError) {
          console.error(`   ❌ Error downloading ${file.name}:`, downloadError.message);
          failCount++;
          continue;
        }

        // Upload to Paris
        const { error: uploadError } = await parisDB.storage
          .from(bucketName)
          .upload(file.name, fileData, {
            contentType: file.metadata?.mimetype || 'application/octet-stream',
            upsert: true, // Overwrite if exists
          });

        if (uploadError) {
          console.error(`   ❌ Error uploading ${file.name}:`, uploadError.message);
          failCount++;
        } else {
          successCount++;
          console.log(`   ✅ Migrated: ${file.name} (${Math.round(file.metadata?.size / 1024)}KB)`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`   ❌ Unexpected error with ${file.name}:`, error.message);
        failCount++;
      }
    }

    console.log(`\n   📊 Bucket summary: ${successCount} succeeded, ${failCount} failed`);

    return { success: failCount === 0, fileCount: successCount };

  } catch (error) {
    console.error(`❌ Unexpected error in bucket ${bucketName}:`, error.message);
    return { success: false, fileCount: 0 };
  }
}

/**
 * Verify bucket file counts
 */
async function verifyBucket(bucketName) {
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

  console.log(`${icon} ${bucketName}: US=${usCount}, Paris=${parisCount}`);

  return { bucketName, usCount, parisCount, match };
}

/**
 * Main storage migration
 */
async function migrateStorage() {
  console.log('🚀 Starting Finixar Storage Migration');
  console.log('📍 From: US Region');
  console.log('📍 To: Paris Region');
  console.log('⏰ Started at:', new Date().toLocaleString());

  const startTime = Date.now();

  // List all buckets from US
  console.log('\n📋 Fetching bucket list...');
  const { data: buckets, error } = await usDB.storage.listBuckets();

  if (error) {
    console.error('❌ Error fetching buckets:', error.message);
    return;
  }

  console.log(`Found ${buckets.length} buckets:`, buckets.map(b => b.name).join(', '));
  console.log('\n' + '='.repeat(60));

  const results = [];

  // Migrate each bucket
  // Based on your schema, you likely have these buckets:
  // - rib-documents (for investor RIB files)
  // - payment-proofs (for payment proof documents)

  for (const bucket of buckets) {
    const result = await migrateBucket(bucket.name, bucket.public);
    results.push({ bucketName: bucket.name, ...result });
  }

  // Verification
  console.log('\n' + '='.repeat(60));
  console.log('\n🔍 Verifying migration...\n');

  const verifications = [];
  for (const bucket of buckets) {
    const verification = await verifyBucket(bucket.name);
    verifications.push(verification);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 STORAGE MIGRATION SUMMARY\n');

  const totalFiles = results.reduce((sum, r) => sum + r.fileCount, 0);
  const successfulBuckets = results.filter(r => r.success).length;
  const failedBuckets = results.filter(r => !r.success);
  const mismatchedBuckets = verifications.filter(v => !v.match);

  console.log(`✅ Successfully migrated: ${successfulBuckets}/${results.length} buckets`);
  console.log(`📦 Total files migrated: ${totalFiles}`);

  if (failedBuckets.length > 0) {
    console.log(`\n❌ Failed buckets (${failedBuckets.length}):`);
    failedBuckets.forEach(b => console.log(`   - ${b.bucketName}`));
  }

  if (mismatchedBuckets.length > 0) {
    console.log(`\n⚠️  File count mismatches (${mismatchedBuckets.length}):`);
    mismatchedBuckets.forEach(v => {
      console.log(`   - ${v.bucketName}: US=${v.usCount}, Paris=${v.parisCount}`);
    });
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n⏱️  Total time: ${duration}s`);
  console.log('⏰ Completed at:', new Date().toLocaleString());

  if (failedBuckets.length === 0 && mismatchedBuckets.length === 0) {
    console.log('\n🎉 Storage migration completed successfully!');
  } else {
    console.log('\n⚠️  Migration completed with warnings. Please review the errors above.');
  }
}

// ============= RUN MIGRATION =============
migrateStorage().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
