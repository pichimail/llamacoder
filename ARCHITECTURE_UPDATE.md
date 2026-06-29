# Architecture Update - Production Hardening

## Summary

LlamaCoder has been hardened for production SaaS deployment with:
- Real authentication via NextAuth + Google OAuth
- Comprehensive authorization layer (`lib/authz.ts`)
- User-owned projects and resources
- Secure file uploads with validation
- Rate limiting and access control
- Database models for tracking ownership

## Key Changes

### 1. Authentication Layer (`app/auth.ts`)

**Before**: Placeholder `auth()` always returning null

**After**: Real NextAuth session with proper user mapping

```typescript
export async function auth(): Promise<AppSession> {
  const session = await nextAuthCore();
  if (!session) return null;
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      // ... with isAdmin flag
    }
  };
}
```

### 2. Authorization Layer (`lib/authz.ts`) - NEW

New comprehensive authorization system:

```typescript
// Public helpers
export class AuthError extends Error {
  constructor(message: string, public status: 401 | 403 | 404) {}
}

export function authErrorResponse(error: AuthError): Response {
  return new Response(error.message, { status: error.status });
}

// Auth checking
export async function getCurrentUserOrNull(): Promise<AppUser | null>
export async function requireCurrentUser(): Promise<AppUser>

// Resource access checking
export async function requireChatAccess(
  chatId: string, 
  userId: string, 
  action: "read" | "write"
): Promise<void>

export async function requireProjectAccess(
  projectId: string,
  userId: string,
  action: "read" | "write" | "admin"
): Promise<void>

export async function requireMessageAccess(
  messageId: string,
  userId: string,
  action: "read" | "delete"
): Promise<void>

export async function requireAdmin(): Promise<AppUser>
```

### 3. API Route Hardening

All protected routes now:
1. Check authentication
2. Validate resource access
3. Return proper status codes (401/403/404)
4. Rate limit per user

Example pattern:
```typescript
export async function POST(request: Request) {
  try {
    const user = await getCurrentUserOrNull();
    if (!user) throw new AuthError("Unauthorized", 401);
    
    await requireChatAccess(chatId, user.id, "write");
    
    // ... handler
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
  }
}
```

### 4. Database Schema Changes

#### New Models

**FileUpload** - Track file ownership and metadata
- Links files to user, chat, message
- Stores MIME type, size, blob URL
- Enables quota enforcement

**RateLimit** - Durable rate limit tracking
- Per user + route + time window
- Fallback from Redis if unavailable
- Enables quota management

#### Updated Models

**User**
```prisma
fileUploads FileUpload[]  // Uploaded files
```

**Chat**
```prisma
fileUploads FileUpload[]  // Uploaded files in chat
```

**Message**
```prisma
fileUploads FileUpload[]  // Files attached to message
```

### 5. File Upload Security

Hardened `/api/blob-upload`:

```typescript
// Auth required
const user = await getCurrentUserOrNull();
if (!user) throw new AuthError("Unauthorized", 401);

// MIME type validation
const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "application/zip", ...
];

// Size limits
const MAX_FILE_SIZE = 20 * 1024 * 1024;        // 20MB
const MAX_FILES_PER_REQUEST = 5;

// Private access
const blob = await put(file.name, file, {
  access: "private",  // Not public!
  addRandomSuffix: true,
});
```

### 6. Project Ownership

When creating chats, authenticated users now:
1. Create owned projects
2. Link chats to projects
3. Can manage team access to projects

```typescript
// In /api/create-chat and /api/import-github-repo
const project = await prisma.project.create({
  data: {
    name: title,
    description: prompt,
    userId: user.id,  // Owned by creator
  },
});

const chat = await prisma.chat.create({
  data: {
    // ...
    projectId: project.id,  // Linked to project
  },
});
```

### 7. Rate Limiting

Per-user rate limiting replaces IP-based:

```typescript
// Before: rate-limited by IP
await rateLimitOrThrow(
  `create-chat:${request.headers.get("x-forwarded-for")}`
);

// After: rate-limited by user ID or IP fallback
const user = await getCurrentUserOrNull();
const rateLimitKey = user 
  ? `create-chat:user:${user.id}`
  : `create-chat:ip:${request.headers.get("x-forwarded-for")}`;
await rateLimitOrThrow(rateLimitKey);
```

## Security Boundaries

### Before Hardening
- No authentication enforcement
- No resource ownership validation
- Public file uploads
- No file validation
- No user quotas
- No access control

### After Hardening
- ✅ Required authentication on protected routes
- ✅ Ownership validation via project/chat/message checks
- ✅ Private file storage with MIME validation
- ✅ File size and count limits
- ✅ User-based rate limiting
- ✅ Role-based access control (user/admin)

## Migration Path

### For Existing Deployments

1. **Phase 1**: Deploy with `REQUIRE_GOOGLE_AUTH=false`
   - All new code active but auth optional
   - Test locally and in staging

2. **Phase 2**: Enable auth in production
   - Set `REQUIRE_GOOGLE_AUTH=true`
   - Users must authenticate to create new chats
   - Existing local chats continue working

3. **Phase 3**: Enforce ownership (optional)
   - Migrate existing chats to owned projects
   - Implement team sharing
   - Full multi-user support

### Backward Compatibility

- Auth checks gracefully skip if `REQUIRE_GOOGLE_AUTH=false`
- Existing unauthenticated chats still accessible
- No breaking API changes to public endpoints
- Admin routes use existing `isAdminEmail` config

## Performance Considerations

### Added Database Queries

New authorization checks add queries:
- `requireChatAccess`: 1 chat lookup
- `requireProjectAccess`: 1 project + optional team lookup
- `requireMessageAccess`: 1 message lookup

Mitigated by:
- Query caching on session
- Indexes on frequently queried fields
- Upstash Redis for rate limiting (not database)

### File Upload Changes

- Added MIME type validation (fast, client-side available too)
- Added size checks (fast, streaming supported)
- Private blob access (no performance impact)

## Testing Strategy

### Unit Tests
- Authorization helpers (`lib/authz.ts`)
- Error handling and status codes
- Access control logic

### Integration Tests
- API routes with auth
- Database access patterns
- File upload workflow

### Security Tests
- Hardcoded secret detection (CI/CD)
- Route auth verification (CI/CD)
- Model schema validation (CI/CD)

## Monitoring & Observability

### Key Metrics to Track

```typescript
// Success metrics
- Authenticated requests
- Unique authenticated users
- Projects created/managed
- Files uploaded (by MIME type)

// Security metrics
- Failed auth attempts (401s)
- Access denied (403s)
- Not found (404s)
- Rate limit exceeded (429s)
```

### Logging Checklist

All protected routes log:
- User ID and action
- Resource accessed
- Success/failure reason
- Timestamp

Example:
```typescript
console.log(`[AUTH] User ${user.id} accessing chat ${chatId}`, {
  action: "read",
  status: "success",
  timestamp: new Date().toISOString(),
});
```

## Configuration

### Environment Variables

```bash
# Auth
AUTH_SECRET=...               # From openssl rand -base64 32
REQUIRE_GOOGLE_AUTH=true      # Enforce in production

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# File Storage
BLOB_READ_WRITE_TOKEN=...

# Rate Limiting
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Admin
ADMIN_EMAIL=admin@example.com
```

See `.example.env` for complete list.

## Future Work

### Phase 6 Enhancements
- Audit logging for all user actions
- 2FA for admin accounts
- IP whitelisting for admin endpoints
- File antivirus scanning
- Data encryption at rest
- Webhook system for integrations

### Phase 7 Scaling
- Sharded rate limiting
- GraphQL API
- API key management
- Multi-tenancy isolation
- Advanced team management

---

For complete security guidelines, see `SECURITY.md`  
For deployment instructions, see `HARDENING_GUIDE.md`
