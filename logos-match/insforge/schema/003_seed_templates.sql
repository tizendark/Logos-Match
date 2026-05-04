with
existing as (
  select id
  from public.question_templates
  where title = 'Nivel Básico: Parábolas'
  limit 1
),
inserted as (
  insert into public.question_templates (
    title,
    description,
    difficulty,
    category,
    is_published
  )
  select
    'Nivel Básico: Parábolas',
    'Preguntas introductorias sobre parábolas y enseñanzas de Jesús.',
    'Básico',
    'Evangelios',
    true
  where not exists (select 1 from existing)
  returning id
),
t as (
  select id from inserted
  union all
  select id from existing
)
insert into public.template_questions (
  template_id,
  prompt,
  options,
  correct_index,
  explanation,
  tags
)
select
  t.id,
  q.prompt,
  q.options,
  q.correct_index,
  q.explanation,
  q.tags
from t
cross join (
  values
    (
      '¿En qué parábola Jesús habla de un hijo que regresa a casa y su padre lo recibe con una fiesta?',
      '["El buen samaritano","El hijo pródigo","La oveja perdida","El sembrador"]'::jsonb,
      1,
      'La parábola del hijo pródigo enfatiza el perdón y la restauración.',
      array['parábolas','perdón']
    ),
    (
      'En la parábola del buen samaritano, ¿quién se detiene a ayudar al hombre herido?',
      '["Un sacerdote","Un levita","Un samaritano","Un escriba"]'::jsonb,
      2,
      'El samaritano muestra compasión cuando otros pasan de largo.',
      array['parábolas','misericordia']
    ),
    (
      'Según la parábola de la oveja perdida, ¿cuántas ovejas deja el pastor para buscar a la que falta?',
      '["1","10","50","99"]'::jsonb,
      3,
      'El pastor deja las noventa y nueve para buscar la oveja que se perdió.',
      array['parábolas']
    )
) as q(prompt, options, correct_index, explanation, tags)
where not exists (
  select 1
  from public.template_questions tq
  where tq.template_id = t.id and tq.prompt = q.prompt
);

with
existing as (
  select id
  from public.question_templates
  where title = 'Reto: Profetas Mayores'
  limit 1
),
inserted as (
  insert into public.question_templates (
    title,
    description,
    difficulty,
    category,
    is_published
  )
  select
    'Reto: Profetas Mayores',
    'Preguntas sobre Isaías, Jeremías, Lamentaciones, Ezequiel y Daniel.',
    'Reto',
    'Profetas',
    true
  where not exists (select 1 from existing)
  returning id
),
t as (
  select id from inserted
  union all
  select id from existing
)
insert into public.template_questions (
  template_id,
  prompt,
  options,
  correct_index,
  explanation,
  tags
)
select
  t.id,
  q.prompt,
  q.options,
  q.correct_index,
  q.explanation,
  q.tags
from t
cross join (
  values
    (
      '¿Qué profeta tuvo una visión de huesos secos que volvieron a la vida?',
      '["Isaías","Jeremías","Ezequiel","Daniel"]'::jsonb,
      2,
      'Ezequiel 37 describe la visión del valle de huesos secos.',
      array['profetas','ezequiel']
    ),
    (
      '¿En qué libro aparece la historia del foso de los leones?',
      '["Daniel","Lamentaciones","Isaías","Jeremías"]'::jsonb,
      0,
      'La historia de Daniel en el foso de los leones es un relato conocido de fidelidad.',
      array['profetas','daniel']
    )
) as q(prompt, options, correct_index, explanation, tags)
where not exists (
  select 1
  from public.template_questions tq
  where tq.template_id = t.id and tq.prompt = q.prompt
);
