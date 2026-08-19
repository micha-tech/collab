-- V One Collab — initial schema
-- Run against a new Supabase project. Requires Anon Sign-Ins enabled in
-- Supabase Auth (Authentication > Sign In / Providers > Anonymous sign-ins).

-- ============================================================
-- grant helper (idempotent via default privileges is enough,
-- but explicit grants keep a fresh project predictable)
-- ============================================================

-- ============================================================
-- profiles
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  is_guest boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- meetings
-- ============================================================
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  host_id uuid not null references auth.users (id) on delete cascade,
  livekit_room_name text not null unique,
  status text not null default 'active'
    check (status in ('active', 'ended')),
  allow_guests boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);

create index meetings_host_created_idx
  on public.meetings (host_id, created_at desc);
create index meetings_slug_idx
  on public.meetings (slug);

-- ============================================================
-- meeting_participants
-- ============================================================
create table public.meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('host', 'participant')),
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

-- A user can only hold one membership per meeting.
create unique index meeting_participants_meeting_user_uq
  on public.meeting_participants (meeting_id, user_id);

-- At most one host per meeting.
create unique index meeting_participants_one_host_uq
  on public.meeting_participants (meeting_id)
  where role = 'host';

create index meeting_participants_meeting_idx
  on public.meeting_participants (meeting_id, joined_at);

-- ============================================================
-- messages
-- ============================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  sender_name text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_meeting_created_idx
  on public.messages (meeting_id, created_at asc);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists meetings_set_updated_at on public.meetings;
create trigger meetings_set_updated_at
  before update on public.meetings
  for each row execute function public.set_updated_at();

-- ============================================================
-- profile auto-creation on sign-up / anonymous sign-in
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, is_guest)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    coalesce(new.is_anonymous, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS helper: does p_user have access to p_meeting?
-- (security definer avoids infinite-recursion in policies)
-- ============================================================
create or replace function public.meeting_access(p_user uuid, p_meeting uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.meetings m
    where m.id = p_meeting
      and (
        m.host_id = p_user
        or exists (
          select 1
          from public.meeting_participants mp
          where mp.meeting_id = m.id
            and mp.user_id = p_user
        )
      )
  );
$$;

-- ============================================================
-- enable RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.messages enable row level security;

-- ============================================================
-- grants
-- ============================================================
grant usage on schema public to anon, authenticated;

grant select on public.profiles to authenticated;
grant select, insert, update on public.profiles to authenticated;

grant select, insert, update on public.meetings to authenticated;

grant select on public.meeting_participants to authenticated;

grant select, insert on public.messages to authenticated;

grant execute on function public.meeting_access(uuid, uuid) to authenticated;

-- ============================================================
-- profiles policies
-- ============================================================
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- meetings policies
-- ============================================================
drop policy if exists meetings_insert_host on public.meetings;
create policy meetings_insert_host
  on public.meetings for insert
  with check (host_id = auth.uid());

drop policy if exists meetings_select_accessible on public.meetings;
create policy meetings_select_accessible
  on public.meetings for select
  using (
    host_id = auth.uid()
    or meeting_access(auth.uid(), id)
  );

drop policy if exists meetings_update_host on public.meetings;
create policy meetings_update_host
  on public.meetings for update
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

-- ============================================================
-- meeting_participants policies
-- (writes are mediated by server endpoints using the service role)
-- ============================================================
drop policy if exists participants_select_accessible on public.meeting_participants;
create policy participants_select_accessible
  on public.meeting_participants for select
  using (meeting_access(auth.uid(), meeting_id));

-- ============================================================
-- messages policies
-- ============================================================
drop policy if exists messages_select_accessible on public.messages;
create policy messages_select_accessible
  on public.messages for select
  using (meeting_access(auth.uid(), meeting_id));

drop policy if exists messages_insert_self on public.messages;
create policy messages_insert_self
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and meeting_access(auth.uid(), meeting_id)
    and sender_name = (
      select mp.display_name
      from public.meeting_participants mp
      where mp.meeting_id = messages.meeting_id
        and mp.user_id = auth.uid()
      limit 1
    )
  );

-- ============================================================
-- Realtime: stream new messages to participants
-- ============================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;