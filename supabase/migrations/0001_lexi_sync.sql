-- Lexi · Fase 3: progreso por usuario para sincronizar entre dispositivos.
-- Diseño completo en docs/04-cuentas-y-sincronizacion.md.
-- Cada usuario solo puede leer y escribir sus propias filas (RLS).

-- ─── Tablas ──────────────────────────────────────────────────────────────────

create table public.word_progress (
  user_id          uuid        not null references auth.users (id) on delete cascade,
  word_id          text        not null check (char_length(word_id) between 1 and 100),
  status           text        check (status in ('review', 'learned')),
  times_seen       integer     not null default 0 check (times_seen >= 0),
  times_learned    integer     not null default 0 check (times_learned >= 0),
  times_review     integer     not null default 0 check (times_review >= 0),
  first_seen_at    timestamptz,
  last_reviewed_at timestamptz,
  updated_at       timestamptz not null,
  -- true = marca de borrado («reiniciar palabra»), para que otros dispositivos no la resuciten.
  deleted          boolean     not null default false,
  primary key (user_id, word_id),
  check (deleted or status is not null)
);

create table public.practice_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  primary key (user_id, day)
);

create table public.practice_sessions (
  user_id      uuid        not null references auth.users (id) on delete cascade,
  id           text        not null check (char_length(id) between 1 and 100),
  started_at   timestamptz not null,
  completed_at timestamptz not null,
  day          date        not null,
  category_id  text,
  total        integer     not null check (total >= 0),
  learned      integer     not null check (learned >= 0),
  review       integer     not null check (review >= 0),
  primary key (user_id, id)
);

create table public.user_settings (
  user_id                uuid        primary key references auth.users (id) on delete cascade,
  session_size           integer     not null default 10 check (session_size between 5 and 20),
  speech_rate            real        not null default 1 check (speech_rate between 0.6 and 1.2),
  auto_pronounce         boolean     not null default true,
  preferences_updated_at timestamptz not null default 'epoch',
  -- Último «borrar progreso»: todo lo anterior se descarta.
  reset_at               timestamptz
);

-- ─── Seguridad: cada usuario, solo sus filas ─────────────────────────────────

alter table public.word_progress     enable row level security;
alter table public.practice_days     enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.user_settings     enable row level security;

create policy "Solo sus filas" on public.word_progress
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Solo sus filas" on public.practice_days
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Solo sus filas" on public.practice_sessions
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Solo sus filas" on public.user_settings
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.word_progress, public.practice_days, public.practice_sessions, public.user_settings from anon;
grant select, insert, update, delete
  on public.word_progress, public.practice_days, public.practice_sessions, public.user_settings
  to authenticated;

-- ─── sync_push: aplica el estado ya fusionado por el cliente ─────────────────
-- security invoker: se ejecuta con los permisos del usuario, así que RLS sigue aplicando.
-- Formato de payload: { settings: {...}, words: [...], days: ["YYYY-MM-DD"], sessions: [...] }

create function public.sync_push(payload jsonb)
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
    (user_id, session_size, speech_rate, auto_pronounce, preferences_updated_at, reset_at)
  values (
    uid,
    (payload -> 'settings' ->> 'session_size')::integer,
    (payload -> 'settings' ->> 'speech_rate')::real,
    (payload -> 'settings' ->> 'auto_pronounce')::boolean,
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

revoke execute on function public.sync_push(jsonb) from public, anon;
grant execute on function public.sync_push(jsonb) to authenticated;

-- ─── delete_my_account: el usuario borra su cuenta y, en cascada, sus datos ──
-- security definer porque auth.users no es accesible para el usuario; limitado a auth.uid().

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
