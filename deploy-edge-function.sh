#!/bin/bash

# Script pour déployer la fonction Edge via curl
# Remplacez YOUR_SUPABASE_ACCESS_TOKEN par votre token

PROJECT_REF="wmgukeonxszbfdrrmkhy"
FUNCTION_NAME="send-coupon-reminders"
ACCESS_TOKEN="YOUR_SUPABASE_ACCESS_TOKEN"

# Créer un tarball de la fonction
cd supabase/functions
tar -czf /tmp/function.tar.gz send-coupon-reminders/

# Déployer via API
curl -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${FUNCTION_NAME}/deploy" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/x-tar" \
  --data-binary "@/tmp/function.tar.gz"

echo "Fonction déployée!"
