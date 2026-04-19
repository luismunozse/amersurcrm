-- ============================================================
-- VISTA KPI VENDEDOR (separada para asegurar que meta_vendedor ya existe)
-- ============================================================

CREATE OR REPLACE VIEW crm.v_kpi_vendedor AS
SELECT
  m.id AS meta_id,
  m.vendedor_username,
  m.vendedor_id,
  m.periodo_anio,
  m.periodo_mes,

  -- Metas
  m.meta_ventas_monto,
  m.meta_ventas_cantidad,
  m.meta_separaciones,
  m.meta_contactos,
  m.meta_visitas,

  -- Reales: ventas
  COALESCE((
    SELECT COUNT(*) FROM crm.venta v
    WHERE v.vendedor_username = m.vendedor_username
      AND EXTRACT(YEAR FROM v.fecha_venta) = m.periodo_anio
      AND EXTRACT(MONTH FROM v.fecha_venta) = m.periodo_mes
      AND v.estado NOT IN ('cancelada')
  ), 0)::bigint AS real_ventas_cantidad,

  COALESCE((
    SELECT SUM(v.precio_total) FROM crm.venta v
    WHERE v.vendedor_username = m.vendedor_username
      AND EXTRACT(YEAR FROM v.fecha_venta) = m.periodo_anio
      AND EXTRACT(MONTH FROM v.fecha_venta) = m.periodo_mes
      AND v.estado NOT IN ('cancelada')
  ), 0)::numeric AS real_ventas_monto,

  -- Reales: separaciones (reservas)
  COALESCE((
    SELECT COUNT(*) FROM crm.reserva r
    WHERE r.vendedor_username = m.vendedor_username
      AND EXTRACT(YEAR FROM r.fecha_reserva) = m.periodo_anio
      AND EXTRACT(MONTH FROM r.fecha_reserva) = m.periodo_mes
      AND r.estado NOT IN ('cancelada')
  ), 0)::bigint AS real_separaciones,

  -- Reales: contactos (interacciones)
  COALESCE((
    SELECT COUNT(*) FROM crm.cliente_interaccion ci
    WHERE ci.vendedor_username = m.vendedor_username
      AND EXTRACT(YEAR FROM ci.fecha_interaccion) = m.periodo_anio
      AND EXTRACT(MONTH FROM ci.fecha_interaccion) = m.periodo_mes
  ), 0)::bigint AS real_contactos,

  -- Reales: visitas
  COALESCE((
    SELECT COUNT(*) FROM crm.visita_propiedad vp
    WHERE vp.vendedor_username = m.vendedor_username
      AND EXTRACT(YEAR FROM vp.fecha_visita) = m.periodo_anio
      AND EXTRACT(MONTH FROM vp.fecha_visita) = m.periodo_mes
  ), 0)::bigint AS real_visitas

FROM crm.meta_vendedor m;

COMMENT ON VIEW crm.v_kpi_vendedor IS 'Vista de KPIs: metas vs resultados reales por vendedor y período';
