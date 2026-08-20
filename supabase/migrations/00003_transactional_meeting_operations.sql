-- Transactional, identity-aware meeting mutations.
-- These functions keep multi-row writes atomic and validate auth.uid() inside
-- Postgres before using security-definer privileges.

create or replace function public.create_meeting_with_host(
  p_id uuid,
  p_slug text,
  p_title text,
  p_livekit_room_name text,
  p_display_name text
)
returns setof public.meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_anonymous boolean;
  v_meeting public.meetings;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select u.is_anonymous into v_is_anonymous
  from auth.users u
  where u.id = v_user_id;

  if coalesce(v_is_anonymous, true) then
    raise exception 'guest accounts cannot create meetings' using errcode = '42501';
  end if;
  if char_length(btrim(p_title)) not between 1 and 120 then
    raise exception 'invalid meeting title' using errcode = '22023';
  end if;
  if char_length(btrim(p_display_name)) not between 1 and 80 then
    raise exception 'invalid display name' using errcode = '22023';
  end if;
  if p_slug !~ '^[A-Za-z0-9_-]{4,64}$' or char_length(p_livekit_room_name) < 1 then
    raise exception 'invalid meeting identifiers' using errcode = '22023';
  end if;

  insert into public.meetings (id, slug, title, host_id, livekit_room_name)
  values (p_id, p_slug, p_title, v_user_id, p_livekit_room_name)
  returning * into v_meeting;

  insert into public.meeting_participants (
    meeting_id, user_id, display_name, role
  ) values (
    v_meeting.id, v_user_id, p_display_name, 'host'
  );

  return next v_meeting;
end;
$$;

create or replace function public.join_meeting(
  p_meeting_id uuid,
  p_display_name text
)
returns setof public.meeting_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_anonymous boolean;
  v_meeting public.meetings;
  v_role text;
  v_participant public.meeting_participants;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if char_length(btrim(p_display_name)) not between 1 and 80 then
    raise exception 'invalid display name' using errcode = '22023';
  end if;

  select * into v_meeting
  from public.meetings
  where id = p_meeting_id
  for update;

  if not found then
    raise exception 'meeting not found' using errcode = 'P0002';
  end if;
  if v_meeting.status <> 'active' then
    raise exception 'meeting ended' using errcode = '55000';
  end if;

  select u.is_anonymous into v_is_anonymous
  from auth.users u
  where u.id = v_user_id;

  if v_user_id <> v_meeting.host_id
     and coalesce(v_is_anonymous, true)
     and not v_meeting.allow_guests then
    raise exception 'guest access disabled' using errcode = '42501';
  end if;

  v_role := case when v_user_id = v_meeting.host_id then 'host' else 'participant' end;

  insert into public.meeting_participants (
    meeting_id, user_id, display_name, role, joined_at, left_at
  ) values (
    v_meeting.id, v_user_id, p_display_name, v_role, now(), null
  )
  on conflict (meeting_id, user_id) do update
    set display_name = excluded.display_name,
        role = excluded.role,
        joined_at = excluded.joined_at,
        left_at = null
  returning * into v_participant;

  return next v_participant;
end;
$$;

create or replace function public.end_meeting(p_meeting_id uuid)
returns setof public.meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_meeting public.meetings;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  update public.meetings
  set status = 'ended', ended_at = coalesce(ended_at, now())
  where id = p_meeting_id and host_id = v_user_id
  returning * into v_meeting;

  if not found then
    raise exception 'meeting not found or host access required' using errcode = '42501';
  end if;

  return next v_meeting;
end;
$$;

revoke all on function public.create_meeting_with_host(uuid, text, text, text, text) from public;
revoke all on function public.join_meeting(uuid, text) from public;
revoke all on function public.end_meeting(uuid) from public;

grant execute on function public.create_meeting_with_host(uuid, text, text, text, text) to authenticated;
grant execute on function public.join_meeting(uuid, text) to authenticated;
grant execute on function public.end_meeting(uuid) to authenticated;
