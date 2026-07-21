import "server-only";

/**
 * @deprecated Compatibility shim. All new and existing code must import from `@/lib/authz`.
 *
 * This file exists only so any residual/external import of `@/lib/access-control`
 * continues to resolve to the single authoritative implementation in `lib/authz.ts`.
 * Do not add new logic here. The previous dual implementation (weaker isAuthRequired
 * path) has been removed to eliminate inconsistent authorization behavior.
 */

export {
  AuthzError as AccessControlError,
  AuthzError,
  authErrorResponse as accessErrorResponse,
  authErrorResponse,
  getCurrentUserOrNull,
  getCurrentUserOrNull as getCurrentUser,
  getScopedChatListWhere,
  requireAdmin,
  requireChatAccess,
  requireCurrentUser,
  requireMessageAccess,
  requireProjectAccess,
  type AccessLevel,
  type CurrentUser,
} from "./authz";
