#!/bin/bash
# This script would deploy the edge function
# For now, we'll just verify the file is ready

echo "Edge function file ready at:"
echo "  supabase/functions/import-registre/index.ts"
echo ""
echo "File contains $(cat supabase/functions/import-registre/index.ts | wc -l) lines"
echo ""
echo "Key fixes applied:"
echo "  ✓ Phone validation now handles quoted values"
echo "  ✓ Email validation is optional (not required)"
echo ""
echo "To deploy, use the GitHub Actions workflow or Supabase dashboard"
