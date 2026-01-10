#!/bin/bash

# Deployment script for send-password-reset edge function
# This ensures the function is properly deployed with correct settings

echo "Deploying send-password-reset edge function..."

# Deploy the function with no JWT verification (it needs to be publicly accessible)
supabase functions deploy send-password-reset --no-verify-jwt

echo "Deployment complete!"
echo ""
echo "Make sure these environment variables are set in Supabase:"
echo "  - RESEND_API_KEY"
echo "  - SUPABASE_URL (should be auto-set)"
echo "  - SUPABASE_SERVICE_ROLE_KEY (should be auto-set)"
echo ""
echo "To check function logs:"
echo "  supabase functions logs send-password-reset"
