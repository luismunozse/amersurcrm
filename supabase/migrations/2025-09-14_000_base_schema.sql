-- BASE SCHEMA + RLS + ÍNDICES + PERMISOS
set search_path = public, crm;

-- Esquema
create schema if not exists crm;

-- Extensiones
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- Enums (tipos)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_proyecto') then
    create type crm.estado_proyecto as enum ('activo', 'pausado', 'cerrado');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_lote') then
    create type crm.estado_lote as enum ('disponible', 'reservado', 'vendido');
  end if;
end $$;

-- Función updated_at
create or replace function crm.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

-- TABLAS
create table if not exists crm.cliente (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text unique,
  telefono text,
  created_at timestamptz not null default now(),
  created_by uuid not null
);

create table if not exists crm.proyecto (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  estado      crm.estado_proyecto not null default 'activo',
  ubicacion   text,
  created_by  uuid not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists t_upd_proyecto on crm.proyecto;
create trigger t_upd_proyecto
before update on crm.proyecto for each row execute function crm.set_updated_at();

create table if not exists crm.lote (
  id           uuid primary key default gen_random_uuid(),
  proyecto_id  uuid not null references crm.proyecto(id) on delete cascade,
  codigo       text not null,
  sup_m2       numeric(10,2),
  precio       numeric(14,2),
  moneda       text default 'ARS',
  estado       crm.estado_lote not null default 'disponible',
  created_by   uuid not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (proyecto_id, codigo)
);
drop trigger if exists t_upd_lote on crm.lote;
create trigger t_upd_lote
before update on crm.lote for each row execute function crm.set_updated_at();

-- Índices
create index if not exists idx_proyecto_nombre on crm.proyecto using gin (nombre gin_trgm_ops);
create index if not exists idx_lote_codigo     on crm.lote (proyecto_id, codigo);

-- RLS
alter table crm.cliente  enable row level security;
alter table crm.proyecto enable row level security;
alter table crm.lote     enable row level security;

-- POLÍTICAS (dropear si existían para re-crear limpias)

-- CLIENTE
drop policy if exists read_own   on crm.cliente;
drop policy if exists insert_own on crm.cliente;
drop policy if exists update_own on crm.cliente;
drop policy if exists delete_own on crm.cliente;

create policy read_own on crm.cliente
for select to authenticated
using (auth.uid() = created_by);

create policy insert_own on crm.cliente
for insert to authenticated
with check (auth.uid() = created_by);

create policy update_own on crm.cliente
for update to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy delete_own on crm.cliente
for delete to authenticated
using (auth.uid() = created_by);

-- PROYECTO
drop policy if exists proyecto_select_own on crm.proyecto;
drop policy if exists proyecto_insert_own on crm.proyecto;
drop policy if exists proyecto_update_own on crm.proyecto;
drop policy if exists proyecto_delete_own on crm.proyecto;

create policy proyecto_select_own on crm.proyecto
for select to authenticated
using (created_by = auth.uid());

create policy proyecto_insert_own on crm.proyecto
for insert to authenticated
with check (created_by = auth.uid());

create policy proyecto_update_own on crm.proyecto
for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy proyecto_delete_own on crm.proyecto
for delete to authenticated
using (created_by = auth.uid());

-- LOTE
drop policy if exists lote_select_by_owner on crm.lote;
drop policy if exists lote_insert_own      on crm.lote;
drop policy if exists lote_update_own      on crm.lote;
drop policy if exists lote_delete_own      on crm.lote;

create policy lote_select_by_owner on crm.lote
for select to authenticated
using (
  exists (select 1 from crm.proyecto p
          where p.id = proyecto_id and p.created_by = auth.uid())
);

create policy lote_insert_own on crm.lote
for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (select 1 from crm.proyecto p
              where p.id = proyecto_id and p.created_by = auth.uid())
);

create policy lote_update_own on crm.lote
for update to authenticated
using (
  exists (select 1 from crm.proyecto p
          where p.id = proyecto_id and p.created_by = auth.uid())
)
with check (
  exists (select 1 from crm.proyecto p
          where p.id = proyecto_id and p.created_by = auth.uid())
);

create policy lote_delete_own on crm.lote
for delete to authenticated
using (
  exists (select 1 from crm.proyecto p
          where p.id = proyecto_id and p.created_by = auth.uid())
);

-- Permisos de esquema/objetos
grant usage on schema crm to authenticated;
-- grant usage on schema crm to anon; -- si lo necesitás

grant select, insert, update, delete on all tables in schema crm to authenticated;
-- grant select on all tables in schema crm to anon;

grant usage, select on all sequences in schema crm to authenticated;
-- grant usage, select on all sequences in schema crm to anon;

alter default privileges in schema crm
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema crm
  grant usage, select on sequences to authenticated;
