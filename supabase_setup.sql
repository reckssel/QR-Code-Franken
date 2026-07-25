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
