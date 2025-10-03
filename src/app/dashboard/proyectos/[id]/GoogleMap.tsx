'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { importLibrary } from '@googlemaps/js-api-loader';

interface Coordenada {
  id: string;
  lat: number;
  lng: number;
  nombre: string;
}

interface LoteConUbicacion {
  id: string;
  codigo: string;
  estado?: string;
  data?: any;
}

interface GoogleMapProps {
  defaultCenter: [number, number];
  defaultZoom: number;
  coordenadas: Coordenada[];
  onMapClick: (lat: number, lng: number) => void;
  planosUrl?: string | null;
  overlayBounds?: [[number, number], [number, number]];
  calibrating?: boolean;
  onBoundsChange?: (bounds: [[number, number], [number, number]]) => void;
  rotationDeg?: number;
  overlayOpacity?: number;
  onToggleFull?: () => void;
  lotesConUbicacion?: LoteConUbicacion[];
  onRotationChange?: (rotation: number) => void;
  onScaleChange?: (scale: number) => void;
  onOpacityChange?: (opacity: number) => void;
  onPanChange?: (x: number, y: number) => void;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function GoogleMap({
  defaultCenter,
  defaultZoom,
  coordenadas,
  onMapClick,
  planosUrl,
  overlayBounds,
  calibrating = false,
  onBoundsChange,
  rotationDeg = 0,
  overlayOpacity = 0.7,
  onToggleFull,
  lotesConUbicacion = [],
  onRotationChange,
  onScaleChange,
  onOpacityChange,
  onPanChange,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const overlayRef = useRef<google.maps.GroundOverlay | null>(null);
  const calibrationRectangleRef = useRef<google.maps.Rectangle | null>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [firstCorner, setFirstCorner] = useState<google.maps.LatLng | null>(null);
  const [planeScale, setPlaneScale] = useState(1);
  const [planePan, setPlanePan] = useState({ x: 0, y: 0 });

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
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry,drawing&v=weekly`;
        script.async = true;
        script.defer = true;
        script.id = 'google-maps-script';
        
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
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: google.maps.ControlPosition.TOP_CENTER,
        mapTypeIds: [
          google.maps.MapTypeId.ROADMAP,
          google.maps.MapTypeId.SATELLITE,
          google.maps.MapTypeId.HYBRID,
          google.maps.MapTypeId.TERRAIN
        ]
      },
      zoomControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      gestureHandling: 'greedy'
    });

    mapInstanceRef.current = map;

    // Agregar listener para clics en el mapa
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        
        if (calibrating) {
          handleCalibrationClick(e.latLng);
        } else {
          onMapClick(lat, lng);
        }
      }
    });

    return () => {
      // Cleanup
      if (mapInstanceRef.current) {
        google.maps.event.clearInstanceListeners(mapInstanceRef.current);
      }
    };
  }, [isLoaded, defaultCenter, defaultZoom, calibrating, onMapClick]);

  // Manejar clics durante calibración
  const handleCalibrationClick = useCallback((latLng: google.maps.LatLng) => {
    if (!mapInstanceRef.current) return;

    if (!firstCorner) {
      setFirstCorner(latLng);
      console.log('Primera esquina seleccionada:', latLng.toString());
    } else {
      // Segunda esquina: crear bounds
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(firstCorner);
      bounds.extend(latLng);

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      
      const boundsArray: [[number, number], [number, number]] = [
        [sw.lat(), sw.lng()],
        [ne.lat(), ne.lng()]
      ];

      if (onBoundsChange) {
        onBoundsChange(boundsArray);
      }

      setFirstCorner(null);
      console.log('Bounds definidos:', boundsArray);
    }
  }, [firstCorner, onBoundsChange]);

  // Actualizar marcadores de coordenadas
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
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#DC2626"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(24, 24),
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${coord.nombre}</h3>
            <p style="margin: 0; font-size: 12px; color: #666;">
              Lat: ${coord.lat.toFixed(6)}<br>
              Lng: ${coord.lng.toFixed(6)}
            </p>
            <button onclick="window.eliminarCoordenada('${coord.id}')" 
                    style="margin-top: 8px; background: #EF4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">
              Eliminar
            </button>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });
  }, [coordenadas]);

  // Actualizar marcadores de lotes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    lotesConUbicacion.forEach(lote => {
      const data = lote.data ? 
        (typeof lote.data === 'string' ? JSON.parse(lote.data) : lote.data) : {};
      
      const planoPoint = data.plano_point;
      if (!planoPoint || !Array.isArray(planoPoint) || planoPoint.length !== 2) {
        return;
      }

      const [lat, lng] = planoPoint;
      
      // Determinar color según el estado del lote
      const getEstadoColor = (estado: string) => {
        switch (estado) {
          case 'disponible': return '#10B981';
          case 'reservado': return '#F59E0B';
          case 'vendido': return '#EF4444';
          default: return '#6B7280';
        }
      };

      const color = getEstadoColor(lote.estado || 'disponible');

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        title: `${lote.codigo} - ${lote.estado || 'Sin estado'}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Sombra -->
              <ellipse cx="20" cy="47" rx="8" ry="3" fill="rgba(0,0,0,0.2)"/>
              <!-- Pin principal -->
              <path d="M20 2C12.8 2 7 7.8 7 15c0 10.5 13 31 13 31s13-20.5 13-31c0-7.2-5.8-13-13-13z" fill="${color}" stroke="white" stroke-width="2"/>
              <!-- Círculo interior -->
              <circle cx="20" cy="15" r="8" fill="white" opacity="0.9"/>
              <!-- Texto del lote -->
              <text x="20" y="19" text-anchor="middle" fill="${color}" font-size="8" font-weight="bold">${lote.codigo.slice(-3)}</text>
              <!-- Indicador de estado -->
              <circle cx="20" cy="15" r="3" fill="${color}"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(40, 50),
          anchor: new google.maps.Point(20, 50)
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 16px; min-width: 280px; font-family: system-ui;">
            <!-- Header del lote -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;">
              <h3 style="margin: 0; font-size: 18px; font-weight: bold; color: #1f2937;">
                📍 ${lote.codigo}
              </h3>
              <span style="background: ${color}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                ${lote.estado || 'Sin estado'}
              </span>
            </div>
            
            <!-- Información de ubicación -->
            <div style="margin-bottom: 16px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px;">
                <div>
                  <div style="color: #6b7280; margin-bottom: 2px;">Latitud</div>
                  <div style="font-weight: 600; color: #374151;">${lat.toFixed(6)}</div>
                </div>
                <div>
                  <div style="color: #6b7280; margin-bottom: 2px;">Longitud</div>
                  <div style="font-weight: 600; color: #374151;">${lng.toFixed(6)}</div>
                </div>
              </div>
            </div>
            
            <!-- Gestión de estados -->
            <div style="margin-bottom: 16px;">
              <div style="color: #6b7280; font-size: 12px; margin-bottom: 8px;">Cambiar Estado:</div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button 
                  onclick="window.cambiarEstadoLote('${lote.id}', 'disponible')" 
                  style="background: #10B981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600; transition: all 0.2s;"
                  onmouseover="this.style.background='#059669'"
                  onmouseout="this.style.background='#10B981'"
                >
                  🟢 Disponible
                </button>
                <button 
                  onclick="window.cambiarEstadoLote('${lote.id}', 'reservado')" 
                  style="background: #F59E0B; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600; transition: all 0.2s;"
                  onmouseover="this.style.background='#D97706'"
                  onmouseout="this.style.background='#F59E0B'"
                >
                  🟡 Reservado
                </button>
                <button 
                  onclick="window.cambiarEstadoLote('${lote.id}', 'vendido')" 
                  style="background: #EF4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600; transition: all 0.2s;"
                  onmouseover="this.style.background='#DC2626'"
                  onmouseout="this.style.background='#EF4444'"
                >
                  🔴 Vendido
                </button>
              </div>
            </div>
            
            <!-- Acciones adicionales -->
            <div style="display: flex; gap: 8px; padding-top: 8px; border-top: 1px solid #e5e5e5;">
              <button 
                onclick="window.editarLoteInfo('${lote.id}')" 
                style="flex: 1; background: #3B82F6; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.2s;"
                onmouseover="this.style.background='#2563EB'"
                onmouseout="this.style.background='#3B82F6'"
              >
                ✏️ Editar Info
              </button>
              <button 
                onclick="window.removerUbicacionLote('${lote.id}')" 
                style="background: #EF4444; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.2s;"
                onmouseover="this.style.background='#DC2626'"
                onmouseout="this.style.background='#EF4444'"
              >
                🗑️ Quitar
              </button>
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });
  }, [lotesConUbicacion]);

  // Actualizar overlay del plano
  useEffect(() => {
    if (!mapInstanceRef.current || !planosUrl || !overlayBounds) return;

    // Remover overlay anterior si existe
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
    }

    const [[swLat, swLng], [neLat, neLng]] = overlayBounds;
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(swLat, swLng),
      new google.maps.LatLng(neLat, neLng)
    );

    const overlay = new google.maps.GroundOverlay(planosUrl, bounds, {
      opacity: overlayOpacity,
      clickable: false
    });

    overlay.setMap(mapInstanceRef.current);
    overlayRef.current = overlay;

    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
      }
    };
  }, [planosUrl, overlayBounds, overlayOpacity]);

  // Mostrar rectángulo durante calibración
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (calibrating && overlayBounds) {
      // Remover rectángulo anterior
      if (calibrationRectangleRef.current) {
        calibrationRectangleRef.current.setMap(null);
      }

      const [[swLat, swLng], [neLat, neLng]] = overlayBounds;
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(swLat, swLng),
        new google.maps.LatLng(neLat, neLng)
      );

      const rectangle = new google.maps.Rectangle({
        bounds: bounds,
        editable: true,
        draggable: true,
        fillColor: '#FF0000',
        fillOpacity: 0.1,
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
      });

      rectangle.setMap(mapInstanceRef.current);
      calibrationRectangleRef.current = rectangle;

      // Listener para cambios en el rectángulo
      rectangle.addListener('bounds_changed', () => {
        const newBounds = rectangle.getBounds();
        if (newBounds && onBoundsChange) {
          const ne = newBounds.getNorthEast();
          const sw = newBounds.getSouthWest();
          onBoundsChange([
            [sw.lat(), sw.lng()],
            [ne.lat(), ne.lng()]
          ]);
        }
      });
    } else {
      // Remover rectángulo cuando no estamos calibrando
      if (calibrationRectangleRef.current) {
        calibrationRectangleRef.current.setMap(null);
        calibrationRectangleRef.current = null;
      }
    }

    return () => {
      if (calibrationRectangleRef.current) {
        calibrationRectangleRef.current.setMap(null);
      }
    };
  }, [calibrating, overlayBounds, onBoundsChange]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Controles de overlay */}
      {planosUrl && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 space-y-2 min-w-[200px]">
          <div className="text-sm font-medium text-gray-700">Controles del Plano</div>
          
          {/* Control de opacidad */}
          <div>
            <label className="text-xs text-gray-600">Opacidad</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={overlayOpacity}
              onChange={(e) => onOpacityChange?.(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          {/* Control de rotación */}
          <div>
            <label className="text-xs text-gray-600">Rotación (°)</label>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={rotationDeg}
              onChange={(e) => onRotationChange?.(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          {/* Control de escala */}
          <div>
            <label className="text-xs text-gray-600">Escala</label>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={planeScale}
              onChange={(e) => {
                const scale = parseFloat(e.target.value);
                setPlaneScale(scale);
                onScaleChange?.(scale);
              }}
              className="w-full"
            />
          </div>
          
          {/* Botón de pantalla completa */}
          {onToggleFull && (
            <button
              onClick={onToggleFull}
              className="w-full bg-blue-600 text-white text-sm py-2 px-3 rounded hover:bg-blue-700 transition-colors"
            >
              Pantalla Completa
            </button>
          )}
        </div>
      )}

      {/* Instrucciones durante calibración */}
      {calibrating && (
        <div className="absolute bottom-4 left-4 bg-yellow-100 border border-yellow-400 rounded-lg p-3 max-w-md">
          <div className="text-sm font-medium text-yellow-800 mb-1">
            Modo Calibración Activo
          </div>
          <div className="text-xs text-yellow-700">
            {!firstCorner 
              ? "Haz clic en la primera esquina donde quieres posicionar el plano"
              : "Haz clic en la esquina opuesta para definir el área"
            }
          </div>
        </div>
      )}
    </div>
  );
}
