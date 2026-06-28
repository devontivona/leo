-- 0003: the "one active timer per type" rule must not apply to diapers.
--
-- 0001 added `events_one_active` as a partial unique index on (type) WHERE
-- end_at is null, to stop two feeds (or two naps) running at once. But the
-- `diaper_is_instant` constraint forces every diaper to have end_at null, so
-- ALL diapers landed in that index — capping the whole table at a single diaper
-- row. Restrict the index to the real timer types (feed, sleep), which is what
-- 0001's own comment intended ("a feed and a nap may overlap, but not two
-- feeds"). Diapers, being instantaneous, are now unbounded.
--
-- Idempotent — safe to re-run.

drop index if exists events_one_active;

create unique index if not exists events_one_active
  on events (type) where end_at is null and type in ('feed', 'sleep');
