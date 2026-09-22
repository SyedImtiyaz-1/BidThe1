/**
 * One idempotent DDL script. No migration files: every statement is written to
 * be safe to re-run, so applying it twice is a no-op.
 *
 * Bump SCHEMA_VERSION whenever a statement is added. `bootstrap` records the
 * version it last applied and skips the whole script when it matches, which
 * keeps cold starts to a single cheap read; without the bump the new statement
 * would never run against a database that already has the tables.
 */
export const SCHEMA_VERSION = 2

export const SCHEMA_SQL = `
create table if not exists schema_meta (
  id      int primary key default 1,
  version int not null default 0
);
insert into schema_meta (id, version) values (1, 0) on conflict (id) do nothing;

create table if not exists listings (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  url              text not null,
  host             text not null,
  title            text not null,
  tagline          text not null default '',
  icon_url         text,
  category         text not null default 'other',
  status           text not null default 'live',
  total_minor      bigint not null default 0,
  peak_minor       bigint not null default 0,
  click_count      bigint not null default 0,
  first_reached_at timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists listings_board_idx
  on listings (total_minor desc, first_reached_at asc);

create index if not exists listings_host_idx on listings (host);

-- Identity of a listing. For most sites this is the host, but for x.com,
-- apps.apple.com and friends it carries a path segment, because the domain
-- alone would merge every product on that platform into one row.
alter table listings add column if not exists listing_key text;
update listings set listing_key = host where listing_key is null;
create unique index if not exists listings_key_idx on listings (listing_key);

-- What sort of thing this is. Derived from the host at creation rather than
-- read back from it every query, so a listing keeps its kind even if the host
-- it was submitted under changes.
alter table listings add column if not exists kind text not null default 'website';
update listings set kind = 'app'
 where kind <> 'app' and host in ('apps.apple.com', 'play.google.com');
create index if not exists listings_kind_idx on listings (kind, total_minor desc);

create table if not exists payments (
  id                uuid primary key default gen_random_uuid(),
  listing_id        uuid not null references listings(id) on delete cascade,
  provider          text not null,
  provider_ref      text not null,
  amount_minor      bigint not null,
  base_currency     text not null default 'USD',
  display_currency  text not null default 'USD',
  display_minor     bigint,
  fx_rate           numeric(20,10),
  status            text not null default 'confirmed',
  rank_quoted       integer,
  rank_obtained     integer,
  created_at        timestamptz not null default now(),
  unique (provider, provider_ref)
);

create index if not exists payments_listing_idx on payments (listing_id);
create index if not exists payments_day_idx on payments (created_at desc);

create table if not exists clicks (
  listing_id   uuid not null references listings(id) on delete cascade,
  visitor_hash text not null,
  hour_bucket  timestamptz not null,
  is_bot       boolean not null default false,
  primary key (listing_id, visitor_hash, hour_bucket)
);

create table if not exists presence (
  visitor_hash text primary key,
  day          date not null,
  last_seen    timestamptz not null
);

create index if not exists presence_seen_idx on presence (last_seen desc);

create table if not exists fx_rates (
  currency     text primary key,
  per_base     numeric(20,10) not null,
  minor_digits smallint not null default 2,
  fetched_at   timestamptz not null default now()
);

create table if not exists reports (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id) on delete cascade,
  reason      text not null,
  note        text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
`
