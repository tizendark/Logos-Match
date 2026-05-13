alter table public.question_templates
  add column if not exists slug text;

create unique index if not exists question_templates_slug_key
  on public.question_templates (slug)
  where slug is not null;

