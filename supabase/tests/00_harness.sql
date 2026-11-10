-- Test harness: recreate the minimal Supabase surface the migrations need,
-- so RLS policies and triggers can be exercised against a real Postgres.
create extension if not exists "uuid-ossp";

do $$ begin
  create role anon nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin bypassrls;
exception when duplicate_object then null; end $$;

create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key default uuid_generate_v4(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);

-- Supabase's auth.uid() reads the JWT claim. PostgREST v12 exposes both the
-- legacy per-claim GUC and a `request.jwt.claims` JSON blob, so accept either.
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;
$$;

create or replace function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    'anon'
  );
$$;

-- PostgREST connects as `authenticator` and switches to `anon`/`authenticated`
-- based on the JWT's role claim.
do $$ begin
  create role authenticator noinherit login password 'postgres';
exception when duplicate_object then null; end $$;
grant anon, authenticated to authenticator;

-- Supabase provisions this publication for Realtime; migrations add tables to it.
do $$ begin
  create publication supabase_realtime;
exception when duplicate_object then null; end $$;

-- Storage stub: migrations insert bucket rows and create policies on
-- storage.objects. Only the shape the migrations touch is needed.
create schema if not exists storage;
create table if not exists storage.buckets (
  id     text primary key,
  name   text,
  public boolean default false
);
create table if not exists storage.objects (
  id        uuid primary key default uuid_generate_v4(),
  bucket_id text,
  name      text,
  owner     uuid
);
alter table storage.objects enable row level security;

-- Supabase storage helper used by the bucket policies.
create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$
  select string_to_array(name, '/');
$$;
