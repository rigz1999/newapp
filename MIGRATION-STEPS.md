# Steps to Complete Paris Database Migration

## 1. Clear Browser Data
1. **Log out** from the application
2. Open browser DevTools (F12)
3. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Clear everything:
   - Clear **Local Storage** (all entries)
   - Clear **Session Storage** (all entries)
   - Clear **Cookies** (all for localhost)
   - Clear **Cache**
5. Or simply do a **Hard Refresh**: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

## 2. Restart Dev Server
```bash
# Stop the dev server (Ctrl+C)
# Clear any cached files
rm -rf node_modules/.vite
# Restart
npm run dev
```

## 3. Log Back In
- Go to your app at `http://localhost:5173`
- Log in with your Paris database credentials
- You should now see only the data that exists in Paris database

## 4. Verify Database Connection
Check browser console (F12 → Console tab), you should see:
```
Environment configuration loaded: {
  supabase: { url: 'https://nyyneivgrwksesgsmpjm.supabase.co', ... }
}
```

If you see `wmgukeonxszbfdrrmkhy` instead, your .env is not being used.

## 5. Diagnostic: Check What's Actually in Paris
Run `check-paris-members.sql` in **Paris SQL Editor** to see all members that actually exist in the database.

Compare with what you see in the admin panel. They should match.

## Common Issues

### Issue: Still seeing old data after clearing cache
**Solution**: Make sure you're using the Paris database anon key in `.env`, not the US one.

### Issue: Can't log in after migration
**Solution**: Your user account needs to exist in Paris database. Check with the diagnostic SQL script.

### Issue: Some data missing
**Solution**: You may need to manually migrate data from US to Paris. The RLS policies and functions are set up, but the actual data rows need to be copied.
