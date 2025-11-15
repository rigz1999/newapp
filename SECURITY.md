# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within Finixar, please send an email to security@finixar.com. All security vulnerabilities will be promptly addressed.

Please do not publicly disclose the issue until it has been addressed by our team.

## Security Measures

### Implemented

- ✅ Environment variable validation on startup
- ✅ Row-level security (RLS) policies in Supabase
- ✅ Authentication via Supabase Auth
- ✅ Role-based access control (RBAC)
- ✅ Input validation for financial data (SIREN, IBAN, amounts)
- ✅ User-friendly error messages (technical details hidden)
- ✅ HTTPS-only connections to backend
- ✅ Secure file upload validation

### Current Vulnerability Status

#### Known Vulnerabilities (as of 2025-01-15)

**xlsx package (HIGH severity)**
- Package: `xlsx@0.18.5`
- Issues:
  - **Prototype Pollution** (GHSA-4r6h-8v6p-xvw6)
  - **Regular Expression Denial of Service (ReDoS)** (GHSA-5pgg-2g8v-p4x9)
- **Status**: No fix available
- **Mitigation**:
  - The xlsx package is only used for exporting data, not parsing user-uploaded files
  - Access is restricted to authenticated users only
  - Export functionality is not exposed to untrusted input
- **Action Plan**:
  - Monitor for package updates
  - Consider migrating to alternative Excel library if vulnerability becomes critical
  - Possible alternatives: `exceljs`, `@sheet/pro` (commercial)

### Planned Security Enhancements

- [ ] Content Security Policy (CSP) headers
- [ ] Rate limiting on sensitive operations
- [ ] CSRF protection tokens
- [ ] Input sanitization library (DOMPurify)
- [ ] Security audit logging
- [ ] Two-factor authentication (2FA)
- [ ] Session timeout and management
- [ ] File upload virus scanning

## Security Best Practices

### For Developers

1. **Never commit sensitive data**:
   - Use `.env` for secrets (already in `.gitignore`)
   - Rotate keys if accidentally committed

2. **Validate all inputs**:
   - Use validators from `src/utils/validators.ts`
   - Sanitize user input before rendering
   - Validate on both client and server

3. **Follow principle of least privilege**:
   - Use appropriate RLS policies
   - Limit API permissions
   - Use role-based access control

4. **Keep dependencies updated**:
   - Run `npm audit` regularly
   - Update dependencies with security fixes
   - Review changelogs for breaking changes

5. **Review code for security**:
   - No SQL injection risks
   - No XSS vulnerabilities
   - Proper authentication checks
   - Secure file handling

### For Deployment

1. **Environment Variables**:
   - Store securely (use hosting platform's secret management)
   - Never log or expose in error messages
   - Rotate regularly

2. **Database**:
   - Enable RLS on all tables
   - Use strong passwords
   - Regular backups
   - Monitor for unusual activity

3. **File Storage**:
   - Restrict public access
   - Validate file types and sizes
   - Scan for malware
   - Use signed URLs for temporary access

4. **Monitoring**:
   - Set up error tracking (e.g., Sentry)
   - Monitor API usage
   - Alert on suspicious activity
   - Regular security audits

## Dependency Security

### Audit Schedule

- **Weekly**: Automated `npm audit` in CI/CD
- **Monthly**: Manual review of dependency updates
- **Quarterly**: Full security assessment

### Update Policy

- **Critical**: Immediate update and deploy
- **High**: Update within 7 days
- **Medium**: Update within 30 days
- **Low**: Update in next release cycle

## Compliance

### Data Protection

- User data stored in EU region (Supabase)
- GDPR-compliant data handling
- Right to deletion implemented
- Data encryption at rest and in transit

### Financial Data

- SIREN validation (French company registry)
- IBAN validation for bank accounts
- Audit trail for all financial transactions
- Secure handling of payment proofs

## Contact

For security concerns, contact:
- Email: security@finixar.com
- For urgent issues: security-urgent@finixar.com

## Changelog

### 2025-01-15
- Initial security policy created
- Documented xlsx vulnerability and mitigation
- Fixed 6 of 7 npm audit vulnerabilities
- Upgraded Vite to v7.2.1 (security fixes)
- Added environment variable validation
