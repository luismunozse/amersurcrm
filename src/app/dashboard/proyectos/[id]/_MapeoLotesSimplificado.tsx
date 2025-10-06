'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/Card';
import { Upload, Check, MapPin } from 'lucide-react';
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

interface MapeoLotesSimplificadoProps {
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

export default function MapeoLotesSimplificado({
  proyectoId,
  planosUrl,
  proyectoNombre,
  initialBounds,
  initialRotation,
  lotes = [],
}: MapeoLotesSimplificadoProps) {
  // Estados principales
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(planosUrl ? 2 : 1);
  const [planUrl, setPlanUrl] = useState<string | null>(planosUrl);
  const [isUploading, setIsUploading] = useState(false);

  // Estados del plano
  const [overlayBounds, setOverlayBounds] = useState<[[number, number], [number, number]] | undefined>(
    initialBounds ?? undefined
  );
  const [overlayRotation, setOverlayRotation] = useState<number>(initialRotation ?? 0);
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  const [overlayEditable, setOverlayEditable] = useState(false);
  const [overlayDirty, setOverlayDirty] = useState(false);

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
    if (planosUrl && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [planosUrl, currentStep]);

  useEffect(() => {
    if (initialBounds) {
      setOverlayBounds(initialBounds);
    }
  }, [initialBounds]);

  useEffect(() => {
    if (typeof initialRotation === 'number') {
      setOverlayRotation(initialRotation);
    }
  }, [initialRotation]);

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
  const handleUploadPlano = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('planos', file);

    try {
      const result = await subirPlanos(proyectoId, formData);

      // Verificar que result es un objeto válido
      if (result && typeof result === 'object' && 'url' in result) {
        const response = result as { success: boolean; url?: string };
        if (response.url) {
          setPlanUrl(response.url);

          // Si no hay bounds previos, crear bounds por defecto en el centro del mapa
          if (!overlayBounds) {
            const center = mapCenter;
            const defaultSize = 0.002; // ~200m aproximadamente
            const defaultBounds: [[number, number], [number, number]] = [
              [center[0] - defaultSize, center[1] - defaultSize], // SW
              [center[0] + defaultSize, center[1] + defaultSize], // NE
            ];
            setOverlayBounds(defaultBounds);
            setOverlayDirty(true);
          }

          toast.success('Plano subido correctamente');
          setCurrentStep(2);
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
    if (!confirm('¿Seguro que deseas eliminar el plano? Esto también eliminará todas las ubicaciones de lotes.')) return;
    try {
      await eliminarPlanos(proyectoId);
      setPlanUrl(null);
      setCurrentStep(1);
      toast.success('Plano eliminado correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el plano');
    }
  };

  const handleOverlayBoundsChange = (bounds: [[number, number], [number, number]]) => {
    setOverlayBounds(bounds);
    setOverlayDirty(true);
  };

  const handleSaveOverlay = async () => {
    if (!overlayBounds) {
      toast.error('Ajusta las esquinas del plano antes de continuar');
      return;
    }
    try {
      await guardarOverlayBounds(proyectoId, overlayBounds, Math.round(overlayRotation));
      toast.success('Ajuste del plano guardado');
      setOverlayDirty(false);
      setOverlayEditable(false);
      setCurrentStep(3);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el ajuste del plano');
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-crm-text-primary">Mapeo de Lotes - {proyectoNombre}</h2>
              <p className="text-sm text-crm-text-muted mt-1">Sigue los pasos para ubicar tus lotes en el plano</p>
            </div>
            <div className="flex gap-3">
              <div key="step-1" className={`flex items-center gap-2 px-4 py-2 rounded-lg ${currentStep >= 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {currentStep > 1 ? <Check className="w-4 h-4" /> : <span className="w-6 h-6 rounded-full bg-current opacity-20 flex items-center justify-center text-xs">1</span>}
                <span className="text-sm font-medium">Subir Plano</span>
              </div>
              <div key="step-2" className={`flex items-center gap-2 px-4 py-2 rounded-lg ${currentStep >= 2 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {currentStep > 2 ? <Check className="w-4 h-4" /> : <span className="w-6 h-6 rounded-full bg-current opacity-20 flex items-center justify-center text-xs">2</span>}
                <span className="text-sm font-medium">Ajustar Plano</span>
              </div>
              <div key="step-3" className={`flex items-center gap-2 px-4 py-2 rounded-lg ${currentStep >= 3 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {currentStep === 3 && stats.pendientes === 0 ? <Check className="w-4 h-4" /> : <span className="w-6 h-6 rounded-full bg-current opacity-20 flex items-center justify-center text-xs">3</span>}
                <span className="text-sm font-medium">Ubicar Lotes</span>
              </div>
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
          {/* PASO 1: Subir Plano */}
          {currentStep === 1 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Upload className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-crm-text-primary">Paso 1: Subir Plano</h3>
                    <p className="text-xs text-crm-text-muted">Arrastra la imagen del plano de tu proyecto</p>
                  </div>
                </div>
                <BlueprintUploader
                  onFileSelect={handleUploadPlano}
                  isUploading={isUploading}
                  currentFile={planUrl}
                  onDelete={handleDeletePlano}
                  acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                  maxSize={10}
                />
              </CardContent>
            </Card>
          )}

          {/* PASO 2: Ajustar Plano */}
          {currentStep === 2 && planUrl && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-crm-text-primary">Paso 2: Ajustar Plano</h3>
                    <p className="text-xs text-crm-text-muted">Alinea el plano con el mapa</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                    <p className="font-medium mb-2">Instrucciones:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Haz clic en "✏️ Activar modo ajuste"</li>
                      <li>Verás un <strong>rectángulo azul</strong> sobre el plano</li>
                      <li>Arrastra las <strong>esquinas</strong> del rectángulo azul para ajustar el plano</li>
                      <li>Usa los sliders para <strong>rotar</strong> y ajustar <strong>opacidad</strong></li>
                      <li>Cuando esté alineado, haz clic en "✓ Plano está listo"</li>
                    </ol>
                  </div>

                  <button
                    onClick={() => setOverlayEditable(!overlayEditable)}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                      overlayEditable
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-crm-primary text-white hover:bg-crm-primary-dark'
                    }`}
                  >
                    {overlayEditable ? '✓ Terminar ajuste' : '✏️ Activar modo ajuste'}
                  </button>

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
                  </div>

                  <button
                    onClick={handleSaveOverlay}
                    disabled={!overlayBounds}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ✓ Plano está listo, continuar
                  </button>

                  {overlayDirty && (
                    <p className="text-xs text-orange-600 text-center">Hay cambios sin guardar</p>
                  )}

                  {/* Botón para eliminar plano */}
                  <button
                    onClick={handleDeletePlano}
                    className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
                  >
                    🗑️ Eliminar plano y volver a empezar
                  </button>
                </div>
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
                    <p className="font-medium mb-2">Cómo ubicar lotes:</p>
                    <p className="text-xs">Arrastra cada lote de la lista y suéltalo en su ubicación dentro del plano. Puedes mover los pins después si necesitas ajustar.</p>
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

                  {/* Botón para eliminar plano */}
                  <div className="pt-4 border-t border-crm-border">
                    <button
                      onClick={handleDeletePlano}
                      className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors text-sm"
                    >
                      🗑️ Eliminar plano y reiniciar
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
                  overlayEditable={overlayEditable}
                  onOverlayBoundsChange={handleOverlayBoundsChange}
                  projectPolygon={[]}
                  projectDrawingActive={false}
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
