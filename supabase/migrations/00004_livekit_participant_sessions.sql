-- Durable, idempotent participant connection history from signed LiveKit webhooks.

create table public.livekit_webhook_events (
  id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

create table public.participant_sessions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  livekit_participant_sid text not null unique,
  livekit_identity text not null,
  display_name text not null,
  region text,
  joined_at timestamptz not null,
  left_at timestamptz,
  disconnect_reason integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index participant_sessions_meeting_joined_idx
  on public.participant_sessions (meeting_id, joined_at desc);
create index participant_sessions_user_joined_idx
  on public.participant_sessions (user_id, joined_at desc)
  where user_id is not null;

alter table public.livekit_webhook_events enable row level security;
alter table public.participant_sessions enable row level security;

grant select on public.participant_sessions to authenticated;

create policy participant_sessions_select_accessible
  on public.participant_sessions for select
  using (meeting_access(auth.uid(), meeting_id));

create trigger participant_sessions_set_updated_at
  before update on public.participant_sessions
  for each row execute function public.set_updated_at();

create or replace function public.process_livekit_participant_webhook(
  p_event_id text,
  p_event_type text,
  p_meeting_id uuid,
  p_user_id uuid,
  p_room_name text,
  p_participant_sid text,
  p_identity text,
  p_display_name text,
  p_region text,
  p_joined_at timestamptz,
  p_event_at timestamptz,
  p_disconnect_reason integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer;
begin
  if p_event_type not in (
    'participant_joined', 'participant_left', 'participant_connection_aborted'
  ) then
    raise exception 'unsupported webhook event' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.meetings
    where id = p_meeting_id and livekit_room_name = p_room_name
  ) then
    raise exception 'meeting and room do not match' using errcode = '22023';
  end if;

  insert into public.livekit_webhook_events (id, event_type)
  values (p_event_id, p_event_type)
  on conflict (id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;

  insert into public.participant_sessions (
    meeting_id, user_id, livekit_participant_sid, livekit_identity,
    display_name, region, joined_at, left_at, disconnect_reason
  ) values (
    p_meeting_id, p_user_id, p_participant_sid, p_identity,
    p_display_name, nullif(p_region, ''), p_joined_at,
    case when p_event_type = 'participant_joined' then null else p_event_at end,
    case when p_event_type = 'participant_joined' then null else p_disconnect_reason end
  )
  on conflict (livekit_participant_sid) do update set
    display_name = excluded.display_name,
    region = coalesce(excluded.region, participant_sessions.region),
    left_at = coalesce(excluded.left_at, participant_sessions.left_at),
    disconnect_reason = coalesce(
      excluded.disconnect_reason, participant_sessions.disconnect_reason
    );

  if p_event_type = 'participant_joined' then
    update public.meeting_participants
    set joined_at = p_joined_at, left_at = null
    where meeting_id = p_meeting_id and user_id = p_user_id;
  else
    update public.meeting_participants
    set left_at = p_event_at
    where meeting_id = p_meeting_id and user_id = p_user_id;
  end if;

  return true;
end;
$$;

revoke all on function public.process_livekit_participant_webhook(
  text, text, uuid, uuid, text, text, text, text, text,
  timestamptz, timestamptz, integer
) from public, anon, authenticated;
grant execute on function public.process_livekit_participant_webhook(
  text, text, uuid, uuid, text, text, text, text, text,
  timestamptz, timestamptz, integer
) to service_role;
