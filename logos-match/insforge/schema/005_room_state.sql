alter table public.rooms
  add column if not exists current_state jsonb not null default '{}'::jsonb;
