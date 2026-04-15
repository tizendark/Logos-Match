alter table public.room_players
  add column if not exists last_seen_at timestamptz not null default now();

create index if not exists room_players_room_id_status_last_seen_idx
  on public.room_players (room_id, status, last_seen_at);

