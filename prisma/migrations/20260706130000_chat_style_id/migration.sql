-- Persist the design preset chosen at chat creation so the same style is used
-- for every later render, validation, and design-apply/restore pass instead
-- of silently falling back to the "modern-saas" default.

ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "styleId" TEXT NOT NULL DEFAULT 'modern-saas';
