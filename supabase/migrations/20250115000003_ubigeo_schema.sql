-- =========================================
-- Esquema UBIGEO - Sistema de Ubicaciones de Perú
-- =========================================

-- Extensiones útiles para búsquedas por texto
create extension if not exists pg_trgm;

-- Función auxiliar para normalizar texto (IMMUTABLE)
-- Versión simplificada sin unaccent
create or replace function normalize_text(text)
returns text
language sql
immutable
as $$
  select lower(trim($1));
$$;

-- =========================================
-- Tablas
-- =========================================
create table if not exists ubigeo_departamento (
  code char(2) primary key,            -- p.ej. '15'
  nombre text not null
);

create unique index if not exists ux_dep_nombre
  on ubigeo_departamento (normalize_text(nombre));

create table if not exists ubigeo_provincia (
  code char(4) primary key,            -- p.ej. '1501' (dep+prov)
  dep_code char(2) not null references ubigeo_departamento(code) on update cascade on delete restrict,
  nombre text not null
);

create unique index if not exists ux_prov_nombre_by_dep
  on ubigeo_provincia (dep_code, normalize_text(nombre));

create index if not exists ix_prov_dep on ubigeo_provincia(dep_code);

create table if not exists ubigeo_distrito (
  code char(6) primary key,            -- p.ej. '150105' (dep+prov+dist)
  prov_code char(4) not null references ubigeo_provincia(code) on update cascade on delete restrict,
  dep_code  char(2) not null references ubigeo_departamento(code) on update cascade on delete restrict,
  nombre text not null,
  -- Consistencia: los prefijos del code deben coincidir
  constraint chk_distrito_codes
    check (substr(code,1,4) = prov_code and substr(code,1,2) = dep_code)
);

create unique index if not exists ux_dist_nombre_by_prov
  on ubigeo_distrito (prov_code, normalize_text(nombre));

create index if not exists ix_dist_dep on ubigeo_distrito(dep_code);
create index if not exists ix_dist_prov on ubigeo_distrito(prov_code);

-- Índices trigram para búsquedas "typeahead"
create index if not exists trgm_dep_nombre
  on ubigeo_departamento using gin (normalize_text(nombre) gin_trgm_ops);
create index if not exists trgm_prov_nombre
  on ubigeo_provincia    using gin (normalize_text(nombre) gin_trgm_ops);
create index if not exists trgm_dist_nombre
  on ubigeo_distrito     using gin (normalize_text(nombre) gin_trgm_ops);

-- =========================================
-- Vistas y funciones RPC (para usar con Supabase)
-- =========================================

-- Vista "full" (útil para reportes y búsquedas globales)
create or replace view ubigeo_full as
select
  d.code  as dep_code,  d.nombre as dep_nombre,
  p.code  as prov_code, p.nombre as prov_nombre,
  t.code  as dist_code, t.nombre as dist_nombre
from ubigeo_departamento d
join ubigeo_provincia    p on p.dep_code = d.code
join ubigeo_distrito     t on t.prov_code = p.code;

-- Departamentos
create or replace function api_get_departamentos()
returns setof ubigeo_departamento
language sql
stable
security definer
set search_path = public
as $$
  select * from ubigeo_departamento order by nombre;
$$;

-- Provincias por departamento
create or replace function api_get_provincias(dep char(2))
returns table (code char(4), nombre text)
language sql
stable
security definer
set search_path = public
as $$
  select code, nombre
  from ubigeo_provincia
  where dep_code = dep
  order by nombre;
$$;

-- Distritos por provincia
create or replace function api_get_distritos(prov char(4))
returns table (code char(6), nombre text)
language sql
stable
security definer
set search_path = public
as $$
  select code, nombre
  from ubigeo_distrito
  where prov_code = prov
  order by nombre;
$$;

-- Búsqueda por texto (devuelve matches en cualquier nivel)
create or replace function api_search_ubigeo(q text, limit_rows int default 20)
returns table (
  dep_code  char(2),  dep_nombre  text,
  prov_code char(4),  prov_nombre text,
  dist_code char(6),  dist_nombre text,
  rank float
)
language sql
stable
security definer
set search_path = public
as $$
  with qn as (select normalize_text(coalesce(q, '')) as ql)
  select
    f.dep_code,  f.dep_nombre,
    f.prov_code, f.prov_nombre,
    f.dist_code, f.dist_nombre,
    greatest(
      similarity(normalize_text(f.dep_nombre),  (select ql from qn)),
      similarity(normalize_text(f.prov_nombre), (select ql from qn)),
      similarity(normalize_text(f.dist_nombre), (select ql from qn))
    ) as rank
  from ubigeo_full f, qn
  where (normalize_text(f.dep_nombre)  like '%'|| (select ql from qn) ||'%'
      or normalize_text(f.prov_nombre) like '%'|| (select ql from qn) ||'%'
      or normalize_text(f.dist_nombre) like '%'|| (select ql from qn) ||'%')
  order by rank desc, dep_nombre, prov_nombre, dist_nombre
  limit limit_rows;
$$;

-- Permisos (Supabase)
grant execute on function api_get_departamentos() to anon, authenticated;
grant execute on function api_get_provincias(char) to anon, authenticated;
grant execute on function api_get_distritos(char) to anon, authenticated;
grant execute on function api_search_ubigeo(text,int) to anon, authenticated;

-- Opcional: políticas RLS (si tenés RLS activo y querés exponer tablas de solo lectura)
alter table ubigeo_departamento enable row level security;
alter table ubigeo_provincia    enable row level security;
alter table ubigeo_distrito     enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'ubigeo_dep_read') then
    create policy ubigeo_dep_read on ubigeo_departamento
      for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'ubigeo_prov_read') then
    create policy ubigeo_prov_read on ubigeo_provincia
      for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'ubigeo_dist_read') then
    create policy ubigeo_dist_read on ubigeo_distrito
      for select using (true);
  end if;
end $$;
