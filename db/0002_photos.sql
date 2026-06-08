-- My Photos: uploaded photos + their publish-to-frame state. Neon holds only the
-- metadata; the image bytes live on the host filesystem (see lib/photo-store.ts).
-- Append-only and idempotent, like 0001 (re-running is safe).

create table if not exists photos (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  filename      text not null,                       -- original upload name
  mime_type     text not null,
  byte_size     integer not null check (byte_size > 0),
  width         integer,                             -- original pixel dims (from client)
  height        integer,
  caption       text,                                -- optional, Leo's first-person voice
  framed_crop   jsonb,                               -- crop used for the frame (re-publish hint)
  published_at  timestamptz,                         -- last time it was sent to a frame
  last_frame    text                                 -- name of the frame it was sent to
);

-- The gallery lists newest-first.
create index if not exists photos_created_at_desc on photos (created_at desc);
