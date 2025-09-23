'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Upload, MapPin, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { subirPlanos, eliminarPlanos, guardarCoordenadasMultiples, obtenerCoordenadasProyecto, guardarOverlayBounds } from './_actions';

// (Leaflet se carga sólo en cliente dentro de LeafletMap)

interface MapeoLotesProps {
  proyectoId: string;
  planosUrl: string | null;
  proyectoNombre: string;
  initialBounds?: [[number, number],[number, number]] | null;
  initialRotation?: number | null;
}

interface Coordenada {
  id: string;
  lat: number;
  lng: number;
  nombre: string;
}

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false });

export default function MapeoLotes({ proyectoId, planosUrl, proyectoNombre, initialBounds, initialRotation }: MapeoLotesProps) {
  const [coordenadas, setCoordenadas] = useState<Coordenada[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [overlayBounds, setOverlayBounds] = useState<[[number, number],[number, number]] | undefined>(initialBounds || undefined);
  const [placing, setPlacing] = useState(false);
  const [firstCorner, setFirstCorner] = useState<[number, number] | null>(null);
  const [rotation, setRotation] = useState(initialRotation ?? 0);
  // Permite seguir el flujo seleccionar zona -> subir plano sin recargar
  const [planUrl, setPlanUrl] = useState<string | null>(planosUrl);

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
      const res = await subirPlanos(proyectoId, formData) as unknown as { success: boolean; url?: string };
      if (res && (res as any).url) {
        setPlanUrl((res as any).url);
      }
      toast.success('Plano subido correctamente');
      // Si ya hay bounds marcados, se mostrará sobre esa zona automáticamente
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

  const handleMapClick = (lat: number, lng: number) => {
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

  const guardarBounds = async () => {
    if (!overlayBounds) {
      toast.error('Ajusta las esquinas del plano antes de guardar');
      return;
    }
    try {
      await guardarOverlayBounds(proyectoId, overlayBounds, rotation);
      toast.success('Calibración del plano guardada');
      setCalibrating(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando calibración');
    }
  };

  const onMapClickCoord = (lat: number, lng: number) => {
    // Si estamos marcando zona para el plano, usar los dos clics para fijar bounds
    if (calibrating && placing) {
      if (!firstCorner) {
        setFirstCorner([lat, lng]);
        toast.success('Esquina 1 fijada. Haz clic para fijar esquina 2');
      } else {
        const swLat = Math.min(firstCorner[0], lat);
        const swLng = Math.min(firstCorner[1], lng);
        const neLat = Math.max(firstCorner[0], lat);
        const neLng = Math.max(firstCorner[1], lng);
        const bounds: [[number, number], [number, number]] = [[swLat, swLng], [neLat, neLng]];
        setOverlayBounds(bounds);
        setFirstCorner(null);
        setPlacing(false);
        toast.success('Zona del plano establecida. Puedes guardar la calibración');
      }
      return;
    }
    // Comportamiento normal: agregar coordenadas de lotes
    handleMapClick(lat, lng);
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
          {/* Controles de subida/calibración de plano */}
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="flex-1">
              <h3 className="font-medium mb-2">Plano del Proyecto</h3>
              {planUrl ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600">✓ Plano cargado</span>
                  <button
                    type="button"
                    onClick={() => setCalibrating((v) => !v)}
                    className={`px-3 py-2 rounded-lg border ${calibrating ? 'bg-crm-primary text-white border-crm-primary' : 'text-crm-text-primary bg-crm-card hover:bg-crm-card-hover border-crm-border'}`}
                  >
                    {calibrating ? 'Calibrando…' : 'Calibrar plano'}
                  </button>
                  {calibrating && (
                    <button
                      type="button"
                      onClick={() => { setPlacing(true); setFirstCorner(null); toast('Haz dos clics en el mapa para ubicar el plano (esquina 1 y 2)'); }}
                      className="px-3 py-2 rounded-lg border text-crm-text-primary bg-crm-card hover:bg-crm-card-hover border-crm-border"
                    >
                      Marcar zona en mapa
                    </button>
                  )}
                  {calibrating && (
                    <button
                      type="button"
                      onClick={guardarBounds}
                      className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                    >
                      Guardar calibración
                    </button>
                  )}
                  {calibrating && (
                    <div className="flex items-center gap-2 ml-2">
                      <label className="text-sm text-crm-text-muted">Rotación</label>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={1}
                        value={rotation}
                        onChange={(e)=>setRotation(parseInt(e.target.value))}
                      />
                      <span className="text-sm text-crm-text-primary w-10 text-right">{rotation}°</span>
                    </div>
                  )}
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
                  {/* Permitir marcar zona aun sin plano para seguir el flujo */}
                  <button
                    type="button"
                    onClick={() => { setCalibrating(true); setPlacing(true); setFirstCorner(null); toast('Haz dos clics en el mapa para ubicar el plano (esquina 1 y 2)'); }}
                    className="ml-2 px-3 py-2 rounded-lg border text-crm-text-primary bg-crm-card hover:bg-crm-card-hover border-crm-border"
                  >
                    Marcar zona primero
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mapa */}
          <div className="h-96 border rounded-lg overflow-hidden">
            <LeafletMap
              defaultCenter={defaultCenter}
              defaultZoom={defaultZoom}
              coordenadas={coordenadas}
              onMapClick={onMapClickCoord}
              planosUrl={planUrl}
              overlayBounds={overlayBounds}
              calibrating={calibrating}
              onBoundsChange={(b) => setOverlayBounds(b)}
              rotationDeg={rotation}
            />
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