'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Check,
  MapPin,
  Search,
  RefreshCcw,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  Eye,
  EyeOff,
  Star,
  Loader2,
  Plus,
} from 'lucide-react';
import BlueprintUploader from '@/components/BlueprintUploader';
import { toast } from 'sonner';
import {
  guardarOverlayLayers,
  guardarOverlayBounds,
  guardarPoligonoLote,
  eliminarLote,
} from './_actions';
import type { OverlayLayerConfig } from '@/types/overlay-layers';

interface _LatLngLiteral {
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
  initialOverlayLayers?: OverlayLayerConfig[] | null;
  lotes?: LoteState[];
}

const GoogleMap = dynamic(() => import('./GoogleMap'), { ssr: false });

const DEFAULT_CENTER: [number, number] = [-12.0464, -77.0428];
const DEFAULT_ZOOM = 17;

type BoundsTuple =
  | [[number, number], [number, number]]
  | [[number, number], [number, number], [number, number], [number, number]];

const generateLayerId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `overlay-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const normalizeLayer = (layer: OverlayLayerConfig, index: number): OverlayLayerConfig => ({
  id: layer.id ?? generateLayerId(),
  name: layer.name ?? `Capa ${index + 1}`,
  url: layer.url ?? null,
  bounds: layer.bounds ?? null,
  opacity: typeof layer.opacity === 'number' ? layer.opacity : 0.7,
  visible: typeof layer.visible === 'boolean' ? layer.visible : true,
  isPrimary: typeof layer.isPrimary === 'boolean' ? layer.isPrimary : index === 0,
  order: typeof layer.order === 'number' ? layer.order : index,
});

const buildInitialLayers = (
  layers: OverlayLayerConfig[] | null | undefined,
  fallbackUrl: string | null,
  fallbackBounds: BoundsTuple | null | undefined,
  fallbackOpacity: number | null | undefined
) => {
  if (layers && layers.length) {
    return layers.filter(layer => layer.url).map((layer, index) => normalizeLayer(layer, index));
  }
  if (fallbackUrl) {
    return [
      normalizeLayer(
        {
          id: 'layer-default',
          name: 'Plano principal',
          url: fallbackUrl,
          bounds: fallbackBounds ?? null,
          opacity: fallbackOpacity ?? 0.7,
          visible: true,
          isPrimary: true,
          order: 0,
        },
        0
      ),
    ];
  }
  return [];
};

const boundsToPolygon = (bounds?: BoundsTuple | null) => {
  if (!bounds) return [];
  if (bounds.length === 4) {
    return bounds.map(([lat, lng]) => ({ lat, lng }));
  }
  const [[swLat, swLng], [neLat, neLng]] = bounds;
  return [
    { lat: neLat, lng: swLng },
    { lat: neLat, lng: neLng },
    { lat: swLat, lng: neLng },
    { lat: swLat, lng: swLng },
  ];
};

const boundsToBoundingBox = (bounds?: BoundsTuple | null) => {
  if (!bounds) return null;
  if (bounds.length === 2) return bounds as [[number, number], [number, number]];
  const lats = bounds.map(point => point[0]);
  const lngs = bounds.map(point => point[1]);
  const sw: [number, number] = [Math.min(...lats), Math.min(...lngs)];
  const ne: [number, number] = [Math.max(...lats), Math.max(...lngs)];
  return [sw, ne] as [[number, number], [number, number]];
};

const polygonToBounds = (polygon: { lat: number; lng: number }[]) => {
  if (!polygon.length) return null;
  const lats = polygon.map(p => p.lat);
  const lngs = polygon.map(p => p.lng);
  const sw: [number, number] = [Math.min(...lats), Math.min(...lngs)];
  const ne: [number, number] = [Math.max(...lats), Math.max(...lngs)];
  return [
    [ne[0], sw[1]],
    [ne[0], ne[1]],
    [sw[0], ne[1]],
    [sw[0], sw[1]],
  ] as [[number, number], [number, number], [number, number], [number, number]];
};

const rotateBoundsByDegrees = (
  bounds: BoundsTuple,
  deltaDegrees: number
): [[number, number], [number, number], [number, number], [number, number]] | null => {
  if (!bounds) return null;
  const polygon = boundsToPolygon(bounds);
  if (polygon.length < 4) return null;
  const center = polygon.reduce(
    (acc, point) => ({
      lat: acc.lat + point.lat / polygon.length,
      lng: acc.lng + point.lng / polygon.length,
    }),
    { lat: 0, lng: 0 }
  );
  const radians = (deltaDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const rotated = polygon.map((point) => {
    const x = point.lng - center.lng;
    const y = point.lat - center.lat;
    const rotatedX = x * cos - y * sin;
    const rotatedY = x * sin + y * cos;
    return { lat: rotatedY + center.lat, lng: rotatedX + center.lng };
  });
  return rotated.map((point) => [point.lat, point.lng]) as [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ];
};

const estimateRotationFromBounds = (bounds?: BoundsTuple | null) => {
  if (!bounds) return 0;
  const polygon = boundsToPolygon(bounds);
  if (polygon.length < 2) return 0;
  const [p0, p1] = polygon;
  const dx = p1.lng - p0.lng;
  const dy = p1.lat - p0.lat;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return Number.isFinite(angle) ? Math.round(angle * 10) / 10 : 0;
};

export default function MapeoLotesMejorado({
  proyectoId,
  planosUrl,
  proyectoNombre,
  proyectoLatitud,
  proyectoLongitud,
  initialBounds,
  initialRotation: _initialRotation,
  initialOpacity,
  initialOverlayLayers,
  lotes = [],
}: MapeoLotesMejoradoProps) {
  const computeInitialLayers = () =>
    buildInitialLayers(initialOverlayLayers, planosUrl, initialBounds, initialOpacity);

  const [overlayLayers, setOverlayLayers] = useState<OverlayLayerConfig[]>(() => computeInitialLayers());

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(() => {
    const initialList = computeInitialLayers();
    const hasBounds =
      initialList.some((layer) => layer.bounds && boundsToBoundingBox(layer.bounds)) || Boolean(initialBounds);
    if (!hasBounds) return 1;
    const hasPlano = initialList.some((layer) => layer.url) || Boolean(planosUrl);
    return hasPlano ? 3 : 2;
  });

  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(() => {
    const initialList = computeInitialLayers();
    return initialList.find((layer) => layer.isPrimary)?.id ?? initialList[0]?.id ?? null;
  });

  // Estados del área/plano
  const [overlayBounds, setOverlayBounds] = useState<[[number, number], [number, number]] | undefined>(
    initialBounds ?? undefined
  );
  const [areaPolygon, setAreaPolygon] = useState<{ lat: number; lng: number }[]>([]);
  const [isDrawingArea, setIsDrawingArea] = useState(false);
  const [overlayDirty, setOverlayDirty] = useState(false);
  const [currentMapCenter, setCurrentMapCenter] = useState<[number, number] | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isUploadingLayer, setIsUploadingLayer] = useState(false);
  const [uploadingLayerId, setUploadingLayerId] = useState<string | null>(null);
  const [isSavingLayers, setIsSavingLayers] = useState(false);
  const [layerRotations, setLayerRotations] = useState<Record<string, number>>({});

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
    const normalized = computeInitialLayers();
    setOverlayLayers(normalized);
    setOverlayDirty(false);
  }, [initialOverlayLayers, planosUrl, initialBounds, initialOpacity]);

  useEffect(() => {
    if (!overlayLayers.length) {
      if (activeOverlayId !== null) {
        setActiveOverlayId(null);
      }
      return;
    }
    if (!activeOverlayId || !overlayLayers.some((layer) => layer.id === activeOverlayId)) {
      const fallback = overlayLayers.find((layer) => layer.isPrimary) ?? overlayLayers[0];
      setActiveOverlayId(fallback?.id ?? null);
    }
  }, [overlayLayers, activeOverlayId]);

  useEffect(() => {
    setLayerRotations((prev) => {
      const next: Record<string, number> = {};
      overlayLayers.forEach((layer) => {
        if (typeof prev[layer.id] === 'number') {
          next[layer.id] = prev[layer.id];
        } else {
          next[layer.id] = estimateRotationFromBounds(layer.bounds) ?? 0;
        }
      });
      return next;
    });
  }, [overlayLayers]);

  const primaryOverlay = useMemo(
    () => overlayLayers.find((layer) => layer.isPrimary) ?? overlayLayers[0] ?? null,
    [overlayLayers]
  );

  const activeOverlay = useMemo(() => {
    if (!overlayLayers.length) return primaryOverlay ?? null;
    const current = overlayLayers.find((layer) => layer.id === activeOverlayId);
    return current ?? primaryOverlay ?? overlayLayers[0] ?? null;
  }, [overlayLayers, activeOverlayId, primaryOverlay]);

  const planUrl = activeOverlay?.url ?? null;
  const resolvedOverlayBounds = useMemo(() => activeOverlay?.bounds ?? overlayBounds ?? null, [activeOverlay, overlayBounds]);
  const dropBounds = useMemo(
    () => boundsToBoundingBox(primaryOverlay?.bounds ?? overlayBounds ?? null),
    [primaryOverlay, overlayBounds]
  );
  const sortedOverlayLayers = useMemo(
    () =>
      [...overlayLayers].sort(
        (a, b) => (a.order ?? overlayLayers.indexOf(a)) - (b.order ?? overlayLayers.indexOf(b))
      ),
    [overlayLayers]
  );

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
    const bounding = boundsToBoundingBox(resolvedOverlayBounds);
    if (bounding) {
      const [[swLat, swLng], [neLat, neLng]] = bounding;
      return [(swLat + neLat) / 2, (swLng + neLng) / 2] as [number, number];
    }

    if (proyectoLatitud != null && proyectoLongitud != null) {
      return [proyectoLatitud, proyectoLongitud] as [number, number];
    }

    return DEFAULT_CENTER;
  }, [resolvedOverlayBounds, proyectoLatitud, proyectoLongitud]);

  const mapZoom = useMemo(() => {
    const bounding = boundsToBoundingBox(resolvedOverlayBounds);
    if (bounding) {
      const [[swLat, swLng], [neLat, neLng]] = bounding;
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
  }, [resolvedOverlayBounds]);

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

  const handleRedrawProjectArea = () => {
    setAreaPolygon([]);
    setOverlayBounds(undefined);
    setOverlayDirty(true);
    setCurrentStep(1);
    handleStartDrawingPolygon();
  };

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

  const handleAddLayer = () => {
    const fallbackBounds = primaryOverlay?.bounds ?? dropBounds ?? overlayBounds ?? null;
    const maxOrder = overlayLayers.reduce(
      (max, layer, index) => Math.max(max, typeof layer.order === 'number' ? layer.order : index),
      -1
    );
    const nextOrder = maxOrder + 1;
    const newLayer: OverlayLayerConfig = {
      id: generateLayerId(),
      name: `Capa ${overlayLayers.length + 1}`,
      url: null,
      bounds: fallbackBounds,
      opacity: 0.7,
      visible: true,
      isPrimary: overlayLayers.length === 0,
      order: nextOrder,
    };
    setOverlayLayers((prev) => [...prev, newLayer]);
    setActiveOverlayId(newLayer.id);
    setOverlayDirty(true);
  };

  const handleLayerNameChange = (layerId: string, value: string) => {
    setOverlayLayers((prev) =>
      prev.map((layer) => (layer.id === layerId ? { ...layer, name: value.slice(0, 80) } : layer))
    );
    setOverlayDirty(true);
  };

  const handleUploadLayer = async (layerId: string, file: File) => {
    if (!file) return;
    if (!dropBounds) {
      toast.error('Primero define el área del proyecto (Paso 1)');
      return;
    }

    setIsUploadingLayer(true);
    setUploadingLayerId(layerId);
    try {
      const formData = new FormData();
      formData.append('planos', file);
      formData.append('proyectoId', proyectoId);

      const response = await fetch('/api/proyectos/upload-overlay-layer', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data?.url) {
        throw new Error(data?.error || 'No se pudo subir la capa');
      }

      setOverlayLayers((prev) =>
        prev.map((layer) => (layer.id === layerId ? { ...layer, url: data.url } : layer))
      );
      setOverlayDirty(true);
      toast.success('Imagen de capa actualizada');
      setCurrentStep(3);
    } catch (error) {
      console.error('Error al subir capa:', error);
      toast.error(error instanceof Error ? error.message : 'Error subiendo capa');
    } finally {
      setIsUploadingLayer(false);
      setUploadingLayerId(null);
    }
  };

  const handleClearLayerImage = (layerId: string) => {
    setOverlayLayers((prev) => {
      const next = prev.map((layer) => (layer.id === layerId ? { ...layer, url: null } : layer));
      if (!next.some((layer) => layer.url)) {
        setCurrentStep(2);
      }
      return next;
    });
    setOverlayDirty(true);
  };

  const handleDeleteLayer = (layerId: string) => {
    const confirmDelete = confirm('¿Eliminar esta capa? Esta acción no se puede deshacer.');
    if (!confirmDelete) return;

    setOverlayLayers((prev) => {
      const filtered = prev.filter((layer) => layer.id !== layerId);
      if (filtered.length === 0) {
        setActiveOverlayId(null);
        setCurrentStep(2);
        return [];
      }
      if (!filtered.some((layer) => layer.isPrimary)) {
        filtered[0] = { ...filtered[0], isPrimary: true };
      }
      if (activeOverlayId === layerId) {
        setActiveOverlayId(filtered[0]?.id ?? null);
      }
      if (!filtered.some((layer) => layer.url)) {
        setCurrentStep(2);
      }
      return filtered;
    });
    setOverlayDirty(true);
  };

  const handleSetPrimaryLayer = (layerId: string) => {
    setOverlayLayers((prev) =>
      prev.map((layer) => ({
        ...layer,
        isPrimary: layer.id === layerId,
      }))
    );
    setActiveOverlayId(layerId);
    setOverlayDirty(true);
  };

  const handleToggleVisibility = (layerId: string) => {
    setOverlayLayers((prev) =>
      prev.map((layer) => (layer.id === layerId ? { ...layer, visible: !(layer.visible === false) } : layer))
    );
    setOverlayDirty(true);
  };

  const handleOpacityChange = (layerId: string, value: number) => {
    setOverlayLayers((prev) =>
      prev.map((layer) => (layer.id === layerId ? { ...layer, opacity: value } : layer))
    );
    setOverlayDirty(true);
  };

  const handleLayerRotationChange = (layerId: string, targetAngle: number) => {
    const layer = overlayLayers.find((l) => l.id === layerId);
    if (!layer) return;
    const sourceBounds = layer.bounds ?? dropBounds ?? overlayBounds ?? null;
    if (!sourceBounds) {
      toast.error('Define el área del proyecto antes de rotar la capa');
      return;
    }
    const currentAngle = layerRotations[layerId] ?? estimateRotationFromBounds(layer.bounds ?? sourceBounds) ?? 0;
    const delta = targetAngle - currentAngle;
    if (Math.abs(delta) < 0.01) return;
    const rotated = rotateBoundsByDegrees(layer.bounds ?? sourceBounds, delta);
    if (!rotated) return;
    setOverlayLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, bounds: rotated } : l))
    );
    const bounding = boundsToBoundingBox(rotated);
    if (bounding) {
      setOverlayBounds(bounding);
    }
    setLayerRotations((prev) => ({ ...prev, [layerId]: targetAngle }));
    setOverlayDirty(true);
  };

  const handleLayerRotationStep = (layerId: string, delta: number) => {
    const current = layerRotations[layerId] ?? 0;
    const next = Math.max(-180, Math.min(180, current + delta));
    handleLayerRotationChange(layerId, next);
  };

  const handleFitLayerToProjectArea = (layerId?: string) => {
    const targetId = layerId ?? activeOverlay?.id ?? null;
    if (!targetId) {
      toast.error('Selecciona una capa para ajustar');
      return;
    }

    const projectQuadrilateral = areaPolygon.length >= 3 ? polygonToBounds(areaPolygon) : null;
    const fallbackBounds =
      projectQuadrilateral ??
      (overlayBounds
        ? (boundsToPolygon(overlayBounds).map((point) => [point.lat, point.lng]) as BoundsTuple)
        : null) ??
      (primaryOverlay?.bounds ?? null);

    if (!fallbackBounds) {
      toast.error('Define el área del proyecto antes de ajustar la capa');
      return;
    }

    setOverlayLayers((prev) =>
      prev.map((layer) =>
        layer.id === targetId
          ? { ...layer, bounds: fallbackBounds }
          : layer
      )
    );
    const bounding = boundsToBoundingBox(fallbackBounds);
    if (bounding) {
      setOverlayBounds(bounding);
    }
    setOverlayDirty(true);
    toast.success('Capa ajustada al área del proyecto');
  };

  const handleOverlayBoundsChange = useCallback(
    (layerId: string, bounds: BoundsTuple) => {
      setOverlayLayers((prev) =>
        prev.map((layer) => (layer.id === layerId ? { ...layer, bounds } : layer))
      );
      const bounding = boundsToBoundingBox(bounds);
      if (bounding) {
        setOverlayBounds(bounding);
      }
      setOverlayDirty(true);
    },
    []
  );

  const handleSaveLayers = async () => {
    if (!overlayLayers.length) {
      toast.error('Agrega al menos una capa antes de guardar');
      return;
    }
    if (!overlayLayers.some((layer) => layer.url)) {
      toast.error('Sube al menos una imagen antes de guardar');
      return;
    }
    setIsSavingLayers(true);
    try {
      await guardarOverlayLayers(proyectoId, overlayLayers);
      toast.success('Capas del plano guardadas');
      setOverlayDirty(false);
      if (currentStep < 3 && overlayLayers.some((layer) => layer.url)) {
        setCurrentStep(3);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar las capas');
    } finally {
      setIsSavingLayers(false);
    }
  };

  const upsertLotePin = useCallback(async (loteId: string, lat: number, lng: number, showToast = true) => {
    if (!dropBounds) {
      toast.error('Define la capa principal antes de ubicar lotes');
      return;
    }

    if (!primaryOverlay?.url) {
      toast.error('Sube una imagen para la capa principal del plano');
      return;
    }

    setSavingLotePolygon(true);
    try {
      const [[swLat, swLng], [neLat, neLng]] = dropBounds;
      const normalizedX = (lng - swLng) / (neLng - swLng);
      const normalizedY = (lat - swLat) / (neLat - swLat);

      const margin = 0.1;
      if (
        normalizedX < -margin ||
        normalizedX > 1 + margin ||
        normalizedY < -margin ||
        normalizedY > 1 + margin
      ) {
        toast.error('⚠️ El lote debe ubicarse DENTRO de los límites de la capa principal.');
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
  }, [proyectoId, dropBounds, primaryOverlay?.url]);

  const handlePinDrop = useCallback(async (loteId: string, lat: number, lng: number) => {
    setSelectedLoteId(loteId);
    setDraggingLoteId(null);
    await upsertLotePin(loteId, lat, lng, true);
  }, [upsertLotePin]);

  const handleMarkerDragEnd = useCallback(async (loteId: string, lat: number, lng: number) => {
    await upsertLotePin(loteId, lat, lng, false);
  }, [upsertLotePin]);

  const _handleLoteDragStart = useCallback((event: DragEvent, loteId: string) => {
    if (!primaryOverlay?.url) {
      toast.error('Primero sube la capa principal del plano');
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
  }, [primaryOverlay?.url]);

  const _handleLoteDragEnd = useCallback(() => {
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

  const _handleLotePolygonComplete = useCallback(async (vertices: [number, number][]) => {
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

  // Computed boolean to avoid TypeScript type narrowing issues
  const isOverlayEditable = currentStep === 2;

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
              <span className="text-sm font-medium">Capas</span>
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
                      ← Gestionar capas
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
                    overlayBounds={resolvedOverlayBounds ?? undefined}
                    overlayLayers={overlayLayers}
                    activeOverlayId={activeOverlay?.id ?? null}
                    overlayEditable={isOverlayEditable}
                    dropAreaBounds={dropBounds ?? null}
                    onOverlayBoundsChange={handleOverlayBoundsChange}
                    onMapCenterChange={setCurrentMapCenter}
                    projectPolygon={areaPolygon}
                    onProjectPolygonChange={handlePolygonChange}
                    projectDrawingActive={isDrawingArea}
                    onProjectDrawingFinished={handleProjectDrawingFinished}
                    lotes={lotesState}
                    highlightLoteId={selectedLoteId}
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
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                        <p className="font-medium">✓ Área dibujada ({areaPolygon.length} vértices)</p>
                        <p className="text-xs mt-1">Arrastra los vértices para ajustar el área</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRedrawProjectArea}
                        className="w-full px-4 py-2 border border-orange-200 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors"
                      >
                        ↺ Volver a dibujar el área
                      </button>
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
                      if (proyectoLatitud != null && proyectoLongitud != null && !overlayBounds) {
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
                    🗺️ Continuar al Paso 2 (Configurar capas)
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    También puedes configurar las capas y subir imágenes ahora para definir el plano más tarde.
                  </p>

                  {overlayDirty && areaPolygon.length >= 3 && (
                    <p className="text-xs text-orange-600 text-center">Área definida • Guarda para continuar</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* PASO 2: Capas del Plano */}
            {currentStep === 2 && (
              <Card>
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Layers className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-crm-text-primary">Paso 2: Capas del plano</h3>
                      <p className="text-xs text-crm-text-muted">
                        Crea varias capas, controla su visibilidad y marca cuál será la principal.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
                    <p className="text-green-800 font-medium">✓ Área del proyecto definida</p>
                    <p className="text-xs text-green-700 mt-1">
                      La capa principal usa esta área como zona de drop para los lotes.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-crm-text-primary">Capas disponibles</p>
                        <p className="text-xs text-crm-text-muted">
                          Activa una capa para editarla, subir imagen o marcarla como principal.
                        </p>
                      </div>
                      <button
                        onClick={handleAddLayer}
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Agregar capa
                      </button>
                    </div>

                    {sortedOverlayLayers.length === 0 ? (
                      <div className="p-4 border border-dashed border-crm-border rounded-lg text-sm text-crm-text-secondary text-center bg-crm-card">
                        Aún no hay capas configuradas. Agrega la primera para subir la imagen inicial del plano.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sortedOverlayLayers.map((layer) => {
                          const isActive = layer.id === activeOverlay?.id;
                          const isPrimaryLayer = layer.isPrimary;
                          const opacityValue = typeof layer.opacity === 'number' ? layer.opacity : 0.7;
                          const inputId = `upload-${layer.id}`;
                          const canRotate = Boolean(layer.bounds ?? dropBounds ?? overlayBounds);
                          return (
                            <div
                              key={layer.id}
                              className={`rounded-xl border p-4 space-y-3 transition-colors ${
                                isActive ? 'border-blue-400 bg-blue-50/40' : 'border-crm-border bg-white'
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex-1 min-w-[160px] space-y-2">
                                  <input
                                    value={layer.name ?? ''}
                                    onChange={(e) => handleLayerNameChange(layer.id, e.target.value)}
                                    className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Nombre de la capa"
                                  />
                                  <div className="text-[11px] text-crm-text-muted">
                                    {layer.url ? 'Imagen cargada' : 'Sin imagen asignada'}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimaryLayer(layer.id)}
                                    title="Marcar como capa principal"
                                    className={`p-2 rounded-full border transition-colors ${
                                      isPrimaryLayer
                                        ? 'border-yellow-400 text-yellow-500 bg-yellow-50'
                                        : 'border-crm-border text-crm-text-secondary hover:text-yellow-500'
                                    }`}
                                  >
                                    <Star className="w-4 h-4" fill={isPrimaryLayer ? 'currentColor' : 'none'} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleVisibility(layer.id)}
                                    title={layer.visible === false ? 'Mostrar capa' : 'Ocultar capa'}
                                    className="p-2 rounded-full border border-crm-border text-crm-text-secondary hover:text-crm-primary transition-colors"
                                  >
                                    {layer.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLayer(layer.id)}
                                    title="Eliminar capa"
                                    className="p-2 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setActiveOverlayId(layer.id)}
                                  className={`px-3 py-1 rounded-md border ${
                                    isActive
                                      ? 'border-blue-500 bg-blue-100 text-blue-700'
                                      : 'border-crm-border text-crm-text-secondary hover:border-blue-400'
                                  }`}
                                >
                                  {isActive ? 'Capa activa' : 'Activar capa'}
                                </button>
                                <label
                                  htmlFor={inputId}
                                  className="px-3 py-1 rounded-md border border-crm-border text-crm-text-secondary cursor-pointer hover:border-blue-400 flex items-center gap-2"
                                >
                                  {uploadingLayerId === layer.id && isUploadingLayer ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Subiendo...
                                    </>
                                  ) : (
                                    <>Subir imagen</>
                                  )}
                                </label>
                                <input
                                  id={inputId}
                                  type="file"
                                  className="hidden"
                                  accept="image/jpeg,image/png,image/webp"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      void handleUploadLayer(layer.id, file);
                                    }
                                    e.target.value = '';
                                  }}
                                />
                                {layer.url && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearLayerImage(layer.id)}
                                    className="px-3 py-1 rounded-md border border-red-200 text-red-500 hover:bg-red-50"
                                  >
                                    Quitar imagen
                                  </button>
                                )}
                                <span className="text-crm-text-muted">
                                  {isPrimaryLayer ? 'Principal' : 'Secundaria'}
                                </span>
                              </div>

                              <div>
                                <label className="text-xs font-medium text-crm-text-primary mb-2 block">
                                  Opacidad ({Math.round(opacityValue * 100)}%)
                                </label>
                                <input
                                  type="range"
                                  min={0.1}
                                  max={1}
                                  step={0.05}
                                  value={opacityValue}
                                  onChange={(e) => handleOpacityChange(layer.id, parseFloat(e.target.value))}
                                  className="w-full"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-crm-text-primary mb-2 block">
                                  Rotación ({Math.round(layerRotations[layer.id] ?? 0)}°)
                                </label>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleLayerRotationStep(layer.id, -5)}
                                    disabled={!canRotate}
                                    className={`px-2 py-1 text-xs border rounded-md ${
                                      canRotate
                                        ? 'border-crm-border hover:border-blue-400'
                                        : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                  >
                                    -5°
                                  </button>
                                  <input
                                    type="range"
                                    min={-180}
                                    max={180}
                                    step={1}
                                    value={layerRotations[layer.id] ?? 0}
                                    onChange={(e) => handleLayerRotationChange(layer.id, parseFloat(e.target.value))}
                                    disabled={!canRotate}
                                    className={`flex-1 ${
                                      canRotate ? '' : 'opacity-50 cursor-not-allowed'
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleLayerRotationStep(layer.id, 5)}
                                    disabled={!canRotate}
                                    className={`px-2 py-1 text-xs border rounded-md ${
                                      canRotate
                                        ? 'border-crm-border hover:border-blue-400'
                                        : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                  >
                                    +5°
                                  </button>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleFitLayerToProjectArea(layer.id)}
                                className="w-full px-3 py-2 rounded-lg text-sm font-medium border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                ↘ Ajustar al área del proyecto
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {activeOverlay ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-crm-text-primary">
                        Imagen de la capa activa:{' '}
                        <span className="text-crm-text-secondary">{activeOverlay.name ?? 'Sin nombre'}</span>
                      </p>
                      <BlueprintUploader
                        key={activeOverlay.id}
                        onFileSelect={(file) => void handleUploadLayer(activeOverlay.id, file)}
                        isUploading={isUploadingLayer && uploadingLayerId === activeOverlay.id}
                        currentFile={activeOverlay.url}
                        onDelete={() => handleClearLayerImage(activeOverlay.id)}
                        acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                        maxSize={10}
                      />
                    </div>
                  ) : (
                    <div className="p-4 border border-dashed border-crm-border rounded-lg text-sm text-crm-text-secondary text-center">
                      Agrega tu primera capa para comenzar a subir imágenes del plano.
                    </div>
                  )}

                  {overlayDirty && (
                    <p className="text-xs text-orange-600 text-center">
                      Hay cambios sin guardar en la configuración de capas.
                    </p>
                  )}

                  <button
                    onClick={handleSaveLayers}
                    disabled={isSavingLayers || !overlayLayers.length}
                    className={`w-full px-4 py-3 rounded-lg font-semibold text-white transition-colors ${
                      isSavingLayers || !overlayLayers.length
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-crm-primary hover:bg-crm-primary-dark'
                    }`}
                  >
                    {isSavingLayers ? 'Guardando capas...' : '💾 Guardar capas y continuar'}
                  </button>

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
                    overlayBounds={resolvedOverlayBounds ?? undefined}
                    overlayLayers={overlayLayers}
                    activeOverlayId={activeOverlay?.id ?? null}
                    overlayEditable={isOverlayEditable}
                    dropAreaBounds={dropBounds ?? null}
                    onOverlayBoundsChange={handleOverlayBoundsChange}
                    onMapCenterChange={setCurrentMapCenter}
                    projectPolygon={areaPolygon}
                    onProjectPolygonChange={handlePolygonChange}
                    projectDrawingActive={isDrawingArea}
                    onProjectDrawingFinished={handleProjectDrawingFinished}
                    lotes={lotesState}
                    highlightLoteId={selectedLoteId}
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
