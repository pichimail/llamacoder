# Production Hardening Guide

This document outlines the security hardening implemented in LlamaCoder for production SaaS deployment.

## Overview

LlamaCoder has been hardened across 5 major phases:
1. **Real Authentication & Authorization** - Wire NextAuth, implement access control
2. **API Route Hardening** - Enforce auth on all protected endpoints
3. **Secure File Uploads** - Validate uploads, track ownership, enforce limits
4. **Model & Generation Security** - Rate limiting, fallback handling
5. **Production Quality** - Tests, CI/CD, documentation

## Environment Setup

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://...
AUTH_SECRET=$(openssl rand -base64 32)

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=...

# At least one LLM provider
TOGETHER_API_KEY=... # or OPENROUTER_API_KEY=...

# Rate Limiting (production)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

See `.example.env` for complete list.

### Authentication

LlamaCoder uses NextAuth.js with Google OAuth. In production:
- Set `REQUIRE_GOOGLE_AUTH=true`
- All API routes enforce authentication where appropriate
- Admin routes require `isAdmin` flag on user

For local development without Google OAuth, set `REQUIRE_GOOGLE_AUTH=false`.

## Authorization Model

### User Roles
- **user**: Standard authenticated user (default)
- **admin**: Admin user with access to admin endpoints

### Resource Ownership
- **Projects**: Owned by a user, team members can have roles
- **Chats**: Created within projects, inherit project access
- **Messages**: Belong to chats, inherit chat access
- **Files**: Owned by uploader, tracked in FileUpload model

### Access Control Pattern

All protected routes use this pattern:

```typescript
import { getCurrentUserOrNull, requireChatAccess, AuthError } from "@/lib/authz";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserOrNull();
    
    // Check access
    if (user) {
      await requireChatAccess(chatId, user.id, "read");
    }
    
    // ... handler logic
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
    // ...
  }
}
```

## API Security

### Protected Endpoints

| Route | Auth Required | Purpose |
|-------|---------------|---------|
| POST /api/create-chat | ✅ | Create new chat |
| POST /api/blob-upload | ✅ | Upload files |
| GET /api/workspace/[chatId] | ✅ | Read chat data |
| POST /api/workspace/[chatId] | ✅ | Update chat |
| POST /api/import-github-repo | ✅ | Import repos |
| POST /api/get-next-completion-stream-promise | ✅ | Generate code |
| POST /api/messages/[id]/preview-image | ✅ | Update preview |
| GET /api/models | ❌ | List available models |
| POST /api/build-spec | ❌ | Public API for build specs |
| POST /api/rewrite-prompt | ❌ | Public prompt rewriting |

### Public vs Authenticated

**Public endpoints** (no auth required):
- `/api/models` - List available LLM models
- `/api/build-spec` - Generate build specifications
- `/api/rewrite-prompt` - Rewrite user prompts

These can be called without authentication but still have rate limiting.

**Protected endpoints** require authentication and access validation:
- User must be logged in (401 if not)
- User must have access to resource (403 if forbidden, 404 if not found)
- All actions rate-limited per user

### Rate Limiting

Rate limits are enforced per user+route+window:

```typescript
await rateLimitOrThrow(`route:${userId}`, { 
  limit: 20,        // 20 requests
  windowSeconds: 60 // per 60 second window
});
```

Via Upstash Redis with graceful fallback in development.

## File Upload Security

### Validation

Files are validated on upload:

```typescript
// MIME types
const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "application/zip", "text/plain", ...
];

// Size limits
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB per file
const MAX_FILES_PER_REQUEST = 5;
```

### Storage

- Files stored in Vercel Blob with **private access**
- Ownership tracked in `FileUpload` model
- Linked to user, chat, and message
- Can enforce future quotas via FileUpload records

## Database Schema Changes

### New Models

**FileUpload** - Track user file ownership
```prisma
model FileUpload {
  id        String   @id @default(nanoid(12))
  userId    String   // File owner
  user      User     @relation(...)
  blobUrl   String   @unique
  filename  String
  mimeType  String
  size      Int
  chatId    String?
  messageId String?
  createdAt DateTime @default(now())
}
```

**RateLimit** - Durable rate limit tracking
```prisma
model RateLimit {
  id        String   @id @default(nanoid(12))
  userId    String
  route     String
  count     Int      @default(1)
  windowStart DateTime
  @@unique([userId, route, windowStart])
}
```

### Updated Models

**User**, **Chat**, **Message** now have relations to:
- `fileUploads: FileUpload[]` - Track uploaded files

## Migration Strategy

### For Existing Deployments

1. **No breaking changes** - All auth checks are opt-in via `REQUIRE_GOOGLE_AUTH`
2. **Gradual rollout**:
   - Deploy with `REQUIRE_GOOGLE_AUTH=false` to test
   - Update local chats with auto-migration script (optional)
   - Enable auth once tested

3. **Backward compatibility**:
   - Local chats continue working when auth disabled
   - Unauthenticated chat access via IP-based session (dev only)
   - Admin routes check `isAdminEmail` config

## Testing

Run security checks:

```bash
# Build and type check
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint
```

GitHub Actions CI runs on every push to verify:
- TypeScript compilation
- ESLint rules
- No hardcoded secrets
- Authorization helpers present
- API routes have auth checks
- Prisma schema validity

## Monitoring & Logging

### Key Logs to Monitor

1. **Auth failures** - 401/403/404 responses
2. **Rate limit exceeded** - 429 responses
3. **File upload rejections** - Invalid MIME/size
4. **Suspicious access patterns** - Multiple 403s from same IP

### Recommended Monitoring

```bash
# Check logs for auth issues
cat logs/production.log | grep -E "(401|403|404|429)"

# Monitor rate limiting
cat logs/production.log | grep "Rate limited"

# Track file upload issues
cat logs/production.log | grep "upload"
```

## Security Best Practices

### 1. Secrets Management
- Use environment variables for all secrets
- Never commit `.env.local` or `DATABASE_URL`
- Rotate `AUTH_SECRET` periodically
- Use strong passwords for database users

### 2. Database Access
- Use least-privilege database credentials
- Enable Row Level Security (RLS) in Postgres if available
- Regular backups with encryption
- Monitor unusual query patterns

### 3. API Security
- All production endpoints should be HTTPS only
- Enable CORS appropriately (restrict to your domains)
- Use strong rate limiting quotas
- Monitor for brute force attempts

### 4. Admin Access
- Require 2FA for admin accounts
- Audit all admin actions
- Limit admin email addresses via `ADMIN_EMAIL`
- Review admin logs regularly

### 5. File Uploads
- Monitor total storage usage
- Implement quotas per user
- Scan uploaded files for malware (future enhancement)
- Regular cleanup of old files

## Deployment Checklist

- [ ] All required env vars set (DATABASE_URL, AUTH_SECRET, OAuth keys)
- [ ] Rate limiting configured (UPSTASH_REDIS_REST_URL or KV_REST_API_URL)
- [ ] HTTPS enabled
- [ ] Database backups configured
- [ ] Auth enabled (`REQUIRE_GOOGLE_AUTH=true`)
- [ ] Admin email configured
- [ ] Monitoring/alerting configured
- [ ] Security headers set
- [ ] CORS configured
- [ ] File storage limits enforced
- [ ] Logs being collected
- [ ] CI/CD running security checks

## Incident Response

### If Authentication is Compromised
1. Rotate `AUTH_SECRET` immediately
2. Invalidate all sessions
3. Force users to re-authenticate
4. Review recent admin actions

### If Database is Compromised
1. Rotate database credentials
2. Review file access logs
3. Check for exported data
4. Audit all projects/chats

### If File Storage is Compromised
1. Review file access logs
2. Check for unauthorized downloads
3. Rotate blob storage token
4. Mark affected files for review

## Future Enhancements

Phase 6+ recommendations:
- [ ] Audit logging (all user actions)
- [ ] File malware scanning
- [ ] 2FA for admin accounts
- [ ] Data encryption at rest
- [ ] IP whitelisting for admin
- [ ] Request signing/validation
- [ ] GraphQL API (if needed)
- [ ] Webhook system for integrations
- [ ] API key management system

---

For questions or security concerns, see SECURITY.md or contact security team.
