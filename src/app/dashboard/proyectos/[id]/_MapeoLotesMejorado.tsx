'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/Card';
import { Upload, Check, MapPin, Search, RefreshCcw, Trash2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import BlueprintUploader from '@/components/BlueprintUploader';
import { toast } from 'sonner';
import {
  subirPlanos,
  eliminarPlanos,
  guardarOverlayBounds,
  guardarPoligonoLote,
  eliminarLote,
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
  proyectoLatitud?: number | null;
  proyectoLongitud?: number | null;
  initialBounds?: [[number, number], [number, number]] | null;
  initialRotation?: number | null;
  initialOpacity?: number | null;
  lotes?: LoteState[];
}

const GoogleMap = dynamic(() => import('./GoogleMap'), { ssr: false });

const DEFAULT_CENTER: [number, number] = [-12.0464, -77.0428];
const DEFAULT_ZOOM = 17;

export default function MapeoLotesMejorado({
  proyectoId,
  planosUrl,
  proyectoNombre,
  proyectoLatitud,
  proyectoLongitud,
  initialBounds,
  initialRotation,
  initialOpacity,
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
  const [overlayOpacity, setOverlayOpacity] = useState(initialOpacity ?? 0.7);
  const [isDrawingArea, setIsDrawingArea] = useState(false);
  const [overlayDirty, setOverlayDirty] = useState(false);
  const [currentMapCenter, setCurrentMapCenter] = useState<[number, number] | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Debug: Log cuando cambia el centro del mapa
  useEffect(() => {
    // Centro actualizado
  }, [currentMapCenter]);

  // Estados de lotes
  const [lotesState, setLotesState] = useState<LoteState[]>(lotes);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [draggingLoteId, setDraggingLoteId] = useState<string | null>(null);
  const [drawingLoteId, setDrawingLoteId] = useState<string | null>(null);
  const [savingLotePolygon, setSavingLotePolygon] = useState(false);
  const [deletingLoteId, setDeletingLoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusRequest, setFocusRequest] = useState<{ id: string; ts: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'located'>('pending');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const toggleDrawer = useCallback(() => {
    // No permitir cerrar el drawer en los Pasos 1 y 2
    if (currentStep === 1 || currentStep === 2) {
      return;
    }
    setDrawerOpen((prev) => !prev);
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== 3) {
      setDrawerOpen(true);
    }
  }, [currentStep]);

  useEffect(() => {
    setLotesState(lotes);
  }, [lotes]);

  useEffect(() => {
    setPlanUrl(planosUrl);
  }, [planosUrl]);

  // Estadísticas globales (sin filtros)
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

  const normalizedSearch = useMemo(() => searchTerm.trim().toLowerCase(), [searchTerm]);
  const hasSearch = normalizedSearch.length >= 2;
  const searchTooShort = searchTerm.trim().length > 0 && !hasSearch;

  const filteredLotes = useMemo(() => {
    if (!hasSearch) return lotesState;
    return lotesState.filter((lote) => lote.codigo.toLowerCase().includes(normalizedSearch));
  }, [hasSearch, lotesState, normalizedSearch]);

  const lotesSinUbicar = useMemo(
    () =>
      filteredLotes.filter((lote) => {
        if (lote.ubicacion?.lat && lote.ubicacion?.lng) return false;
        if (lote.plano_poligono && lote.plano_poligono.length > 0) return false;
        return true;
      }),
    [filteredLotes]
  );

  const lotesUbicados = useMemo(
    () =>
      filteredLotes.filter((lote) => {
        if (lote.ubicacion?.lat && lote.ubicacion?.lng) return true;
        if (lote.plano_poligono && lote.plano_poligono.length > 0) return true;
        return false;
      }),
    [filteredLotes]
  );

  const totalProgress = stats.total > 0 ? Math.round((stats.ubicados / stats.total) * 100) : 0;
  const visibleLotes = activeTab === 'pending' ? lotesSinUbicar : lotesUbicados;
  const selectedLote = useMemo(
    () => lotesState.find((lote) => lote.id === selectedLoteId) ?? null,
    [lotesState, selectedLoteId]
  );
  const selectedLoteUbicado = useMemo(() => {
    if (!selectedLote) return false;
    if (selectedLote.ubicacion?.lat && selectedLote.ubicacion?.lng) return true;
    if (selectedLote.plano_poligono && selectedLote.plano_poligono.length > 0) return true;
    return false;
  }, [selectedLote]);

  const mapCenter = useMemo(() => {
    // 1. Si hay bounds del overlay, usar el centro de esos bounds
    if (overlayBounds) {
      const [[swLat, swLng], [neLat, neLng]] = overlayBounds;
      return [(swLat + neLat) / 2, (swLng + neLng) / 2] as [number, number];
    }

    // 2. Si no hay bounds pero hay coordenadas del proyecto, usar esas
    if (proyectoLatitud != null && proyectoLongitud != null) {
      return [proyectoLatitud, proyectoLongitud] as [number, number];
    }

    // 3. Fallback a las coordenadas por defecto (Lima)
    return DEFAULT_CENTER;
  }, [overlayBounds, proyectoLatitud, proyectoLongitud]);

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

  // Debug: Ver cuando cambia areaPolygon
  useEffect(() => {
    // areaPolygon actualizado
  }, [areaPolygon]);

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
      await guardarOverlayBounds(proyectoId, overlayBounds, Math.round(overlayRotation), overlayOpacity);
      toast.success('Ajustes guardados');
      setOverlayDirty(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error guardando ajustes');
    }
  };

  const upsertLotePin = useCallback(async (loteId: string, lat: number, lng: number, showToast = true) => {
    if (!overlayBounds) {
      toast.error('Primero debes definir el área del plano');
      return;
    }

    if (!planUrl) {
      toast.error('Primero debes subir el plano del proyecto');
      return;
    }

    setSavingLotePolygon(true);
    try {
      const [[swLat, swLng], [neLat, neLng]] = overlayBounds;
      const normalizedX = (lng - swLng) / (neLng - swLng);
      const normalizedY = (lat - swLat) / (neLat - swLat);

      const margin = 0.1;
      if (
        normalizedX < -margin ||
        normalizedX > 1 + margin ||
        normalizedY < -margin ||
        normalizedY > 1 + margin
      ) {
        toast.error('⚠️ El lote debe ubicarse DENTRO del plano. Intenta soltarlo nuevamente dentro del área.');
        console.warn('❌ Coordenadas fuera del plano:', { normalizedX, normalizedY });
        setSavingLotePolygon(false);
        return;
      }

      const poligonoReal: [number, number][] = [[lat, lng]];
      await guardarPoligonoLote(loteId, proyectoId, poligonoReal);

      setLotesState((prev) =>
        prev.map((lote) =>
          lote.id === loteId
            ? {
                ...lote,
                plano_poligono: poligonoReal,
                ubicacion: { lat, lng },
              }
            : lote
        )
      );
      if (showToast) toast.success('✅ Lote ubicado en el plano');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la ubicación del lote');
    } finally {
      setSavingLotePolygon(false);
    }
  }, [proyectoId, overlayBounds, planUrl]);

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

  const handleFocusLote = useCallback((loteId: string) => {
    setSelectedLoteId(loteId);
    setFocusRequest({ id: loteId, ts: Date.now() });
    setCurrentStep((prev) => (prev === 3 ? prev : 3));
  }, []);

  const handleStartDrawingLote = useCallback((loteId: string) => {
    setDrawingLoteId(loteId);
    setSelectedLoteId(loteId);
  }, []);

  const handleLotePolygonComplete = useCallback(async (vertices: [number, number][]) => {
    if (!drawingLoteId) return;

    setSavingLotePolygon(true);
    try {
      await guardarPoligonoLote(drawingLoteId, proyectoId, vertices);

      setLotesState((prev) =>
        prev.map((lote) =>
          lote.id === drawingLoteId
            ? {
                ...lote,
                plano_poligono: vertices,
                ubicacion: vertices.length > 0 ? {
                  lat: vertices[0][0],
                  lng: vertices[0][1],
                } : null,
              }
            : lote
        )
      );

      toast.success(`✅ Lote ${lotesState.find(l => l.id === drawingLoteId)?.codigo} ubicado correctamente`);
      setDrawingLoteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el polígono del lote');
    } finally {
      setSavingLotePolygon(false);
    }
  }, [drawingLoteId, proyectoId, lotesState]);

  const handleRemoveLotePin = useCallback(
    async (
      loteId: string,
      options: { skipConfirm?: boolean } = {}
    ): Promise<boolean> => {
      if (!options.skipConfirm && !confirm('¿Quitar la ubicación de este lote?')) {
        return false;
      }
      setSavingLotePolygon(true);
      try {
      await guardarPoligonoLote(loteId, proyectoId, []);
      setLotesState((prev) =>
        prev.map((lote) =>
          lote.id === loteId ? { ...lote, plano_poligono: null, ubicacion: null } : lote
        )
      );
      setSelectedLoteId((prevSelected) => (prevSelected === loteId ? null : prevSelected));
      setActiveTab((prev) => (prev === 'located' ? 'pending' : prev));
      toast.success('Se removió la ubicación del lote');
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo remover la ubicación');
      return false;
      } finally {
        setSavingLotePolygon(false);
      }
    },
    [proyectoId]
  );

  const handleReubicarLote = useCallback(
    async (loteId: string) => {
      const lote = lotesState.find((item) => item.id === loteId);
      const mensaje = `El lote ${lote?.codigo ?? ''} volverá a la lista de pendientes para que puedas ubicarlo nuevamente. ¿Deseas continuar?`;
      if (!confirm(mensaje)) return;
      const removed = await handleRemoveLotePin(loteId, { skipConfirm: true });
      if (removed) {
        setActiveTab('pending');
        handleStartDrawingLote(loteId);
      }
    },
    [handleRemoveLotePin, handleStartDrawingLote, lotesState]
  );

  const handleDeleteLote = async (loteId: string) => {
    if (!confirm('¿Eliminar este lote del proyecto? Esta acción no se puede deshacer.')) return;
    setDeletingLoteId(loteId);
    try {
      await eliminarLote(loteId, proyectoId);
      setLotesState((prev) => prev.filter((lote) => lote.id !== loteId));
      if (selectedLoteId === loteId) {
        setSelectedLoteId(null);
      }
      toast.success('Lote eliminado correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el lote');
    } finally {
      setDeletingLoteId(null);
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
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              currentStep >= 1 ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-50 text-gray-400 border-2 border-gray-200'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                currentStep > 1 ? 'bg-green-600' : currentStep === 1 ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {currentStep > 1 ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <span className="text-xs font-bold text-white">1</span>
                )}
              </div>
              <span className="text-sm font-medium">Área</span>
            </div>

            <div className={`h-0.5 w-8 ${currentStep >= 2 ? 'bg-green-400' : 'bg-gray-200'}`} />

            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              currentStep >= 2 ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-50 text-gray-400 border-2 border-gray-200'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                currentStep > 2 ? 'bg-green-600' : currentStep === 2 ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {currentStep > 2 ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <span className="text-xs font-bold text-white">2</span>
                )}
              </div>
              <span className="text-sm font-medium">Plano</span>
            </div>

            <div className={`h-0.5 w-8 ${currentStep >= 3 ? 'bg-green-400' : 'bg-gray-200'}`} />

            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              currentStep >= 3 ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-50 text-gray-400 border-2 border-gray-200'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                currentStep === 3 && stats.pendientes === 0 ? 'bg-green-600' : currentStep === 3 ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {currentStep === 3 && stats.pendientes === 0 ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <span className="text-xs font-bold text-white">3</span>
                )}
              </div>
              <span className="text-sm font-medium">Lotes</span>
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

      {currentStep === 3 ? (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch">
          <div
            className={`w-full space-y-4 transition-all duration-300 ${
              drawerOpen
                ? 'xl:w-[22rem] xl:max-w-[22rem] xl:opacity-100'
                : 'xl:w-0 xl:max-w-0 xl:opacity-0 xl:pointer-events-none'
            }`}
          >
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-crm-text-primary">Paso 3 · Ubicar lotes</h3>
                      <p className="text-xs text-crm-text-muted">
                        Arrastra o dibuja cada lote directamente sobre el plano para finalizar el mapeo.
                      </p>
                    </div>
                  </div>
                  <div className="sm:w-56">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-crm-text-muted">
                      <span>Progreso del mapeo</span>
                      <span className="text-crm-text-primary">{stats.ubicados}/{stats.total}</span>
                    </div>
                    <div className="mt-2 h-2 bg-crm-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-crm-primary to-crm-primary-hover"
                        style={{ width: `${totalProgress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-crm-text-muted">{totalProgress}% completado</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-crm-text-muted uppercase tracking-wide" htmlFor="buscar-lote">
                      Buscar lote
                    </label>
                    <div className="relative mt-1">
                      <Search className="w-4 h-4 text-crm-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="buscar-lote"
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Código, referencia..."
                        className="w-full pl-10 pr-24 py-2 border border-crm-border rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                      />
                      {(hasSearch || searchTooShort) && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-crm-text-muted hover:text-crm-primary"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                    {searchTooShort && (
                      <p className="text-xs text-crm-text-muted mt-1">Escribe al menos 2 caracteres para buscar.</p>
                    )}
                    {hasSearch && !filteredLotes.length && !searchTooShort && (
                      <p className="text-xs text-crm-text-muted mt-1">No se encontraron lotes con “{searchTerm.trim()}”.</p>
                    )}
                    {hasSearch && filteredLotes.length > 0 && (
                      <p className="text-xs text-crm-text-muted mt-1">{filteredLotes.length} resultado{filteredLotes.length === 1 ? '' : 's'} encontrado{filteredLotes.length === 1 ? '' : 's'}.</p>
                    )}
                  </div>

                  <div className="lg:w-48 p-3 border border-blue-200 bg-blue-50 rounded-lg text-xs text-blue-900">
                    <p className="font-semibold mb-1">¿Cómo ubico un lote?</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Haz clic en <span className="font-semibold">“Dibujar”</span> para trazar el polígono.</li>
                      <li>También puedes arrastrar el lote al plano para soltar un pin.</li>
                      <li>Usa “Reubicar” si necesitas ajustarlo nuevamente.</li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1 px-1 py-1 rounded-lg bg-crm-card border border-crm-border">
                    <button
                      type="button"
                      onClick={() => setActiveTab('pending')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                        activeTab === 'pending'
                          ? 'bg-crm-primary text-white shadow'
                          : 'text-crm-text-secondary hover:bg-crm-card-hover'
                      }`}
                    >
                      Pendientes ({lotesSinUbicar.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('located')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                        activeTab === 'located'
                          ? 'bg-crm-primary text-white shadow'
                          : 'text-crm-text-secondary hover:bg-crm-card-hover'
                      }`}
                    >
                      Ubicados ({lotesUbicados.length})
                    </button>
                  </div>

                  <span className="text-[11px] text-crm-text-muted">
                    {activeTab === 'pending'
                      ? 'Arrastra o dibuja los lotes pendientes sobre el plano.'
                      : 'Revisa, reubica o quita la ubicación de los lotes ya colocados.'}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-crm-text-primary">
                      {activeTab === 'pending'
                        ? `Lotes pendientes (${lotesSinUbicar.length})`
                        : `Lotes ubicados (${lotesUbicados.length})`}
                    </h4>
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="text-xs text-crm-text-secondary hover:text-crm-primary"
                    >
                      ← Ajustar plano
                    </button>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
                    {visibleLotes.length === 0 ? (
                      <div className="text-center py-10 border border-dashed border-crm-border rounded-xl bg-white">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-crm-primary/10 flex items-center justify-center">
                          <Check className="w-6 h-6 text-crm-primary" />
                        </div>
                        <p className="text-sm font-medium text-crm-text-primary">
                          {activeTab === 'pending'
                            ? 'No hay lotes pendientes'
                            : 'Todos los lotes están ubicados'}
                        </p>
                        <p className="text-xs text-crm-text-muted mt-1">
                          {activeTab === 'pending'
                            ? '¡Puedes comenzar a ubicar lotes desde el listado principal!'
                            : 'Puedes reubicar un lote si lo necesitas usando las acciones laterales.'}
                        </p>
                      </div>
                    ) : (
                      visibleLotes.map((lote) => {
                        const estadoColor =
                          lote.estado === 'disponible'
                            ? 'text-green-600 bg-green-50 border-green-200'
                            : lote.estado === 'vendido'
                              ? 'text-red-600 bg-red-50 border-red-200'
                              : lote.estado === 'reservado'
                                ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
                                : 'text-gray-600 bg-gray-50 border-gray-200';

                        return (
                          <div
                            key={lote.id}
                            className={`group rounded-xl border transition-all duration-200 bg-white ${
                              selectedLoteId === lote.id
                                ? 'border-crm-primary shadow-md'
                                : 'border-crm-border hover:border-crm-primary/60 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex flex-col gap-3 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="text-xs font-semibold text-crm-text-muted uppercase tracking-wider">
                                    Lote {lote.codigo}
                                  </div>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${estadoColor}`}>
                                    {lote.estado === 'disponible'
                                      ? 'Disponible'
                                      : lote.estado === 'vendido'
                                        ? 'Vendido'
                                        : lote.estado === 'reservado'
                                          ? 'Reservado'
                                          : 'Sin estado'}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-end text-xs">
                                  <button
                                    onClick={() => handleFocusLote(lote.id)}
                                    className="px-3 py-1 border border-crm-border rounded-md text-crm-text-secondary hover:text-crm-primary hover:border-crm-primary transition-colors"
                                  >
                                    Ver
                                  </button>
                                  {activeTab === 'pending' ? (
                                    <>
                                      <button
                                        onClick={() => handleStartDrawingLote(lote.id)}
                                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                      >
                                        Dibujar
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLote(lote.id)}
                                        disabled={deletingLoteId === lote.id}
                                        className="px-3 py-1 border border-transparent rounded-md text-red-600 hover:text-red-700 hover:border-red-300 transition-colors disabled:opacity-60 flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Eliminar
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleReubicarLote(lote.id)}
                                        className="px-3 py-1 border border-crm-border rounded-md text-crm-text-secondary hover:text-crm-primary hover:border-crm-primary transition-colors flex items-center gap-1"
                                      >
                                        <RefreshCcw className="w-3.5 h-3.5" />
                                        Reubicar
                                      </button>
                                      <button
                                        onClick={() => handleRemoveLotePin(lote.id)}
                                        className="px-3 py-1 text-red-600 border border-transparent rounded-md hover:text-red-700 hover:border-red-300 transition-colors"
                                        disabled={savingLotePolygon}
                                      >
                                        Quitar ubicación
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLote(lote.id)}
                                        disabled={deletingLoteId === lote.id}
                                        className="px-3 py-1 border border-transparent rounded-md text-red-600 hover:text-red-700 hover:border-red-300 transition-colors disabled:opacity-60 flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Eliminar
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {selectedLote && (
                    <div className="p-4 border border-crm-border rounded-xl bg-crm-card space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-crm-text-primary">Lote {selectedLote.codigo}</p>
                          <p className="text-xs text-crm-text-muted">
                            Estado: {selectedLote.estado ?? 'Sin estado'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleFocusLote(selectedLote.id)}
                          className="text-xs text-crm-text-secondary hover:text-crm-primary"
                        >
                          Centrar
                        </button>
                      </div>
                      {selectedLoteUbicado ? (
                        <>
                          {selectedLote.ubicacion && (
                            <div>
                              <p className="text-[11px] text-crm-text-muted uppercase font-semibold mb-1">Ubicación</p>
                              <p className="font-mono text-xs text-crm-text-primary">
                                {selectedLote.ubicacion.lat.toFixed(6)}, {selectedLote.ubicacion.lng.toFixed(6)}
                              </p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <button
                              onClick={() => handleReubicarLote(selectedLote.id)}
                              className="px-3 py-1 border border-crm-border rounded-md text-crm-text-secondary hover:text-crm-primary hover:border-crm-primary transition-colors flex items-center gap-1"
                            >
                              <RefreshCcw className="w-3.5 h-3.5" />
                              Reubicar
                            </button>
                            <button
                              onClick={() => handleRemoveLotePin(selectedLote.id)}
                              className="px-3 py-1 text-red-600 border border-transparent rounded-md hover:text-red-700 hover:border-red-300 transition-colors"
                              disabled={savingLotePolygon}
                            >
                              Quitar ubicación
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-[11px] text-crm-text-muted">
                            Este lote aún no se ha ubicado. Puedes comenzar a dibujarlo ahora mismo.
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <button
                              onClick={() => handleStartDrawingLote(selectedLote.id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                              Dibujar ahora
                            </button>
                            <button
                              onClick={() => handleDeleteLote(selectedLote.id)}
                              disabled={deletingLoteId === selectedLote.id}
                              className="px-3 py-1 border border-transparent rounded-md text-red-600 hover:text-red-700 hover:border-red-300 transition-colors disabled:opacity-60 flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className={`flex-1 relative ${isFullScreen ? 'fixed inset-0 z-40 bg-white' : ''}`}>
            <Card className={isFullScreen ? 'h-full rounded-none' : 'h-full'}>
              <CardContent className="p-0 h-full">
                <div className={isFullScreen ? 'h-screen' : 'h-[88vh] min-h-[640px]'}>
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
                    loteDrawingActive={Boolean(drawingLoteId)}
                    onLoteDrawingFinished={() => setDrawingLoteId(null)}
                    onLotePolygonComplete={handleLotePolygonComplete}
                    draggingLoteId={draggingLoteId}
                    onPinDrop={handlePinDrop}
                    onMarkerDragEnd={handleMarkerDragEnd}
                    focusLoteRequest={focusRequest}
                    onFocusHandled={() => setFocusRequest(null)}
                    fullScreenActive={isFullScreen}
                    onToggleFull={() => setIsFullScreen(!isFullScreen)}
                  />
                </div>
              </CardContent>
            </Card>
            {/* Solo mostrar botón de toggle en Paso 3 */}
            {!isFullScreen && currentStep === 3 && (
              <button
                type="button"
                onClick={toggleDrawer}
                className="absolute top-4 left-4 z-50 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/90 shadow-md border border-crm-border text-xs font-semibold text-crm-text-primary hover:bg-white"
              >
                {drawerOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                <span className="hidden sm:inline">{drawerOpen ? 'Ocultar lista' : 'Mostrar lista'}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Panel Lateral */}
          <div className="xl:col-span-1 space-y-6">
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
                      <li>Usa el <strong>buscador del mapa</strong> para encontrar la ubicación (ej: &quot;Huaral, Lima&quot;)</li>
                      <li>Haz clic en <strong>&quot;✏️ Dibujar área del proyecto&quot;</strong></li>
                      <li>Haz clic en el mapa para marcar cada <strong>vértice del área</strong></li>
                      <li>Haz clic en el <strong>primer punto</strong> para cerrar el polígono</li>
                      <li>Arrastra los vértices para ajustar si es necesario</li>
                      <li>Haz clic en <strong>&quot;Guardar ubicación&quot;</strong> para continuar</li>
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

                  {/* Botón para saltar al Paso 2 */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-2 text-gray-500">o</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      // Si hay coordenadas del proyecto pero no hay bounds, crear bounds aproximados
                      if (proyectoLatitud != null && proyectoLongitud != null && !overlayBounds) {
                        // Crear un área aproximada de 500m alrededor de las coordenadas
                        const offset = 0.0045; // Aproximadamente 500m
                        const bounds: [[number, number], [number, number]] = [
                          [proyectoLatitud - offset, proyectoLongitud - offset],
                          [proyectoLatitud + offset, proyectoLongitud + offset]
                        ];
                        setOverlayBounds(bounds);
                      }
                      setCurrentStep(2);
                    }}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    🗺️ Saltar al Paso 2 (Cargar Plano)
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    Si prefieres, ve directo a cargar el plano sin dibujar el área del proyecto
                  </p>

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
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                        <p className="text-green-800 font-medium mb-1">✓ Plano cargado</p>
                        <p className="text-xs text-green-700">
                          💡 Arrastra las <strong>esquinas verdes</strong> del plano para ajustar su tamaño y posición
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-crm-text-primary mb-2 block">Opacidad del plano</label>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={overlayOpacity}
                            onChange={(e) => {
                              setOverlayOpacity(parseFloat(e.target.value));
                              setOverlayDirty(true);
                            }}
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

          </div>
          <div className={`xl:col-span-4 relative ${isFullScreen ? 'fixed inset-0 z-40 bg-white' : ''}`}>
            <Card className={isFullScreen ? 'h-full rounded-none' : 'h-full'}>
              <CardContent className="p-0 h-full">
                <div className={isFullScreen ? 'h-screen' : 'h-[88vh] min-h-[640px]'}>
                  <GoogleMap
                    defaultCenter={mapCenter}
                    defaultZoom={mapZoom}
                    planosUrl={planUrl}
                    overlayBounds={overlayBounds}
                    overlayOpacity={overlayOpacity}
                    rotationDeg={overlayRotation}
                    overlayEditable={currentStep === 2}
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
                    loteDrawingActive={Boolean(drawingLoteId)}
                    onLoteDrawingFinished={() => setDrawingLoteId(null)}
                    onLotePolygonComplete={handleLotePolygonComplete}
                    draggingLoteId={draggingLoteId}
                    onPinDrop={handlePinDrop}
                    onMarkerDragEnd={handleMarkerDragEnd}
                    focusLoteRequest={focusRequest}
                    onFocusHandled={() => setFocusRequest(null)}
                    fullScreenActive={isFullScreen}
                    onToggleFull={() => setIsFullScreen(!isFullScreen)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
