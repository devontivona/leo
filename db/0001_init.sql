-- 0001_init: the single events timeline (feed / nap / diaper).
-- Idempotent — safe to re-run. Applied by `npm run db:migrate`.

create extension if not exists pgcrypto;  -- gen_random_uuid() is core in PG13+, this is just belt-and-suspenders

create table if not exists events (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('feed', 'sleep', 'diaper')),
  start_at   timestamptz not null,
  end_at     timestamptz,                 -- null = live/in-progress (feed & sleep only)

  -- feed: any combination of sources; bottle optionally carries a volume
  fed_left   boolean,
  fed_right  boolean,
  fed_bottle boolean,
  bottle_ml  integer check (bottle_ml is null or bottle_ml >= 0),

  -- diaper: pee and/or poo (both false = a dry change)
  pee        boolean,
  poo        boolean,

  note       text,
  created_at timestamptz not null default now(),

  -- a feed must have at least one source
  constraint feed_has_source check (
    type <> 'feed'
    or coalesce(fed_left, false) or coalesce(fed_right, false) or coalesce(fed_bottle, false)
  ),
  -- diapers are instantaneous
  constraint diaper_is_instant check (type <> 'diaper' or end_at is null),
  -- a finished timed event can't end before it started
  constraint end_after_start check (end_at is null or end_at >= start_at)
);

-- Newest-first timeline scans.
create index if not exists events_start_at_desc on events (start_at desc);

-- Fast lookup of the in-progress timer, AND enforces at most one active timer
-- per type (a feed and a nap may overlap, but not two feeds).
create unique index if not exists events_one_active on events (type) where end_at is null;

-- Filter-by-type queries.
create index if not exists events_type_idx on events (type);
