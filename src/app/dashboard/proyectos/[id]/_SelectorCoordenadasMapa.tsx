'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, ImageOverlay, useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { MapPin, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

// Fix para iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Coordenada {
  id: string;
  lat: number;
  lng: number;
  nombre: string;
}

interface SelectorCoordenadasMapaProps {
  planosUrl: string | null;
  onCoordenadasChange: (coordenadas: Coordenada[]) => void;
  coordenadasIniciales?: Coordenada[];
  readonly?: boolean;
}

export default function SelectorCoordenadasMapa({
  planosUrl,
  onCoordenadasChange,
  coordenadasIniciales = [],
  readonly = false
}: SelectorCoordenadasMapaProps) {
  const [coordenadas, setCoordenadas] = useState<Coordenada[]>(coordenadasIniciales);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [imageBounds, setImageBounds] = useState<L.LatLngBounds | null>(null);
  const mapRef = useRef<L.Map>(null);

  // Coordenadas de Lima, Perú como centro por defecto
  const defaultCenter: [number, number] = [-12.0464, -77.0428];
  const defaultZoom = 13;

  useEffect(() => {
    setCoordenadas(coordenadasIniciales);
  }, [coordenadasIniciales]);

  useEffect(() => {
    onCoordenadasChange(coordenadas);
  }, [coordenadas, onCoordenadasChange]);

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (readonly) return;
    
    const { lat, lng } = e.latlng;
    const nuevaCoordenada: Coordenada = {
      id: Date.now().toString(),
      lat,
      lng,
      nombre: `Lote ${coordenadas.length + 1}`
    };
    
    setCoordenadas(prev => [...prev, nuevaCoordenada]);
    toast.success(`Coordenada agregada: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  };

  const eliminarCoordenada = (id: string) => {
    setCoordenadas(prev => prev.filter(coord => coord.id !== id));
    toast.success('Coordenada eliminada');
  };

  const actualizarNombreCoordenada = (id: string, nuevoNombre: string) => {
    setCoordenadas(prev => 
      prev.map(coord => 
        coord.id === id ? { ...coord, nombre: nuevoNombre } : coord
      )
    );
  };

  const limpiarCoordenadas = () => {
    if (coordenadas.length === 0) return;
    if (!confirm('¿Estás seguro de que quieres eliminar todas las coordenadas?')) return;
    
    setCoordenadas([]);
    toast.success('Todas las coordenadas han sido eliminadas');
  };

  // Componente interno para manejar clics en el mapa
  const MapClickHandler = () => {
    const map = useMap();
    
    useEffect(() => {
      const handleClick = (e: L.LeafletMouseEvent) => {
        handleMapClick(e);
      };

      if (!readonly) {
        map.on('click', handleClick);
      }
      
      return () => {
        map.off('click', handleClick);
      };
    }, [map, readonly]);

    return null;
  };

  // Componente para mostrar marcadores de coordenadas
  const CoordenadasMarkers = () => {
    const map = useMap();
    
    useEffect(() => {
      const markers: L.Marker[] = [];
      
      coordenadas.forEach(coord => {
        const marker = L.marker([coord.lat, coord.lng])
          .bindPopup(`
            <div class="p-2 min-w-[200px]">
              <h3 class="font-semibold mb-2">${coord.nombre}</h3>
              <div class="space-y-2">
                <div class="text-sm text-gray-600">
                  <strong>Lat:</strong> ${coord.lat.toFixed(6)}<br>
                  <strong>Lng:</strong> ${coord.lng.toFixed(6)}
                </div>
                ${!readonly ? `
                  <div class="flex gap-1">
                    <input 
                      type="text" 
                      value="${coord.nombre}" 
                      onchange="actualizarNombreCoordenada('${coord.id}', this.value)"
                      class="w-full px-2 py-1 text-xs border rounded"
                      placeholder="Nombre del lote"
                    />
                  </div>
                  <button 
                    onclick="eliminarCoordenada('${coord.id}')"
                    class="w-full px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                  >
                    Eliminar
                  </button>
                ` : ''}
              </div>
            </div>
          `)
          .addTo(map);
        markers.push(marker);
      });

      return () => {
        markers.forEach(marker => marker.remove());
      };
    }, [coordenadas, map, readonly]);

    return null;
  };

  // Exponer funciones globalmente para los popups
  useEffect(() => {
    (window as any).eliminarCoordenada = eliminarCoordenada;
    (window as any).actualizarNombreCoordenada = actualizarNombreCoordenada;
  }, []);

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
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Imagen del plano si existe */}
          {planosUrl && imageBounds && (
            <ImageOverlay
              url={planosUrl}
              bounds={imageBounds}
              opacity={0.8}
            />
          )}
          
          <MapClickHandler />
          <CoordenadasMarkers />
        </MapContainer>
      </div>

      {/* Lista de coordenadas */}
      {coordenadas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5" />
              Coordenadas Seleccionadas ({coordenadas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {coordenadas.map((coord, index) => (
                <div
                  key={coord.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {!readonly ? (
                        <input
                          type="text"
                          value={coord.nombre}
                          onChange={(e) => actualizarNombreCoordenada(coord.id, e.target.value)}
                          className="font-medium bg-transparent border-none outline-none"
                          placeholder="Nombre del lote"
                        />
                      ) : (
                        <span className="font-medium">{coord.nombre}</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Lat: {coord.lat.toFixed(6)} | Lng: {coord.lng.toFixed(6)}
                    </div>
                  </div>
                  {!readonly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarCoordenada(coord.id)}
                      className="text-red-600 hover:text-red-700 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instrucciones */}
      {coordenadas.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Instrucciones:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Haz clic en el mapa para agregar coordenadas de lotes</li>
            <li>• Las coordenadas aparecerán como marcadores en el mapa</li>
            <li>• Haz clic en un marcador para editar el nombre o eliminarlo</li>
            <li>• Usa el botón "Limpiar Todo" para eliminar todas las coordenadas</li>
          </ul>
        </div>
      )}
    </div>
  );
}
