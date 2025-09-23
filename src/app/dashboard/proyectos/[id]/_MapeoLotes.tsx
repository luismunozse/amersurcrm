'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, ImageOverlay, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Upload, MapPin, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { subirPlanos, eliminarPlanos, guardarCoordenadasMultiples, obtenerCoordenadasProyecto } from './_actions';

// Fix para iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapeoLotesProps {
  proyectoId: string;
  planosUrl: string | null;
  proyectoNombre: string;
}

interface Coordenada {
  id: string;
  lat: number;
  lng: number;
  nombre: string;
}

export default function MapeoLotes({ proyectoId, planosUrl, proyectoNombre }: MapeoLotesProps) {
  const [coordenadas, setCoordenadas] = useState<Coordenada[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [imageBounds, setImageBounds] = useState<L.LatLngBounds | null>(null);
  const mapRef = useRef<L.Map>(null);

  // Coordenadas de Lima, Perú como centro por defecto
  const defaultCenter: [number, number] = [-12.0464, -77.0428];
  const defaultZoom = 13;

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato no válido. Use JPG, PNG o WEBP');
      return;
    }

    // Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('El archivo es muy grande. Máximo 5MB');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('planos', file);

    try {
      await subirPlanos(proyectoId, formData);
      toast.success('Plano subido correctamente');
      // Recargar la página para mostrar el nuevo plano
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error subiendo plano');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePlano = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar el plano?')) return;

    try {
      await eliminarPlanos(proyectoId);
      toast.success('Plano eliminado correctamente');
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error eliminando plano');
    }
  };

  const handleMapClick = (e: L.LeafletMouseEvent) => {
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

  const guardarCoordenadas = async () => {
    if (coordenadas.length === 0) {
      toast.error('No hay coordenadas para guardar');
      return;
    }

    try {
      const coordenadasParaGuardar = coordenadas.map(coord => ({
        loteId: coord.id,
        lat: coord.lat,
        lng: coord.lng,
        nombre: coord.nombre
      }));

      await guardarCoordenadasMultiples(proyectoId, coordenadasParaGuardar);
      toast.success(`${coordenadas.length} coordenadas guardadas correctamente`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error guardando coordenadas');
    }
  };

  // Componente interno para manejar clics en el mapa
  const MapClickHandler = () => {
    const map = useMap();
    
    useEffect(() => {
      const handleClick = (e: L.LeafletMouseEvent) => {
        handleMapClick(e);
      };

      map.on('click', handleClick);
      return () => {
        map.off('click', handleClick);
      };
    }, [map]);

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
            <div class="p-2">
              <h3 class="font-semibold">${coord.nombre}</h3>
              <p class="text-sm text-gray-600">
                Lat: ${coord.lat.toFixed(6)}<br>
                Lng: ${coord.lng.toFixed(6)}
              </p>
              <button 
                onclick="eliminarCoordenada('${coord.id}')"
                class="mt-2 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
              >
                Eliminar
              </button>
            </div>
          `)
          .addTo(map);
        markers.push(marker);
      });

      return () => {
        markers.forEach(marker => marker.remove());
      };
    }, [coordenadas, map]);

    return null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Mapeo de Lotes - {proyectoNombre}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controles de subida de plano */}
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="flex-1">
              <h3 className="font-medium mb-2">Plano del Proyecto</h3>
              {planosUrl ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600">✓ Plano cargado</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeletePlano}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                    id="plano-upload"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="plano-upload"
                    className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg cursor-pointer hover:bg-crm-primary/90 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {isUploading ? 'Subiendo...' : 'Subir Plano'}
                  </label>
                  <span className="text-sm text-gray-500">
                    JPG, PNG, WEBP • Máx: 5MB
                  </span>
                </div>
              )}
            </div>
          </div>

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

          {/* Instrucciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Instrucciones:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Haz clic en el mapa para agregar coordenadas de lotes</li>
              <li>• Las coordenadas aparecerán como marcadores en el mapa</li>
              <li>• Haz clic en un marcador para ver detalles o eliminarlo</li>
              <li>• Guarda las coordenadas cuando hayas terminado</li>
            </ul>
          </div>

          {/* Lista de coordenadas */}
          {coordenadas.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Coordenadas seleccionadas ({coordenadas.length})</h4>
                <Button
                  onClick={guardarCoordenadas}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Guardar Coordenadas
                </Button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {coordenadas.map((coord) => (
                  <div
                    key={coord.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                  >
                    <span>
                      {coord.nombre}: {coord.lat.toFixed(6)}, {coord.lng.toFixed(6)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarCoordenada(coord.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}