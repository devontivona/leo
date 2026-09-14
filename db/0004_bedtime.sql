-- 0004_bedtime: a distinct "bedtime" event type for overnight sleep, separate
-- from "sleep" (daytime naps). Same start/end timer shape as feed/nap, but its
-- own type so the nanny's live nap timer + nap history are untouched.
--
-- Idempotent — safe to re-run.

alter table events drop constraint if exists events_type_check;
alter table events add constraint events_type_check
  check (type in ('feed', 'sleep', 'bedtime', 'diaper'));

drop index if exists events_one_active;
create unique index if not exists events_one_active
  on events (type) where end_at is null and type in ('feed', 'sleep', 'bedtime');
