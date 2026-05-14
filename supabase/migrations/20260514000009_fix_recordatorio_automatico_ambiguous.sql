-- Fix: funciones crear_recordatorio_automatico y actualizar_recordatorio_automatico
-- declaran variable local "fecha_recordatorio" con el mismo nombre que la columna
-- crm.recordatorio.fecha_recordatorio. Postgres lanza:
--   "column reference \"fecha_recordatorio\" is ambiguous"
-- al actualizar un evento. Renombrar variable local a v_fecha_recordatorio.

BEGIN;

CREATE OR REPLACE FUNCTION crm.crear_recordatorio_automatico()
RETURNS TRIGGER AS $$
DECLARE
  v_fecha_recordatorio TIMESTAMPTZ;
BEGIN
  IF NEW.notificar_email = true OR NEW.notificar_push = true THEN
    v_fecha_recordatorio := NEW.fecha_inicio - INTERVAL '1 minute' * NEW.recordar_antes_minutos;

    INSERT INTO crm.recordatorio (
      titulo,
      descripcion,
      tipo,
      prioridad,
      fecha_recordatorio,
      vendedor_id,
      cliente_id,
      propiedad_id,
      evento_id,
      notificar_email,
      notificar_push,
      etiquetas,
      created_by
    ) VALUES (
      'Recordatorio: ' || NEW.titulo,
      COALESCE(NEW.descripcion, 'Recordatorio automático para el evento: ' || NEW.titulo),
      'personalizado',
      NEW.prioridad,
      v_fecha_recordatorio,
      NEW.vendedor_id,
      NEW.cliente_id,
      NEW.propiedad_id,
      NEW.id,
      NEW.notificar_email,
      NEW.notificar_push,
      ARRAY['recordatorio_automatico', 'evento'],
      NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION crm.actualizar_recordatorio_automatico()
RETURNS TRIGGER AS $$
DECLARE
  v_fecha_recordatorio TIMESTAMPTZ;
BEGIN
  IF NEW.notificar_email = true OR NEW.notificar_push = true THEN
    v_fecha_recordatorio := NEW.fecha_inicio - INTERVAL '1 minute' * NEW.recordar_antes_minutos;

    UPDATE crm.recordatorio
    SET
      titulo = 'Recordatorio: ' || NEW.titulo,
      descripcion = COALESCE(NEW.descripcion, 'Recordatorio automático para el evento: ' || NEW.titulo),
      prioridad = NEW.prioridad,
      fecha_recordatorio = v_fecha_recordatorio,
      cliente_id = NEW.cliente_id,
      propiedad_id = NEW.propiedad_id,
      notificar_email = NEW.notificar_email,
      notificar_push = NEW.notificar_push,
      updated_at = NOW()
    WHERE evento_id = NEW.id AND etiquetas @> ARRAY['recordatorio_automatico'];

    IF NOT FOUND THEN
      INSERT INTO crm.recordatorio (
        titulo,
        descripcion,
        tipo,
        prioridad,
        fecha_recordatorio,
        vendedor_id,
        cliente_id,
        propiedad_id,
        evento_id,
        notificar_email,
        notificar_push,
        etiquetas,
        created_by
      ) VALUES (
        'Recordatorio: ' || NEW.titulo,
        COALESCE(NEW.descripcion, 'Recordatorio automático para el evento: ' || NEW.titulo),
        'personalizado',
        NEW.prioridad,
        v_fecha_recordatorio,
        NEW.vendedor_id,
        NEW.cliente_id,
        NEW.propiedad_id,
        NEW.id,
        NEW.notificar_email,
        NEW.notificar_push,
        ARRAY['recordatorio_automatico', 'evento'],
        NEW.created_by
      );
    END IF;
  ELSE
    DELETE FROM crm.recordatorio
    WHERE evento_id = NEW.id AND etiquetas @> ARRAY['recordatorio_automatico'];
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
