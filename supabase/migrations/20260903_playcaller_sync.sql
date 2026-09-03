-- Playcaller cloud sync.
-- Access model: the playbook_id is a secret capability (share-link style).
-- The table has RLS enabled with NO policies, so it is unreachable through
-- the data API; all access goes through security-definer RPCs that require
-- knowing the playbook UUID.

create table if not exists public.playcaller_plays (
  playbook_id uuid not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (playbook_id, id)
);

alter table public.playcaller_plays enable row level security;

create or replace function public.playcaller_get_plays(pbid uuid)
returns setof jsonb
language sql security definer set search_path = public as $$
  select data from public.playcaller_plays
  where playbook_id = pbid
  order by updated_at desc;
$$;

create or replace function public.playcaller_replace_playbook(pbid uuid, plays jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.playcaller_plays
   where playbook_id = pbid
     and id not in (select p->>'id' from jsonb_array_elements(plays) p);
  insert into public.playcaller_plays (playbook_id, id, data, updated_at)
  select pbid, p->>'id', p, now()
  from jsonb_array_elements(plays) p
  on conflict (playbook_id, id)
    do update set data = excluded.data, updated_at = now();
end;
$$;

create or replace function public.playcaller_put_play(pbid uuid, play jsonb)
returns void
language sql security definer set search_path = public as $$
  insert into public.playcaller_plays (playbook_id, id, data, updated_at)
  values (pbid, play->>'id', play, now())
  on conflict (playbook_id, id)
    do update set data = excluded.data, updated_at = now();
$$;

create or replace function public.playcaller_delete_play(pbid uuid, play_id text)
returns void
language sql security definer set search_path = public as $$
  delete from public.playcaller_plays
  where playbook_id = pbid and id = play_id;
$$;
