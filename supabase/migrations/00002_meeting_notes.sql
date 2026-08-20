-- V One Collab — collaborative meeting notes (Yjs over Supabase)
-- One row per meeting holds the latest Yjs state merge as a jsonb array of
-- bytes. Live sync uses Supabase Realtime *broadcast* channels, so this table
-- does NOT need to be added to the supabase_realtime publication.

create table public.meeting_notes (
  meeting_id uuid primary key references public.meetings (id) on delete cascade,
  state jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create index meeting_notes_updated_idx
  on public.meeting_notes (updated_at desc);

alter table public.meeting_notes enable row level security;

grant select, insert, update on public.meeting_notes to authenticated;

drop policy if exists meeting_notes_select_accessible on public.meeting_notes;
create policy meeting_notes_select_accessible
  on public.meeting_notes for select
  using (meeting_access(auth.uid(), meeting_id));

drop policy if exists meeting_notes_insert_accessible on public.meeting_notes;
create policy meeting_notes_insert_accessible
  on public.meeting_notes for insert
  with check (meeting_access(auth.uid(), meeting_id));

drop policy if exists meeting_notes_update_accessible on public.meeting_notes;
create policy meeting_notes_update_accessible
  on public.meeting_notes for update
  using (meeting_access(auth.uid(), meeting_id))
  with check (meeting_access(auth.uid(), meeting_id));

drop trigger if exists meeting_notes_set_updated_at on public.meeting_notes;
create trigger meeting_notes_set_updated_at
  before update on public.meeting_notes
  for each row execute function public.set_updated_at();