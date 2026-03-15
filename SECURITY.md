# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

- **Email:** security@aura.app
- **Do NOT** create public GitHub issues for security vulnerabilities

We will respond within 48 hours and aim to patch critical issues within 7 days.

## Security Architecture

### Authentication

- Phone-based OTP via Twilio Verify (no passwords stored)
- JWT access tokens (15-minute expiry, HS256)
- JWT refresh tokens (7-day expiry) with rotation and reuse detection
- Token family tracking in Redis for automatic revocation on replay

### Data Protection

- PII (email, name) encrypted at rest with AES-256-GCM
- Encryption keys derived via scrypt with unique salts
- Phone numbers stored in E.164 format (used as lookup key, not encrypted)
- Soft delete with data anonymization on account deletion

### API Security

- Helmet security headers (CSP, HSTS, X-Content-Type-Options, etc.)
- CORS restricted to configured web origin
- Request body size limit: 1MB
- Request timeout: 30 seconds
- Rate limiting: sliding window per IP/user
- OTP rate limiting: 5 requests per 15 minutes per phone
- Message rate limiting: plan-based per minute

### Webhook Security

- Twilio webhook signature validation (X-Twilio-Signature)
- Stripe webhook signature validation (Stripe-Signature)
- Signature validation skipped only in development mode

### Content Safety

- AI output safety filter (blocks financial, medical, legal advice; PII solicitation; identity claims)
- Crisis detection with automatic 988 Lifeline routing
- Warmth floor (0.3) prevents cold/manipulative personality configurations

### TCPA Compliance

- Explicit SMS/Voice consent tracking with audit trail
- STOP/HELP keyword processing on inbound SMS
- Quiet hours enforcement (configurable per timezone)
- Consent revocation via STOP keyword

### Infrastructure

- PostgreSQL 15 with parameterized queries (Prisma ORM)
- Redis 7 for session/token storage
- Environment variables for all secrets (never hardcoded)
- Append-only audit logging for all sensitive operations

## Dependency Management

Run `pnpm audit` regularly to check for known vulnerabilities.

## Security Checklist

- [ ] All environment variables set in production
- [ ] JWT secrets are unique, random, 32+ characters
- [ ] ENCRYPTION_KEY is set and backed up securely
- [ ] Twilio webhook URL uses HTTPS
- [ ] Stripe webhook secret is configured
- [ ] CORS origin set to production domain only
- [ ] ADMIN_USER_IDS configured for admin access
- [ ] Rate limiting tuned for production traffic
- [ ] Database credentials are not default values
- [ ] Redis is password-protected in production
