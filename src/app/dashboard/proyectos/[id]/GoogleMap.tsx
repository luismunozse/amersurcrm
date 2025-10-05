'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

interface GoogleMapProps {
  defaultCenter: [number, number];
  defaultZoom: number;
  planosUrl?: string | null;
  overlayBounds?: [[number, number], [number, number]];
  overlayOpacity?: number;
  rotationDeg?: number;
  overlayEditable?: boolean;
  onOverlayBoundsChange?: (bounds: [[number, number], [number, number]]) => void;
  projectPolygon?: LatLngLiteral[];
  onProjectPolygonChange?: (vertices: LatLngLiteral[]) => void;
  projectDrawingActive?: boolean;
  onProjectDrawingFinished?: () => void;
  lotes?: LoteOverlay[];
  highlightLoteId?: string | null;
  loteDrawingActive?: boolean;
  onLoteDrawingFinished?: () => void;
  onLotePolygonComplete?: (vertices: [number, number][]) => void;
  fullScreenActive?: boolean;
  onToggleFull?: () => void;
  draggingLoteId?: string | null;
  onPinDrop?: (loteId: string, lat: number, lng: number) => void;
  onMarkerDragEnd?: (loteId: string, lat: number, lng: number) => void;
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

export default function GoogleMap({
  defaultCenter,
  defaultZoom,
  planosUrl,
  overlayBounds,
  overlayOpacity = 0.7,
  rotationDeg = 0,
  overlayEditable = false,
  onOverlayBoundsChange,
  projectPolygon = [],
  onProjectPolygonChange,
  projectDrawingActive = false,
  onProjectDrawingFinished,
  lotes = [],
  highlightLoteId,
  loteDrawingActive = false,
  onLoteDrawingFinished,
  onLotePolygonComplete,
  fullScreenActive = false,
  onToggleFull,
  draggingLoteId = null,
  onPinDrop,
  onMarkerDragEnd,
}: GoogleMapProps) {
  const [centerLat, centerLng] = defaultCenter;
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const projectPolygonRef = useRef<google.maps.Polygon | null>(null);
  const projectPolygonListenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const projectPolygonSilentUpdateRef = useRef(false);
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const overlayRectangleRef = useRef<google.maps.Rectangle | null>(null);
  const overlayListenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const overlaySilentRef = useRef(false);
  const lotesPolygonsRef = useRef<Map<string, google.maps.Polygon>>(new Map());
  const lotesPolygonListenersRef = useRef<Map<string, google.maps.MapsEventListener[]>>(new Map());
  const lotesLabelsRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const drawingContextRef = useRef<'project' | 'lote' | null>(null);
  const overlayFitRef = useRef(false);
  const polygonFitRef = useRef(false);
  const dropOverlayRef = useRef<HTMLDivElement | null>(null);
  const projectionOverlayRef = useRef<google.maps.OverlayView | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    setIsDragActive(Boolean(draggingLoteId));
  }, [draggingLoteId]);

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
      mapTypeId: google.maps.MapTypeId.SATELLITE,
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: google.maps.ControlPosition.TOP_RIGHT,
      },
      streetViewControl: true,
      zoomControl: true,
      fullscreenControl: false,
      gestureHandling: 'greedy',
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

    return () => {
      drawingManager.setMap(null);
      google.maps.event.clearInstanceListeners(map);
      mapInstanceRef.current = null;
    };
  }, [isLoaded, defaultCenter, defaultZoom]);

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

  // Configurar Autocomplete para búsqueda de ubicaciones
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !searchInputRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
      fields: ['geometry', 'name'],
      componentRestrictions: { country: ['pe'] },
    });
    autocomplete.bindTo('bounds', mapInstanceRef.current);

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place || !place.geometry) return;

      if (place.geometry.viewport) {
        mapInstanceRef.current?.fitBounds(place.geometry.viewport);
      } else if (place.geometry.location) {
        mapInstanceRef.current?.panTo(place.geometry.location);
      }
    });

    return () => listener.remove();
  }, [isLoaded]);

  const cleanupProjectPolygonListeners = useCallback(() => {
    projectPolygonListenersRef.current.forEach((listener) => listener.remove());
    projectPolygonListenersRef.current = [];
  }, []);

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
    if (loteDrawingActive) return;

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
  }, [projectDrawingActive, onProjectPolygonChange, onProjectDrawingFinished, attachProjectPolygonListeners, loteDrawingActive, isLoaded]);

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
        fillOpacity: 0.1,
        strokeColor: '#1D4ED8',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        editable: true,
        draggable: true,
      });
      projectPolygonRef.current = polygon;
      attachProjectPolygonListeners(polygon);
      if (!polygonFitRef.current) {
        map.fitBounds(bounds);
        polygonFitRef.current = true;
      }
    } else {
      projectPolygonSilentUpdateRef.current = true;
      projectPolygonRef.current.setPath(path);
      projectPolygonSilentUpdateRef.current = false;
      if (!polygonFitRef.current) {
        map.fitBounds(bounds);
        polygonFitRef.current = true;
      }
    }
  }, [projectPolygon, attachProjectPolygonListeners, cleanupProjectPolygonListeners, isLoaded]);

  // Dibujo manual de lotes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const drawingManager = drawingManagerRef.current;
    if (!map || !drawingManager) return;

    if (!loteDrawingActive) {
      if (drawingContextRef.current === 'lote') {
        drawingManager.setDrawingMode(null);
        drawingContextRef.current = null;
      }
      return;
    }

    drawingContextRef.current = 'lote';
    drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);

    const listener = google.maps.event.addListener(
      drawingManager,
      'overlaycomplete',
      (event: google.maps.drawing.OverlayCompleteEvent) => {
        if (event.type !== google.maps.drawing.OverlayType.POLYGON) return;

        const polygon = event.overlay as google.maps.Polygon;
        const vertices = polygon
          .getPath()
          .getArray()
          .map((latLng) => [latLng.lat(), latLng.lng()] as [number, number]);

        polygon.setMap(null);
        drawingManager.setDrawingMode(null);
        drawingContextRef.current = null;
        onLotePolygonComplete?.(vertices);
        onLoteDrawingFinished?.();
      }
    );

    return () => {
      listener.remove();
      if (drawingContextRef.current === 'lote') {
        drawingManager.setDrawingMode(null);
        drawingContextRef.current = null;
      }
    };
  }, [loteDrawingActive, onLotePolygonComplete, onLoteDrawingFinished, isLoaded]);

  // Gestionar overlay del plano
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!planosUrl || !overlayBounds) {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      return;
    }

    if (typeof window === 'undefined') return;
    const googleNamespace = (window as typeof window & { google?: typeof google }).google;
    if (!googleNamespace?.maps?.OverlayView) return;

    const [[swLat, swLng], [neLat, neLng]] = overlayBounds;
    const bounds = new googleNamespace.maps.LatLngBounds(
      new googleNamespace.maps.LatLng(swLat, swLng),
      new googleNamespace.maps.LatLng(neLat, neLng)
    );

    class GroundOverlayWithRotation extends googleNamespace.maps.OverlayView {
      private url: string;
      private bounds: google.maps.LatLngBounds;
      private rotation: number;
      private opacity: number;
      private container?: HTMLDivElement;
      private image?: HTMLImageElement;

      constructor(url: string, bounds: google.maps.LatLngBounds, rotation = 0, opacity = 0.7) {
        super();
        this.url = url;
        this.bounds = bounds;
        this.rotation = rotation;
        this.opacity = opacity;
      }

      onAdd() {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.overflow = 'visible';

        const img = document.createElement('img');
        img.src = this.url;
        img.style.position = 'absolute';
        img.style.top = '50%';
        img.style.left = '50%';
        img.style.transform = `translate(-50%, -50%) rotate(${this.rotation}deg)`;
        img.style.transformOrigin = 'center center';
        img.style.opacity = `${this.opacity}`;
        img.style.pointerEvents = 'none';

        div.appendChild(img);
        this.container = div;
        this.image = img;

        const panes = this.getPanes();
        if (!panes || !panes.overlayLayer) {
          console.warn('No se pudo obtener el overlayLayer para el plano');
          return;
        }
        panes.overlayLayer.appendChild(div);
      }

      draw() {
        if (!this.container) return;
        const projection = this.getProjection();
        if (!projection) return;

        const sw = projection.fromLatLngToDivPixel(this.bounds.getSouthWest());
        const ne = projection.fromLatLngToDivPixel(this.bounds.getNorthEast());
        if (!sw || !ne) return;

        const width = ne.x - sw.x;
        const height = sw.y - ne.y;

        this.container.style.left = `${sw.x}px`;
        this.container.style.top = `${ne.y}px`;
        this.container.style.width = `${width}px`;
        this.container.style.height = `${height}px`;

        if (this.image) {
          this.image.style.width = `${width}px`;
          this.image.style.height = `${height}px`;
          this.image.style.transform = `translate(-50%, -50%) rotate(${this.rotation}deg)`;
          this.image.style.opacity = `${this.opacity}`;
        }
      }

      onRemove() {
        if (this.container?.parentNode) {
          this.container.parentNode.removeChild(this.container);
        }
        this.container = undefined;
        this.image = undefined;
      }
    }

    const overlay = new GroundOverlayWithRotation(planosUrl, bounds, rotationDeg, overlayOpacity);
    overlay.setMap(map);
    overlayRef.current = overlay;
    if (!overlayFitRef.current) {
      map.fitBounds(bounds);
      overlayFitRef.current = true;
    }

    return () => {
      overlay.setMap(null);
      if (overlayRef.current === overlay) {
        overlayRef.current = null;
      }
    };
  }, [planosUrl, overlayBounds, rotationDeg, overlayOpacity, isLoaded]);

  useEffect(() => {
    if (!overlayBounds) {
      overlayFitRef.current = false;
    }
  }, [overlayBounds]);

  // Permitir edición del rectángulo del overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!overlayEditable || !overlayBounds) {
      overlayListenersRef.current.forEach((listener) => listener.remove());
      overlayListenersRef.current = [];
      if (overlayRectangleRef.current) {
        overlayRectangleRef.current.setMap(null);
        overlayRectangleRef.current = null;
      }
      return;
    }

    const [[swLat, swLng], [neLat, neLng]] = overlayBounds;
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(swLat, swLng),
      new google.maps.LatLng(neLat, neLng)
    );

    if (!overlayRectangleRef.current) {
      const rectangle = new google.maps.Rectangle({
        bounds,
        map,
        editable: true,
        draggable: true,
        fillOpacity: 0,
        strokeColor: '#2563EB',
        strokeOpacity: 0.8,
        strokeWeight: 2,
      });
      overlayRectangleRef.current = rectangle;

      const notifyBounds = () => {
        if (overlaySilentRef.current) return;
        if (!onOverlayBoundsChange) return;
        const rectBounds = rectangle.getBounds();
        if (!rectBounds) return;
        const ne = rectBounds.getNorthEast();
        const sw = rectBounds.getSouthWest();
        onOverlayBoundsChange([
          [sw.lat(), sw.lng()],
          [ne.lat(), ne.lng()],
        ]);
      };

      overlayListenersRef.current = [
        google.maps.event.addListener(rectangle, 'bounds_changed', notifyBounds),
        google.maps.event.addListener(rectangle, 'dragend', notifyBounds),
      ];
    } else {
      overlaySilentRef.current = true;
      overlayRectangleRef.current.setBounds(bounds);
      overlaySilentRef.current = false;
    }

    return () => {
      overlayListenersRef.current.forEach((listener) => listener.remove());
      overlayListenersRef.current = [];
    };
  }, [overlayEditable, overlayBounds, onOverlayBoundsChange]);

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

      // Solo renderizar lotes que tienen polígono
      if (!lote.plano_poligono || lote.plano_poligono.length < 3) {
        removeLote(lote.id);
        return;
      }

      const color = ESTADO_COLORES[lote.estado || 'desconocido'] || ESTADO_COLORES.desconocido;
      const isHighlighted = highlightLoteId === lote.id;

      // Convertir coordenadas a formato Google Maps
      const path = lote.plano_poligono.map(([lat, lng]) => ({ lat, lng }));

      // Crear o actualizar polígono
      if (!lotesPolygonsRef.current.has(lote.id)) {
        const polygon = new google.maps.Polygon({
          paths: path,
          strokeColor: color,
          strokeOpacity: isHighlighted ? 1 : 0.8,
          strokeWeight: isHighlighted ? 3 : 2,
          fillColor: color,
          fillOpacity: isHighlighted ? 0.5 : 0.35,
          map,
          draggable: false,
          editable: false,
          clickable: true,
        });
        lotesPolygonsRef.current.set(lote.id, polygon);
      } else {
        const polygon = lotesPolygonsRef.current.get(lote.id)!;
        polygon.setOptions({
          paths: path,
          strokeColor: color,
          strokeOpacity: isHighlighted ? 1 : 0.8,
          strokeWeight: isHighlighted ? 3 : 2,
          fillColor: color,
          fillOpacity: isHighlighted ? 0.5 : 0.35,
        });
      }

      // Calcular centro del polígono para la etiqueta
      const [latSum, lngSum] = lote.plano_poligono.reduce(
        (acc, pair) => [acc[0] + pair[0], acc[1] + pair[1]],
        [0, 0]
      );
      const center = {
        lat: latSum / lote.plano_poligono.length,
        lng: lngSum / lote.plano_poligono.length,
      };

      // Crear o actualizar label
      if (!lotesLabelsRef.current.has(lote.id)) {
        const label = new google.maps.Marker({
          position: center,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0,
          },
          label: {
            text: lote.codigo,
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 'bold',
            className: 'lote-label',
          },
          clickable: false,
          zIndex: 1000,
        });
        lotesLabelsRef.current.set(lote.id, label);
      } else {
        const label = lotesLabelsRef.current.get(lote.id)!;
        label.setOptions({
          position: center,
          label: {
            text: lote.codigo,
            color: '#ffffff',
            fontSize: isHighlighted ? '12px' : '11px',
            fontWeight: 'bold',
          },
        });
      }

      // Agregar event listeners al polígono
      const polygon = lotesPolygonsRef.current.get(lote.id)!;
      const existingListeners = lotesPolygonListenersRef.current.get(lote.id);
      if (existingListeners) {
        existingListeners.forEach((listener) => listener.remove());
      }

      const listeners: google.maps.MapsEventListener[] = [];
      listeners.push(
        polygon.addListener('click', () => {
          // Aquí se puede agregar lógica para seleccionar el lote
          console.log('Lote clickeado:', lote.codigo);
        })
      );
      lotesPolygonListenersRef.current.set(lote.id, listeners);
    });

    // Remover polígonos que ya no existen
    Array.from(lotesPolygonsRef.current.keys()).forEach((id) => {
      if (!seen.has(id)) {
        removeLote(id);
      }
    });
  }, [lotes, highlightLoteId, isLoaded]);

  const loadingFallback = useMemo(
    () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando Google Maps...</p>
        </div>
      </div>
    ),
    []
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
    if (!loteId) {
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
  }, [draggingLoteId, onPinDrop]);

  const legendItems = useMemo(
    () => ['disponible', 'reservado', 'vendido'] as const,
    []
  );

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
      >
        {isDragActive && (
          <div className="flex h-full w-full items-center justify-center bg-blue-500/10">
            <div className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-blue-700 shadow">
              Suelta aquí para ubicar el lote
            </div>
          </div>
        )}
      </div>

      {/* Barra de búsqueda */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 flex flex-col gap-2 w-72 z-[1000]">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Buscar ubicación</div>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Buscar dirección o referencia"
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {onToggleFull && (
          <button
            onClick={onToggleFull}
            className="text-sm text-blue-600 hover:text-blue-700 text-left"
          >
            {fullScreenActive ? 'Salir de pantalla completa' : 'Pantalla completa'}
          </button>
        )}
      </div>

      {/* Leyenda */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow flex flex-col gap-2 px-4 py-3 text-xs text-gray-700">
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
