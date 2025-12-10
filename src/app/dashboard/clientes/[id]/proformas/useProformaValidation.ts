import { useState, useCallback } from "react";
import { ProformaDatos } from "@/types/proforma";

interface ValidationErrors {
  clienteNombre?: string;
  proyecto?: string;
  lote?: string;
  precioLista?: string;
}

export function useProformaValidation() {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateForm = useCallback((datos: ProformaDatos, _precioFinal: number): boolean => {
    const newErrors: ValidationErrors = {};

    // Validar nombre del cliente (obligatorio)
    if (!datos.cliente?.nombre || datos.cliente.nombre.trim() === "") {
      newErrors.clienteNombre = "El nombre del cliente es obligatorio";
    }

    // Validar datos del terreno (recomendados)
    if (!datos.terreno?.proyecto || datos.terreno.proyecto.trim() === "") {
      newErrors.proyecto = "El proyecto es recomendado";
    }

    if (!datos.terreno?.lote || datos.terreno.lote.trim() === "") {
      newErrors.lote = "El lote es recomendado";
    }

    // Validar precio (obligatorio)
    if (!datos.precios?.precioLista || datos.precios.precioLista <= 0) {
      newErrors.precioLista = "El precio en lista debe ser mayor a 0";
    }

    setErrors(newErrors);

    // Solo errores críticos bloquean el envío (nombre y precio)
    const hasCriticalErrors = Boolean(newErrors.clienteNombre || newErrors.precioLista);
    return !hasCriticalErrors;
  }, []);

  const clearError = useCallback((field: keyof ValidationErrors) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    validateForm,
    clearError,
    clearAllErrors,
  };
}
