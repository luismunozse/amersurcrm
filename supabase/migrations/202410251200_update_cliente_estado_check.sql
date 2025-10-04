-- Ajusta los estados permitidos para cliente.estado_cliente
set search_path = public, crm;

alter table if exists crm.cliente
  drop constraint if exists cliente_estado_cliente_check;

alter table if exists crm.cliente
  add constraint cliente_estado_cliente_check
  check (
    estado_cliente = any (
      array[
        'por_contactar',
        'contactado',
        'transferido',
        'intermedio',
        'desestimado',
        'potencial'
      ]
    )
  );
