'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/Card';
import { MapPin, Info } from 'lucide-react';

interface LoteState {
  id: string;
  codigo: string;
  estado?: string;
  data?: unknown;
  plano_poligono?: [number, number][] | null;
  ubicacion?: {
    lat: number;
    lng: number;
  } | null;
}

interface MapeoLotesVisualizacionProps {
  proyectoNombre: string;
  planosUrl: string | null;
  overlayBounds?: [[number, number], [number, number]] | null;
  overlayRotation?: number | null;
  lotes?: LoteState[];
}

const GoogleMap = dynamic(() => import('./GoogleMap'), { ssr: false });

const DEFAULT_CENTER: [number, number] = [-12.0464, -77.0428];
const DEFAULT_ZOOM = 17;

export default function MapeoLotesVisualizacion({
  proyectoNombre,
  planosUrl,
  overlayBounds,
  overlayRotation,
  lotes = [],
}: MapeoLotesVisualizacionProps) {
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);

  // Estadísticas
  const stats = useMemo(() => {
    const disponibles = lotes.filter((l) => l.estado === 'disponible').length;
    const reservados = lotes.filter((l) => l.estado === 'reservado').length;
    const vendidos = lotes.filter((l) => l.estado === 'vendido').length;
    const ubicados = lotes.filter((l) => {
      if (l.ubicacion?.lat && l.ubicacion?.lng) return true;
      if (l.plano_poligono && l.plano_poligono.length > 0) return true;
      return false;
    }).length;
    return {
      total: lotes.length,
      disponibles,
      reservados,
      vendidos,
      ubicados,
    };
  }, [lotes]);

  const lotesUbicados = useMemo(
    () => lotes.filter((lote) => {
      if (lote.ubicacion?.lat && lote.ubicacion?.lng) return true;
      if (lote.plano_poligono && lote.plano_poligono.length > 0) return true;
      return false;
    }),
    [lotes]
  );

  const selectedLote = useMemo(
    () => lotes.find((lote) => lote.id === selectedLoteId) ?? null,
    [lotes, selectedLoteId]
  );

  const mapCenter = useMemo(() => {
    if (overlayBounds) {
      const [[swLat, swLng], [neLat, neLng]] = overlayBounds;
      return [(swLat + neLat) / 2, (swLng + neLng) / 2] as [number, number];
    }
    return DEFAULT_CENTER;
  }, [overlayBounds]);

  const mapZoom = useMemo(() => {
    if (overlayBounds) {
      const [[swLat, swLng], [neLat, neLng]] = overlayBounds;
      const latDiff = Math.abs(neLat - swLat);
      const lngDiff = Math.abs(neLng - swLng);
      const span = Math.max(latDiff, lngDiff);
      if (span > 0.08) return 14;
      if (span > 0.05) return 15;
      if (span > 0.02) return 16;
      if (span > 0.01) return 17;
      return 18;
    }
    return DEFAULT_ZOOM;
  }, [overlayBounds]);

  if (!planosUrl) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-crm-text-primary mb-2">
            Plano no disponible
          </h3>
          <p className="text-sm text-crm-text-muted max-w-md mx-auto">
            El administrador aún no ha cargado el plano de este proyecto. Por favor, contacta con el administrador para más información.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-crm-text-primary">Plano de Lotes - {proyectoNombre}</h2>
              <p className="text-sm text-crm-text-muted mt-1">Vista de disponibilidad de lotes</p>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div key="stat-total" className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <div className="text-xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-blue-800">Total</div>
            </div>
            <div key="stat-disponibles" className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="text-xl font-bold text-green-600">{stats.disponibles}</div>
              <div className="text-xs text-green-800">Disponibles</div>
            </div>
            <div key="stat-reservados" className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
              <div className="text-xl font-bold text-yellow-600">{stats.reservados}</div>
              <div className="text-xs text-yellow-800">Reservados</div>
            </div>
            <div key="stat-vendidos" className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
              <div className="text-xl font-bold text-red-600">{stats.vendidos}</div>
              <div className="text-xs text-red-800">Vendidos</div>
            </div>
            <div key="stat-ubicados" className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
              <div className="text-xl font-bold text-purple-600">{stats.ubicados}</div>
              <div className="text-xs text-purple-800">Ubicados</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Lateral - Lista de Lotes */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Info className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-crm-text-primary">Lotes del Proyecto</h3>
                  <p className="text-xs text-crm-text-muted">Haz clic en un lote para resaltarlo</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Leyenda de colores */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Leyenda:</p>
                  <div className="space-y-1.5">
                    <div key="leyenda-disponible" className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="text-xs text-gray-700">Disponible para venta</span>
                    </div>
                    <div key="leyenda-reservado" className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span className="text-xs text-gray-700">Reservado</span>
                    </div>
                    <div key="leyenda-vendido" className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="text-xs text-gray-700">Vendido</span>
                    </div>
                  </div>
                </div>

                {/* Lista de lotes ubicados */}
                <div>
                  <h4 className="text-sm font-semibold text-crm-text-primary mb-3">
                    Lotes ubicados ({lotesUbicados.length})
                  </h4>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {lotesUbicados.length === 0 ? (
                      <div className="text-center py-8 text-sm text-crm-text-muted border border-dashed rounded-lg">
                        <p>No hay lotes ubicados aún</p>
                      </div>
                    ) : (
                      lotesUbicados.map((lote) => (
                        <button
                          key={lote.id}
                          onClick={() => setSelectedLoteId(lote.id === selectedLoteId ? null : lote.id)}
                          className={`w-full text-left p-3 border rounded-lg transition-all ${
                            selectedLoteId === lote.id
                              ? 'border-crm-primary bg-crm-primary/5 shadow-md'
                              : 'border-crm-border hover:border-crm-primary/50 hover:bg-crm-primary/5'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                lote.estado === 'disponible' ? 'bg-green-500' :
                                lote.estado === 'reservado' ? 'bg-yellow-500' :
                                lote.estado === 'vendido' ? 'bg-red-500' : 'bg-gray-400'
                              }`}></div>
                              <div>
                                <div className="text-sm font-semibold text-crm-text-primary">Lote {lote.codigo}</div>
                                <div className="text-xs text-crm-text-muted capitalize">
                                  {lote.estado || 'Sin estado'}
                                </div>
                              </div>
                            </div>
                            {selectedLoteId === lote.id && (
                              <MapPin className="w-4 h-4 text-crm-primary" />
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Info del lote seleccionado */}
                {selectedLote && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Lote {selectedLote.codigo}</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Estado:</span>
                        <span className={`font-medium capitalize ${
                          selectedLote.estado === 'disponible' ? 'text-green-600' :
                          selectedLote.estado === 'reservado' ? 'text-yellow-600' :
                          selectedLote.estado === 'vendido' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {selectedLote.estado === 'disponible' ? '✅ Disponible' :
                           selectedLote.estado === 'reservado' ? '🔒 Reservado' :
                           selectedLote.estado === 'vendido' ? '💰 Vendido' : 'Sin estado'}
                        </span>
                      </div>
                      {selectedLote.ubicacion && (
                        <div className="pt-2 border-t border-blue-200">
                          <span className="text-blue-700 block mb-1">Ubicación:</span>
                          <span className="text-blue-600 font-mono text-[10px]">
                            {selectedLote.ubicacion.lat.toFixed(6)}, {selectedLote.ubicacion.lng.toFixed(6)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mapa */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="h-[700px]">
                <GoogleMap
                  defaultCenter={mapCenter}
                  defaultZoom={mapZoom}
                  planosUrl={planosUrl}
                  overlayBounds={overlayBounds ?? undefined}
                  overlayOpacity={0.7}
                  rotationDeg={overlayRotation ?? 0}
                  overlayEditable={false}
                  projectPolygon={[]}
                  projectDrawingActive={false}
                  lotes={lotes}
                  highlightLoteId={selectedLoteId}
                  loteDrawingActive={false}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
