"use client";

import LoteCard from "@/components/LoteCard";

type Lote = {
  id: string;
  codigo: string;
  sup_m2: number | null;
  precio: number | null;
  moneda: string | null;
  estado: "disponible" | "reservado" | "vendido";
  data?: {
    fotos?: string[];
    plano?: string;
    renders?: string[];
    links3D?: string[];
    proyecto?: string;
    ubicacion?: string;
    etapa?: string;
    identificador?: string;
    manzana?: string;
    numero?: string;
    condiciones?: string;
    descuento?: number;
  };
};

export default function LotesList({ proyectoId, lotes }: { proyectoId: string; lotes: Lote[] }) {
  return (
    <div className="crm-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-crm-text-primary">Lotes del Proyecto</h3>
          <p className="text-sm text-crm-text-muted mt-1">
            {lotes.length} {lotes.length === 1 ? 'lote' : 'lotes'} registrado{lotes.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-crm-primary/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
          </div>
        </div>
      </div>

      {lotes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-crm-card-hover rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <h4 className="text-xl font-medium text-crm-text-primary mb-3">No hay lotes registrados</h4>
          <p className="text-crm-text-muted mb-6 max-w-md mx-auto">
            Comienza agregando tu primer lote usando el asistente paso a paso de arriba.
          </p>
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-crm-primary/10 text-crm-primary rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="text-sm font-medium">Usa el botón "Crear Lote" para comenzar</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lotes.map((lote) => (
            <LoteCard key={lote.id} lote={lote} proyectoId={proyectoId} />
          ))}
        </div>
      )}
    </div>
  );
}

