-- Fixture users. Inserting into auth.users fires handle_new_user(), which
-- creates the matching public.profiles row. Idempotent so it can be applied to
-- more than one database in a run.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{"name":"Alice","handle":"alice"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com',   '{"name":"Bob","handle":"bob"}'),
  ('33333333-3333-3333-3333-333333333333', 'carol@example.com', '{"name":"Carol","handle":"carol"}')
on conflict (id) do nothing;
