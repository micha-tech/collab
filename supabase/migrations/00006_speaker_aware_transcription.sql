-- Durable, speaker-aware transcript segments. Audio is never stored here.

create table public.meeting_transcript_segments (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  speaker_id uuid not null references auth.users (id) on delete cascade,
  livekit_identity text not null,
  speaker_name text,
  text text not null check (char_length(btrim(text)) between 1 and 4000),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  sequence bigint generated always as identity,
  is_final boolean not null default true check (is_final),
  source text not null default 'local-asr' check (source = 'local-asr'),
  created_at timestamptz not null default now(),
  check (ended_at >= started_at)
);

create index transcript_meeting_idx
  on public.meeting_transcript_segments (meeting_id);
create index transcript_meeting_started_idx
  on public.meeting_transcript_segments (meeting_id, started_at, sequence);
create index transcript_speaker_idx
  on public.meeting_transcript_segments (speaker_id);

alter table public.meeting_transcript_segments enable row level security;

grant select on public.meeting_transcript_segments to authenticated;
grant usage, select on sequence public.meeting_transcript_segments_sequence_seq to authenticated;

create policy transcript_select_accessible
  on public.meeting_transcript_segments for select
  using (public.meeting_access(auth.uid(), meeting_id));

-- Inserts go through this identity-aware function. speaker_id and display name
-- are derived from the authenticated membership, never accepted from clients.
create or replace function public.insert_transcript_segment(
  p_meeting_id uuid,
  p_livekit_identity text,
  p_text text,
  p_started_at timestamptz,
  p_ended_at timestamptz
)
returns setof public.meeting_transcript_segments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text;
  v_segment public.meeting_transcript_segments;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if not public.meeting_access(v_user_id, p_meeting_id) then
    raise exception 'meeting access required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.meetings
    where id = p_meeting_id and status = 'active'
  ) then
    raise exception 'meeting is not active' using errcode = '55000';
  end if;
  if p_livekit_identity !~ ('^u_' || left(v_user_id::text, 8) || '_[A-Za-z0-9_-]{5,}$') then
    raise exception 'invalid participant identity' using errcode = '42501';
  end if;
  if char_length(btrim(p_text)) not between 1 and 4000 then
    raise exception 'invalid transcript text' using errcode = '22023';
  end if;
  if p_ended_at < p_started_at
     or p_ended_at - p_started_at > interval '2 minutes'
     or p_started_at > now() + interval '2 minutes'
     or p_started_at < now() - interval '10 minutes' then
    raise exception 'invalid transcript timing' using errcode = '22023';
  end if;

  select mp.display_name into v_name
  from public.meeting_participants mp
  where mp.meeting_id = p_meeting_id and mp.user_id = v_user_id;

  insert into public.meeting_transcript_segments (
    meeting_id, speaker_id, livekit_identity, speaker_name, text,
    started_at, ended_at
  ) values (
    p_meeting_id, v_user_id, p_livekit_identity, nullif(v_name, ''),
    btrim(p_text), p_started_at, p_ended_at
  ) returning * into v_segment;

  return next v_segment;
end;
$$;

revoke all on function public.insert_transcript_segment(uuid, text, text, timestamptz, timestamptz) from public;
revoke execute on function public.insert_transcript_segment(uuid, text, text, timestamptz, timestamptz) from anon;
grant execute on function public.insert_transcript_segment(uuid, text, text, timestamptz, timestamptz) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.meeting_transcript_segments;
  end if;
exception when duplicate_object then null;
end $$;
