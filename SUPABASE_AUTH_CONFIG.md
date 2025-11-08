# Supabase Auth Configuration

## Leaked Password Protection

**Status**: ⚠️ Currently Disabled

### What is Leaked Password Protection?

Supabase Auth can prevent users from using passwords that have been compromised in data breaches by checking against the HaveIBeenPwned.org database. This is an important security feature that helps protect user accounts.

### How to Enable

1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** → **Authentication**
3. Scroll down to **Password Protection** section
4. Enable **"Check passwords against HaveIBeenPwned"**
5. Save the changes

### Benefits

- ✅ Prevents users from using compromised passwords
- ✅ Enhances overall account security
- ✅ Checks against millions of known breached passwords
- ✅ No additional cost or performance impact

### Documentation

For more information, see: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

---

**Action Required**: Please enable this feature in your Supabase dashboard to resolve the security warning.
