/**
 * Custom hook for managing Google Maps integration
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { MapConfig, MapPoint, OverlayBounds } from '@/types/proyectos';

interface UseGoogleMapsOptions {
  apiKey?: string;
  libraries?: string[];
  onMapLoad?: (map: google.maps.Map) => void;
}

interface UseGoogleMapsReturn {
  isLoaded: boolean;
  loadError: Error | null;
  map: google.maps.Map | null;
  initMap: (element: HTMLElement, config: MapConfig) => void;
  clearMap: () => void;
}

/**
 * Hook para gestionar la inicialización y carga de Google Maps
 */
export function useGoogleMaps(options: UseGoogleMapsOptions = {}): UseGoogleMapsReturn {
  const { apiKey, libraries = ['drawing', 'geometry', 'places'], onMapLoad } = options;

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    // Check if already loaded
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true));
      existingScript.addEventListener('error', () => setLoadError(new Error('Failed to load Google Maps')));
      return;
    }

    // Load the script
    if (apiKey) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries.join(',')}`;
      script.async = true;
      script.defer = true;

      script.addEventListener('load', () => {
        setIsLoaded(true);
      });

      script.addEventListener('error', () => {
        setLoadError(new Error('Failed to load Google Maps API'));
      });

      document.head.appendChild(script);
      scriptRef.current = script;

      return () => {
        if (scriptRef.current && document.head.contains(scriptRef.current)) {
          document.head.removeChild(scriptRef.current);
        }
      };
    }
  }, [apiKey, libraries]);

  const initMap = useCallback(
    (element: HTMLElement, config: MapConfig) => {
      if (!isLoaded || !window.google?.maps) {
        console.error('Google Maps not loaded yet');
        return;
      }

      const mapInstance = new google.maps.Map(element, {
        center: config.center,
        zoom: config.zoom,
        mapTypeId: config.mapTypeId as google.maps.MapTypeId,
        styles: config.styles,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });

      mapRef.current = mapInstance;
      setMap(mapInstance);
      onMapLoad?.(mapInstance);
    },
    [isLoaded, onMapLoad]
  );

  const clearMap = useCallback(() => {
    if (mapRef.current) {
      // Clear all overlays and listeners
      google.maps.event.clearInstanceListeners(mapRef.current);
      mapRef.current = null;
      setMap(null);
    }
  }, []);

  return {
    isLoaded,
    loadError,
    map,
    initMap,
    clearMap,
  };
}

/**
 * Hook para gestionar un Ground Overlay con rotación
 */
export function useGroundOverlay(map: google.maps.Map | null) {
  const [overlay, setOverlay] = useState<google.maps.GroundOverlay | null>(null);

  const createOverlay = useCallback(
    (imageUrl: string, bounds: OverlayBounds, _rotation: number = 0) => {
      if (!map || !window.google?.maps) return null;

      // Remove existing overlay
      if (overlay) {
        overlay.setMap(null);
      }

      const googleBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(bounds.south, bounds.west),
        new google.maps.LatLng(bounds.north, bounds.east)
      );

      const newOverlay = new google.maps.GroundOverlay(imageUrl, googleBounds, {
        opacity: 0.8,
        clickable: false,
      });

      newOverlay.setMap(map);
      setOverlay(newOverlay);

      return newOverlay;
    },
    [map, overlay]
  );

  const updateOverlay = useCallback(
    (imageUrl?: string, bounds?: OverlayBounds, rotation?: number) => {
      if (!overlay) return;

      if (imageUrl) {
        // To update image, we need to recreate the overlay
        if (bounds !== undefined) {
          createOverlay(imageUrl, bounds, rotation);
        }
      }

      if (bounds) {
        const googleBounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(bounds.south, bounds.west),
          new google.maps.LatLng(bounds.north, bounds.east)
        );
        overlay.setMap(null);
        const newOverlay = new google.maps.GroundOverlay(
          overlay.getUrl() || '',
          googleBounds,
          { opacity: overlay.getOpacity() || 0.8 }
        );
        newOverlay.setMap(overlay.getMap());
        setOverlay(newOverlay);
      }
    },
    [overlay, createOverlay]
  );

  const removeOverlay = useCallback(() => {
    if (overlay) {
      overlay.setMap(null);
      setOverlay(null);
    }
  }, [overlay]);

  return {
    overlay,
    createOverlay,
    updateOverlay,
    removeOverlay,
  };
}

/**
 * Hook para gestionar el DrawingManager de Google Maps
 */
export function useDrawingManager(
  map: google.maps.Map | null,
  onPolygonComplete?: (polygon: google.maps.Polygon) => void
) {
  const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  useEffect(() => {
    if (!map || !window.google?.maps?.drawing) return;

    const manager = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [google.maps.drawing.OverlayType.POLYGON],
      },
      polygonOptions: {
        fillColor: '#3b82f6',
        fillOpacity: 0.3,
        strokeWeight: 2,
        strokeColor: '#2563eb',
        clickable: true,
        editable: true,
        zIndex: 1,
      },
    });

    manager.setMap(map);

    if (onPolygonComplete) {
      google.maps.event.addListener(manager, 'polygoncomplete', (polygon: google.maps.Polygon) => {
        onPolygonComplete(polygon);
        manager.setDrawingMode(null);
        setIsDrawingMode(false);
      });
    }

    setDrawingManager(manager);

    return () => {
      google.maps.event.clearInstanceListeners(manager);
      manager.setMap(null);
    };
  }, [map, onPolygonComplete]);

  const enableDrawing = useCallback(() => {
    if (drawingManager) {
      drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
      setIsDrawingMode(true);
    }
  }, [drawingManager]);

  const disableDrawing = useCallback(() => {
    if (drawingManager) {
      drawingManager.setDrawingMode(null);
      setIsDrawingMode(false);
    }
  }, [drawingManager]);

  return {
    drawingManager,
    isDrawingMode,
    enableDrawing,
    disableDrawing,
  };
}

/**
 * Hook para gestionar múltiples polígonos en el mapa
 */
export function useMapPolygons(map: google.maps.Map | null) {
  const [polygons, setPolygons] = useState<Map<string, google.maps.Polygon>>(new Map());

  const addPolygon = useCallback(
    (id: string, paths: MapPoint[], options?: google.maps.PolygonOptions) => {
      if (!map) return null;

      const polygon = new google.maps.Polygon({
        paths: paths.map((p) => ({ lat: p.lat, lng: p.lng })),
        map,
        ...options,
      });

      setPolygons((prev) => {
        const next = new Map(prev);
        // Remove old polygon if exists
        const old = next.get(id);
        if (old) {
          old.setMap(null);
        }
        next.set(id, polygon);
        return next;
      });

      return polygon;
    },
    [map]
  );

  const removePolygon = useCallback((id: string) => {
    setPolygons((prev) => {
      const next = new Map(prev);
      const polygon = next.get(id);
      if (polygon) {
        polygon.setMap(null);
        next.delete(id);
      }
      return next;
    });
  }, []);

  const clearPolygons = useCallback(() => {
    polygons.forEach((polygon) => {
      polygon.setMap(null);
    });
    setPolygons(new Map());
  }, [polygons]);

  const getPolygon = useCallback(
    (id: string) => {
      return polygons.get(id) || null;
    },
    [polygons]
  );

  const updatePolygonStyle = useCallback(
    (id: string, options: google.maps.PolygonOptions) => {
      const polygon = polygons.get(id);
      if (polygon) {
        polygon.setOptions(options);
      }
    },
    [polygons]
  );

  return {
    polygons,
    addPolygon,
    removePolygon,
    clearPolygons,
    getPolygon,
    updatePolygonStyle,
  };
}

/**
 * Utilidades para cálculos geométricos
 */
export const mapUtils = {
  /**
   * Calcula el área de un polígono en metros cuadrados
   */
  calculatePolygonArea(paths: MapPoint[]): number {
    if (!window.google?.maps?.geometry) return 0;

    const googlePaths = paths.map((p) => new google.maps.LatLng(p.lat, p.lng));
    return google.maps.geometry.spherical.computeArea(googlePaths);
  },

  /**
   * Calcula el centro de un polígono
   */
  calculatePolygonCenter(paths: MapPoint[]): MapPoint {
    const bounds = new google.maps.LatLngBounds();
    paths.forEach((p) => bounds.extend(new google.maps.LatLng(p.lat, p.lng)));
    const center = bounds.getCenter();
    return { lat: center.lat(), lng: center.lng() };
  },

  /**
   * Convierte un polígono de Google Maps a coordenadas GeoJSON
   */
  polygonToGeoJSON(polygon: google.maps.Polygon): number[][][] {
    const paths = polygon.getPath();
    const coordinates: number[][] = [];

    for (let i = 0; i < paths.getLength(); i++) {
      const point = paths.getAt(i);
      coordinates.push([point.lng(), point.lat()]);
    }

    // Close the polygon
    if (coordinates.length > 0) {
      coordinates.push(coordinates[0]);
    }

    return [coordinates];
  },

  /**
   * Convierte coordenadas GeoJSON a paths de Google Maps
   */
  geoJSONToMapPaths(coordinates: number[][][]): MapPoint[] {
    if (!coordinates[0]) return [];
    return coordinates[0].map((coord) => ({
      lng: coord[0],
      lat: coord[1],
    }));
  },
};
