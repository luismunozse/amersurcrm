-- Add overlay_layers column to store multiple plano overlays per proyecto
alter table if exists crm.proyecto
  add column if not exists overlay_layers jsonb;

comment on column crm.proyecto.overlay_layers is
  'Lista de capas del plano ({ id, name, url, bounds, opacity, isPrimary, visible, order })';
