# Security Policy

## Overview

LlamaCoder is a production-ready SaaS platform for AI-powered code generation. This document outlines our security practices, authentication model, and responsible disclosure process.

## Security Architecture

### Authentication

- **Google OAuth 2.0** is the primary authentication provider
- Sessions are stored in the database via NextAuth with secure session tokens
- Auth Secret is required in production via `AUTH_SECRET` environment variable
- Local development can disable authentication via `REQUIRE_GOOGLE_AUTH=false` (prod always enforces)
- All protected routes use strict `requireCurrentUser()` + `requireChatAccess` (owner/editor/viewer)
- Uploads tracked in FileUpload, ownership verified
- Env vars encrypted at rest (AES-GCM via ENCRYPTION_SECRET/AUTH_SECRET)
- Rate limits fail closed when no storage in prod
- Design apply and checkpoints authenticated + validated

### Authorization

All protected endpoints enforce ownership validation:

- **Chat Access**: Users can only access chats they own or are members of
- **Project Access**: Users can only access projects they own or are members of
- **Message Access**: Users can only access messages within their accessible chats
- **Admin Routes**: Restricted to users whose email matches `ADMIN_EMAIL`

### Rate Limiting

- Rate limits are enforced per user and per route
- Uses Upstash Redis or Vercel KV for durable distributed rate limiting
- Graceful fallback to allow requests if rate limit service is unavailable (dev only)
- Production requires rate limiting to be configured

### File Storage

- File uploads require authentication
- Uploaded files are stored in Vercel Blob storage with private access
- File ownership is tracked in the database
- Supported MIME types are restricted to safe file types
- Maximum file size: 20MB per file, 5 files per request

## Environment Variables

**Production-Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - Secret for session encryption (generate with `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` - OAuth credentials
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob access token
- At least one LLM provider key: `TOGETHER_API_KEY` or `OPENROUTER_API_KEY`

**Production-Recommended:**
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` - Rate limiting backend
- `ADMIN_EMAIL` - Email address granted admin access
- `REQUIRE_GOOGLE_AUTH=true` - Enforce authentication

**Never commit to version control:**
- API keys and secrets
- Database credentials
- OAuth credentials
- Blob storage tokens

## API Security

### Protected Endpoints

All endpoints that modify or access user data require authentication:

- `POST /api/create-chat` - Create owned projects
- `POST /api/import-github-repo` - Import repositories (authenticated only)
- `POST /api/workspace/[chatId]` - Workspace actions (sync, save-env, publish, etc.)
- `POST /api/blob-upload` - File uploads (authenticated, validated)
- `POST /api/messages/[id]/preview-image` - Update preview images
- `POST /api/get-next-completion-stream-promise` - Generation (chat access required)
- All `/api/admin/*` routes - Admin only

### Public Endpoints

These endpoints may be accessed without authentication:

- `GET /api/models` - List available models
- `GET /api/public-settings` - Public configuration
- `GET /api/featured/sandbox` - Featured gallery
- `POST /api/build-spec` - Build specification (for prompt engineering)
- `POST /api/rewrite-prompt` - Prompt rewriting (public)
- `POST /api/github-import` - GitHub file fetching (public, no auth required for public repos)

### Error Responses

- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User authenticated but lacks permissions
- `404 Not Found` - Resource not found (returns 404 even if user lacks access, to prevent leaking existence)
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error (no debug details in production)

## Data Protection

### User Data

- User data is never shared with third parties without consent
- Database connections use encrypted connections (SSL/TLS)
- Session tokens are cryptographically secure and httpOnly

### Generated Code

- Generated code is stored in the database as project artifacts
- Code is not automatically published or shared unless explicitly requested
- Published code requires a share token to access
- Environment variables in projects are stored (future: will be encrypted at rest)

### File Uploads

- Files are stored with private access
- File ownership is tracked for quota enforcement
- MIME type validation prevents malicious file uploads
- File size limits prevent denial-of-service attacks

## Responsible Disclosure

If you discover a security vulnerability, please email security@pichimail.com with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Your suggested fix (if any)

Please do not publicly disclose vulnerabilities before giving us 90 days to patch.

## Dependencies

Dependencies are managed via pnpm and locked in `pnpm-lock.yaml`. All dependencies receive regular security updates:

- Run `pnpm audit` to check for known vulnerabilities
- Run `pnpm update` to apply patches
- Automate with Dependabot or similar tools

## Production Deployment

### Pre-deployment Checklist

- [ ] `AUTH_SECRET` is set to a cryptographically secure value
- [ ] `REQUIRE_GOOGLE_AUTH=true` is set
- [ ] `ADMIN_EMAIL` is configured for admin access
- [ ] Rate limiting backend (Redis/KV) is configured and tested
- [ ] Database backups are enabled
- [ ] SSL/TLS certificates are valid and auto-renewing
- [ ] All environment variables are configured in production
- [ ] Build passes with `pnpm build` and `pnpm lint`
- [ ] Tests pass with `pnpm test` (when available)
- [ ] Database migrations have been run

### Monitoring

- Monitor authentication logs for failed login attempts
- Monitor API logs for unusual rate limit patterns
- Set up alerts for database performance degradation
- Track error rates and investigate spikes

## Security Best Practices

### For Users

- Use a strong, unique password for your Google account
- Enable 2FA on your Google account
- Do not share generated code with untrusted parties
- Regularly rotate API keys used in projects
- Review shared links and revoke access when no longer needed

### For Operators

- Regularly update dependencies: `pnpm update`
- Run security audits: `pnpm audit`
- Review database logs for suspicious activity
- Rotate credentials regularly
- Test disaster recovery procedures
- Keep detailed audit logs of admin actions

## Compliance

LlamaCoder follows industry best practices for security:

- SQL injection prevention: Prisma parameterized queries
- XSS prevention: React escaping + CSP headers
- CSRF prevention: SameSite cookies
- Secure session management: httpOnly, Secure flags
- Rate limiting: Per-user, per-route limits

## Changes to This Policy

This security policy may be updated at any time. Users will be notified of material changes via email or in-app notification.

Last updated: 2026-06-30
