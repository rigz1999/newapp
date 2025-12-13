# Finixar - Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Deployment Platforms](#deployment-platforms)
- [Database Setup](#database-setup)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Rollback Procedures](#rollback-procedures)

## Prerequisites

### Required Accounts
- [ ] **Supabase Project** - Database, authentication, and storage
- [ ] **Sentry Account** (recommended) - Error tracking and performance monitoring
- [ ] **Hosting Platform** - Vercel, Netlify, or custom server

### Required Tools
- Node.js 20.x or higher
- npm 9.x or higher
- Git

## Environment Configuration

### 1. Create Environment File

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### 2. Required Environment Variables

**Critical (Must Configure):**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_SUPER_ADMIN_EMAIL=admin@yourcompany.com
VITE_APP_URL=https://yourdomain.com
```

**Recommended (Strongly Advised):**
```env
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_ENVIRONMENT=production
VITE_APP_VERSION=1.0.0
VITE_SUPPORT_EMAIL=support@yourcompany.com
```

**Optional:**
```env
VITE_ENABLE_REALTIME_UPDATES=true
VITE_ENABLE_ADVANCED_FILTERS=true
VITE_ITEMS_PER_PAGE=25
VITE_MAX_FILE_SIZE_DOCUMENTS=10
VITE_MAX_FILE_SIZE_IMAGES=5
```

### 3. Supabase Configuration

#### Get Supabase Credentials:
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon/Public Key** → `VITE_SUPABASE_ANON_KEY`

#### Configure Storage Buckets:
1. Go to Storage → Create Buckets:
   - `payment-proofs` (private)
   - `payment-proofs-temp` (private)
   - `ribs` (private)
2. Set RLS policies (see `/supabase/migrations/`)

## Deployment Platforms

### Option 1: Vercel (Recommended)

#### Deploy via CLI:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
# ... add all other variables

# Deploy to production
vercel --prod
```

#### Deploy via GitHub:
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Configure environment variables
5. Deploy

**Configuration:** `vercel.json` is already configured with:
- Build command: `npm run build`
- Output directory: `dist`
- Security headers
- SPA routing

### Option 2: Netlify

#### Deploy via CLI:
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Set environment variables via dashboard or CLI
netlify env:set VITE_SUPABASE_URL "your_value"
```

#### Deploy via GitHub:
1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Connect repository
4. Configure build settings
5. Add environment variables
6. Deploy

**Configuration:** `netlify.toml` is already configured.

### Option 3: Custom Server (Docker)

#### Create Dockerfile:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Build and Run:
```bash
docker build -t finixar .
docker run -p 80:80 finixar
```

## Database Setup

### 1. Apply Migrations

**Using Supabase CLI:**
```bash
# Install Supabase CLI
npm i -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

**Manual (Supabase Dashboard):**
1. Go to SQL Editor
2. Run each migration file in `/supabase/migrations/` in order
3. Verify with: `SELECT * FROM migrations;`

### 2. Verify Row-Level Security

Run this check:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All tables should have `rowsecurity = true`.

### 3. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy send-invitation
supabase functions deploy send-coupon-reminders
supabase functions deploy analyze-payment
# ... deploy remaining functions
```

## Post-Deployment

### 1. Verification Checklist

- [ ] **Application loads** - Visit your URL
- [ ] **Authentication works** - Test login/logout
- [ ] **Database connection** - Check dashboard loads
- [ ] **Realtime updates** - Verify live data sync
- [ ] **File uploads** - Test RIB/payment proof upload
- [ ] **Excel exports** - Test data export
- [ ] **Error tracking** - Verify Sentry receives errors
- [ ] **Performance** - Check page load times

### 2. Create First Super Admin

```sql
-- In Supabase SQL Editor
INSERT INTO profiles (id, email, role, is_superadmin)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@yourcompany.com'),
  'admin@yourcompany.com',
  'super_admin',
  true
);
```

### 3. Configure DNS (if custom domain)

**For Vercel:**
1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS (A/CNAME records)

**For Netlify:**
1. Go to Site Settings → Domain Management
2. Add custom domain
3. Configure DNS

### 4. Enable HTTPS

Both Vercel and Netlify provide automatic SSL certificates.

For custom server, use Let's Encrypt:
```bash
certbot --nginx -d yourdomain.com
```

## Monitoring

### 1. Sentry Dashboard

Monitor at: `https://sentry.io/organizations/your-org/projects/`

**Key Metrics:**
- Error rate
- Performance (P75, P95, P99)
- User sessions
- Release tracking

### 2. Supabase Monitoring

Monitor at: `https://supabase.com/dashboard/project/your-project/reports`

**Key Metrics:**
- Database size and performance
- API requests
- Storage usage
- Active connections

### 3. Hosting Platform Metrics

**Vercel:**
- Build times
- Deployment frequency
- Bandwidth usage
- Function executions

**Netlify:**
- Build minutes
- Bandwidth
- Function invocations

### 4. Set Up Alerts

**Sentry Alerts:**
1. Go to Alerts → Create Alert Rule
2. Configure:
   - Error spike detection
   - Performance degradation
   - New issue creation

**Supabase Alerts:**
- Database CPU > 80%
- Storage > 80% capacity
- Connection pool exhaustion

## Rollback Procedures

### Quick Rollback (Vercel/Netlify)

**Vercel:**
```bash
vercel rollback
```

**Netlify:**
1. Go to Deploys
2. Click on previous deploy
3. Click "Publish deploy"

### Database Rollback

⚠️ **CAUTION:** Database rollbacks are complex. Always backup first.

```bash
# Create backup
supabase db dump > backup-$(date +%Y%m%d).sql

# Revert migration
supabase migration revert
```

### Emergency Procedures

**If site is down:**
1. Check hosting platform status
2. Check Supabase status
3. Review Sentry for error spikes
4. Rollback to last known good deploy
5. Check environment variables

**If database issues:**
1. Check Supabase dashboard for errors
2. Review RLS policies
3. Check connection limits
4. Contact Supabase support if needed

## Backup Strategy

### Automated Backups

**Supabase:**
- Daily backups (last 7 days) - Included in Pro plan
- Weekly backups (last 4 weeks)
- Configure: Project Settings → Backups

**Application State:**
- Use Git tags for releases
- Export critical data regularly

### Manual Backup

```bash
# Database backup
supabase db dump -f backup.sql

# Storage backup
# Download buckets via Supabase dashboard
```

### Restore Procedure

```bash
# Restore database
psql -h db.your-project.supabase.co -U postgres < backup.sql
```

## Maintenance

### Regular Tasks

**Weekly:**
- [ ] Review Sentry errors
- [ ] Check Supabase database size
- [ ] Monitor API usage

**Monthly:**
- [ ] Update dependencies
- [ ] Security audit (`npm audit`)
- [ ] Review and optimize slow queries
- [ ] Test backup restoration

**Quarterly:**
- [ ] Performance audit
- [ ] Security penetration testing
- [ ] Capacity planning
- [ ] Documentation updates

## Troubleshooting

### Common Issues

**Build Fails:**
```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

**Environment Variables Not Loading:**
- Check variable names (must start with `VITE_`)
- Rebuild after changing variables
- Verify in hosting dashboard

**Database Connection Issues:**
- Check Supabase status
- Verify RLS policies
- Check connection limits

**Authentication Problems:**
- Verify Supabase auth configuration
- Check redirect URLs
- Review email templates

## Support

- **Technical Issues:** support@finixar.com
- **Supabase:** support@supabase.io
- **Sentry:** support@sentry.io

## Security Considerations

- [ ] All environment variables secured
- [ ] RLS enabled on all tables
- [ ] HTTPS enforced
- [ ] CSP headers configured
- [ ] Regular security audits
- [ ] Dependency updates automated
- [ ] Backup and disaster recovery tested

---

**Last Updated:** 2025-12-13
**Version:** 1.0.0
