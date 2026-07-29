create extension if not exists pgcrypto;

create table if not exists public.listen (
    id     uuid primary key default gen_random_uuid(),
    titel  text not null,
    daten  jsonb not null default '[]'::jsonb
);

-- Falls "listen" schon vorher existierte (z. B. aus einem frueheren manuellen
-- Setup) legt CREATE TABLE IF NOT EXISTS oben nichts an. Die folgenden zwei
-- Zeilen stellen sicher, dass die Spalten in JEDEM Fall vorhanden sind.
alter table public.listen add column if not exists edit_token uuid not null default gen_random_uuid();
alter table public.listen add column if not exists created_at timestamptz not null default now();

alter table public.listen enable row level security;

drop policy if exists "select_public" on public.listen;
create policy "select_public" on public.listen
    for select using (true);

-- Direkter Zugriff auf die Tabelle wird gesperrt bzw. eingeschraenkt.
-- edit_token ist absichtlich NICHT in der Spaltenliste, damit ihn
-- niemand einfach per SELECT auslesen kann.
revoke all on public.listen from anon, authenticated;
grant select (id, titel, daten, created_at) on public.listen to anon, authenticated;

-- Anlegen einer neuen Liste (gibt inkl. edit_token die volle Zeile zurueck,
-- nur einmalig direkt nach dem Erstellen sichtbar fuer den Ersteller).
create or replace function public.create_list(p_titel text, p_daten jsonb)
returns public.listen
language plpgsql
security definer
set search_path = public
as $$
declare
    v_row public.listen;
begin
    insert into public.listen (titel, daten)
    values (p_titel, p_daten)
    returning * into v_row;

    return v_row;
end;
$$;

grant execute on function public.create_list(text, jsonb) to anon, authenticated;

-- Bearbeiten einer Liste: nur wenn id UND edit_token uebereinstimmen.
create or replace function public.update_list(
    p_id uuid, p_token uuid, p_titel text, p_daten jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.listen
    set titel = p_titel,
        daten = p_daten
    where id = p_id
      and edit_token = p_token;

    if not found then
        raise exception 'Ungueltige ID oder Bearbeitungs-Token.';
    end if;
end;
$$;

grant execute on function public.update_list(uuid, uuid, text, jsonb) to anon, authenticated;

-- ============================================================
-- Erweiterung: Alle Listen anzeigen, Listen löschen, Tags
-- ============================================================

-- Tags sind eigenstaendige, wiederverwendbare Objekte (z. B. "Urlaub",
-- "Einkauf"), die beliebigen Listen zugewiesen werden koennen.
create table if not exists public.tags (
    id         uuid primary key default gen_random_uuid(),
    name       text not null unique,
    created_at timestamptz not null default now()
);

-- Verknuepfungstabelle Liste <-> Tag (viele-zu-viele).
create table if not exists public.list_tags (
    list_id uuid not null references public.listen(id) on delete cascade,
    tag_id  uuid not null references public.tags(id) on delete cascade,
    primary key (list_id, tag_id)
);

alter table public.tags enable row level security;
alter table public.list_tags enable row level security;

drop policy if exists "tags_select_public" on public.tags;
create policy "tags_select_public" on public.tags for select using (true);

drop policy if exists "list_tags_select_public" on public.list_tags;
create policy "list_tags_select_public" on public.list_tags for select using (true);

-- Auch hier: Aendern nur ueber die abgesicherten Funktionen unten,
-- kein direkter Insert/Update/Delete von auszen.
revoke all on public.tags from anon, authenticated;
grant select on public.tags to anon, authenticated;

revoke all on public.list_tags from anon, authenticated;
grant select on public.list_tags to anon, authenticated;

-- View fuer die Hauptseite: alle Listen inkl. ihrer zugewiesenen Tags
-- in einer einzigen Abfrage (ohne edit_token!).
create or replace view public.listen_public as
select
    l.id,
    l.titel,
    l.daten,
    l.created_at,
    coalesce(t.tags, '[]'::json) as tags
from public.listen l
left join lateral (
    select json_agg(json_build_object('id', tg.id, 'name', tg.name) order by tg.name) as tags
    from public.list_tags lt
    join public.tags tg on tg.id = lt.tag_id
    where lt.list_id = l.id
) t on true;

grant select on public.listen_public to anon, authenticated;

-- Liste komplett loeschen: nur mit passendem Bearbeitungs-Token.
create or replace function public.delete_list(p_id uuid, p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    delete from public.listen
    where id = p_id
      and edit_token = p_token;

    if not found then
        raise exception 'Ungueltige ID oder Bearbeitungs-Token.';
    end if;
end;
$$;

grant execute on function public.delete_list(uuid, uuid) to anon, authenticated;

-- Tag einer Liste zuweisen (legt den Tag an, falls er noch nicht
-- existiert). Prueft wie update_list serverseitig id + edit_token.
create or replace function public.add_tag_to_list(p_list_id uuid, p_token uuid, p_tag_name text)
returns public.tags
language plpgsql
security definer
set search_path = public
as $$
declare
    v_tag  public.tags;
    v_name text := trim(p_tag_name);
begin
    if v_name = '' then
        raise exception 'Tag-Name darf nicht leer sein.';
    end if;

    if not exists (
        select 1 from public.listen
        where id = p_list_id and edit_token = p_token
    ) then
        raise exception 'Ungueltige ID oder Bearbeitungs-Token.';
    end if;

    insert into public.tags (name)
    values (v_name)
    on conflict (name) do update set name = excluded.name
    returning * into v_tag;

    insert into public.list_tags (list_id, tag_id)
    values (p_list_id, v_tag.id)
    on conflict do nothing;

    return v_tag;
end;
$$;

grant execute on function public.add_tag_to_list(uuid, uuid, text) to anon, authenticated;

-- Tag-Zuweisung von einer Liste wieder entfernen (der Tag selbst
-- bleibt fuer andere Listen erhalten).
create or replace function public.remove_tag_from_list(p_list_id uuid, p_token uuid, p_tag_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not exists (
        select 1 from public.listen
        where id = p_list_id and edit_token = p_token
    ) then
        raise exception 'Ungueltige ID oder Bearbeitungs-Token.';
    end if;

    delete from public.list_tags
    where list_id = p_list_id and tag_id = p_tag_id;
end;
$$;

grant execute on function public.remove_tag_from_list(uuid, uuid, uuid) to anon, authenticated;
