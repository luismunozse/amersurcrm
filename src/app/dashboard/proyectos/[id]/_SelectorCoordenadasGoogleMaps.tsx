'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
// Google Maps se carga dinámicamente via script tag

interface Coordenada {
  id: string;
  lat: number;
  lng: number;
  nombre: string;
}

interface SelectorCoordenadasGoogleMapsProps {
  planosUrl?: string | null;
  onCoordenadasChange: (coordenadas: Coordenada[]) => void;
  coordenadasIniciales?: Coordenada[];
  readonly?: boolean;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function SelectorCoordenadasGoogleMaps({
  planosUrl,
  onCoordenadasChange,
  coordenadasIniciales = [],
  readonly = false
}: SelectorCoordenadasGoogleMapsProps) {
  const [coordenadas, setCoordenadas] = useState<Coordenada[]>(coordenadasIniciales);
  const [isLoaded, setIsLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const overlayRef = useRef<google.maps.GroundOverlay | null>(null);

  // Coordenadas de Lima, Perú como centro por defecto
  const defaultCenter: [number, number] = [-12.0464, -77.0428];
  const defaultZoom = 13;

  // Inicializar Google Maps
  useEffect(() => {
    const initMap = async () => {
      if (!GOOGLE_MAPS_API_KEY) {
        console.error('Google Maps API Key no configurada');
        return;
      }

      try {
        // Verificar si Google Maps ya está cargado
        if ((window as any).google?.maps) {
          setIsLoaded(true);
          return;
        }

        // Verificar si el script ya existe
        const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
        if (existingScript) {
          // Si existe, solo esperar a que cargue
          const checkLoaded = () => {
            if ((window as any).google?.maps) {
              setIsLoaded(true);
            } else {
              setTimeout(checkLoaded, 100);
            }
          };
          checkLoaded();
          return;
        }

        // Crear y cargar el script de Google Maps
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry&v=weekly`;
        script.async = true;
        script.defer = true;
        script.id = 'google-maps-selector-script';
        
        script.onload = () => {
          setIsLoaded(true);
        };
        
        script.onerror = () => {
          console.error('Error cargando Google Maps Script');
        };

        document.head.appendChild(script);

        return () => {
          // Cleanup: remover script si es necesario
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        };
      } catch (error) {
        console.error('Error inicializando Google Maps:', error);
      }
    };

    initMap();
  }, []);

  // Crear mapa cuando esté cargado
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: defaultCenter[0], lng: defaultCenter[1] },
      zoom: defaultZoom,
      mapTypeId: google.maps.MapTypeId.SATELLITE,
      mapTypeControl: true,
      zoomControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;

    // Agregar listener para clics en el mapa
    if (!readonly) {
      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          handleMapClick(e.latLng);
        }
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        google.maps.event.clearInstanceListeners(mapInstanceRef.current);
      }
    };
  }, [isLoaded, readonly]);

  // Sincronizar coordenadas iniciales
  useEffect(() => {
    setCoordenadas(coordenadasIniciales);
  }, [coordenadasIniciales]);

  // Notificar cambios en coordenadas
  useEffect(() => {
    onCoordenadasChange(coordenadas);
  }, [coordenadas, onCoordenadasChange]);

  // Manejar clics en el mapa
  const handleMapClick = (latLng: google.maps.LatLng) => {
    if (readonly) return;
    
    const lat = latLng.lat();
    const lng = latLng.lng();
    const nuevaCoordenada: Coordenada = {
      id: Date.now().toString(),
      lat,
      lng,
      nombre: `Lote ${coordenadas.length + 1}`
    };
    
    setCoordenadas(prev => [...prev, nuevaCoordenada]);
    toast.success(`Coordenada agregada: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  };

  // Eliminar coordenada
  const eliminarCoordenada = (id: string) => {
    setCoordenadas(prev => prev.filter(coord => coord.id !== id));
    toast.success('Coordenada eliminada');
  };

  // Actualizar nombre de coordenada
  const actualizarNombreCoordenada = (id: string, nuevoNombre: string) => {
    setCoordenadas(prev => 
      prev.map(coord => 
        coord.id === id ? { ...coord, nombre: nuevoNombre } : coord
      )
    );
  };

  // Limpiar todas las coordenadas
  const limpiarCoordenadas = () => {
    if (coordenadas.length === 0) return;
    if (!confirm('¿Estás seguro de que quieres eliminar todas las coordenadas?')) return;
    
    setCoordenadas([]);
    toast.success('Todas las coordenadas han sido eliminadas');
  };

  // Actualizar marcadores
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Limpiar marcadores existentes
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Crear nuevos marcadores
    coordenadas.forEach(coord => {
      const marker = new google.maps.Marker({
        position: { lat: coord.lat, lng: coord.lng },
        map: mapInstanceRef.current,
        title: coord.nombre,
        draggable: !readonly,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#DC2626"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(24, 24),
        }
      });

      // Info window con controles
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 200px;">
            <div style="margin-bottom: 8px;">
              <input 
                type="text" 
                value="${coord.nombre}" 
                onchange="window.actualizarNombreCoordenada('${coord.id}', this.value)"
                style="width: 100%; padding: 4px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;"
                ${readonly ? 'readonly' : ''}
              />
            </div>
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">
              Lat: ${coord.lat.toFixed(6)}<br>
              Lng: ${coord.lng.toFixed(6)}
            </p>
            ${!readonly ? `
              <button 
                onclick="window.eliminarCoordenada('${coord.id}')" 
                style="background: #EF4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;"
              >
                Eliminar
              </button>
            ` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      // Listener para arrastrar marcador
      if (!readonly) {
        marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            setCoordenadas(prev => 
              prev.map(c => 
                c.id === coord.id 
                  ? { ...c, lat: newLat, lng: newLng }
                  : c
              )
            );
            toast.success(`Coordenada ${coord.nombre} actualizada`);
          }
        });
      }

      markersRef.current.push(marker);
    });
  }, [coordenadas, readonly]);

  // Actualizar overlay del plano si existe
  useEffect(() => {
    if (!mapInstanceRef.current || !planosUrl) return;

    // Remover overlay anterior si existe
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
    }

    // Crear bounds por defecto centrados en el mapa
    const center = mapInstanceRef.current.getCenter();
    if (!center) return;

    const lat = center.lat();
    const lng = center.lng();
    const offset = 0.01; // Ajustar según necesidades

    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(lat - offset, lng - offset),
      new google.maps.LatLng(lat + offset, lng + offset)
    );

    const overlay = new google.maps.GroundOverlay(planosUrl, bounds, {
      opacity: 0.8,
      clickable: false
    });

    overlay.setMap(mapInstanceRef.current);
    overlayRef.current = overlay;

    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
      }
    };
  }, [planosUrl]);

  // Exponer funciones globalmente para los popups
  useEffect(() => {
    (window as any).eliminarCoordenada = eliminarCoordenada;
    (window as any).actualizarNombreCoordenada = actualizarNombreCoordenada;
  }, []);

  if (!isLoaded) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-100 border rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      {!readonly && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            Haz clic en el mapa para agregar coordenadas de lotes
          </div>
          {coordenadas.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={limpiarCoordenadas}
              className="text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4 mr-1" />
              Limpiar Todo
            </Button>
          )}
        </div>
      )}

      {/* Mapa */}
      <div className="h-96 border rounded-lg overflow-hidden">
        <div ref={mapRef} className="w-full h-full" />
      </div>

      {/* Lista de coordenadas */}
      {coordenadas.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">
            Coordenadas Marcadas ({coordenadas.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {coordenadas.map((coord, index) => (
              <div key={coord.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex-1">
                  <div className="font-medium text-sm">{coord.nombre}</div>
                  <div className="text-xs text-gray-500">
                    {coord.lat.toFixed(6)}, {coord.lng.toFixed(6)}
                  </div>
                </div>
                {!readonly && (
                  <button
                    onClick={() => eliminarCoordenada(coord.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Eliminar coordenada"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
