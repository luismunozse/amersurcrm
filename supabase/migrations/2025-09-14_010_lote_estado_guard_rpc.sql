set search_path = public, crm;

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

-- RPC: reservar / vender / liberar (habilitan el cambio)
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
