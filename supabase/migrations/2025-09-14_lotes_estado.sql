-- Usar schema
set search_path = public, crm;

-- Constraint de estado
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'lote_estado_chk' and conrelid = 'crm.lote'::regclass
  ) then
    alter table crm.lote
      add constraint lote_estado_chk
      check (estado in ('disponible','reservado','vendido'));
  end if;
end $$;

-- updated_at + trigger
alter table crm.lote
  add column if not exists updated_at timestamptz default now();

create or replace function crm.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_lote_touch on crm.lote;
create trigger trg_lote_touch
before update on crm.lote
for each row execute function crm.touch_updated_at();

-- Guard: impedir cambiar estado por fuera de las RPC
create or replace function crm.guard_estado()
returns trigger language plpgsql as $$
begin
  if (new.estado is distinct from old.estado)
     and coalesce(current_setting('app.allow_estado_change', true), 'off') <> 'on'
  then
     raise exception 'El estado del lote solo puede cambiarse por funciones (reservar/vender/liberar).';
  end if;
  return new;
end $$;

drop trigger if exists trg_lote_guard_estado on crm.lote;
create trigger trg_lote_guard_estado
before update on crm.lote
for each row execute function crm.guard_estado();

-- RPC: reservar / vender / liberar (habilitan el cambio de estado)
create or replace function crm.reservar_lote(p_lote uuid)
returns boolean language plpgsql security definer set search_path = public, crm as $$
begin
  perform set_config('app.allow_estado_change','on', true);
  update crm.lote set estado='reservado' where id=p_lote and estado='disponible';
  return found;
end $$;

create or replace function crm.vender_lote(p_lote uuid)
returns boolean language plpgsql security definer set search_path = public, crm as $$
begin
  perform set_config('app.allow_estado_change','on', true);
  update crm.lote set estado='vendido' where id=p_lote and estado='reservado';
  return found;
end $$;

create or replace function crm.liberar_lote(p_lote uuid)
returns boolean language plpgsql security definer set search_path = public, crm as $$
begin
  perform set_config('app.allow_estado_change','on', true);
  update crm.lote set estado='disponible' where id=p_lote and estado='reservado';
  return found;
end $$;

grant execute on function crm.reservar_lote(uuid) to authenticated;
grant execute on function crm.vender_lote(uuid)    to authenticated;
grant execute on function crm.liberar_lote(uuid)   to authenticated;
