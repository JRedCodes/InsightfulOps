-- InsightfulOps (MVP) - Extensions + Enums
-- Source of truth: docs/insightful_ops_db_schema_rls.md

-- pgvector for embeddings
create extension if not exists vector;

-- UUID helpers (often enabled by default in Supabase)
create extension if not exists pgcrypto;

-- Roles
do $$
begin
  create type app_role as enum ('employee', 'manager', 'admin');
exception
  when duplicate_object then null;
end $$;

-- Doc visibility
do $$
begin
  create type doc_visibility as enum ('employee', 'manager', 'admin');
exception
  when duplicate_object then null;
end $$;

-- Document processing status
do $$
begin
  create type doc_status as enum ('processing', 'indexed', 'failed', 'archived');
exception
  when duplicate_object then null;
end $$;

-- Feedback
do $$
begin
  create type feedback_rating as enum ('up', 'down');
exception
  when duplicate_object then null;
end $$;

