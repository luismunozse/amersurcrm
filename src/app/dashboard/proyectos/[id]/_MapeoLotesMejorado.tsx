'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/Card';
import { Upload, Check, MapPin, Search, Square } from 'lucide-react';
import BlueprintUploader from '@/components/BlueprintUploader';
import { toast } from 'sonner';
import {
  subirPlanos,
  eliminarPlanos,
  guardarOverlayBounds,
  guardarPoligonoLote,
} from './_actions';

interface LatLngLiteral {
  lat: number;
  lng: number;
}

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

interface MapeoLotesMejoradoProps {
  proyectoId: string;
  planosUrl: string | null;
  proyectoNombre: string;
  initialBounds?: [[number, number], [number, number]] | null;
  initialRotation?: number | null;
  lotes?: LoteState[];
}

const GoogleMap = dynamic(() => import('./GoogleMap'), { ssr: false });

const DEFAULT_CENTER: [number, number] = [-12.0464, -77.0428];
const DEFAULT_ZOOM = 17;

export default function MapeoLotesMejorado({
  proyectoId,
  planosUrl,
  proyectoNombre,
  initialBounds,
  initialRotation,
  lotes = [],
}: MapeoLotesMejoradoProps) {
  // Estados principales
  // Determinar el paso inicial:
  // - Si NO hay área definida → Paso 1 (siempre)
  // - Si hay área pero NO hay plano → Paso 2
  // - Si hay área Y plano → Paso 3
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(() => {
    if (!initialBounds) return 1; // Sin área, empezar en Paso 1
    if (!planosUrl) return 2; // Con área pero sin plano, empezar en Paso 2
    return 3; // Con área y plano, empezar en Paso 3
  });

  const [planUrl, setPlanUrl] = useState<string | null>(planosUrl);
  const [isUploading, setIsUploading] = useState(false);

  // Estados del área/plano
  const [overlayBounds, setOverlayBounds] = useState<[[number, number], [number, number]] | undefined>(
    initialBounds ?? undefined
  );
  const [areaPolygon, setAreaPolygon] = useState<{ lat: number; lng: number }[]>([]);
  const [overlayRotation, setOverlayRotation] = useState<number>(initialRotation ?? 0);
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  const [isDrawingArea, setIsDrawingArea] = useState(false);
  const [overlayDirty, setOverlayDirty] = useState(false);
  const [currentMapCenter, setCurrentMapCenter] = useState<[number, number] | null>(null);

  // Debug: Log cuando cambia el centro del mapa
  useEffect(() => {
    if (currentMapCenter) {
      console.log('📍 Centro del mapa actualizado:', currentMapCenter);
    }
  }, [currentMapCenter]);

  // Estados de lotes
  const [lotesState, setLotesState] = useState<LoteState[]>(lotes);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [draggingLoteId, setDraggingLoteId] = useState<string | null>(null);
  const [savingLotePolygon, setSavingLotePolygon] = useState(false);

  useEffect(() => {
    setLotesState(lotes);
  }, [lotes]);

  useEffect(() => {
    setPlanUrl(planosUrl);
  }, [planosUrl]);

  // Estadísticas
  const stats = useMemo(() => {
    const disponibles = lotesState.filter((l) => l.estado === 'disponible').length;
    const reservados = lotesState.filter((l) => l.estado === 'reservado').length;
    const vendidos = lotesState.filter((l) => l.estado === 'vendido').length;
    const ubicados = lotesState.filter((l) => {
      if (l.ubicacion?.lat && l.ubicacion?.lng) return true;
      if (l.plano_poligono && l.plano_poligono.length > 0) return true;
      return false;
    }).length;
    return {
      total: lotesState.length,
      disponibles,
      reservados,
      vendidos,
      ubicados,
      pendientes: lotesState.length - ubicados,
    };
  }, [lotesState]);

  const lotesSinUbicar = useMemo(
    () => lotesState.filter((lote) => {
      if (lote.ubicacion?.lat && lote.ubicacion?.lng) return false;
      if (lote.plano_poligono && lote.plano_poligono.length > 0) return false;
      return true;
    }),
    [lotesState]
  );

  const lotesUbicados = useMemo(
    () => lotesState.filter((lote) => {
      if (lote.ubicacion?.lat && lote.ubicacion?.lng) return true;
      if (lote.plano_poligono && lote.plano_poligono.length > 0) return true;
      return false;
    }),
    [lotesState]
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

  // Handlers
  const handleStartDrawingPolygon = () => {
    setIsDrawingArea(true);
    toast.info('Haz clic en el mapa para dibujar los vértices del área. Haz clic en el primer punto para cerrar.');
  };

  const handleProjectDrawingFinished = useCallback(() => {
    console.log('🎯 Dibujo de área completado');
    setIsDrawingArea(false);
    toast.success('Área definida correctamente. Puedes ajustar los vértices arrastrándolos.');
  }, []);

  const handlePolygonChange = useCallback((vertices: { lat: number; lng: number }[]) => {
    setAreaPolygon(vertices);
    setOverlayDirty(true);

    // Actualizar bounds
    if (vertices.length > 0) {
      const lats = vertices.map(v => v.lat);
      const lngs = vertices.map(v => v.lng);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)]
      ];
      setOverlayBounds(bounds);
    }
  }, []);

  const handleSaveArea = async () => {
    if (areaPolygon.length < 3) {
      toast.error('Dibuja el área del proyecto primero (mínimo 3 vértices)');
      return;
    }
    if (!overlayBounds) {
      toast.error('Error calculando los límites del área');
      return;
    }
    try {
      await guardarOverlayBounds(proyectoId, overlayBounds, 0);
      toast.success('Área del proyecto guardada');
      setOverlayDirty(false);
      setIsDrawingArea(false);
      setCurrentStep(2);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error guardando área');
    }
  };

  const handleUploadPlano = async (file: File) => {
    // Validar que exista el área antes de subir el plano
    if (!overlayBounds) {
      toast.error('Primero debes definir el área del proyecto en el Paso 1');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('planos', file);

    try {
      const result = await subirPlanos(proyectoId, formData);

      if (result && typeof result === 'object' && 'url' in result) {
        const response = result as { success: boolean; url?: string };
        if (response.url) {
          setPlanUrl(response.url);
          toast.success('Plano subido correctamente');
          setCurrentStep(3);
        }
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (error) {
      console.error('Error al subir plano:', error);
      toast.error(error instanceof Error ? error.message : 'Error subiendo plano');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePlano = async () => {
    if (!planUrl) return;
    if (!confirm('¿Seguro que deseas eliminar el plano? Esto eliminará todas las ubicaciones de lotes.')) return;
    try {
      await eliminarPlanos(proyectoId);
      setPlanUrl(null);
      setCurrentStep(2);
      toast.success('Plano eliminado correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el plano');
    }
  };

  const handleOverlayBoundsChange = (bounds: [[number, number], [number, number]]) => {
    setOverlayBounds(bounds);
    setOverlayDirty(true);
  };

  const handleSaveAdjustments = async () => {
    if (!overlayBounds) return;
    try {
      await guardarOverlayBounds(proyectoId, overlayBounds, Math.round(overlayRotation));
      toast.success('Ajustes guardados');
      setOverlayDirty(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error guardando ajustes');
    }
  };

  const upsertLotePin = useCallback(async (loteId: string, lat: number, lng: number, showToast = true) => {
    setSavingLotePolygon(true);
    try {
      const poligonoNuevo: [number, number][] = [[lat, lng]];
      await guardarPoligonoLote(loteId, proyectoId, poligonoNuevo);

      setLotesState((prev) =>
        prev.map((lote) =>
          lote.id === loteId
            ? {
                ...lote,
                plano_poligono: poligonoNuevo,
                ubicacion: { lat, lng },
              }
            : lote
        )
      );
      if (showToast) toast.success('Ubicación del lote actualizada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la ubicación del lote');
    } finally {
      setSavingLotePolygon(false);
    }
  }, [proyectoId]);

  const handlePinDrop = useCallback(async (loteId: string, lat: number, lng: number) => {
    setSelectedLoteId(loteId);
    setDraggingLoteId(null);
    await upsertLotePin(loteId, lat, lng, true);
  }, [upsertLotePin]);

  const handleMarkerDragEnd = useCallback(async (loteId: string, lat: number, lng: number) => {
    await upsertLotePin(loteId, lat, lng, false);
  }, [upsertLotePin]);

  const handleLoteDragStart = useCallback((event: DragEvent, loteId: string) => {
    if (!planUrl) {
      toast.error('Primero sube el plano del proyecto');
      event.preventDefault();
      return;
    }
    setSelectedLoteId(loteId);
    setDraggingLoteId(loteId);
    try {
      event.dataTransfer.setData('application/x-lote-id', loteId);
      event.dataTransfer.effectAllowed = 'copyMove';
    } catch (error) {
      console.warn('No se pudo asignar dataTransfer', error);
    }
  }, [planUrl]);

  const handleLoteDragEnd = useCallback(() => {
    setDraggingLoteId(null);
  }, []);

  const handleRemoveLotePin = async (loteId: string) => {
    if (!confirm('¿Quitar la ubicación de este lote?')) return;
    setSavingLotePolygon(true);
    try {
      await guardarPoligonoLote(loteId, proyectoId, []);
      setLotesState((prev) =>
        prev.map((lote) =>
          lote.id === loteId ? { ...lote, plano_poligono: null, ubicacion: null } : lote
        )
      );
      if (selectedLoteId === loteId) {
        setSelectedLoteId(null);
      }
      toast.success('Se removió la ubicación del lote');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo remover la ubicación');
    } finally {
      setSavingLotePolygon(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con progreso */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-crm-text-primary">Mapeo de Lotes - {proyectoNombre}</h2>
            <p className="text-sm text-crm-text-muted mt-1">Configura la ubicación del proyecto y ubica los lotes</p>
          </div>

          {/* Indicadores de paso */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${currentStep >= 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {currentStep > 1 ? <Check className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              <span className="text-sm font-medium">1. Ubicar Área</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${currentStep >= 2 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {currentStep > 2 ? <Check className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              <span className="text-sm font-medium">2. Subir Plano</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${currentStep >= 3 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {currentStep === 3 && stats.pendientes === 0 ? <Check className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
              <span className="text-sm font-medium">3. Ubicar Lotes</span>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div key="stat-total" className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <div className="text-xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-blue-800">Total Lotes</div>
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
        {/* Panel Lateral */}
        <div className="lg:col-span-1 space-y-6">
          {/* PASO 1: Ubicar Área del Proyecto */}
          {currentStep === 1 && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Search className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-crm-text-primary">Paso 1: Ubicar Área del Proyecto</h3>
                    <p className="text-xs text-crm-text-muted">Busca y marca la zona en el mapa</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                  <p className="font-medium mb-2">Instrucciones:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Usa el <strong>buscador del mapa</strong> para encontrar la ubicación (ej: "Huaral, Lima")</li>
                    <li>Haz clic en <strong>"✏️ Dibujar área del proyecto"</strong></li>
                    <li>Haz clic en el mapa para marcar cada <strong>vértice del área</strong></li>
                    <li>Haz clic en el <strong>primer punto</strong> para cerrar el polígono</li>
                    <li>Arrastra los vértices para ajustar si es necesario</li>
                    <li>Haz clic en <strong>"Guardar ubicación"</strong> para continuar</li>
                  </ol>
                </div>

                {areaPolygon.length === 0 ? (
                  <button
                    onClick={handleStartDrawingPolygon}
                    disabled={isDrawingArea}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                      isDrawingArea
                        ? 'bg-orange-500 text-white'
                        : 'bg-crm-primary text-white hover:bg-crm-primary-dark'
                    }`}
                  >
                    {isDrawingArea ? '✏️ Dibujando... (haz clic en el mapa)' : '✏️ Dibujar área del proyecto'}
                  </button>
                ) : (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                    <p className="font-medium">✓ Área dibujada ({areaPolygon.length} vértices)</p>
                    <p className="text-xs mt-1">Arrastra los vértices para ajustar el área</p>
                  </div>
                )}

                <button
                  onClick={handleSaveArea}
                  disabled={areaPolygon.length < 3}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ✓ Guardar ubicación y continuar
                </button>

                {overlayDirty && areaPolygon.length >= 3 && (
                  <p className="text-xs text-orange-600 text-center">Área definida • Guarda para continuar</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* PASO 2: Subir Plano */}
          {currentStep === 2 && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Upload className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-crm-text-primary">Paso 2: Subir Plano</h3>
                    <p className="text-xs text-crm-text-muted">El plano se ubicará en el área marcada</p>
                  </div>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <p className="text-green-800">✓ Área del proyecto ubicada correctamente</p>
                  <p className="text-xs text-green-700 mt-1">El plano aparecerá dentro del área marcada</p>
                </div>

                <BlueprintUploader
                  onFileSelect={handleUploadPlano}
                  isUploading={isUploading}
                  currentFile={planUrl}
                  onDelete={handleDeletePlano}
                  acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                  maxSize={10}
                />

                {planUrl && (
                  <>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-crm-text-primary mb-2 block">Opacidad del plano</label>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={overlayOpacity}
                          onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <div className="text-xs text-crm-text-muted mt-1">{Math.round(overlayOpacity * 100)}%</div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-crm-text-primary mb-2 block">Rotación</label>
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          step={1}
                          value={overlayRotation}
                          onChange={(e) => {
                            setOverlayRotation(parseFloat(e.target.value));
                            setOverlayDirty(true);
                          }}
                          className="w-full"
                        />
                        <div className="text-xs text-crm-text-muted mt-1">{overlayRotation.toFixed(0)}°</div>
                      </div>

                      {overlayDirty && (
                        <button
                          onClick={handleSaveAdjustments}
                          className="w-full px-4 py-2 bg-crm-primary text-white rounded-lg font-medium hover:bg-crm-primary-dark transition-colors text-sm"
                        >
                          💾 Guardar ajustes
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => setCurrentStep(3)}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      ✓ Plano listo, continuar
                    </button>
                  </>
                )}

                <button
                  onClick={() => setCurrentStep(1)}
                  className="w-full px-4 py-2 border border-crm-border text-crm-text-secondary rounded-lg font-medium hover:bg-crm-card-hover transition-colors text-sm"
                >
                  ← Volver a ubicar área
                </button>
              </CardContent>
            </Card>
          )}

          {/* PASO 3: Ubicar Lotes */}
          {currentStep === 3 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-crm-text-primary">Paso 3: Ubicar Lotes</h3>
                    <p className="text-xs text-crm-text-muted">Arrastra cada lote al plano</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                    <p className="font-medium mb-1">Cómo ubicar lotes:</p>
                    <p className="text-xs">Arrastra cada lote de la lista y suéltalo en su ubicación dentro del plano</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-crm-text-primary">Lotes pendientes ({lotesSinUbicar.length})</h4>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {lotesSinUbicar.length === 0 ? (
                        <div className="text-center py-8 text-sm text-crm-text-muted border border-dashed rounded-lg">
                          <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
                          <p>¡Todos los lotes están ubicados!</p>
                        </div>
                      ) : (
                        lotesSinUbicar.map((lote) => (
                          <button
                            key={lote.id}
                            draggable
                            onClick={() => setSelectedLoteId(lote.id)}
                            onDragStart={(e) => handleLoteDragStart(e, lote.id)}
                            onDragEnd={handleLoteDragEnd}
                            className={`w-full text-left p-3 border-2 rounded-lg transition-all cursor-grab active:cursor-grabbing ${
                              draggingLoteId === lote.id
                                ? 'opacity-50 scale-95 border-crm-primary bg-crm-primary/10'
                                : selectedLoteId === lote.id
                                ? 'border-crm-primary bg-crm-primary/5 shadow-md'
                                : 'border-crm-border hover:border-crm-primary/50 hover:bg-crm-primary/5'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-crm-primary/10 rounded flex items-center justify-center">
                                  <span className="text-sm font-bold text-crm-primary">{lote.codigo}</span>
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-crm-text-primary">Lote {lote.codigo}</div>
                                  <div className={`text-xs ${
                                    lote.estado === 'disponible' ? 'text-green-600' :
                                    lote.estado === 'reservado' ? 'text-yellow-600' :
                                    lote.estado === 'vendido' ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    {lote.estado === 'disponible' ? '✅ Disponible' :
                                     lote.estado === 'reservado' ? '🔒 Reservado' :
                                     lote.estado === 'vendido' ? '💰 Vendido' : 'Sin estado'}
                                  </div>
                                </div>
                              </div>
                              <svg className="w-5 h-5 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                              </svg>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {lotesUbicados.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-crm-text-primary">Lotes ubicados ({lotesUbicados.length})</h4>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {lotesUbicados.map((lote) => (
                          <div
                            key={lote.id}
                            className="flex items-center justify-between p-3 border border-crm-border rounded-lg bg-green-50"
                          >
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-600" />
                              <div>
                                <div className="text-sm font-semibold text-crm-text-primary">Lote {lote.codigo}</div>
                                <div className="text-xs text-crm-text-muted">Ubicado</div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveLotePin(lote.id)}
                              className="text-xs text-red-600 hover:text-red-700 font-medium"
                              disabled={savingLotePolygon}
                            >
                              Quitar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-crm-border">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="w-full px-4 py-2 border border-crm-border text-crm-text-secondary rounded-lg font-medium hover:bg-crm-card-hover transition-colors text-sm"
                    >
                      ← Volver a ajustar plano
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mapa */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="h-[700px]">
                <GoogleMap
                  defaultCenter={mapCenter}
                  defaultZoom={mapZoom}
                  planosUrl={planUrl}
                  overlayBounds={overlayBounds}
                  overlayOpacity={overlayOpacity}
                  rotationDeg={overlayRotation}
                  overlayEditable={false}
                  onOverlayBoundsChange={handleOverlayBoundsChange}
                  onMapCenterChange={setCurrentMapCenter}
                  onCreateDefaultBounds={() => {
                    setOverlayDirty(true);
                  }}
                  projectPolygon={areaPolygon}
                  onProjectPolygonChange={handlePolygonChange}
                  projectDrawingActive={isDrawingArea}
                  onProjectDrawingFinished={handleProjectDrawingFinished}
                  lotes={lotesState}
                  highlightLoteId={selectedLoteId}
                  loteDrawingActive={false}
                  draggingLoteId={draggingLoteId}
                  onPinDrop={handlePinDrop}
                  onMarkerDragEnd={handleMarkerDragEnd}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
