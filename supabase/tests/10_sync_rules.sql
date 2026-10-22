\set ON_ERROR_STOP on
\set ana 'aaaaaaaa-0000-0000-0000-000000000001'
\set luis 'bbbbbbbb-0000-0000-0000-000000000002'

-- T1: Ana sube su progreso
set role authenticated;
select set_config('request.jwt.claim.sub', :'ana', false);
select public.sync_push('{
  "settings": {"session_size": 15, "speech_rate": 0.8, "auto_pronounce": false,
               "preferences_updated_at": "2026-10-05T00:00:00Z", "reset_at": null, "reset_day": null},
  "words": [
    {"word_id": "travel-fly", "status": "learned", "times_seen": 1, "times_learned": 1, "times_review": 0,
     "first_seen_at": "2026-10-05T10:00:00Z", "last_reviewed_at": "2026-10-05T10:00:00Z",
     "updated_at": "2026-10-05T10:00:00Z", "deleted": false},
    {"word_id": "food-eat", "status": "review", "times_seen": 1, "times_learned": 0, "times_review": 1,
     "first_seen_at": "2026-10-06T10:00:00Z", "last_reviewed_at": "2026-10-06T10:00:00Z",
     "updated_at": "2026-10-06T10:00:00Z", "deleted": false}
  ],
  "days": ["2026-10-04", "2026-10-05", "2026-10-06"],
  "sessions": [
    {"id": "s-old", "started_at": "2026-10-04T09:00:00Z", "completed_at": "2026-10-04T09:10:00Z", "day": "2026-10-04",
     "category_id": null, "total": 10, "learned": 5, "review": 5},
    {"id": "s-new", "started_at": "2026-10-06T09:00:00Z", "completed_at": "2026-10-06T09:10:00Z", "day": "2026-10-06",
     "category_id": "food", "total": 5, "learned": 3, "review": 2}
  ]
}'::jsonb);
do $$ begin
  assert (select count(*) from public.word_progress) = 2, 'T1 words';
  assert (select count(*) from public.practice_days) = 3, 'T1 days';
  assert (select count(*) from public.practice_sessions) = 2, 'T1 sessions';
  assert (select session_size from public.user_settings) = 15, 'T1 settings';
  raise notice 'T1 ok: Ana sube palabras, días, sesiones y ajustes';
end $$;

-- T2: aislamiento entre usuarios (RLS)
select set_config('request.jwt.claim.sub', :'luis', false);
do $$ begin
  assert (select count(*) from public.word_progress) = 0, 'T2 Luis ve palabras de Ana';
  assert (select count(*) from public.practice_days) = 0, 'T2 Luis ve días de Ana';
  assert (select count(*) from public.user_settings) = 0, 'T2 Luis ve ajustes de Ana';
  begin
    insert into public.word_progress (user_id, word_id, status, updated_at)
      values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', 'learned', now());
    raise exception 'T2 Luis pudo escribir en la cuenta de Ana';
  exception when insufficient_privilege then null;
  end;
  update public.word_progress set status = 'review';
  delete from public.practice_days;
  raise notice 'T2 ok: Luis no ve ni puede escribir datos de Ana';
end $$;

-- T3: gana el cambio más reciente
select set_config('request.jwt.claim.sub', :'ana', false);
do $$ begin
  assert (select status from public.word_progress where word_id = 'travel-fly') = 'learned', 'T3 Luis cambió datos de Ana';
  assert (select count(*) from public.practice_days) = 3, 'T3 Luis borró días de Ana';
end $$;
select public.sync_push('{"settings": {"session_size": 10, "speech_rate": 1, "auto_pronounce": true,
  "preferences_updated_at": "2026-10-01T00:00:00Z", "reset_at": null, "reset_day": null},
  "words": [{"word_id": "travel-fly", "status": "review", "times_seen": 1, "times_learned": 0, "times_review": 1,
    "first_seen_at": null, "last_reviewed_at": null, "updated_at": "2026-10-04T00:00:00Z", "deleted": false}],
  "days": [], "sessions": []}'::jsonb);
do $$ begin
  assert (select status from public.word_progress where word_id = 'travel-fly') = 'learned', 'T3 un cambio antiguo pisó uno nuevo';
  assert (select session_size from public.user_settings) = 15, 'T3 ajustes antiguos pisaron los nuevos';
end $$;
select public.sync_push('{"settings": {"session_size": 20, "speech_rate": 1, "auto_pronounce": true,
  "preferences_updated_at": "2026-10-07T00:00:00Z", "reset_at": null, "reset_day": null},
  "words": [{"word_id": "travel-fly", "status": "review", "times_seen": 2, "times_learned": 1, "times_review": 1,
    "first_seen_at": "2026-10-05T10:00:00Z", "last_reviewed_at": "2026-10-07T10:00:00Z", "updated_at": "2026-10-07T10:00:00Z", "deleted": false}],
  "days": ["2026-10-07"], "sessions": []}'::jsonb);
do $$ begin
  assert (select status from public.word_progress where word_id = 'travel-fly') = 'review', 'T3 el cambio nuevo no se aplicó';
  assert (select session_size from public.user_settings) = 20, 'T3 ajustes nuevos no se aplicaron';
  assert (select count(*) from public.practice_days) = 4, 'T3 días no se sumaron';
  raise notice 'T3 ok: lo antiguo no pisa lo nuevo y lo nuevo se aplica';
end $$;

-- T4: marca de borrado
select public.sync_push('{"settings": {"session_size": 20, "speech_rate": 1, "auto_pronounce": true,
  "preferences_updated_at": "2026-10-07T00:00:00Z", "reset_at": null, "reset_day": null},
  "words": [{"word_id": "food-eat", "status": null, "times_seen": 0, "times_learned": 0, "times_review": 0,
    "first_seen_at": null, "last_reviewed_at": null, "updated_at": "2026-10-08T00:00:00Z", "deleted": true}],
  "days": [], "sessions": []}'::jsonb);
do $$ begin
  assert (select deleted from public.word_progress where word_id = 'food-eat'), 'T4 la marca de borrado no se guardó';
  raise notice 'T4 ok: reiniciar una palabra queda registrado';
end $$;

-- T5: «borrar progreso»
select public.sync_push('{"settings": {"session_size": 20, "speech_rate": 1, "auto_pronounce": true,
  "preferences_updated_at": "2026-10-07T00:00:00Z", "reset_at": "2026-10-06T12:00:00Z", "reset_day": "2026-10-06"},
  "words": [], "days": [], "sessions": []}'::jsonb);
do $$ begin
  assert (select count(*) from public.word_progress) = 2, 'T5 borró palabras posteriores al reset';
  assert not exists (select 1 from public.practice_sessions where id = 's-old'), 'T5 sesión s-old no borrada';
  assert not exists (select 1 from public.practice_sessions where id = 's-new'), 'T5 sesión s-new no borrada';
  assert (select array_agg(day order by day)::text from public.practice_days) = '{2026-10-06,2026-10-07}', 'T5 días';
  assert (select reset_at from public.user_settings) = '2026-10-06T12:00:00Z', 'T5 reset_at';
  raise notice 'T5 ok: el reset borra de la cuenta lo anterior y conserva lo posterior';
end $$;
select public.sync_push('{"settings": {"session_size": 20, "speech_rate": 1, "auto_pronounce": true,
  "preferences_updated_at": "2026-10-07T00:00:00Z", "reset_at": null, "reset_day": null},
  "words": [{"word_id": "health-fever", "status": "learned", "times_seen": 1, "times_learned": 1, "times_review": 0,
    "first_seen_at": "2026-10-05T00:00:00Z", "last_reviewed_at": "2026-10-05T00:00:00Z", "updated_at": "2026-10-05T00:00:00Z", "deleted": false}],
  "days": [], "sessions": [{"id": "s-older", "started_at": "2026-10-03T09:00:00Z", "completed_at": "2026-10-03T09:10:00Z",
    "day": "2026-10-03", "category_id": null, "total": 5, "learned": 5, "review": 0}]}'::jsonb);
do $$ begin
  assert not exists (select 1 from public.word_progress where word_id = 'health-fever'), 'T5 se resucitó una palabra anterior al reset';
  assert not exists (select 1 from public.practice_sessions where id = 's-older'), 'T5 se resucitó una sesión anterior al reset';
  assert (select reset_at from public.user_settings) = '2026-10-06T12:00:00Z', 'T5 un reset_at nulo anuló el reset';
  raise notice 'T5 ok: un dispositivo atrasado no resucita datos borrados';
end $$;

-- T6: sin sesión y anónimos
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  begin
    perform public.sync_push('{}'::jsonb);
    raise exception 'T6 sync_push sin sesión no falló';
  exception when sqlstate '28000' then null;
  end;
end $$;
reset role;
set role anon;
do $$ begin
  begin
    perform public.sync_push('{}'::jsonb);
    raise exception 'T6 anon pudo ejecutar sync_push';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.word_progress;
    raise exception 'T6 anon pudo leer word_progress';
  exception when insufficient_privilege then null;
  end;
  raise notice 'T6 ok: sin sesión o como anónimo no hay acceso';
end $$;
reset role;

-- Luis también tiene datos, para comprobar que eliminar a Ana no le afecta.
set role authenticated;
select set_config('request.jwt.claim.sub', :'luis', false);
select public.sync_push('{"settings": {"session_size": 5, "speech_rate": 1, "auto_pronounce": true,
  "preferences_updated_at": "2026-10-07T00:00:00Z", "reset_at": null, "reset_day": null},
  "words": [{"word_id": "travel-fly", "status": "learned", "times_seen": 1, "times_learned": 1, "times_review": 0,
    "first_seen_at": "2026-10-07T00:00:00Z", "last_reviewed_at": "2026-10-07T00:00:00Z", "updated_at": "2026-10-07T00:00:00Z", "deleted": false}],
  "days": ["2026-10-07"], "sessions": []}'::jsonb);

-- T7: eliminar cuenta
select set_config('request.jwt.claim.sub', :'ana', false);
select public.delete_my_account();
reset role;
do $$ begin
  assert not exists (select 1 from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'T7 Ana sigue existiendo';
  assert not exists (select 1 from public.word_progress where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'T7 quedaron palabras de Ana';
  assert not exists (select 1 from public.practice_days where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'T7 quedaron días de Ana';
  assert not exists (select 1 from public.user_settings where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'T7 quedaron ajustes de Ana';
  assert exists (select 1 from auth.users where id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'T7 se borró a Luis';
  assert (select count(*) from public.word_progress where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 1, 'T7 se tocaron datos de Luis';
  raise notice 'T7 ok: eliminar la cuenta borra solo los datos de quien la elimina';
end $$;

-- T8: paquetes activos (0002), con la misma regla que el resto de preferencias
set role authenticated;
select set_config('request.jwt.claim.sub', :'luis', false);
select public.sync_push('{"settings": {"session_size": 5, "speech_rate": 1, "auto_pronounce": true,
  "active_packs": ["travel", "food"], "preferences_updated_at": "2026-10-08T00:00:00Z", "reset_at": null, "reset_day": null},
  "words": [], "days": [], "sessions": []}'::jsonb);
-- Una preferencia más antigua no pisa la reciente.
select public.sync_push('{"settings": {"session_size": 5, "speech_rate": 1, "auto_pronounce": true,
  "active_packs": [], "preferences_updated_at": "2026-10-07T12:00:00Z", "reset_at": null, "reset_day": null},
  "words": [], "days": [], "sessions": []}'::jsonb);
do $$ begin
  assert (select active_packs from public.user_settings) = array['travel', 'food'], 'T8 una preferencia antigua pisó los paquetes';
end $$;
-- Un cliente anterior a los paquetes (sin active_packs) cambia otra preferencia: los paquetes se conservan.
select public.sync_push('{"settings": {"session_size": 20, "speech_rate": 1, "auto_pronounce": true,
  "preferences_updated_at": "2026-10-09T00:00:00Z", "reset_at": null, "reset_day": null},
  "words": [], "days": [], "sessions": []}'::jsonb);
do $$ begin
  assert (select session_size from public.user_settings) = 20, 'T8 no se aplicó la preferencia nueva';
  assert (select active_packs from public.user_settings) = array['travel', 'food'], 'T8 un cliente antiguo borró los paquetes';
  raise notice 'T8 ok: los paquetes activos siguen la regla de preferencias y sobreviven a clientes antiguos';
end $$;
reset role;

-- T9: recordatorios (0003). Cada usuario solo ve y borra sus dispositivos.
insert into auth.users values ('cccccccc-0000-0000-0000-000000000003', 'eva@example.com');
set role authenticated;
select set_config('request.jwt.claim.sub', :'luis', false);
select public.register_reminder('https://push.example/luis-movil', 'k1', 'a1', '20:00', 'Europe/Madrid');
do $$ begin
  assert (select count(*) from public.reminder_devices) = 1, 'T9 Luis no ve su dispositivo';
  assert (select remind_at from public.reminder_devices) = '20:00', 'T9 hora';
  begin
    perform public.register_reminder('https://push.example/x', 'k', 'a', '20:00', 'Marte/Olympus');
    raise exception 'T9 aceptó una zona horaria inválida';
  exception when invalid_parameter_value then null;
  end;
  begin
    insert into public.reminder_devices (endpoint, user_id, p256dh, auth, time_zone)
      values ('https://push.example/y', 'bbbbbbbb-0000-0000-0000-000000000002', 'k', 'a', 'UTC');
    raise exception 'T9 se pudo escribir sin register_reminder';
  exception when insufficient_privilege then null;
  end;
end $$;
-- Cambiar la hora conserva el último envío.
reset role;
update public.reminder_devices set last_sent_on = '2026-10-20';
set role authenticated;
select public.register_reminder('https://push.example/luis-movil', 'k1', 'a1', '08:30', 'Europe/Madrid');
do $$ begin
  assert (select remind_at from public.reminder_devices) = '08:30', 'T9 no cambió la hora';
  assert (select last_sent_on from public.reminder_devices) = '2026-10-20', 'T9 se perdió el último envío';
end $$;

-- Eva no ve los dispositivos de Luis; si inicia sesión en el mismo navegador, el endpoint pasa a ella.
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', false);
do $$ begin
  assert (select count(*) from public.reminder_devices) = 0, 'T9 Eva ve dispositivos de Luis';
end $$;
delete from public.reminder_devices;
select public.register_reminder('https://push.example/luis-movil', 'k2', 'a2', '21:00', 'America/Bogota');
do $$ begin
  assert (select count(*) from public.reminder_devices) = 1, 'T9 Eva no tomó el dispositivo';
  assert (select last_sent_on from public.reminder_devices) is null, 'T9 heredó el último envío de Luis';
end $$;
select set_config('request.jwt.claim.sub', :'luis', false);
do $$ begin
  assert (select count(*) from public.reminder_devices) = 0, 'T9 Luis conserva el dispositivo que tomó Eva';
end $$;
select public.register_reminder('https://push.example/luis-tablet', 'k3', 'a3', '20:00', 'UTC');
delete from public.reminder_devices;
do $$ begin
  assert (select count(*) from public.reminder_devices) = 0, 'T9 Luis no pudo desactivar';
end $$;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', false);
select public.delete_my_account();
reset role;
do $$ begin
  assert not exists (select 1 from public.reminder_devices), 'T9 quedaron dispositivos de Eva';
  raise notice 'T9 ok: recordatorios aislados por usuario, el endpoint cambia de cuenta y se borran con ella';
end $$;
reset role;
