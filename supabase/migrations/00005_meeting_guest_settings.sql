-- Allow hosts to set guest access as part of the atomic creation operation.

create or replace function public.create_meeting_with_host(
  p_id uuid,
  p_slug text,
  p_title text,
  p_livekit_room_name text,
  p_display_name text,
  p_allow_guests boolean
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

  insert into public.meetings (
    id, slug, title, host_id, livekit_room_name, allow_guests
  ) values (
    p_id, p_slug, p_title, v_user_id, p_livekit_room_name, p_allow_guests
  )
  returning * into v_meeting;

  insert into public.meeting_participants (
    meeting_id, user_id, display_name, role
  ) values (
    v_meeting.id, v_user_id, p_display_name, 'host'
  );

  return next v_meeting;
end;
$$;

revoke all on function public.create_meeting_with_host(
  uuid, text, text, text, text, boolean
) from public, anon;
grant execute on function public.create_meeting_with_host(
  uuid, text, text, text, text, boolean
) to authenticated;

revoke all on function public.create_meeting_with_host(
  uuid, text, text, text, text
) from public, anon, authenticated;
