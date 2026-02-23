'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { OverlayLayerConfig } from '@/types/overlay-layers';

interface LatLngLiteral {
  lat: number;
  lng: number;
}

interface LoteOverlay {
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

interface MapOverlayLayer extends OverlayLayerConfig {
  id: string;
  url: string | null;
  bounds?: [[number, number], [number, number]] | [[number, number], [number, number], [number, number], [number, number]] | null;
  opacity?: number | null;
  visible?: boolean | null;
}

interface GoogleMapProps {
  defaultCenter: [number, number];
  defaultZoom: number;
  planosUrl?: string | null;
  overlayBounds?: [[number, number], [number, number]] | [[number, number], [number, number], [number, number], [number, number]];
  overlayOpacity?: number;
  overlayLayers?: MapOverlayLayer[] | null;
  activeOverlayId?: string | null;
  overlayEditable?: boolean;
  dropAreaBounds?: [[number, number], [number, number]] | null;
  onOverlayBoundsChange?: (
    overlayId: string,
    bounds: [[number, number], [number, number]] | [[number, number], [number, number], [number, number], [number, number]]
  ) => void;
  onMapCenterChange?: (center: [number, number]) => void;
  onGetMapCenter?: () => [number, number] | null;
  projectPolygon?: LatLngLiteral[];
  onProjectPolygonChange?: (vertices: LatLngLiteral[]) => void;
  projectDrawingActive?: boolean;
  onProjectDrawingFinished?: () => void;
  lotes?: LoteOverlay[];
  highlightLoteId?: string | null;
  fullScreenActive?: boolean;
  onToggleFull?: () => void;
  draggingLoteId?: string | null;
  onPinDrop?: (loteId: string, lat: number, lng: number) => void;
  onMarkerDragEnd?: (loteId: string, lat: number, lng: number) => void;
  focusLoteRequest?: { id: string; ts: number } | null;
  onFocusHandled?: () => void;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

const ESTADO_COLORES: Record<string, string> = {
  disponible: '#10B981',
  reservado: '#F59E0B',
  vendido: '#EF4444',
  desconocido: '#6B7280',
};

const ESTADO_TEXTOS: Record<string, string> = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  vendido: 'Vendido',
  desconocido: 'Sin estado',
};

const LEGEND_ITEMS = ['disponible', 'reservado', 'vendido'] as const;

type BoundsTuple =
  | [[number, number], [number, number]]
  | [[number, number], [number, number], [number, number], [number, number]];

const normalizeOpacity = (value?: number | null) => (typeof value === 'number' ? value : 0.7);

const toBoundingBox = (bounds?: BoundsTuple | null): [[number, number], [number, number]] | null => {
  if (!bounds) return null;
  if (bounds.length === 2) return bounds as [[number, number], [number, number]];
  const lats = bounds.map(point => point[0]);
  const lngs = bounds.map(point => point[1]);
  const sw: [number, number] = [Math.min(...lats), Math.min(...lngs)];
  const ne: [number, number] = [Math.max(...lats), Math.max(...lngs)];
  return [sw, ne];
};

// Función factory para crear la clase de overlay con perspectiva (4 puntos deformables)
function createGroundOverlayClass() {
  return class GroundOverlayWithPerspective extends google.maps.OverlayView {
    private url: string;
    private corners: [google.maps.LatLng, google.maps.LatLng, google.maps.LatLng, google.maps.LatLng]; // NW, NE, SE, SW
    private opacity: number;
    private container?: HTMLDivElement;
    private canvas?: HTMLCanvasElement;
    private ctx?: CanvasRenderingContext2D;
    private img?: HTMLImageElement;
    private imageLoaded = false;

    constructor(
      url: string,
      corners: [google.maps.LatLng, google.maps.LatLng, google.maps.LatLng, google.maps.LatLng],
      opacity = 0.7
    ) {
      super();
      this.url = url;
      this.corners = corners;
      this.opacity = opacity;
    }

    onAdd() {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.overflow = 'visible';
      div.style.pointerEvents = 'none';

      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.pointerEvents = 'none';
      canvas.style.opacity = `${this.opacity}`;

      div.appendChild(canvas);
      this.container = div;
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d') || undefined;

      // Cargar imagen
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.imageLoaded = true;
        this.draw();
      };
      img.src = this.url;
      this.img = img;

      const panes = this.getPanes();
      if (!panes || !panes.overlayLayer) {
        console.warn('No se pudo obtener el overlayLayer para el plano');
        return;
      }
      panes.overlayLayer.appendChild(div);
    }

    draw() {
      if (!this.container || !this.canvas || !this.ctx || !this.imageLoaded || !this.img) return;
      const projection = this.getProjection();
      if (!projection) return;

      // Convertir esquinas lat/lng a píxeles
      const corners = this.corners.map(corner => projection.fromLatLngToDivPixel(corner));
      if (corners.some(c => !c)) return;

      const [nw, ne, se, sw] = corners as google.maps.Point[];

      // Calcular bounding box
      const minX = Math.min(nw.x, ne.x, se.x, sw.x);
      const maxX = Math.max(nw.x, ne.x, se.x, sw.x);
      const minY = Math.min(nw.y, ne.y, se.y, sw.y);
      const maxY = Math.max(nw.y, ne.y, se.y, sw.y);

      const width = maxX - minX;
      const height = maxY - minY;

      // Posicionar contenedor
      this.container.style.left = `${minX}px`;
      this.container.style.top = `${minY}px`;
      this.container.style.width = `${width}px`;
      this.container.style.height = `${height}px`;

      // Configurar canvas
      this.canvas.width = width;
      this.canvas.height = height;

      // Puntos relativos al canvas
      const p0 = { x: nw.x - minX, y: nw.y - minY }; // NW
      const p1 = { x: ne.x - minX, y: ne.y - minY }; // NE
      const p2 = { x: se.x - minX, y: se.y - minY }; // SE
      const p3 = { x: sw.x - minX, y: sw.y - minY }; // SW

      // Dibujar imagen con transformación de perspectiva
      this.ctx.clearRect(0, 0, width, height);
      this.ctx.save();

      // Aplicar transformación de perspectiva usando 4 puntos
      this.perspectiveTransform(
        this.ctx,
        this.img,
        [p0, p1, p2, p3]
      );

      this.ctx.restore();
    }

    // Transformación de perspectiva simplificada usando triangulación
    perspectiveTransform(
      ctx: CanvasRenderingContext2D,
      img: HTMLImageElement,
      corners: Array<{x: number, y: number}>
    ) {
      const [p0, p1, p2, p3] = corners;

      // Dividir en dos triángulos y renderizar
      // Triángulo 1: p0, p1, p2
      this.drawTriangle(ctx, img,
        0, 0,
        img.width, 0,
        img.width, img.height,
        p0.x, p0.y,
        p1.x, p1.y,
        p2.x, p2.y
      );

      // Triángulo 2: p0, p2, p3
      this.drawTriangle(ctx, img,
        0, 0,
        img.width, img.height,
        0, img.height,
        p0.x, p0.y,
        p2.x, p2.y,
        p3.x, p3.y
      );
    }

    drawTriangle(
      ctx: CanvasRenderingContext2D,
      img: HTMLImageElement,
      x0: number, y0: number,
      x1: number, y1: number,
      x2: number, y2: number,
      dx0: number, dy0: number,
      dx1: number, dy1: number,
      dx2: number, dy2: number
    ) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(dx0, dy0);
      ctx.lineTo(dx1, dy1);
      ctx.lineTo(dx2, dy2);
      ctx.closePath();
      ctx.clip();

      // Calcular matriz de transformación afín
      const m = this.calculateAffineMatrix(
        x0, y0, x1, y1, x2, y2,
        dx0, dy0, dx1, dy1, dx2, dy2
      );

      ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    }

    calculateAffineMatrix(
      x0: number, y0: number,
      x1: number, y1: number,
      x2: number, y2: number,
      dx0: number, dy0: number,
      dx1: number, dy1: number,
      dx2: number, dy2: number
    ) {
      const d = (x0 - x2) * (y1 - y2) - (x1 - x2) * (y0 - y2);
      const a = ((dx0 - dx2) * (y1 - y2) - (dx1 - dx2) * (y0 - y2)) / d;
      const b = ((x0 - x2) * (dx1 - dx2) - (x1 - x2) * (dx0 - dx2)) / d;
      const c = ((dy0 - dy2) * (y1 - y2) - (dy1 - dy2) * (y0 - y2)) / d;
      const dd = ((x0 - x2) * (dy1 - dy2) - (x1 - x2) * (dy0 - dy2)) / d;
      const e = dx2 - a * x2 - b * y2;
      const f = dy2 - c * x2 - dd * y2;
      return { a, b, c, d: dd, e, f };
    }

    updateOpacity(opacity: number) {
      this.opacity = opacity;
      if (this.canvas) {
        this.canvas.style.opacity = `${this.opacity}`;
      }
    }

    updateCorners(corners: [google.maps.LatLng, google.maps.LatLng, google.maps.LatLng, google.maps.LatLng]) {
      this.corners = corners;
      this.draw();
    }

    onRemove() {
      if (this.container?.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      this.container = undefined;
      this.canvas = undefined;
      this.ctx = undefined;
      this.img = undefined;
    }
  };
}

export default function GoogleMap({
  defaultCenter,
  defaultZoom,
  planosUrl,
  overlayBounds,
  overlayOpacity = 0.7,
  overlayLayers = null,
  activeOverlayId,
  overlayEditable = false,
  dropAreaBounds = null,
  onOverlayBoundsChange,
  onMapCenterChange,
  onGetMapCenter,
  projectPolygon = [],
  onProjectPolygonChange,
  projectDrawingActive = false,
  onProjectDrawingFinished,
  lotes = [],
  highlightLoteId,
  fullScreenActive = false,
  onToggleFull,
  draggingLoteId = null,
  onPinDrop,
  onMarkerDragEnd,
  focusLoteRequest,
  onFocusHandled,
}: GoogleMapProps) {
  const [centerLat, centerLng] = defaultCenter;
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const projectPolygonRef = useRef<google.maps.Polygon | null>(null);
  const projectPolygonListenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const projectPolygonSilentUpdateRef = useRef(false);
  const overlayInstancesRef = useRef<Map<string, google.maps.OverlayView>>(new Map());
  const overlayPolygonRef = useRef<google.maps.Polygon | null>(null);
  const overlayPolygonListenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const overlayPolygonSilentUpdateRef = useRef(false);
  const overlayPolygonLastValidPathRef = useRef<LatLngLiteral[]>([]);
  const lotesPolygonsRef = useRef<Map<string, google.maps.Polygon>>(new Map());
  const lotesPolygonListenersRef = useRef<Map<string, google.maps.MapsEventListener[]>>(new Map());
  const lotesLabelsRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const drawingContextRef = useRef<'project' | 'lote' | null>(null);
  const polygonFitRef = useRef(false);
  const dropOverlayRef = useRef<HTMLDivElement | null>(null);
  const projectionOverlayRef = useRef<google.maps.OverlayView | null>(null);
  const dropZoneRectangleRef = useRef<google.maps.Rectangle | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const overlayLayersForMap = useMemo(
    () => {
      if (overlayLayers && overlayLayers.length) {
        return overlayLayers
          .filter((layer) => layer.url)
          .map((layer) => ({
            id: layer.id,
            url: layer.url,
            bounds: layer.bounds ?? null,
            opacity: normalizeOpacity(layer.opacity),
            visible: layer.visible !== false,
          }));
      }
      if (planosUrl && overlayBounds) {
        return [
          {
            id: 'legacy-overlay',
            url: planosUrl,
            bounds: overlayBounds,
            opacity: normalizeOpacity(overlayOpacity),
            visible: true,
          },
        ];
      }
      return [];
    },
    [overlayLayers, planosUrl, overlayBounds, overlayOpacity]
  );

  const resolvedActiveOverlayId = useMemo(() => {
    if (overlayLayers && overlayLayers.length) {
      return activeOverlayId ?? overlayLayers[0].id;
    }
    return overlayLayersForMap[0]?.id ?? null;
  }, [overlayLayers, activeOverlayId, overlayLayersForMap]);

  const resolvedActiveOverlayBounds = useMemo(() => {
    if (overlayLayers && overlayLayers.length) {
      const current = overlayLayers.find((layer) => layer.id === resolvedActiveOverlayId);
      return current?.bounds ?? null;
    }
    return overlayBounds ?? null;
  }, [overlayLayers, resolvedActiveOverlayId, overlayBounds]);

  const dropBounds = useMemo(() => {
    if (dropAreaBounds) return dropAreaBounds;
    if (overlayLayers && overlayLayers.length) {
      const primary = overlayLayers.find((layer) => layer.isPrimary) ?? overlayLayers[0];
      return toBoundingBox(primary?.bounds ?? null);
    }
    return toBoundingBox(overlayBounds ?? null);
  }, [dropAreaBounds, overlayLayers, overlayBounds]);

  const activeOverlayIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeOverlayIdRef.current = resolvedActiveOverlayId ?? null;
  }, [resolvedActiveOverlayId]);

  useEffect(() => {
    setIsDragActive(Boolean(draggingLoteId));
  }, [draggingLoteId]);

  // Mostrar zona de drop cuando se está arrastrando un lote
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isLoaded) return;

    if (isDragActive && dropBounds) {
      const [[swLat, swLng], [neLat, neLng]] = dropBounds;
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(swLat, swLng),
        new google.maps.LatLng(neLat, neLng)
      );

      if (!dropZoneRectangleRef.current) {
        const dropZone = new google.maps.Rectangle({
          bounds,
          map,
          editable: false,
          draggable: false,
          fillColor: '#10B981',
          fillOpacity: 0.25,
          strokeColor: '#10B981',
          strokeOpacity: 1,
          strokeWeight: 4,
          zIndex: 999,
        });
        dropZoneRectangleRef.current = dropZone;
      } else {
        dropZoneRectangleRef.current.setBounds(bounds);
        dropZoneRectangleRef.current.setMap(map);
      }
    } else {
      if (dropZoneRectangleRef.current) {
        dropZoneRectangleRef.current.setMap(null);
      }
    }

    return () => {
      if (dropZoneRectangleRef.current) {
        dropZoneRectangleRef.current.setMap(null);
      }
    };
  }, [isDragActive, dropBounds, isLoaded]);

  // Exponer función para obtener el centro actual del mapa
  useEffect(() => {
    if (!onGetMapCenter) return;

    const getCenter = (): [number, number] | null => {
      const map = mapInstanceRef.current;
      if (!map) return null;
      const center = map.getCenter();
      if (!center) return null;
      return [center.lat(), center.lng()];
    };

    // Esta es una forma de "exponer" la función al componente padre
    // No es la más elegante pero funciona con el patrón actual
    (onGetMapCenter as unknown as { current?: () => [number, number] | null }).current = getCenter;
  }, [onGetMapCenter]);

  useEffect(() => () => {
    // Cleanup de polígonos al desmontar
    lotesPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
    lotesPolygonsRef.current.clear();
    lotesLabelsRef.current.forEach((label) => label.setMap(null));
    lotesLabelsRef.current.clear();
  }, []);

  // Cargar script de Google Maps cuando no esté presente
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API Key no configurada');
      return;
    }

    const initialize = () => setIsLoaded(true);

    const globalWindow = window as typeof window & { google?: typeof google };
    if (globalWindow.google?.maps) {
      initialize();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src*="maps.googleapis.com"]`);
    if (existingScript) {
      existingScript.addEventListener('load', initialize, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry,drawing,places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = initialize;
    script.onerror = () => console.error('Error cargando Google Maps Script');
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  // Inicializar mapa y DrawingManager
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: defaultCenter[0], lng: defaultCenter[1] },
      zoom: defaultZoom,
      mapTypeId: google.maps.MapTypeId.SATELLITE, // Modo satelital por defecto
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: google.maps.ControlPosition.LEFT_TOP,
        mapTypeIds: [
          google.maps.MapTypeId.SATELLITE,
          google.maps.MapTypeId.HYBRID,
          google.maps.MapTypeId.TERRAIN,
          google.maps.MapTypeId.ROADMAP,
        ],
      },
      streetViewControl: true,
      streetViewControlOptions: {
        position: google.maps.ControlPosition.LEFT_TOP,
      },
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM,
      },
      fullscreenControl: false,
      gestureHandling: 'greedy',
      scrollwheel: true,
      disableDoubleClickZoom: false,
      // No establecer restricciones de zoom - dejar que el mapa use los límites naturales
      // Esto permite zoom completo según la disponibilidad de tiles del tipo de mapa
    });

    mapInstanceRef.current = map;

    const drawingManager = new google.maps.drawing.DrawingManager({
      drawingControl: false,
      polygonOptions: {
        fillColor: '#2563EB',
        fillOpacity: 0.1,
        strokeColor: '#1D4ED8',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        editable: true,
        draggable: true,
      },
    });
    drawingManager.setMap(map);
    drawingManagerRef.current = drawingManager;

    // Listener para informar cambios de centro del mapa
    const centerChangedListener = map.addListener('center_changed', () => {
      const center = map.getCenter();
      if (center && onMapCenterChange) {
        onMapCenterChange([center.lat(), center.lng()]);
      }
    });

    return () => {
      centerChangedListener.remove();
      drawingManager.setMap(null);
      google.maps.event.clearInstanceListeners(map);
      mapInstanceRef.current = null;
    };
  }, [isLoaded, defaultCenter, defaultZoom, onMapCenterChange]);

  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;
    const overlay = new google.maps.OverlayView();
    overlay.onAdd = () => {};
    overlay.draw = () => {};
    overlay.onRemove = () => {};
    overlay.setMap(mapInstanceRef.current);
    projectionOverlayRef.current = overlay;
    return () => {
      overlay.setMap(null);
      projectionOverlayRef.current = null;
    };
  }, [isLoaded]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.panTo({ lat: centerLat, lng: centerLng });
  }, [centerLat, centerLng]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setZoom(defaultZoom);
  }, [defaultZoom]);

  const cleanupProjectPolygonListeners = useCallback(() => {
    projectPolygonListenersRef.current.forEach((listener) => listener.remove());
    projectPolygonListenersRef.current = [];
  }, []);

  const cleanupOverlayPolygonListeners = useCallback(() => {
    overlayPolygonListenersRef.current.forEach((listener) => listener.remove());
    overlayPolygonListenersRef.current = [];
  }, []);

  const cleanupOverlayPolygon = useCallback(() => {
    cleanupOverlayPolygonListeners();
    if (overlayPolygonRef.current) {
      overlayPolygonRef.current.setMap(null);
      overlayPolygonRef.current = null;
    }
  }, [cleanupOverlayPolygonListeners]);

  const attachProjectPolygonListeners = useCallback(
    (polygon: google.maps.Polygon) => {
      cleanupProjectPolygonListeners();
    const path = polygon.getPath();
    const handleChange = () => {
      if (projectPolygonSilentUpdateRef.current) return;
      if (!onProjectPolygonChange) return;
      const updated = path.getArray().map((latLng) => ({ lat: latLng.lat(), lng: latLng.lng() }));
      onProjectPolygonChange(updated);
    };

    projectPolygonListenersRef.current = [
      google.maps.event.addListener(path, 'set_at', handleChange),
      google.maps.event.addListener(path, 'insert_at', handleChange),
      google.maps.event.addListener(path, 'remove_at', handleChange),
      google.maps.event.addListener(polygon, 'dragend', handleChange),
    ];
    },
    [cleanupProjectPolygonListeners, onProjectPolygonChange]
  );

  // Gestionar dibujo del polígono del proyecto
  useEffect(() => {
    const map = mapInstanceRef.current;
    const drawingManager = drawingManagerRef.current;
    if (!map || !drawingManager) return;

    if (!projectDrawingActive) {
      if (drawingContextRef.current === 'project') {
        drawingManager.setDrawingMode(null);
        drawingContextRef.current = null;
      }
      return;
    }

    drawingContextRef.current = 'project';
    drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);

    const overlayCompleteListener = google.maps.event.addListener(
      drawingManager,
      'overlaycomplete',
      (event: google.maps.drawing.OverlayCompleteEvent) => {
        if (event.type !== google.maps.drawing.OverlayType.POLYGON) return;

        const polygon = event.overlay as google.maps.Polygon;
        event.overlay = null as unknown as google.maps.Polygon;

        polygon.setEditable(true);
        polygon.setDraggable(true);
        polygon.setMap(map);

        if (projectPolygonRef.current) {
          projectPolygonRef.current.setMap(null);
        }

        projectPolygonRef.current = polygon;
        attachProjectPolygonListeners(polygon);

        const path = polygon
          .getPath()
          .getArray()
          .map((latLng) => ({ lat: latLng.lat(), lng: latLng.lng() }));
        onProjectPolygonChange?.(path);
        drawingManager.setDrawingMode(null);
        drawingContextRef.current = null;
        onProjectDrawingFinished?.();
      }
    );

    return () => {
      if (drawingContextRef.current === 'project') {
        drawingManager.setDrawingMode(null);
        drawingContextRef.current = null;
      }
      overlayCompleteListener.remove();
    };
  }, [projectDrawingActive, onProjectPolygonChange, onProjectDrawingFinished, attachProjectPolygonListeners, isLoaded]);

  // Sincronizar polígono del proyecto recibido por props
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!projectPolygon || projectPolygon.length < 3) {
      cleanupProjectPolygonListeners();
      if (projectPolygonRef.current) {
        projectPolygonRef.current.setMap(null);
        projectPolygonRef.current = null;
      }
      polygonFitRef.current = false;
      return;
    }

    const path = projectPolygon.map((vertex) => new google.maps.LatLng(vertex.lat, vertex.lng));
    const bounds = new google.maps.LatLngBounds();
    path.forEach((latLng) => bounds.extend(latLng));

    if (!projectPolygonRef.current) {
      const polygon = new google.maps.Polygon({
        map,
        paths: path,
        fillColor: '#2563EB',
        fillOpacity: 0.2,
        strokeColor: '#1D4ED8',
        strokeOpacity: 0.9,
        strokeWeight: 3,
        editable: true,
        draggable: true,
      });
      projectPolygonRef.current = polygon;
      attachProjectPolygonListeners(polygon);
      if (!polygonFitRef.current && overlayLayersForMap.length === 0) {
        // Solo hacer fitBounds si no hay plano cargado (primera vez dibujando el polígono)
        map.fitBounds(bounds);
        polygonFitRef.current = true;
      }
    } else {
      projectPolygonSilentUpdateRef.current = true;
      projectPolygonRef.current.setPath(path);
      projectPolygonSilentUpdateRef.current = false;
      // No hacer fitBounds al actualizar - respetar el zoom del usuario
    }
  }, [projectPolygon, attachProjectPolygonListeners, cleanupProjectPolygonListeners, isLoaded, overlayLayersForMap]);

  // Función auxiliar para convertir bounds a corners (4 puntos)
  // Soporta tanto formato antiguo (2 puntos: bounding box) como nuevo (4 puntos: esquinas independientes)
  const boundsToCorners = useCallback((
    bounds: [[number, number], [number, number]] | [[number, number], [number, number], [number, number], [number, number]]
  ): [google.maps.LatLng, google.maps.LatLng, google.maps.LatLng, google.maps.LatLng] => {
    // Si tiene 4 puntos, usar directamente (formato nuevo: esquinas independientes)
    if (bounds.length === 4) {
      const [[nwLat, nwLng], [neLat, neLng], [seLat, seLng], [swLat, swLng]] = bounds;
      return [
        new google.maps.LatLng(nwLat, nwLng), // NW
        new google.maps.LatLng(neLat, neLng), // NE
        new google.maps.LatLng(seLat, seLng), // SE
        new google.maps.LatLng(swLat, swLng), // SW
      ];
    }

    // Si tiene 2 puntos, convertir de bounding box a rectángulo (formato antiguo)
    const [[swLat, swLng], [neLat, neLng]] = bounds;
    return [
      new google.maps.LatLng(neLat, swLng), // NW
      new google.maps.LatLng(neLat, neLng), // NE
      new google.maps.LatLng(swLat, neLng), // SE
      new google.maps.LatLng(swLat, swLng), // SW
    ];
  }, []);

  const attachOverlayPolygonListeners = useCallback((polygon: google.maps.Polygon) => {
    if (!onOverlayBoundsChange) return;

    cleanupOverlayPolygonListeners();
    const path = polygon.getPath();

    const emitChange = () => {
      if (overlayPolygonSilentUpdateRef.current) return;
      const pathArray = path.getArray();
      if (pathArray.length < 4) return;

      const serialized = pathArray.map((latLng) => ({ lat: latLng.lat(), lng: latLng.lng() }));
      overlayPolygonLastValidPathRef.current = serialized;
      const formatted = serialized.map(
        (corner) => [corner.lat, corner.lng] as [number, number]
      ) as [[number, number], [number, number], [number, number], [number, number]];
      if (activeOverlayIdRef.current) {
        onOverlayBoundsChange(activeOverlayIdRef.current, formatted);
      }
    };

    const restoreLastValidPath = () => {
      if (!overlayPolygonLastValidPathRef.current.length) return;
      overlayPolygonSilentUpdateRef.current = true;
      path.clear();
      overlayPolygonLastValidPathRef.current.forEach((corner) =>
        path.push(new google.maps.LatLng(corner.lat, corner.lng))
      );
      overlayPolygonSilentUpdateRef.current = false;
    };

    overlayPolygonListenersRef.current = [
      google.maps.event.addListener(path, 'set_at', emitChange),
      google.maps.event.addListener(path, 'insert_at', (index: number) => {
        if (overlayPolygonSilentUpdateRef.current) return;
        if (path.getLength() > 4) {
          overlayPolygonSilentUpdateRef.current = true;
          path.removeAt(index);
          overlayPolygonSilentUpdateRef.current = false;
        }
        emitChange();
      }),
      google.maps.event.addListener(path, 'remove_at', () => {
        if (overlayPolygonSilentUpdateRef.current) return;
        if (path.getLength() < 4) {
          restoreLastValidPath();
          return;
        }
        emitChange();
      }),
      google.maps.event.addListener(polygon, 'dragend', emitChange),
    ];
  }, [cleanupOverlayPolygonListeners, onOverlayBoundsChange]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isLoaded) {
      overlayInstancesRef.current.forEach((instance) => instance.setMap(null));
      overlayInstancesRef.current.clear();
      return;
    }

    const GroundOverlayWithPerspective = createGroundOverlayClass();
    const nextIds = new Set<string>();

    overlayLayersForMap.forEach((layer) => {
      if (!layer.bounds || layer.visible === false) {
        const existing = overlayInstancesRef.current.get(layer.id);
        if (existing) {
          existing.setMap(null);
          overlayInstancesRef.current.delete(layer.id);
        }
        return;
      }

      if (!layer.url) {
        return;
      }

      const corners = boundsToCorners(layer.bounds);
      let overlayInstance = overlayInstancesRef.current.get(layer.id);
      if (!overlayInstance) {
        overlayInstance = new GroundOverlayWithPerspective(layer.url, corners, layer.opacity);
        overlayInstance.setMap(map);
        overlayInstancesRef.current.set(layer.id, overlayInstance);
      } else {
        const handler = overlayInstance as any;
        if (typeof handler.updateCorners === 'function') handler.updateCorners(corners);
        if (typeof handler.updateOpacity === 'function') handler.updateOpacity(layer.opacity);
        if (!handler.getMap()) handler.setMap(map);
      }
      nextIds.add(layer.id);
    });

    overlayInstancesRef.current.forEach((instance, id) => {
      if (!nextIds.has(id)) {
        instance.setMap(null);
        overlayInstancesRef.current.delete(id);
      }
    });

    return () => {
      overlayInstancesRef.current.forEach((instance) => instance.setMap(null));
      overlayInstancesRef.current.clear();
    };
  }, [overlayLayersForMap, isLoaded, boundsToCorners]);

  // Mostrar polígono editable para calibrar el plano
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isLoaded || !overlayEditable) {
      cleanupOverlayPolygon();
      return;
    }

    if (!resolvedActiveOverlayId) {
      cleanupOverlayPolygon();
      return;
    }

    const editingBounds = resolvedActiveOverlayBounds ?? dropBounds;
    if (!editingBounds) {
      cleanupOverlayPolygon();
      return;
    }

    const corners = boundsToCorners(editingBounds);
    overlayPolygonLastValidPathRef.current = corners.map((corner) => ({
      lat: corner.lat(),
      lng: corner.lng(),
    }));

    if (!overlayPolygonRef.current) {
      const polygon = new google.maps.Polygon({
        map,
        paths: corners,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#3B82F6',
        fillOpacity: 0.15,
        draggable: true,
        editable: true,
        zIndex: 1200,
      });
      overlayPolygonRef.current = polygon;
      attachOverlayPolygonListeners(polygon);
    } else {
      const path = overlayPolygonRef.current.getPath();
      overlayPolygonSilentUpdateRef.current = true;
      path.clear();
      corners.forEach((corner) => path.push(corner));
      overlayPolygonSilentUpdateRef.current = false;
      overlayPolygonRef.current.setMap(map);
      overlayPolygonRef.current.setOptions({ draggable: true, editable: true });
    }
  }, [
    overlayEditable,
    resolvedActiveOverlayBounds,
    dropBounds,
    resolvedActiveOverlayId,
    isLoaded,
    boundsToCorners,
    attachOverlayPolygonListeners,
    cleanupOverlayPolygon,
  ]);

  useEffect(() => {
    return () => {
      cleanupOverlayPolygon();
    };
  }, [cleanupOverlayPolygon]);

  // Renderizar polígonos de lotes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isLoaded) return;

    const removeLote = (id: string) => {
      const polygon = lotesPolygonsRef.current.get(id);
      if (polygon) {
        polygon.setMap(null);
        lotesPolygonsRef.current.delete(id);
      }
      const label = lotesLabelsRef.current.get(id);
      if (label) {
        label.setMap(null);
        lotesLabelsRef.current.delete(id);
      }
      const listeners = lotesPolygonListenersRef.current.get(id);
      if (listeners) {
        listeners.forEach((listener) => listener.remove());
        lotesPolygonListenersRef.current.delete(id);
      }
    };

    const seen = new Set<string>();

    lotes.forEach((lote) => {
      seen.add(lote.id);

      // Si no tiene ubicación, remover cualquier renderizado previo
      if (!lote.plano_poligono || lote.plano_poligono.length === 0) {
        removeLote(lote.id);
        return;
      }

      const color = ESTADO_COLORES[lote.estado || 'desconocido'] || ESTADO_COLORES.desconocido;
      const isHighlighted = highlightLoteId === lote.id;

      // Solo renderizar como marcador (pin) - siempre usar el primer punto
      const [lat, lng] = lote.plano_poligono[0];
      const position = { lat, lng };

      // Crear o actualizar marcador
      if (!lotesLabelsRef.current.has(lote.id)) {
        const marker = new google.maps.Marker({
          position,
          map,
          draggable: true,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 3,
            scale: 12,
          },
          label: {
            text: lote.codigo,
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 'bold',
          },
          zIndex: isHighlighted ? 1001 : 1000,
          title: `${lote.codigo} - Arrastra para reposicionar`,
          animation: google.maps.Animation.DROP,
        });

        // Agregar listener para cuando empieza a arrastrar
        const dragStartListener = marker.addListener('dragstart', () => {
          marker.setOptions({
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: color,
              fillOpacity: 0.6,
              strokeColor: '#ffffff',
              strokeWeight: 4,
              scale: 16,
            },
          });
        });

        // Agregar listener para arrastrar el marcador
        const dragEndListener = marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          // Volver al tamaño normal
          marker.setOptions({
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: color,
              fillOpacity: 0.9,
              strokeColor: '#ffffff',
              strokeWeight: 3,
              scale: 12,
            },
          });
          if (pos && onMarkerDragEnd) {
            onMarkerDragEnd(lote.id, pos.lat(), pos.lng());
          }
        });

        // Agregar listener para hover
        const mouseoverListener = marker.addListener('mouseover', () => {
          marker.setOptions({
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 4,
              scale: 14,
            },
          });
        });

        const mouseoutListener = marker.addListener('mouseout', () => {
          if (highlightLoteId !== lote.id) {
            marker.setOptions({
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: 0.9,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                scale: 12,
              },
            });
          }
        });

        lotesLabelsRef.current.set(lote.id, marker);
        lotesPolygonListenersRef.current.set(lote.id, [dragStartListener, dragEndListener, mouseoverListener, mouseoutListener]);
      } else {
        const marker = lotesLabelsRef.current.get(lote.id)!;
        marker.setOptions({
          position,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: isHighlighted ? 1 : 0.9,
            strokeColor: '#ffffff',
            strokeWeight: isHighlighted ? 4 : 3,
            scale: isHighlighted ? 14 : 12,
          },
          label: {
            text: lote.codigo,
            color: '#ffffff',
            fontSize: isHighlighted ? '12px' : '11px',
            fontWeight: 'bold',
          },
          zIndex: isHighlighted ? 1001 : 1000,
        });
      }
    });

    // Remover polígonos que ya no existen
    Array.from(lotesPolygonsRef.current.keys()).forEach((id) => {
      if (!seen.has(id)) {
        removeLote(id);
      }
    });
  }, [lotes, highlightLoteId, isLoaded]);

  const loadingFallback = (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Cargando Google Maps...</p>
      </div>
    </div>
  );

  const hasDragData = useCallback((event: React.DragEvent) => {
    if (draggingLoteId) return true;
    const types = event.dataTransfer?.types;
    return Boolean(types && (types.includes('application/x-lote-id') || types.includes('text/plain')));
  }, [draggingLoteId]);

  const handleMapDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!hasDragData(event)) return;
    event.preventDefault();
    setIsDragActive(true);
  }, [hasDragData]);

  const handleMapDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!hasDragData(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragActive(true);
  }, [hasDragData]);

  const handleMapDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setIsDragActive(false);
  }, []);

  const handleMapDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const map = mapInstanceRef.current;
    const projectionOverlay = projectionOverlayRef.current;
    if (!map || !projectionOverlay) return;

    const dataTransfer = event.dataTransfer;
    const loteId = draggingLoteId || dataTransfer?.getData('application/x-lote-id') || dataTransfer?.getData('text/plain');
    if (!loteId || !dropBounds) {
      setIsDragActive(false);
      return;
    }

    event.preventDefault();
    setIsDragActive(false);

    const rect = dropOverlayRef.current?.getBoundingClientRect() ?? mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    const projection = projectionOverlay.getProjection();
    if (!projection) return;
    const latLng = projection.fromDivPixelToLatLng(new google.maps.Point(offsetX, offsetY));
    if (!latLng) return;

    onPinDrop?.(loteId, latLng.lat(), latLng.lng());
  }, [draggingLoteId, onPinDrop, dropBounds]);

  const legendItems = LEGEND_ITEMS;

  useEffect(() => {
    if (!focusLoteRequest || !isLoaded) return;
    const map = mapInstanceRef.current;
    if (!map) return;
    const lote = lotes.find((item) => item.id === focusLoteRequest.id);
    if (!lote) {
      onFocusHandled?.();
      return;
    }

    // Como solo usamos pins, simplemente centrar en el primer punto
    let point: [number, number] | null = null;
    if (lote.plano_poligono && lote.plano_poligono.length >= 1) {
      point = lote.plano_poligono[0];
    } else if (lote.ubicacion) {
      point = [lote.ubicacion.lat, lote.ubicacion.lng];
    }

    if (point) {
      map.panTo({ lat: point[0], lng: point[1] });
      const currentZoom = map.getZoom();
      if (!currentZoom || currentZoom < 19) {
        map.setZoom(19);
      }
    }

    onFocusHandled?.();
  }, [focusLoteRequest, isLoaded, lotes, onFocusHandled]);

  if (!isLoaded) {
    return loadingFallback;
  }

  return (
    <div
      className="relative w-full h-full"
      onDragEnter={handleMapDragEnter}
      onDragOver={handleMapDragOver}
      onDragLeave={handleMapDragLeave}
      onDrop={handleMapDrop}
    >
      <div ref={mapRef} className="w-full h-full" />

      <div
        ref={dropOverlayRef}
        className="pointer-events-none absolute inset-0 z-[1100]"
        style={{
          cursor: isDragActive ? 'crosshair' : 'default',
        }}
      >
        {isDragActive && (
          <div className="flex h-full w-full items-center justify-center bg-blue-500/20 backdrop-blur-[1px]">
            <div className="rounded-lg bg-white/95 px-6 py-3 text-base font-semibold text-blue-700 shadow-lg border-2 border-blue-500">
              📍 Suelta aquí para ubicar el lote en el plano
            </div>
          </div>
        )}
      </div>

      {/* Botón de pantalla completa */}
      {onToggleFull && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 z-[1000]">
          <button
            onClick={onToggleFull}
            className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1.5 font-medium"
          >
            {fullScreenActive ? 'Salir de pantalla completa' : 'Pantalla completa'}
          </button>
        </div>
      )}

      {/* Leyenda - Movida abajo a la derecha, debajo del buscador */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow flex flex-col gap-2 px-4 py-3 text-xs text-gray-700 z-[1000]">
        <span className="font-semibold text-gray-900 text-sm">Estados de lotes</span>
        <div className="flex flex-col gap-1">
          {legendItems.map((estado) => (
            <div key={estado} className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full border border-white shadow"
                style={{ backgroundColor: ESTADO_COLORES[estado] }}
              />
              <span>{ESTADO_TEXTOS[estado]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
