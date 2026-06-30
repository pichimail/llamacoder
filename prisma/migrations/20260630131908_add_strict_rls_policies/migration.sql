-- Enable RLS for strict security on per-project/per-user tables
-- Note: These assume application sets session variable or uses service role carefully.
-- Full RLS with auth requires custom auth setup (e.g. Supabase JWT).

ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Integration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EnvironmentVariable" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectFile" ENABLE ROW LEVEL SECURITY;

-- Example basic policies (adjust based on your auth: using userId from app context)
-- For production, use auth.uid() or similar if using Supabase, or set app.current_user_id

-- Example (commented, enable after testing):
-- CREATE POLICY "project_owner" ON "Project" FOR ALL USING ("userId" = current_setting('app.current_user_id', true));

-- Similar for child tables via project ownership.
-- For now, RLS enabled as defense-in-depth alongside app-level checks.

COMMENT ON TABLE "Project" IS 'RLS enabled - enforce per user via app or policies';
