# Finixar - Operations Runbook

## Quick Reference

### Emergency Contacts
- **On-call Engineer:** [Your contact]
- **Database Admin:** Supabase Support
- **Hosting Support:** Vercel/Netlify Support
- **Sentry Support:** support@sentry.io

### Critical URLs
- **Production:** https://yourdomain.com
- **Staging:** https://staging.yourdomain.com
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Sentry:** https://sentry.io
- **Hosting Dashboard:** https://vercel.com or https://netlify.com

## Common Operations

### Check Application Health

```bash
# Check if site is accessible
curl -I https://yourdomain.com

# Expected: HTTP/2 200

# Check API health
curl https://your-project.supabase.co/rest/v1/

# Expected: 200 OK
```

### View Recent Errors

**Sentry:**
1. Go to https://sentry.io
2. Select Finixar project
3. View Issues → Last 24 hours

**Application Logs (Vercel):**
```bash
vercel logs --prod
```

**Application Logs (Netlify):**
1. Go to Site → Logs
2. Filter by time range

### Database Operations

#### Check Database Status
```sql
-- Connection count
SELECT count(*) FROM pg_stat_activity;

-- Database size
SELECT pg_size_pretty(pg_database_size('postgres'));

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

#### Slow Query Analysis
```sql
-- Enable slow query logging
ALTER DATABASE postgres SET log_min_duration_statement = 1000; -- 1 second

-- View slow queries (in Supabase Dashboard → Logs)
```

### Clear Cache

**Application Cache:**
```javascript
// In browser console
localStorage.clear();
caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
location.reload();
```

**CDN Cache (Vercel):**
```bash
# Purge cache
vercel --prod --yes
```

### Restart Services

**Edge Functions (Supabase):**
```bash
supabase functions deploy function-name --no-verify-jwt
```

**Application (Vercel):**
- Redeploy via dashboard or:
```bash
vercel --prod --force
```

## Incident Response

### Severity Levels

**P0 - Critical (Production Down)**
- Site completely inaccessible
- Data loss occurring
- Security breach
- **Response Time:** Immediate
- **Escalation:** Notify all stakeholders immediately

**P1 - High (Major Feature Down)**
- Authentication broken
- Payment processing failing
- Database errors affecting multiple users
- **Response Time:** 30 minutes
- **Escalation:** Notify manager within 1 hour

**P2 - Medium (Minor Feature Impacted)**
- Export functionality broken
- UI rendering issues
- Performance degradation
- **Response Time:** 4 hours
- **Escalation:** Report in daily standup

**P3 - Low (Cosmetic Issues)**
- Visual bugs
- Minor UX issues
- Non-critical errors
- **Response Time:** Next business day
- **Escalation:** Create ticket, address in sprint

### Incident Response Steps

#### 1. Acknowledge
- [ ] Confirm the incident
- [ ] Set severity level
- [ ] Note incident start time

#### 2. Assess
- [ ] Check Sentry for errors
- [ ] Check Supabase status
- [ ] Check hosting platform status
- [ ] Review recent deployments
- [ ] Check monitoring dashboards

#### 3. Communicate
- [ ] Post in incident channel
- [ ] Update status page (if applicable)
- [ ] Notify affected users (P0/P1)

#### 4. Mitigate
- [ ] Rollback if recent deployment
- [ ] Disable problematic feature if possible
- [ ] Scale resources if capacity issue
- [ ] Apply hotfix if necessary

#### 5. Resolve
- [ ] Fix root cause
- [ ] Deploy fix
- [ ] Verify resolution
- [ ] Monitor for 30 minutes

#### 6. Document
- [ ] Write post-mortem
- [ ] Update runbook
- [ ] Create preventive measures
- [ ] Share learnings with team

## Common Issues & Solutions

### Issue: Users Can't Log In

**Symptoms:**
- "Invalid credentials" errors
- Redirect loops
- Session expires immediately

**Diagnosis:**
```bash
# Check Supabase Auth status
# Go to Supabase Dashboard → Authentication → Users
# Check for error logs
```

**Solutions:**
1. Verify redirect URLs in Supabase Dashboard → Authentication → URL Configuration
2. Check environment variables (VITE_APP_URL)
3. Clear browser cookies and try again
4. Check Supabase auth rate limits

### Issue: Real-time Updates Not Working

**Symptoms:**
- Data doesn't update automatically
- Need to refresh page manually

**Diagnosis:**
```javascript
// In browser console
// Check WebSocket connection
navigator.onLine // Should be true
```

**Solutions:**
1. Check Supabase Realtime status
2. Verify RLS policies allow SELECT
3. Check browser WebSocket support
4. Disable ad blockers/VPN

### Issue: File Upload Failing

**Symptoms:**
- Upload errors
- "File too large" messages
- Permission denied errors

**Diagnosis:**
```sql
-- Check storage bucket policies
SELECT * FROM storage.buckets WHERE name = 'payment-proofs';

-- Check storage usage
SELECT
  bucket_id,
  count(*) as files,
  pg_size_pretty(sum(metadata->>'size')::bigint) as total_size
FROM storage.objects
GROUP BY bucket_id;
```

**Solutions:**
1. Verify bucket RLS policies
2. Check file size limits (default: 10MB documents, 5MB images)
3. Ensure bucket exists
4. Check user permissions

### Issue: Slow Performance

**Symptoms:**
- Page load >3 seconds
- Queries timing out
- UI lag

**Diagnosis:**
```bash
# Check Lighthouse score
npx lighthouse https://yourdomain.com --view

# Check database connections
# Supabase Dashboard → Reports → Database
```

**Solutions:**
1. Check for missing database indexes
2. Review slow queries
3. Clear browser cache
4. Check CDN cache hit rate
5. Review bundle size (should be <2MB)

### Issue: Excel Export Not Working

**Symptoms:**
- Export button does nothing
- Download starts but file corrupted
- Browser freezes during export

**Diagnosis:**
```javascript
// In browser console
// Check if ExcelJS loaded
await import('exceljs').then(() => console.log('ExcelJS available'));
```

**Solutions:**
1. Check browser console for errors
2. Verify data size (large exports may timeout)
3. Try smaller date range
4. Check available memory

### Issue: High Error Rate in Sentry

**Symptoms:**
- Sentry shows spike in errors
- Same error affecting multiple users

**Diagnosis:**
1. Go to Sentry → Issues
2. Click on error to see details
3. Check breadcrumbs and stack trace
4. Look for patterns (specific page, user action, etc.)

**Solutions:**
1. If new deployment: rollback
2. If specific feature: disable feature flag
3. If database: check RLS policies
4. If third-party: check service status

## Monitoring Best Practices

### Daily Checks
- [ ] Review Sentry errors (< 10/day target)
- [ ] Check application uptime (99.9% target)
- [ ] Review slow queries (< 1s target)
- [ ] Check database size growth

### Weekly Checks
- [ ] Review performance metrics (Lighthouse score > 90)
- [ ] Check storage usage
- [ ] Review API usage and costs
- [ ] Test backup restoration

### Monthly Checks
- [ ] Security audit (npm audit)
- [ ] Dependency updates
- [ ] Review and optimize database queries
- [ ] Capacity planning review

## Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Page Load Time | < 2s | > 3s | > 5s |
| API Response | < 500ms | > 1s | > 2s |
| Error Rate | < 0.1% | > 0.5% | > 1% |
| Uptime | 99.9% | < 99% | < 95% |
| Database CPU | < 50% | > 70% | > 90% |
| Storage Usage | < 70% | > 85% | > 95% |

## Scaling Procedures

### Horizontal Scaling (More Instances)

**Vercel:** Automatic based on load

**Custom Server:**
```bash
# Increase replicas
kubectl scale deployment finixar --replicas=5
```

### Vertical Scaling (More Resources)

**Supabase:**
1. Go to Project Settings → Billing
2. Upgrade plan for more compute/storage
3. Scale: Starter → Pro → Enterprise

**Database:**
1. Supabase Dashboard → Database → Settings
2. Upgrade instance size
3. Note: May require brief downtime

### Database Connection Pooling

```typescript
// Already configured in supabase.ts
// Default pool size: 15 connections
// Max pool size: Depends on Supabase plan
```

## Backup & Recovery

### Create Manual Backup

```bash
# Database
supabase db dump -f backup-$(date +%Y%m%d-%H%M%S).sql

# Storage (via Supabase Dashboard)
# Go to Storage → Bucket → Download all files
```

### Restore from Backup

```bash
# Test restore in staging first!
# Database restore
psql -h db.staging-project.supabase.co -U postgres < backup.sql

# Verify data
psql -h db.staging-project.supabase.co -U postgres -c "SELECT count(*) FROM projets;"
```

### Disaster Recovery

**RPO (Recovery Point Objective):** 1 hour
**RTO (Recovery Time Objective):** 4 hours

**Steps:**
1. Assess extent of data loss
2. Identify last good backup
3. Notify stakeholders of expected downtime
4. Restore from backup to new instance
5. Update DNS/environment variables
6. Verify data integrity
7. Resume operations
8. Post-mortem

## Security Procedures

### Suspected Security Breach

1. **Immediate Actions:**
   - [ ] Rotate all API keys and secrets
   - [ ] Force logout all users
   - [ ] Enable additional logging
   - [ ] Notify security team

2. **Investigation:**
   - [ ] Review Supabase auth logs
   - [ ] Check Sentry for suspicious patterns
   - [ ] Review database audit logs
   - [ ] Check for unauthorized data access

3. **Remediation:**
   - [ ] Patch vulnerability
   - [ ] Update RLS policies if needed
   - [ ] Force password resets if necessary
   - [ ] Notify affected users

### Rotating Secrets

```bash
# Supabase API keys
# 1. Generate new key in Supabase Dashboard
# 2. Update environment variables
# 3. Deploy new version
# 4. Revoke old key after 24 hours

# Sentry DSN
# Similar process via Sentry Dashboard
```

## Useful SQL Queries

### Find Active Users
```sql
SELECT
  email,
  last_sign_in_at,
  sign_in_count
FROM auth.users
WHERE last_sign_in_at > NOW() - INTERVAL '7 days'
ORDER BY last_sign_in_at DESC;
```

### Data Integrity Check
```sql
-- Orphaned records check
SELECT s.id
FROM souscriptions s
LEFT JOIN investisseurs i ON s.investisseur_id = i.id
WHERE i.id IS NULL;
```

### Performance Insights
```sql
-- Most queried tables
SELECT
  schemaname,
  tablename,
  seq_scan,
  idx_scan,
  seq_tup_read,
  idx_tup_fetch
FROM pg_stat_user_tables
ORDER BY seq_scan + idx_scan DESC
LIMIT 10;
```

---

**Last Updated:** 2025-12-13
**Maintained By:** DevOps Team
**Review Frequency:** Monthly
