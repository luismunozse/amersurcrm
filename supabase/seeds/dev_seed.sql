set search_path = public, crm;

do $$
declare
  v_user uuid;
begin
  select id into v_user from auth.users where email = 'admin@amersur.test' limit 1;
  if v_user is null then
    raise exception 'No existe un usuario con ese email. Crealo en Auth > Users o logueate primero.';
  end if;

  -- Proyecto demo (si no existe)
  insert into crm.proyecto (id, nombre, estado, ubicacion, created_by)
  values (gen_random_uuid(), 'Parque Norte', 'activo', 'Córdoba', v_user)
  on conflict do nothing;

  -- Tomar el proyecto recién creado
  with p as (select id from crm.proyecto where nombre='Parque Norte' limit 1)
  insert into crm.lote (id, proyecto_id, codigo, sup_m2, precio, moneda, estado, created_by)
  select gen_random_uuid(), p.id, x.codigo, x.sup_m2, x.precio, 'ARS', 'disponible', v_user
  from p cross join (values
    ('MzA-01', 250, 20000),
    ('MzA-02', 260, 20500),
    ('MzB-01', 300, 25000)
  ) as x(codigo, sup_m2, precio)
  on conflict do nothing;
  
  -- Clientes demo
  insert into crm.cliente (id, nombre, email, telefono, created_by)
  values
    (gen_random_uuid(), 'Juan Pérez', 'juan@example.com',  '351-555-0001', v_user),
    (gen_random_uuid(), 'Ana Gómez',  'ana@example.com',   '351-555-0002', v_user),
    (gen_random_uuid(), 'Carlos Ruiz',null,                null,           v_user)
  on conflict do nothing;
end $$;
