'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Upload, MapPin, Trash2, Save, PenLine, Ruler, Layers, Wand2, RefreshCcw } from 'lucide-react';
import BlueprintUploader from '@/components/BlueprintUploader';
import { toast } from 'sonner';
import {
  subirPlanos,
  eliminarPlanos,
  guardarOverlayBounds,
  guardarPoligonoProyecto,
  eliminarPoligonoProyecto,
  guardarPoligonoLote,
} from './_actions';
import { obtenerCoordenadasUbicacion } from '@/lib/geocoding';

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

interface MapeoLotesProps {
  proyectoId: string;
  planosUrl: string | null;
  proyectoNombre: string;
  initialBounds?: [[number, number], [number, number]] | null;
  initialRotation?: number | null;
  initialPolygon?: LatLngLiteral[] | null;
  lotes?: LoteState[];
  ubigeo?: {
    departamento: string;
    provincia: string;
    distrito: string;
  };
}

const GoogleMap = dynamic(() => import('./GoogleMap'), { ssr: false });

const DEFAULT_CENTER: [number, number] = [-12.0464, -77.0428];
const DEFAULT_ZOOM = 17;

const getBoundsFromPolygon = (
  polygon: LatLngLiteral[]
): [[number, number], [number, number]] | undefined => {
  if (!polygon.length) return undefined;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  polygon.forEach(({ lat, lng }) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  });

  if (!Number.isFinite(minLat) || !Number.isFinite(minLng) || !Number.isFinite(maxLat) || !Number.isFinite(maxLng)) {
    return undefined;
  }

  return [[minLat, minLng], [maxLat, maxLng]];
};

const getCentroidFromPolygon = (polygon: LatLngLiteral[]): [number, number] | null => {
  if (polygon.length === 0) return null;
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    const factor = current.lat * next.lng - next.lat * current.lng;
    area += factor;
    cx += (current.lat + next.lat) * factor;
    cy += (current.lng + next.lng) * factor;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-7) {
    const avgLat = polygon.reduce((acc, p) => acc + p.lat, 0) / polygon.length;
    const avgLng = polygon.reduce((acc, p) => acc + p.lng, 0) / polygon.length;
    return [avgLat, avgLng];
  }
  cx = cx / (6 * area);
  cy = cy / (6 * area);
  return [cx, cy];
};

const polygonToTextarea = (polygon: LatLngLiteral[]): string => {
  if (!polygon.length) return '';
  return polygon.map((vertex) => `${vertex.lat.toFixed(6)}, ${vertex.lng.toFixed(6)}`).join('\n');
};

const parsePolygonFromText = (value: string): LatLngLiteral[] => {
  const lines = value
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    throw new Error('Ingresa al menos tres pares lat,lng (uno por línea)');
  }

  const vertices: LatLngLiteral[] = [];

  lines.forEach((line, index) => {
    const withoutIndex = line.replace(/^\d+\.\s*/, '');
    const parts = withoutIndex.split(/\s|,/).filter(Boolean);
    if (parts.length < 2) {
      throw new Error(`Formato inválido en la línea ${index + 1}: "${line}"`);
    }
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`Coordenadas inválidas en la línea ${index + 1}: "${line}"`);
    }
    vertices.push({ lat, lng });
  });

  if (vertices.length < 3) {
    throw new Error('Necesitas al menos 3 vértices para definir el perímetro');
  }

  return vertices;
};

const snapAngle = (deg: number) => {
  const targets = [-180, -135, -90, -45, 0, 45, 90, 135, 180];
  const threshold = 4;
  for (const target of targets) {
    if (Math.abs(deg - target) <= threshold) return target;
  }
  return deg;
};

const obtenerPoligonoLote = (lote: LoteState): [number, number][] | null => {
  if (Array.isArray(lote.plano_poligono) && lote.plano_poligono.length >= 1) {
    return lote.plano_poligono;
  }
  if (!lote.data) return null;
  try {
    const parsed = typeof lote.data === 'string' ? JSON.parse(lote.data) : lote.data;
    if (parsed?.plano_poligono && Array.isArray(parsed.plano_poligono) && parsed.plano_poligono.length >= 1) {
      return parsed.plano_poligono;
    }
  } catch (error) {
    console.warn('No se pudo parsear la data del lote', error);
  }
  return null;
};

const tieneUbicacion = (lote: LoteState) => {
  if (lote.ubicacion && typeof lote.ubicacion.lat === 'number' && typeof lote.ubicacion.lng === 'number') {
    return true;
  }
  const poligono = obtenerPoligonoLote(lote);
  return Boolean(poligono && poligono.length >= 1);
};

const computeOverlayFromPolygon = (polygon: LatLngLiteral[]) => {
  if (polygon.length < 3) return null;

  const latMean = polygon.reduce((sum, p) => sum + p.lat, 0) / polygon.length;
  const lngMean = polygon.reduce((sum, p) => sum + p.lng, 0) / polygon.length;
  const metersPerLat = 110_574; // approximate meters per degree latitude
  const metersPerLng = 111_320 * Math.cos((latMean * Math.PI) / 180);
  if (Math.abs(metersPerLng) < 1e-6) return null;

  const points = polygon.map((p) => ({
    x: (p.lng - lngMean) * metersPerLng,
    y: (p.lat - latMean) * metersPerLat,
  }));

  const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  points.forEach((p) => {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  });

  const covXX = sxx / points.length;
  const covYY = syy / points.length;
  const covXY = sxy / points.length;

  const angle = 0.5 * Math.atan2(2 * covXY, covXX - covYY);
  const sinAngle = Math.sin(angle);
  const cosAngle = Math.cos(angle);

  const rotated = points.map((p) => {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    const rx = dx * cosAngle + dy * sinAngle;
    const ry = -dx * sinAngle + dy * cosAngle;
    return { x: rx, y: ry };
  });

  const minX = Math.min(...rotated.map((p) => p.x));
  const maxX = Math.max(...rotated.map((p) => p.x));
  const minY = Math.min(...rotated.map((p) => p.y));
  const maxY = Math.max(...rotated.map((p) => p.y));

  const width = maxX - minX;
  const height = maxY - minY;
  if (width <= 0 || height <= 0) return null;

  const cxPrime = (maxX + minX) / 2;
  const cyPrime = (maxY + minY) / 2;

  const centerX = cxPrime * cosAngle - cyPrime * sinAngle + meanX;
  const centerY = cxPrime * sinAngle + cyPrime * cosAngle + meanY;

  const centerLat = centerY / metersPerLat + latMean;
  const centerLng = centerX / metersPerLng + lngMean;

  const halfLat = (height / metersPerLat) / 2;
  const halfLng = (width / metersPerLng) / 2;

  const bounds: [[number, number], [number, number]] = [
    [centerLat - halfLat, centerLng - halfLng],
    [centerLat + halfLat, centerLng + halfLng],
  ];

  const rotationDeg = (angle * 180) / Math.PI;

  return { bounds, rotationDeg };
};

export default function MapeoLotes({
  proyectoId,
  planosUrl,
  proyectoNombre,
  initialBounds,
  initialRotation,
  initialPolygon,
  lotes = [],
  ubigeo,
}: MapeoLotesProps) {
  const [planUrl, setPlanUrl] = useState<string | null>(planosUrl);
  const [isUploading, setIsUploading] = useState(false);

  const [projectPolygon, setProjectPolygon] = useState<LatLngLiteral[]>(initialPolygon ?? []);
  const [projectPolygonDirty, setProjectPolygonDirty] = useState(false);
  const [drawingProject, setDrawingProject] = useState(false);
  const [manualPolygonOpen, setManualPolygonOpen] = useState(false);
  const [manualPolygonValue, setManualPolygonValue] = useState(polygonToTextarea(initialPolygon ?? []));

  const [overlayBounds, setOverlayBounds] = useState<[[number, number], [number, number]] | undefined>(
    initialBounds ?? undefined
  );
  const [overlayRotation, setOverlayRotation] = useState<number>(initialRotation ?? 0);
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  const [overlayEditable, setOverlayEditable] = useState(false);
  const [overlayDirty, setOverlayDirty] = useState(false);

  const [lotesState, setLotesState] = useState<LoteState[]>(lotes);
  const [centerOverride, setCenterOverride] = useState<[number, number] | null>(null);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [loteDrawing, setLoteDrawing] = useState(false);
  const [savingLotePolygon, setSavingLotePolygon] = useState(false);
  const [mapFullScreen, setMapFullScreen] = useState(false);
  const [draggingLoteId, setDraggingLoteId] = useState<string | null>(null);

  useEffect(() => {
    if (!overlayBounds && typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(`mapeo:${proyectoId}:overlay`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as {
            bounds?: [[number, number], [number, number]];
            rotation?: number;
          };
          if (parsed.bounds && parsed.bounds.length === 2) {
            setOverlayBounds(parsed.bounds);
          }
          if (typeof parsed.rotation === 'number') {
            setOverlayRotation(parsed.rotation);
          }
        } catch (error) {
          console.warn('No se pudo restaurar overlay desde storage local:', error);
        }
      }
    }
  }, [overlayBounds, proyectoId]);

  useEffect(() => {
    if (overlayBounds && typeof window !== 'undefined') {
      const payload = JSON.stringify({ bounds: overlayBounds, rotation: overlayRotation });
      window.localStorage.setItem(`mapeo:${proyectoId}:overlay`, payload);
    }
  }, [overlayBounds, overlayRotation, proyectoId]);

  useEffect(() => {
    if (!planUrl && typeof window !== 'undefined') {
      const storedPlan = window.localStorage.getItem(`mapeo:${proyectoId}:plan-url`);
      if (storedPlan) {
        setPlanUrl(storedPlan);
      }
    }
  }, [planUrl, proyectoId]);

  useEffect(() => {
    if (!planUrl || typeof window === 'undefined') return;
    window.localStorage.setItem(`mapeo:${proyectoId}:plan-url`, planUrl);
  }, [planUrl, proyectoId]);

  useEffect(() => {
    setPlanUrl(planosUrl);
  }, [planosUrl]);

  useEffect(() => {
    setLotesState(lotes);
  }, [lotes]);

  useEffect(() => {
    if (initialPolygon && initialPolygon.length >= 3) {
      setProjectPolygon(initialPolygon);
      setProjectPolygonDirty(false);
      setManualPolygonValue(polygonToTextarea(initialPolygon));
    }
  }, [initialPolygon]);

  useEffect(() => {
    if (initialBounds) {
      setOverlayBounds(initialBounds);
      setOverlayDirty(false);
    }
  }, [initialBounds]);

  useEffect(() => {
    if (typeof initialRotation === 'number') {
      setOverlayRotation(initialRotation);
      setOverlayDirty(false);
    }
  }, [initialRotation]);

  useEffect(() => {
    if (manualPolygonOpen) return;
    setManualPolygonValue(polygonToTextarea(projectPolygon));
  }, [projectPolygon, manualPolygonOpen]);

  useEffect(() => {
    if (!ubigeo || !ubigeo.departamento || !ubigeo.provincia || !ubigeo.distrito) return;
    obtenerCoordenadasUbicacion(ubigeo.departamento, ubigeo.provincia, ubigeo.distrito)
      .then((coords) => {
        if (coords) {
          setCenterOverride([coords.lat, coords.lng]);
        }
      })
      .catch((error) => {
        console.error('Error obteniendo coordenadas del ubigeo:', error);
      });
  }, [ubigeo]);

  useEffect(() => {
    if (!mapFullScreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mapFullScreen]);

  useEffect(() => {
    if (!overlayBounds && projectPolygon.length >= 3) {
      const bounds = getBoundsFromPolygon(projectPolygon);
      if (bounds) setOverlayBounds(bounds);
    }
  }, [projectPolygon, overlayBounds]);

const stats = useMemo(() => {
  const disponibles = lotesState.filter((l) => l.estado === 'disponible').length;
  const reservados = lotesState.filter((l) => l.estado === 'reservado').length;
  const vendidos = lotesState.filter((l) => l.estado === 'vendido').length;
  const conPlano = lotesState.filter((l) => tieneUbicacion(l)).length;
  return {
    total: lotesState.length,
    disponibles,
    reservados,
    vendidos,
      conPlano,
    };
  }, [lotesState]);

  const lotesSinPoligono = useMemo(
    () => lotesState.filter((lote) => !tieneUbicacion(lote)),
    [lotesState]
  );

  const lotesConPoligono = useMemo(
    () => lotesState.filter((lote) => tieneUbicacion(lote)),
    [lotesState]
  );

  const selectedLote = useMemo(
    () => lotesState.find((lote) => lote.id === selectedLoteId) ?? null,
    [lotesState, selectedLoteId]
  );

  const selectedLoteData = useMemo<Record<string, unknown> | null>(() => {
    if (!selectedLote?.data) return null;
    if (typeof selectedLote.data === 'string') {
      try {
        return JSON.parse(selectedLote.data);
      } catch (error) {
        console.warn('No se pudo parsear la data del lote seleccionado', error);
        return null;
      }
    }
    if (typeof selectedLote.data === 'object') {
      return selectedLote.data as Record<string, unknown>;
    }
    return null;
  }, [selectedLote]);

  const selectedLoteSup = useMemo(() => {
    const sup = selectedLoteData && (selectedLoteData as { sup_m2?: unknown }).sup_m2;
    return typeof sup === 'number' ? sup : null;
  }, [selectedLoteData]);

  const mapCenter = useMemo(() => {
    if (centerOverride) return centerOverride;
    if (overlayBounds) {
      const [[swLat, swLng], [neLat, neLng]] = overlayBounds;
      return [
        (swLat + neLat) / 2,
        (swLng + neLng) / 2,
      ] as [number, number];
    }
    if (projectPolygon.length >= 3) {
      const centroid = getCentroidFromPolygon(projectPolygon);
      if (centroid) return centroid;
    }
    return DEFAULT_CENTER;
  }, [centerOverride, overlayBounds, projectPolygon]);

  const mapZoom = useMemo(() => {
    if (centerOverride) return 15;
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
    if (projectPolygon.length >= 3) return 17;
    return DEFAULT_ZOOM;
  }, [centerOverride, overlayBounds, projectPolygon]);

  const handleUploadPlano = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('planos', file);

    try {
      const response = (await subirPlanos(proyectoId, formData)) as unknown as { success: boolean; url?: string };
      if (response?.url) {
        setPlanUrl(response.url);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(`mapeo:${proyectoId}:plan-url`, response.url);
        }
        toast.success('Plano subido correctamente');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error subiendo plano');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePlano = async () => {
    if (!planUrl) return;
    if (!confirm('¿Seguro que deseas eliminar el plano?')) return;
    try {
      await eliminarPlanos(proyectoId);
      setPlanUrl(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(`mapeo:${proyectoId}:plan-url`);
      }
      toast.success('Plano eliminado correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el plano');
    }
  };

  const handleProjectPolygonChange = (vertices: LatLngLiteral[]) => {
    setProjectPolygon(vertices);
    setProjectPolygonDirty(true);
  };

  const handleManualPolygonApply = () => {
    try {
      const parsed = parsePolygonFromText(manualPolygonValue);
      setProjectPolygon(parsed);
      setProjectPolygonDirty(true);
      toast.success(`Polígono actualizado con ${parsed.length} vértices`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Formato de coordenadas inválido');
    }
  };

  const handleSaveProjectPolygon = async () => {
    if (projectPolygon.length < 3) {
      toast.error('Dibuja el perímetro antes de guardarlo');
      return;
    }
    try {
      await guardarPoligonoProyecto(proyectoId, projectPolygon);
      toast.success('Perímetro del proyecto guardado');
      setProjectPolygonDirty(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el perímetro');
    }
  };

  const handleRemoveProjectPolygon = async () => {
    if (!projectPolygon.length) return;
    if (!confirm('Esto eliminará el perímetro actual. ¿Deseas continuar?')) return;
    try {
      await eliminarPoligonoProyecto(proyectoId);
      setProjectPolygon([]);
      setProjectPolygonDirty(false);
      toast.success('Perímetro eliminado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el perímetro');
    }
  };

  const handleOverlayBoundsChange = (bounds: [[number, number], [number, number]]) => {
    setOverlayBounds(bounds);
    setOverlayDirty(true);
  };

  const handleApplyPolygonBoundsToOverlay = () => {
    const bounds = getBoundsFromPolygon(projectPolygon);
    if (!bounds) {
      toast.error('Primero define el perímetro del proyecto');
      return;
    }
    const oriented = computeOverlayFromPolygon(projectPolygon);
    if (oriented) {
      setOverlayBounds(oriented.bounds);
      setOverlayRotation(snapAngle(oriented.rotationDeg));
    } else {
      setOverlayBounds(bounds);
    }
    setOverlayDirty(true);
    toast.success('El plano se ajustó al perímetro dibujado');
  };

  const handleSaveOverlay = async () => {
    if (!overlayBounds) {
      toast.error('Ajusta las esquinas del plano antes de guardar');
      return;
    }
    try {
      await guardarOverlayBounds(proyectoId, overlayBounds, Math.round(overlayRotation));
      toast.success('Ajuste del plano guardado');
      setOverlayDirty(false);
      setOverlayEditable(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el ajuste del plano');
    }
  };

  const handleStartLoteDrawing = () => {
    if (!selectedLoteId) {
      toast.error('Selecciona un lote para dibujar');
      return;
    }
    if (!planUrl) {
      toast.error('Sube el plano del proyecto antes de ubicar lotes');
      return;
    }
    setLoteDrawing(true);
    toast.info('Modo dibujo activo', {
      description: 'Haz clic en el plano para marcar los vértices del lote',
    });
  };

  const handleLotePolygonComplete = async (vertices: [number, number][]) => {
    if (!selectedLoteId) {
      toast.error('Selecciona un lote antes de dibujar');
      return;
    }
    if (vertices.length < 3) {
      toast.error('Se necesitan al menos 3 puntos para un lote');
      return;
    }

    setSavingLotePolygon(true);
    try {
      await guardarPoligonoLote(selectedLoteId, proyectoId, vertices);
      setLotesState((prev) =>
        prev.map((lote) =>
          lote.id === selectedLoteId ? { ...lote, plano_poligono: vertices } : lote
        )
      );
      toast.success('Geometría del lote guardada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la geometría del lote');
    } finally {
      setSavingLotePolygon(false);
      setLoteDrawing(false);
    }
  };

  const handleRemoveLotePolygon = async (loteId: string) => {
    if (!confirm('¿Quitar la geometría asignada a este lote?')) return;
    setSavingLotePolygon(true);
    try {
      await guardarPoligonoLote(loteId, proyectoId, []);
      setLotesState((prev) =>
        prev.map((lote) =>
          lote.id === loteId ? { ...lote, plano_poligono: null } : lote
        )
      );
      if (selectedLoteId === loteId) {
        setSelectedLoteId(null);
      }
      toast.success('Se removió la geometría del lote');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo remover la geometría');
    } finally {
      setSavingLotePolygon(false);
      setLoteDrawing(false);
    }
  };

  const upsertLotePin = useCallback(async (loteId: string, lat: number, lng: number, showToast = true) => {
    setSavingLotePolygon(true);
    try {
      const loteActual = lotesState.find((l) => l.id === loteId);
      const poligonoNuevo: [number, number][] = [[lat, lng]];

      await guardarPoligonoLote(loteId, proyectoId, poligonoNuevo);

      const dataExistente = (() => {
        if (!loteActual?.data) return {} as Record<string, unknown>;
        if (typeof loteActual.data === 'string') {
          try {
            return JSON.parse(loteActual.data) as Record<string, unknown>;
          } catch (error) {
            console.warn('No se pudo parsear data existente del lote', error);
            return {} as Record<string, unknown>;
          }
        }
        if (typeof loteActual.data === 'object') {
          return { ...(loteActual.data as Record<string, unknown>) };
        }
        return {} as Record<string, unknown>;
      })();

      const nuevaData = {
        ...dataExistente,
        plano_point: [lat, lng],
        plano_poligono: poligonoNuevo,
      };

      const fd = new FormData();
      fd.append('proyecto_id', proyectoId);
      if (loteActual?.codigo) fd.append('codigo', loteActual.codigo);
      fd.append('estado', loteActual?.estado ?? 'disponible');
      fd.append('data', JSON.stringify(nuevaData));

      await actualizarLote(loteId, fd as any);

      setLotesState((prev) =>
        prev.map((lote) =>
          lote.id === loteId
            ? {
                ...lote,
                plano_poligono: poligonoNuevo,
                ubicacion: { lat, lng },
                data: nuevaData,
              }
            : lote
        )
      );
      if (showToast) toast.success('Ubicación del lote actualizada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la ubicación del lote');
    } finally {
      setSavingLotePolygon(false);
      setLoteDrawing(false);
    }
  }, [lotesState, proyectoId]);

  const handlePinDrop = useCallback(async (loteId: string, lat: number, lng: number) => {
    setSelectedLoteId(loteId);
    setDraggingLoteId(null);
    await upsertLotePin(loteId, lat, lng, true);
  }, [upsertLotePin]);

  const handleMarkerDragEnd = useCallback(async (loteId: string, lat: number, lng: number) => {
    await upsertLotePin(loteId, lat, lng, false);
  }, [upsertLotePin]);

  const handleToggleFullMap = () => {
    setMapFullScreen((prev) => !prev);
  };

  const handleLoteDragStart = useCallback((event: DragEvent, loteId: string) => {
    if (!planUrl) {
      toast.error('Sube el plano para poder ubicar lotes');
      event.preventDefault();
      return;
    }
    setSelectedLoteId(loteId);
    setDraggingLoteId(loteId);
    try {
      event.dataTransfer.setData('application/x-lote-id', loteId);
      event.dataTransfer.setData('text/plain', loteId);
      event.dataTransfer.effectAllowed = 'copyMove';
    } catch (error) {
      console.warn('No se pudo asignar dataTransfer', error);
    }
  }, [planUrl]);

  const handleLoteDragEnd = useCallback(() => {
    setDraggingLoteId(null);
    setSavingLotePolygon(false);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Estado general de lotes en {proyectoNombre}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{stats.disponibles}</div>
              <div className="text-sm text-green-800">Disponibles</div>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.reservados}</div>
              <div className="text-sm text-yellow-800">Reservados</div>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{stats.vendidos}</div>
              <div className="text-sm text-red-800">Vendidos</div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.conPlano}</div>
              <div className="text-sm text-blue-800">Con geometría en plano</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Guía rápida de mapeo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold">1</span>
              <div>
                <p className="font-medium text-gray-800">Dibuja el perímetro</p>
                <p className="text-sm text-gray-600">Marca las esquinas del terreno y ajusta los vértices hasta que coincidan con la geografía real.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold">2</span>
              <div>
                <p className="font-medium text-gray-800">Calibra el plano</p>
                <p className="text-sm text-gray-600">Apoya el plano en el perímetro, regula rotación, escala y opacidad y confirma el ajuste.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold">3</span>
              <div>
                <p className="font-medium text-gray-800">Ubica los lotes</p>
                <p className="text-sm text-gray-600">Selecciona cada lote, dibuja su contorno o coloca el pin y guarda para mantener el estado.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Perímetro del proyecto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant={drawingProject ? 'secondary' : 'outline'}
              onClick={() => setDrawingProject((prev) => !prev)}
            >
              <PenLine className="w-4 h-4 mr-2" />
              {drawingProject ? 'Cancelar dibujo' : 'Dibujar perímetro'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setManualPolygonOpen((prev) => !prev)}
            >
              <Ruler className="w-4 h-4 mr-2" />
              {manualPolygonOpen ? 'Ocultar ingreso manual' : 'Ingresar coordenadas manualmente'}
            </Button>
            <Button
              type="button"
              onClick={handleSaveProjectPolygon}
              disabled={!projectPolygonDirty || projectPolygon.length < 3}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar perímetro
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleRemoveProjectPolygon}
              disabled={!projectPolygon.length}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar perímetro
            </Button>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
            1. Usa la búsqueda para encontrar el proyecto · 2. Presiona el botón Dibujar perímetro y marca los vértices · 3. Ajusta los puntos arrastrándolos · 4. Guarda el perímetro cuando estés conforme.
          </div>

          {manualPolygonOpen && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Coordenadas (lat,lng por línea)</label>
              <textarea
                className="w-full min-h-[140px] border rounded-lg px-3 py-2 text-sm font-mono"
                value={manualPolygonValue}
                onChange={(event) => setManualPolygonValue(event.target.value)}
                placeholder={"-12.046400, -77.042800"}
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={handleManualPolygonApply}>
                  Aplicar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setManualPolygonOpen(false);
                    setManualPolygonValue(polygonToTextarea(projectPolygon));
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Vértices actuales ({projectPolygon.length})</h4>
            <div className="max-h-40 overflow-y-auto border rounded-lg divide-y text-sm">
              {projectPolygon.length === 0 && (
                <div className="p-3 text-gray-500">Sin perímetro definido todavía</div>
              )}
              {projectPolygon.map((vertex, index) => (
                <div key={`${vertex.lat}-${vertex.lng}-${index}`} className="p-3 flex justify-between text-gray-700">
                  <span>V{index + 1}</span>
                  <span className="font-mono">
                    {vertex.lat.toFixed(6)}, {vertex.lng.toFixed(6)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Plano e integración con el mapa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BlueprintUploader
            onFileSelect={handleUploadPlano}
            isUploading={isUploading}
            currentFile={planUrl}
            onDelete={handleDeletePlano}
            acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
            maxSize={10}
          />

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={handleApplyPolygonBoundsToOverlay}>
              <Wand2 className="w-4 h-4 mr-2" />
              Ajustar plano al perímetro
            </Button>
            <Button
              type="button"
              variant={overlayEditable ? 'secondary' : 'outline'}
              onClick={() => setOverlayEditable((prev) => !prev)}
              disabled={!overlayBounds}
            >
              <PenLine className="w-4 h-4 mr-2" />
              {overlayEditable ? 'Terminar ajuste manual' : 'Ajustar manualmente'}
            </Button>
                  <Button
                    type="button"
                    onClick={handleSaveOverlay}
                    disabled={!overlayDirty || !overlayBounds}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Confirmar ajuste
                  </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-600">Opacidad del plano</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={overlayOpacity}
                onChange={(event) => setOverlayOpacity(parseFloat(event.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-500">{Math.round(overlayOpacity * 100)}%</div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-600">Rotación (°)</label>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={overlayRotation}
                onChange={(event) => {
                  const value = parseFloat(event.target.value);
                  setOverlayRotation(snapAngle(value));
                  setOverlayDirty(true);
                }}
                className="w-full"
              />
              <div className="text-xs text-gray-500">{overlayRotation.toFixed(0)}°</div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-600">Estado</label>
              <div className={`text-xs font-medium ${overlayDirty ? 'text-orange-600' : 'text-green-600'}`}>
                {overlayDirty ? 'Hay cambios sin guardar' : 'Cambios guardados'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCcw className="w-5 h-5" />
            Lotes dentro del plano
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-800">Modo A · Dibujo manual</h4>
                <p className="text-sm text-gray-600">
                  Selecciona un lote de la lista, activa el modo dibujo y marca los vértices directamente sobre el plano.
                  Finaliza con doble clic para guardar el polígono.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">Lotes pendientes</span>
                  <span className="text-gray-500">{lotesSinPoligono.length}</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2">
                  {lotesSinPoligono.length === 0 && (
                    <div className="col-span-full text-sm text-gray-500 border border-dashed rounded-lg p-4 text-center bg-gray-50">
                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p>Todos los lotes tienen ubicación asignada</p>
                    </div>
                  )}
                  {lotesSinPoligono.map((lote) => (
                    <button
                      key={lote.id}
                      draggable
                      onClick={() => setSelectedLoteId((current) => (current === lote.id ? null : lote.id))}
                      onDragStart={(event) => handleLoteDragStart(event, lote.id)}
                      onDragEnd={handleLoteDragEnd}
                      className={`group relative px-3 py-2 border rounded-lg text-sm text-left transition-all duration-200 ${
                        draggingLoteId === lote.id
                          ? 'opacity-40 scale-95 border-crm-primary cursor-grabbing shadow-lg'
                          : selectedLoteId === lote.id
                          ? 'border-crm-primary bg-crm-primary/5 shadow-md ring-1 ring-crm-primary/20 cursor-grab'
                          : 'border-gray-200 hover:border-crm-primary/50 hover:bg-crm-primary/5 hover:shadow cursor-grab'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Código del lote */}
                        <div className="font-semibold text-sm text-crm-text-primary">{lote.codigo}</div>

                        {/* Icono de arrastre */}
                        <div className={`flex-shrink-0 transition-opacity duration-200 ${
                          draggingLoteId === lote.id ? 'opacity-100' : 'opacity-20 group-hover:opacity-40'
                        }`}>
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                      </div>

                      {/* Badge de estado compacto */}
                      <div className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        lote.estado === 'disponible' ? 'bg-green-100 text-green-700' :
                        lote.estado === 'reservado' ? 'bg-yellow-100 text-yellow-700' :
                        lote.estado === 'vendido' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {lote.estado === 'disponible' ? '✅' :
                         lote.estado === 'reservado' ? '🔒' :
                         lote.estado === 'vendido' ? '💰' :
                         '⚪'}
                        <span className="ml-0.5">
                          {lote.estado === 'disponible' ? 'Disponible' :
                           lote.estado === 'reservado' ? 'Reservado' :
                           lote.estado === 'vendido' ? 'Vendido' :
                           'Sin estado'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={handleStartLoteDrawing}
                    disabled={!selectedLoteId || loteDrawing || savingLotePolygon}
                  >
                    {loteDrawing ? 'Haz clic en el plano…' : 'Dibujar lote seleccionado'}
                  </Button>
                  {loteDrawing && (
                    <Button type="button" variant="ghost" onClick={() => setLoteDrawing(false)}>
                      Cancelar dibujo
                    </Button>
                  )}
                </div>

                {selectedLote && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-3 text-sm text-blue-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Lote {selectedLote.codigo}</span>
                      <span className="text-xs uppercase tracking-wide px-2 py-1 rounded-full bg-white text-blue-700 border border-blue-300">
                        {selectedLote.estado ?? 'sin estado'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs text-blue-700">
                      <div>
                        <p className="font-semibold text-blue-800">Pin</p>
                        <p>{selectedLote.ubicacion ? `${selectedLote.ubicacion.lat.toFixed(5)}, ${selectedLote.ubicacion.lng.toFixed(5)}` : 'Se calculará al guardar'}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-blue-800">Superficie</p>
                        <p>{selectedLoteSup ? `${selectedLoteSup} m²` : 'Sin registrar'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Haz clic sobre el plano siguiendo el contorno del lote.</span>
                      <button
                        type="button"
                        onClick={() => setSelectedLoteId(null)}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {savingLotePolygon && (
                  <div className="text-xs text-gray-500">Guardando geometría...</div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-800">Lotes con geometría</h4>
                <p className="text-sm text-gray-600">
                  Puedes resaltar un lote en el mapa o quitar su polígono si necesitas volver a dibujarlo.
                </p>
              </div>

              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                {lotesConPoligono.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">Sin lotes asignados todavía.</div>
                )}
                {lotesConPoligono.map((lote) => (
                  <div key={lote.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <div className="font-semibold text-gray-800">{lote.codigo}</div>
                      <div className="text-xs text-gray-500 capitalize">{lote.estado ?? 'sin estado'}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        draggable
                        onClick={() => setSelectedLoteId(lote.id)}
                        onDragStart={(event) => handleLoteDragStart(event, lote.id)}
                        onDragEnd={handleLoteDragEnd}
                      >
                        Resaltar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleRemoveLotePolygon(lote.id)}
                        disabled={savingLotePolygon}
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 text-sm text-gray-600">
                <div>
                  <h4 className="font-semibold text-gray-800">Modo B · Grilla automática (próximamente)</h4>
                  <p>
                    Define un rectángulo, el número de filas/columnas y deja que el sistema genere todos los lotes de forma
                    regular. Ideal para proyectos modulares.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Modo C · Importación masiva (próximamente)</h4>
                  <p>
                    Carga un archivo GeoJSON o KML con las geometrías listas y las asignamos automáticamente a los lotes
                    existentes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div
        className={clsx(
          'relative',
          mapFullScreen && 'fixed inset-0 z-50 bg-white p-4 flex flex-col'
        )}
      >
        {mapFullScreen && (
          <button
            type="button"
            onClick={handleToggleFullMap}
            className="absolute top-6 right-8 z-[1200] bg-black/60 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-black/80 transition-colors"
          >
            Cerrar mapa
          </button>
        )}
        <Card
          className={clsx(
            'overflow-hidden',
            mapFullScreen && 'flex-1 shadow-none border-none'
          )}
        >
          <CardHeader className={mapFullScreen ? 'pb-2' : undefined}>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Mapa interactivo
            </CardTitle>
          </CardHeader>
          <CardContent
            className={clsx(
              'p-0',
              mapFullScreen ? 'flex-1' : undefined
            )}
          >
            <div
              className={clsx(
                'h-[600px]',
                mapFullScreen && 'h-full min-h-[calc(100vh-200px)]'
              )}
            >
              <GoogleMap
                defaultCenter={mapCenter}
                defaultZoom={mapZoom}
                planosUrl={planUrl}
                overlayBounds={overlayBounds}
                overlayOpacity={overlayOpacity}
                rotationDeg={overlayRotation}
                overlayEditable={overlayEditable}
                onOverlayBoundsChange={handleOverlayBoundsChange}
                projectPolygon={projectPolygon}
                onProjectPolygonChange={handleProjectPolygonChange}
                projectDrawingActive={drawingProject}
                onProjectDrawingFinished={() => setDrawingProject(false)}
                lotes={lotesState}
                highlightLoteId={selectedLoteId}
                loteDrawingActive={loteDrawing}
                onLoteDrawingFinished={() => setLoteDrawing(false)}
                onLotePolygonComplete={handleLotePolygonComplete}
                fullScreenActive={mapFullScreen}
                onToggleFull={handleToggleFullMap}
                draggingLoteId={draggingLoteId}
                onPinDrop={handlePinDrop}
                onMarkerDragEnd={handleMarkerDragEnd}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
