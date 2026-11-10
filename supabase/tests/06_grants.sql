-- Supabase grants these automatically on a real project; the harness must do it
-- explicitly so RLS (not a missing GRANT) is what the tests exercise.
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
