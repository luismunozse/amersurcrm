'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Upload, MapPin, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { subirPlanos, eliminarPlanos, guardarCoordenadasMultiples, obtenerCoordenadasProyecto, guardarOverlayBounds, actualizarLote } from './_actions';

// (Leaflet se carga sólo en cliente dentro de LeafletMap)

interface MapeoLotesProps {
  proyectoId: string;
  planosUrl: string | null;
  proyectoNombre: string;
  initialBounds?: [[number, number],[number, number]] | null;
  initialRotation?: number | null;
  lotes?: Array<{ id: string; codigo: string; data?: any }>;
}

interface Coordenada {
  id: string;
  lat: number;
  lng: number;
  nombre: string;
}

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false });

export default function MapeoLotes({ proyectoId, planosUrl, proyectoNombre, initialBounds, initialRotation, lotes = [] }: MapeoLotesProps) {
  const [coordenadas, setCoordenadas] = useState<Coordenada[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [overlayBounds, setOverlayBounds] = useState<[[number, number],[number, number]] | undefined>(initialBounds || undefined);
  const [placing, setPlacing] = useState(false);
  const [firstCorner, setFirstCorner] = useState<[number, number] | null>(null);
  const [rotation, setRotation] = useState(initialRotation ?? 0);
  // Permite seguir el flujo seleccionar zona -> subir plano sin recargar
  const [planUrl, setPlanUrl] = useState<string | null>(planosUrl);
  const [keepAspect, setKeepAspect] = useState(true);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);

  // Snap de rotación a ángulos cardinales si está cerca del umbral
  const snapAngle = (deg: number) => {
    const targets = [ -180, -90, 0, 90, 180 ];
    const threshold = 5; // grados
    for (const t of targets) {
      if (Math.abs(deg - t) <= threshold) return t;
    }
    return deg;
  };

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
    
    // Si estamos asignando un pin a un lote seleccionado
    if (selectedLoteId) {
      const loteSeleccionado = lotes.find(l => l.id === selectedLoteId);
      if (!loteSeleccionado) {
        toast.error('Lote no encontrado');
        return;
      }

      console.log('Lote seleccionado:', loteSeleccionado);
      console.log('Coordenadas del clic:', { lat, lng });

      // Mostrar confirmación antes de guardar
      const confirmar = confirm(
        `¿Ubicar el lote ${loteSeleccionado.codigo} en las coordenadas ${lat.toFixed(6)}, ${lng.toFixed(6)}?`
      );
      
      if (confirmar) {
        // Crear FormData con los datos del lote
        const fd = new FormData();
        
        // Obtener datos existentes del lote
        const dataExistente = loteSeleccionado.data ? 
          (typeof loteSeleccionado.data === 'string' ? 
            JSON.parse(loteSeleccionado.data) : 
            loteSeleccionado.data) : {};
        
        console.log('Datos existentes del lote:', dataExistente);
        
        // Agregar la nueva ubicación en el plano
        const nuevaData = {
          ...dataExistente,
          plano_point: [lat, lng],
          ubicacion_plano: {
            lat: lat,
            lng: lng,
            fecha_ubicacion: new Date().toISOString()
          }
        };
        
        console.log('Nueva data a guardar:', nuevaData);
        
        fd.append('data', JSON.stringify(nuevaData));
        fd.append('proyecto_id', proyectoId);
        
        actualizarLote(selectedLoteId, fd as any)
          .then(() => {
            console.log('Lote actualizado exitosamente');
            toast.success(`Lote ${loteSeleccionado.codigo} ubicado exitosamente en el plano`);
            setSelectedLoteId(null); // Deseleccionar el lote
            // Forzar recarga de la página para mostrar el pin
            window.location.reload();
          })
          .catch((error) => {
            console.error('Error actualizando lote:', error);
            toast.error(`Error ubicando el lote: ${error.message || 'Error desconocido'}`);
          });
      }
      return;
    }
    
    // Comportamiento normal: agregar coordenadas de lotes (solo si no hay lote seleccionado)
    handleMapClick(lat, lng);
  };

  // Helpers de bounds
  const getCenterFromBounds = (b: [[number, number],[number, number]]) => {
    const lat = (b[0][0] + b[1][0]) / 2;
    const lng = (b[0][1] + b[1][1]) / 2;
    return [lat, lng] as [number, number];
  };
  const scaleBounds = (b: [[number, number],[number, number]], factor: number) => {
    const [clat, clng] = getCenterFromBounds(b);
    const halfLat = (b[1][0] - b[0][0]) / 2 * factor;
    const halfLng = (b[1][1] - b[0][1]) / 2 * factor;
    const sw: [number, number] = [clat - halfLat, clng - halfLng];
    const ne: [number, number] = [clat + halfLat, clng + halfLng];
    return [sw, ne] as [[number, number],[number, number]];
  };
  const onBoundsChangeWithAspect = (b: [[number, number],[number, number]]) => {
    if (!keepAspect || !overlayBounds) { setOverlayBounds(b); return; }
    const prev = overlayBounds;
    const swPrev = prev[0];
    const nePrev = prev[1];
    const sw = [...b[0]] as [number, number];
    const ne = [...b[1]] as [number, number];
    const prevLatSpan = Math.max(1e-9, nePrev[0] - swPrev[0]);
    const prevLngSpan = Math.max(1e-9, nePrev[1] - swPrev[1]);
    const ratio = prevLatSpan / prevLngSpan;
    const movedNE = Math.abs(ne[0]-nePrev[0]) + Math.abs(ne[1]-nePrev[1]) > Math.abs(sw[0]-swPrev[0]) + Math.abs(sw[1]-swPrev[1]);
    const lngSpan = Math.max(1e-9, ne[1] - sw[1]);
    const latSpan = ratio * lngSpan;
    if (movedNE) {
      ne[0] = sw[0] + latSpan;
    } else {
      sw[0] = ne[0] - latSpan;
    }
    setOverlayBounds([sw, ne]);
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
                        onChange={(e)=>setRotation(snapAngle(parseInt(e.target.value)))}
                        onMouseUp={(e)=>setRotation(snapAngle(parseInt((e.target as HTMLInputElement).value)))}
                        onTouchEnd={(e)=>setRotation(snapAngle(rotation))}
                      />
                      <span className="text-sm text-crm-text-primary w-12 text-right">{rotation}°</span>
                      <div className="flex items-center gap-1">
                        <button type="button" className="px-2 py-1 text-xs border border-crm-border rounded hover:bg-crm-card-hover" onClick={()=>setRotation(0)}>0°</button>
                        <button type="button" className="px-2 py-1 text-xs border border-crm-border rounded hover:bg-crm-card-hover" onClick={()=>setRotation(90)}>90°</button>
                        <button type="button" className="px-2 py-1 text-xs border border-crm-border rounded hover:bg-crm-card-hover" onClick={()=>setRotation(-90)}>-90°</button>
                      </div>
                    </div>
                  )}
                  {calibrating && overlayBounds && (
                    <div className="flex items-center gap-2 ml-2">
                      <label className="text-sm text-crm-text-muted">Escala</label>
                      <button type="button" className="px-2 py-1 text-xs border border-crm-border rounded hover:bg-crm-card-hover" onClick={()=>setOverlayBounds(scaleBounds(overlayBounds!, 0.95))}>–</button>
                      <button type="button" className="px-2 py-1 text-xs border border-crm-border rounded hover:bg-crm-card-hover" onClick={()=>setOverlayBounds(scaleBounds(overlayBounds!, 1.05))}>+</button>
                      <label className="inline-flex items-center gap-1 text-sm ml-2">
                        <input type="checkbox" checked={keepAspect} onChange={(e)=>setKeepAspect(e.target.checked)} />
                        Mantener proporción
                      </label>
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

          {/* Vinculación de lotes a un punto en el plano */}
          <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="font-medium text-blue-900">Vincular Lotes al Plano</h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <select
                  value={selectedLoteId || ''}
                  onChange={(e)=>setSelectedLoteId(e.target.value || null)}
                  className="px-3 py-2 border border-blue-300 rounded-lg bg-white text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar lote para ubicar</option>
                  {lotes.map(l => (
                    <option key={l.id} value={l.id}>{l.codigo}</option>
                  ))}
                </select>
                
                {selectedLoteId && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-blue-700 font-medium">
                      Modo ubicación activo
                    </span>
                  </div>
                )}
              </div>
              
              {selectedLoteId && (
                <div className="p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Instrucciones:</strong> Haz clic en el plano donde quieres ubicar el lote <strong>{lotes.find(l => l.id === selectedLoteId)?.codigo}</strong>. 
                    Se colocará un pin en esa ubicación y se guardará automáticamente.
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-blue-700 font-medium">Opacidad del plano</label>
                  <input 
                    type="range" 
                    min={0} 
                    max={100} 
                    value={overlayOpacity*100} 
                    onChange={(e)=>setOverlayOpacity(parseInt(e.target.value)/100)} 
                    className="w-20"
                  />
                  <span className="text-sm text-blue-600 w-10 text-right">{Math.round(overlayOpacity*100)}%</span>
                </div>
                
                {selectedLoteId && (
                  <button
                    onClick={() => setSelectedLoteId(null)}
                    className="px-3 py-1 text-xs text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                  >
                    Cancelar ubicación
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mapa */}
          <div id="mapeo-lotes-container" className="h-96 border rounded-lg overflow-hidden">
            <LeafletMap
              defaultCenter={defaultCenter}
              defaultZoom={defaultZoom}
              coordenadas={coordenadas}
              onMapClick={onMapClickCoord}
              planosUrl={planUrl}
              overlayBounds={overlayBounds}
              calibrating={calibrating}
              onBoundsChange={onBoundsChangeWithAspect}
              rotationDeg={rotation}
              overlayOpacity={overlayOpacity}
              lotesConUbicacion={lotes}
              onToggleFull={() => {
                const el = document.fullscreenElement;
                const container = document.querySelector('#mapeo-lotes-container') as HTMLElement | null;
                if (!container) return;
                if (el) {
                  document.exitFullscreen().catch(()=>{});
                } else {
                  container.requestFullscreen().catch(()=>{});
                }
              }}
            />
          </div>

          {/* Instrucciones */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">📋 Instrucciones de Uso:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-800">
              <div>
                <h5 className="font-semibold mb-2">Para ubicar lotes en el plano:</h5>
                <ul className="space-y-1">
                  <li>• 1. Selecciona un lote del dropdown</li>
                  <li>• 2. Haz clic en el plano donde quieres ubicarlo</li>
                  <li>• 3. Confirma la ubicación</li>
                  <li>• 4. El lote se guardará automáticamente</li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold mb-2">Para calibrar el plano:</h5>
                <ul className="space-y-1">
                  <li>• 1. Sube el plano del proyecto</li>
                  <li>• 2. Haz clic en "Calibrar plano"</li>
                  <li>• 3. Marca las dos esquinas del plano</li>
                  <li>• 4. Ajusta rotación y escala</li>
                  <li>• 5. Guarda la calibración</li>
                </ul>
              </div>
            </div>
            <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-700">
              💡 <strong>Tip:</strong> Los lotes ubicados aparecen como pins de ubicación con colores según su estado:
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Verde = Disponible</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Amarillo = Reservado</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Rojo = Vendido</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lotes ubicados en el plano */}
          {lotes.filter(lote => {
            const data = lote.data ? 
              (typeof lote.data === 'string' ? JSON.parse(lote.data) : lote.data) : {};
            return data.plano_point && Array.isArray(data.plano_point) && data.plano_point.length === 2;
          }).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor" style={{transform: 'rotate(45deg)'}}>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </div>
                <h4 className="font-medium text-blue-900">
                  Lotes ubicados en el plano ({lotes.filter(lote => {
                    const data = lote.data ? 
                      (typeof lote.data === 'string' ? JSON.parse(lote.data) : lote.data) : {};
                    return data.plano_point && Array.isArray(data.plano_point) && data.plano_point.length === 2;
                  }).length})
                </h4>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {lotes.filter(lote => {
                  const data = lote.data ? 
                    (typeof lote.data === 'string' ? JSON.parse(lote.data) : lote.data) : {};
                  return data.plano_point && Array.isArray(data.plano_point) && data.plano_point.length === 2;
                }).map((lote) => {
                  const data = lote.data ? 
                    (typeof lote.data === 'string' ? JSON.parse(lote.data) : lote.data) : {};
                  const [lat, lng] = data.plano_point;
                  return (
                    <div
                      key={lote.id}
                      className="flex items-center justify-between p-2 bg-blue-50 rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          lote.estado === 'disponible' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                          lote.estado === 'reservado' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                          lote.estado === 'vendido' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                          'bg-gradient-to-br from-gray-500 to-gray-600'
                        }`}>
                          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor" style={{transform: 'rotate(45deg)'}}>
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                        </div>
                        <span className="font-medium text-gray-900">
                          Lote {lote.codigo}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          lote.estado === 'disponible' ? 'bg-green-100 text-green-700' :
                          lote.estado === 'reservado' ? 'bg-yellow-100 text-yellow-700' :
                          lote.estado === 'vendido' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {lote.estado === 'disponible' ? 'Disponible' : 
                           lote.estado === 'reservado' ? 'Reservado' : 
                           lote.estado === 'vendido' ? 'Vendido' : 
                           lote.estado || 'Desconocido'}
                        </span>
                        <span className="text-gray-600 text-xs">
                          {lat.toFixed(4)}, {lng.toFixed(4)}
                        </span>
                      </div>
                      <div className="text-xs text-blue-600">
                        {data.ubicacion_plano?.fecha_ubicacion ? 
                          new Date(data.ubicacion_plano.fecha_ubicacion).toLocaleDateString() : 
                          'Sin fecha'
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lista de coordenadas generales */}
          {coordenadas.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Coordenadas generales ({coordenadas.length})</h4>
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