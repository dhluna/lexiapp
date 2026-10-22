-- Lexi · Recordatorio diario (notificaciones push). Diseño en docs/15-recordatorios.md.
-- Una fila por dispositivo con el recordatorio activado: su suscripción push, la hora y la
-- zona horaria. Solo con cuenta; se borra al desactivarlo, al cerrar sesión o al eliminar
-- la cuenta (en cascada).

create table public.reminder_devices (
  -- La URL del servicio de push identifica al dispositivo (y al navegador) de forma única.
  endpoint     text        primary key check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  p256dh       text        not null check (char_length(p256dh) between 1 and 200),
  auth         text        not null check (char_length(auth) between 1 and 100),
  remind_at    time        not null default '20:00',
  time_zone    text        not null check (char_length(time_zone) between 1 and 64),
  -- Día local (en time_zone) del último aviso enviado: como mucho uno al día.
  last_sent_on date,
  created_at   timestamptz not null default now()
);

create index reminder_devices_user on public.reminder_devices (user_id);

alter table public.reminder_devices enable row level security;

create policy "Solo sus filas" on public.reminder_devices
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Se lee y se borra (desactivar) directamente; se escribe solo con register_reminder.
revoke all on public.reminder_devices from anon, authenticated;
grant select, delete on public.reminder_devices to authenticated;

-- ─── register_reminder: activa o cambia el recordatorio de este dispositivo ─────
-- security definer: si el endpoint estaba a nombre de otra cuenta (otra sesión en el mismo
-- navegador), pasa a la cuenta actual. Quien tiene el endpoint es el dueño del dispositivo.

create function public.register_reminder(
  sub_endpoint text, sub_p256dh text, sub_auth text, at_time time, tz text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = tz) then
    raise exception 'invalid time zone' using errcode = '22023';
  end if;
  if (select count(*) from public.reminder_devices d where d.user_id = uid and d.endpoint <> sub_endpoint) >= 10 then
    raise exception 'too many devices' using errcode = '54000';
  end if;

  insert into public.reminder_devices as d (endpoint, user_id, p256dh, auth, remind_at, time_zone)
  values (sub_endpoint, uid, sub_p256dh, sub_auth, at_time, tz)
  on conflict (endpoint) do update set
    user_id   = excluded.user_id,
    p256dh    = excluded.p256dh,
    auth      = excluded.auth,
    remind_at = excluded.remind_at,
    time_zone = excluded.time_zone,
    -- Otra cuenta en el mismo dispositivo: empieza de cero.
    last_sent_on = case when d.user_id = excluded.user_id then d.last_sent_on end;
end;
$$;

revoke execute on function public.register_reminder(text, text, text, time, text) from public, anon;
grant execute on function public.register_reminder(text, text, text, time, text) to authenticated;
