-- Enable PostGIS
create extension if not exists postgis;

-- Sightings table
create table public.sightings (
  id uuid primary key default gen_random_uuid(),
  location geography(point, 4326) not null,
  description text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '4 hours')
);

-- Spatial index
create index sightings_location_idx on public.sightings using gist (location);

-- Index for expiry filtering
create index sightings_expires_at_idx on public.sightings (expires_at);

-- RLS
alter table public.sightings enable row level security;

create policy "Anyone can insert sightings"
  on public.sightings for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can view non-expired sightings"
  on public.sightings for select
  to anon, authenticated
  using (expires_at > now());

-- Function to find sightings within a radius (meters)
create or replace function public.sightings_within_radius(
  lat double precision,
  lng double precision,
  radius_meters double precision
)
returns setof public.sightings
language sql
stable
as $$
  select *
  from public.sightings
  where expires_at > now()
    and st_dwithin(
      location,
      st_makepoint(lng, lat)::geography,
      radius_meters
    )
  order by created_at desc;
$$;

-- Push subscriptions table
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Anyone can insert push subscriptions"
  on public.push_subscriptions for insert
  to anon, authenticated
  with check (true);

-- Enable realtime for sightings
alter publication supabase_realtime add table public.sightings;
