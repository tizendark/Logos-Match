create extension if not exists "pgcrypto";

create table if not exists public.question_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  difficulty text,
  category text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.template_questions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.question_templates(id) on delete cascade,
  prompt text not null,
  options jsonb not null,
  correct_index integer not null,
  explanation text,
  tags text[],
  created_at timestamptz not null default now()
);

create index if not exists template_questions_template_id_idx
  on public.template_questions (template_id);

create table if not exists public.custom_quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  host_token text not null,
  created_at timestamptz not null default now()
);

create index if not exists custom_quizzes_host_token_idx
  on public.custom_quizzes (host_token);

create table if not exists public.custom_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.custom_quizzes(id) on delete cascade,
  prompt text not null,
  options jsonb not null,
  correct_index integer not null,
  explanation text,
  created_at timestamptz not null default now()
);

create index if not exists custom_quiz_questions_quiz_id_idx
  on public.custom_quiz_questions (quiz_id);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_token text not null,
  status text not null,
  game_config jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists rooms_code_idx on public.rooms (code);
create index if not exists rooms_host_token_idx on public.rooms (host_token);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  score integer not null default 0,
  status text not null default 'connected',
  created_at timestamptz not null default now()
);

create index if not exists room_players_room_id_idx
  on public.room_players (room_id);

create table if not exists public.game_questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  prompt text not null,
  options jsonb not null,
  correct_index integer not null,
  order_index integer not null,
  created_at timestamptz not null default now()
);

create index if not exists game_questions_room_id_order_index_idx
  on public.game_questions (room_id, order_index);

