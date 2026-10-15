-- Lexi · Paquetes de palabras.
-- Los paquetes opcionales que cada usuario añade a su práctica se guardan con el resto de
-- preferencias y siguen su misma regla: gana el cambio más reciente.
-- La columna category_id de practice_sessions pasa a guardar el id del paquete (sigue siendo text).

alter table public.user_settings
  add column active_packs text[] not null default '{}'
    check (cardinality(active_packs) <= 20);

-- sync_push con active_packs (el resto, igual que en 0001).

create or replace function public.sync_push(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid            uuid := auth.uid();
  sent_reset     timestamptz := (payload -> 'settings' ->> 'reset_at')::timestamptz;
  sent_reset_day date := (payload -> 'settings' ->> 'reset_day')::date;
  effective      timestamptz;
  sent_packs     text[] := case
    when jsonb_typeof(payload -> 'settings' -> 'active_packs') = 'array'
    then array(select jsonb_array_elements_text(payload -> 'settings' -> 'active_packs'))
  end;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if jsonb_array_length(coalesce(payload -> 'words', '[]')) > 5000
     or jsonb_array_length(coalesce(payload -> 'sessions', '[]')) > 1000
     or jsonb_array_length(coalesce(payload -> 'days', '[]')) > 5000 then
    raise exception 'payload too large' using errcode = '54000';
  end if;

  -- Ajustes: las preferencias solo si son más recientes; reset_at, el mayor.
  insert into public.user_settings as s
    (user_id, session_size, speech_rate, auto_pronounce, active_packs, preferences_updated_at, reset_at)
  values (
    uid,
    (payload -> 'settings' ->> 'session_size')::integer,
    (payload -> 'settings' ->> 'speech_rate')::real,
    (payload -> 'settings' ->> 'auto_pronounce')::boolean,
    coalesce(sent_packs, '{}'),
    (payload -> 'settings' ->> 'preferences_updated_at')::timestamptz,
    sent_reset
  )
  on conflict (user_id) do update set
    session_size   = case when excluded.preferences_updated_at > s.preferences_updated_at
                          then excluded.session_size else s.session_size end,
    speech_rate    = case when excluded.preferences_updated_at > s.preferences_updated_at
                          then excluded.speech_rate else s.speech_rate end,
    auto_pronounce = case when excluded.preferences_updated_at > s.preferences_updated_at
                          then excluded.auto_pronounce else s.auto_pronounce end,
    -- Clientes anteriores a los paquetes no envían active_packs: se conservan los de la cuenta.
    active_packs   = case when excluded.preferences_updated_at > s.preferences_updated_at
                               and sent_packs is not null
                          then excluded.active_packs else s.active_packs end,
    preferences_updated_at = greatest(s.preferences_updated_at, excluded.preferences_updated_at),
    reset_at       = greatest(s.reset_at, excluded.reset_at);

  select reset_at into effective from public.user_settings where user_id = uid;

  -- «Borrar progreso»: elimina de la cuenta lo anterior al reset.
  if effective is not null then
    delete from public.word_progress     where user_id = uid and updated_at <= effective;
    delete from public.practice_sessions where user_id = uid and completed_at <= effective;
    -- Los días son fechas locales del dispositivo que hizo el reset.
    if sent_reset = effective and sent_reset_day is not null then
      delete from public.practice_days where user_id = uid and day < sent_reset_day;
    end if;
  end if;

  -- Palabras: solo se acepta lo más reciente (si otro dispositivo subió algo más nuevo, se respeta).
  insert into public.word_progress as w
    (user_id, word_id, status, times_seen, times_learned, times_review,
     first_seen_at, last_reviewed_at, updated_at, deleted)
  select uid, r.word_id, r.status, r.times_seen, r.times_learned, r.times_review,
         r.first_seen_at, r.last_reviewed_at, r.updated_at, r.deleted
  from jsonb_to_recordset(coalesce(payload -> 'words', '[]')) as r(
    word_id text, status text, times_seen integer, times_learned integer, times_review integer,
    first_seen_at timestamptz, last_reviewed_at timestamptz, updated_at timestamptz, deleted boolean
  )
  where effective is null or r.updated_at > effective
  on conflict (user_id, word_id) do update set
    status           = excluded.status,
    times_seen       = excluded.times_seen,
    times_learned    = excluded.times_learned,
    times_review     = excluded.times_review,
    first_seen_at    = excluded.first_seen_at,
    last_reviewed_at = excluded.last_reviewed_at,
    updated_at       = excluded.updated_at,
    deleted          = excluded.deleted
  where w.updated_at < excluded.updated_at;

  insert into public.practice_days (user_id, day)
  select uid, d::date
  from jsonb_array_elements_text(coalesce(payload -> 'days', '[]')) as d
  where sent_reset_day is null or sent_reset is distinct from effective or d::date >= sent_reset_day
  on conflict do nothing;

  insert into public.practice_sessions
    (user_id, id, started_at, completed_at, day, category_id, total, learned, review)
  select uid, r.id, r.started_at, r.completed_at, r.day, r.category_id, r.total, r.learned, r.review
  from jsonb_to_recordset(coalesce(payload -> 'sessions', '[]')) as r(
    id text, started_at timestamptz, completed_at timestamptz, day date,
    category_id text, total integer, learned integer, review integer
  )
  where effective is null or r.completed_at > effective
  on conflict do nothing;
end;
$$;
