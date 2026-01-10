#!/usr/bin/env node

/**
 * Verify Auth Users Script
 *
 * This script checks if users exist in Supabase Auth
 * Run with: node verify-auth-users.js
 */

// Note: This requires the service role key for auth.admin access
// You'll need to set these environment variables:
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Verifying auth users...\n');

console.log('To run this verification, you need to:');
console.log('1. Go to Supabase Dashboard > Project Settings > API');
console.log('2. Copy the service_role key (keep it secret!)');
console.log('3. Run the following commands:\n');

console.log('```bash');
console.log('export SUPABASE_URL="your-supabase-url"');
console.log('export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
console.log('node verify-auth-users.js');
console.log('```\n');

console.log('OR test directly in Supabase SQL Editor:\n');

console.log('-- Check if user exists in auth.users');
console.log("SELECT id, email, created_at, confirmed_at, email_confirmed_at");
console.log("FROM auth.users");
console.log("WHERE email = 'test@example.com';  -- Replace with the email you're testing\n");

console.log('-- Count total auth users');
console.log("SELECT COUNT(*) as total_users FROM auth.users;\n");

console.log('-- List all auth user emails');
console.log("SELECT email, created_at, confirmed_at");
console.log("FROM auth.users");
console.log("ORDER BY created_at DESC;\n");

console.log('📝 IMPORTANT NOTES:');
console.log('- Users must exist in auth.users table to receive password reset emails');
console.log('- The edge function returns success even if user doesn\'t exist (security feature)');
console.log('- Check Supabase Edge Function logs to see actual email sending activity');
console.log('- Look for logs like "Password reset email sent successfully" or "Password reset requested for non-existent user"');
