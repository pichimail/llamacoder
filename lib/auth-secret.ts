type AuthSecretEnv = {
  AUTH_SECRET?: string;
  NEXTAUTH_SECRET?: string;
  NODE_ENV?: string;
};

export function resolveAuthSecret(env: AuthSecretEnv = process.env) {
  const secret = env.AUTH_SECRET || env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required in production");
  }
  return "chinna-coder-fallback-secret-change-me";
}
