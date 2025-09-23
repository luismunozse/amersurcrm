-- Agrega columnas para calibración de plano en proyectos
-- Fecha: 2025-09-23

set search_path = crm, public;

-- Columnas para almacenar bounds y rotación del overlay del plano
alter table if exists crm.proyecto
  add column if not exists overlay_bounds jsonb,
  add column if not exists overlay_rotation integer default 0;

comment on column crm.proyecto.overlay_bounds is '[[southWestLat,lng],[northEastLat,lng]] en lat/lng';
comment on column crm.proyecto.overlay_rotation is 'Rotación del overlay en grados (-180 a 180)';


