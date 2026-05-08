'use client';

import { useCallback } from 'react';
import ExportButton from '@/components/export/ExportButton';
import type { ClienteExportFilters } from '@/lib/export/filteredExport';
import { obtenerTodosLosClientes } from './_actions';

interface Props {
  filters: ClienteExportFilters & {
    proyectoInteres?: string;
  };
  totalCount: number;
  fileName?: string;
}

export default function ExportClientesButton({ filters, totalCount, fileName = 'clientes' }: Props) {
  const fetchAllData = useCallback(async () => {
    const result = await obtenerTodosLosClientes({
      searchTerm: filters.q,
      searchTelefono: filters.telefono,
      searchDni: filters.dni,
      estado: filters.estado,
      tipo: filters.tipo,
      vendedor: filters.vendedor,
      origen: filters.origen,
      proyectoInteres: filters.proyectoInteres,
      fechaDesde: filters.fechaDesde,
      fechaHasta: filters.fechaHasta,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder as 'asc' | 'desc' | undefined,
    });
    return { data: result.data, total: result.total ?? result.data.length };
  }, [filters]);

  return (
    <ExportButton
      type="clientes"
      data={[]}
      filters={filters}
      fileName={fileName}
      label="Exportar"
      size="sm"
      variant="secondary"
      fetchAllData={fetchAllData}
      totalCount={totalCount}
    />
  );
}
