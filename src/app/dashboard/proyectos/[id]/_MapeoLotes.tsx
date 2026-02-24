'use client';

import { createPortal } from 'react-dom';
import { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Eye, Settings, MapPin, Loader2, Search, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import BlueprintUploader from '@/components/BlueprintUploader';
import {
  subirPlanos,
  guardarOverlayBounds,
  guardarOverlayLayers,
  guardarPoligonoLote,
} from './_actions';
import type { OverlayLayerConfig } from '@/types/overlay-layers';

const GoogleMap = dynamic(() => import('./GoogleMap'), { ssr: false });

// ─── Tipos ────────────────────────────────────────────────────────────────────

type MapMode = 'ver' | 'calibrar' | 'pinear';

type BoundsTuple =
  | [[number, number], [number, number]]
  | [[number, number], [number, number], [number, number], [number, number]];

export interface LoteForMap {
  id: string;
  codigo: string;
  estado?: string | null;
  data?: unknown;
  plano_poligono?: [number, number][] | null;
  coordenada_lat?: number | null;
  coordenada_lng?: number | null;
}

interface LoteConUbicacion extends LoteForMap {
  ubicacion: { lat: number; lng: number } | null;
}

interface MapeoLotesProps {
  proyectoId: string;
  proyectoNombre: string;
  proyectoLatitud?: number | null;
  proyectoLongitud?: number | null;
  overlayLayers: OverlayLayerConfig[];
  lotes: LoteForMap[];
  isAdmin: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveUbicacion(lotes: LoteForMap[]): LoteConUbicacion[] {
  return lotes.map((l) => {
    if (l.plano_poligono && l.plano_poligono.length > 0) {
      const [lat, lng] = l.plano_poligono[0];
      return { ...l, ubicacion: { lat, lng } };
    }
    if (l.coordenada_lat != null && l.coordenada_lng != null) {
      return { ...l, ubicacion: { lat: l.coordenada_lat, lng: l.coordenada_lng } };
    }
    return { ...l, ubicacion: null };
  });
}

function normalizeLayer(layer: OverlayLayerConfig, index: number): OverlayLayerConfig {
  return {
    id: layer.id ?? `layer-${index}`,
    name: layer.name ?? `Capa ${index + 1}`,
    url: layer.url ?? null,
    bounds: layer.bounds ?? null,
    opacity: typeof layer.opacity === 'number' ? layer.opacity : 0.7,
    visible: typeof layer.visible === 'boolean' ? layer.visible : true,
    isPrimary: typeof layer.isPrimary === 'boolean' ? layer.isPrimary : index === 0,
    order: typeof layer.order === 'number' ? layer.order : index,
  };
}

const ESTADO_COLORES: Record<string, string> = {
  disponible: '#10B981',
  reservado: '#F59E0B',
  vendido: '#EF4444',
};

// ─── PinLoteDialog ─────────────────────────────────────────────────────────────

function PinLoteDialog({
  open,
  lotesSinUbicar,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  lotesSinUbicar: LoteConUbicacion[];
  onConfirm: (loteId: string) => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState('');

  if (!open || typeof document === 'undefined') return null;

  const filtered = lotesSinUbicar.filter((l) =>
    l.codigo.toLowerCase().includes(search.toLowerCase())
  );

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-crm-text-primary">¿Qué lote ubicar aquí?</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              placeholder="Buscar por código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-crm-text-muted text-center py-6">
                {lotesSinUbicar.length === 0
                  ? 'Todos los lotes ya tienen pin'
                  : 'Sin resultados'}
              </p>
            ) : (
              filtered.map((lote) => (
                <button
                  key={lote.id}
                  onClick={() => onConfirm(lote.id)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2.5 transition-colors"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ESTADO_COLORES[lote.estado ?? ''] ?? '#6B7280' }}
                  />
                  <span className="text-sm font-medium text-crm-text-primary flex-1">{lote.codigo}</span>
                  {lote.estado && (
                    <span className="text-xs text-crm-text-muted capitalize">{lote.estado}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MapeoLotes({
  proyectoId,
  proyectoLatitud,
  proyectoLongitud,
  overlayLayers: initialOverlayLayers,
  lotes,
  isAdmin,
}: MapeoLotesProps) {
  // Modo de visualización
  const [mode, setMode] = useState<MapMode>('ver');

  // Capas del overlay (plano)
  const [layers, setLayers] = useState<OverlayLayerConfig[]>(() =>
    initialOverlayLayers.filter((l) => l.url).map(normalizeLayer)
  );
  const [layersDirty, setLayersDirty] = useState(false);
  const [isSavingCalibration, setIsSavingCalibration] = useState(false);
  const [isUploadingBlueprint, setIsUploadingBlueprint] = useState(false);

  // Lotes con ubicacion derivada
  const [lotesState, setLotesState] = useState<LoteConUbicacion[]>(() => deriveUbicacion(lotes));

  // Pin pendiente
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);

  // UI
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ id: string; ts: number } | null>(null);
  const [search, setSearch] = useState('');

  // ─── Derivados ──────────────────────────────────────────────────────────────

  const primaryLayer = useMemo(
    () => layers.find((l) => l.isPrimary) ?? layers[0] ?? null,
    [layers]
  );

  const mapCenter = useMemo<[number, number]>(() => {
    if (primaryLayer?.bounds) {
      const pts = primaryLayer.bounds as [number, number][];
      const lats = pts.map((p) => p[0]);
      const lngs = pts.map((p) => p[1]);
      return [
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
      ];
    }
    if (proyectoLatitud != null && proyectoLongitud != null) {
      return [proyectoLatitud, proyectoLongitud];
    }
    return [-12.0464, -77.0428];
  }, [primaryLayer, proyectoLatitud, proyectoLongitud]);

  const lotesUbicados = useMemo(() => lotesState.filter((l) => l.ubicacion), [lotesState]);
  const lotesSinUbicar = useMemo(() => lotesState.filter((l) => !l.ubicacion), [lotesState]);

  const filteredLotes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return lotesState;
    return lotesState.filter((l) => l.codigo.toLowerCase().includes(term));
  }, [lotesState, search]);

  const mapLayers = useMemo(
    () =>
      layers.map((l) => ({
        id: l.id,
        name: l.name ?? undefined,
        url: l.url,
        bounds: l.bounds as BoundsTuple | undefined,
        opacity: l.opacity ?? 0.7,
        visible: l.visible !== false,
        isPrimary: l.isPrimary ?? false,
        order: l.order ?? 0,
      })),
    [layers]
  );

  const lotesForMap = useMemo(
    () =>
      lotesState
        .filter((l) => l.ubicacion)
        .map((l) => ({
          id: l.id,
          codigo: l.codigo,
          estado: l.estado ?? undefined,
          data: l.data,
          plano_poligono: l.ubicacion
            ? ([[l.ubicacion.lat, l.ubicacion.lng]] as [number, number][])
            : null,
          ubicacion: l.ubicacion,
        })),
    [lotesState]
  );

  const stats = useMemo(() => {
    const disponibles = lotesState.filter((l) => l.estado === 'disponible').length;
    const reservados = lotesState.filter((l) => l.estado === 'reservado').length;
    const vendidos = lotesState.filter((l) => l.estado === 'vendido').length;
    return { total: lotesState.length, disponibles, reservados, vendidos, ubicados: lotesUbicados.length };
  }, [lotesState, lotesUbicados]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleBlueprintFile = useCallback(
    async (file: File) => {
      setIsUploadingBlueprint(true);
      try {
        const fd = new FormData();
        fd.append('planos', file);
        const result = await subirPlanos(proyectoId, fd);
        if (!result?.url) throw new Error('No se recibió URL del plano');

        const newLayer = normalizeLayer(
          primaryLayer
            ? { ...primaryLayer, url: result.url }
            : {
                id: crypto.randomUUID(),
                name: 'Plano principal',
                url: result.url,
                bounds: null,
                opacity: 0.7,
                visible: true,
                isPrimary: true,
                order: 0,
              },
          0
        );

        const nextLayers = primaryLayer
          ? layers.map((l) => (l.isPrimary ? newLayer : l))
          : [newLayer, ...layers];

        setLayers(nextLayers);
        setLayersDirty(true);
        toast.success('Plano cargado. Arrastra las esquinas para calibrar su posición.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error subiendo plano');
      } finally {
        setIsUploadingBlueprint(false);
      }
    },
    [proyectoId, layers, primaryLayer]
  );

  const handleOverlayBoundsChange = useCallback(
    (
      overlayId: string,
      bounds: [[number, number], [number, number]] | [[number, number], [number, number], [number, number], [number, number]]
    ) => {
      setLayers((prev) => prev.map((l) => (l.id === overlayId ? { ...l, bounds } : l)));
      setLayersDirty(true);
    },
    []
  );

  const handleSaveCalibration = useCallback(async () => {
    if (!layersDirty) return;
    setIsSavingCalibration(true);
    try {
      await guardarOverlayLayers(proyectoId, layers);
      if (primaryLayer?.bounds) {
        await guardarOverlayBounds(
          proyectoId,
          primaryLayer.bounds as BoundsTuple,
          0,
          primaryLayer.opacity ?? 0.7
        );
      }
      setLayersDirty(false);
      toast.success('Calibración guardada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error guardando calibración');
    } finally {
      setIsSavingCalibration(false);
    }
  }, [proyectoId, layers, layersDirty, primaryLayer]);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (mode !== 'pinear') return;
      setPendingPin({ lat, lng });
      setPinDialogOpen(true);
    },
    [mode]
  );

  const handleConfirmPin = useCallback(
    async (loteId: string) => {
      if (!pendingPin) return;
      setPinDialogOpen(false);
      setIsSavingPin(true);
      try {
        await guardarPoligonoLote(loteId, proyectoId, [[pendingPin.lat, pendingPin.lng]]);
        setLotesState((prev) =>
          prev.map((l) =>
            l.id === loteId
              ? { ...l, plano_poligono: [[pendingPin.lat, pendingPin.lng]], ubicacion: pendingPin }
              : l
          )
        );
        toast.success('Lote ubicado en el mapa');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error guardando pin');
      } finally {
        setIsSavingPin(false);
        setPendingPin(null);
      }
    },
    [pendingPin, proyectoId]
  );

  const handleMarkerDragEnd = useCallback(
    async (loteId: string, lat: number, lng: number) => {
      try {
        await guardarPoligonoLote(loteId, proyectoId, [[lat, lng]]);
        setLotesState((prev) =>
          prev.map((l) =>
            l.id === loteId ? { ...l, plano_poligono: [[lat, lng]], ubicacion: { lat, lng } } : l
          )
        );
      } catch {
        toast.error('Error reposicionando lote');
      }
    },
    [proyectoId]
  );

  const handleRemovePin = useCallback(
    async (loteId: string) => {
      try {
        await guardarPoligonoLote(loteId, proyectoId, []);
        setLotesState((prev) =>
          prev.map((l) =>
            l.id === loteId ? { ...l, plano_poligono: null, ubicacion: null } : l
          )
        );
        toast.success('Pin removido');
      } catch {
        toast.error('Error removiendo pin');
      }
    },
    [proyectoId]
  );

  const handleOpacityChange = useCallback((val: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.isPrimary ? { ...l, opacity: val } : l))
    );
    setLayersDirty(true);
  }, []);

  // ─── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar de modos — solo admin */}
      {isAdmin && (
        <div className="crm-card p-4 flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'ver', label: 'Ver', icon: <Eye className="w-4 h-4" /> },
              { id: 'calibrar', label: 'Calibrar plano', icon: <Settings className="w-4 h-4" /> },
              { id: 'pinear', label: 'Pinear lotes', icon: <MapPin className="w-4 h-4" /> },
            ] as { id: MapMode; label: string; icon: React.ReactNode }[]
          ).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === id
                  ? 'bg-crm-primary text-white'
                  : 'bg-crm-card-hover text-crm-text-secondary hover:text-crm-text-primary'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}

          {mode === 'calibrar' && layersDirty && (
            <button
              onClick={handleSaveCalibration}
              disabled={isSavingCalibration}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-60 transition-colors"
            >
              {isSavingCalibration ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Guardar calibración
            </button>
          )}

          {mode === 'pinear' && (
            <span className="ml-auto text-xs text-crm-text-muted flex items-center gap-1.5">
              {isSavingPin && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Haz clic en el mapa para colocar un pin
            </span>
          )}
        </div>
      )}

      {/* Subir plano — solo admin en modo calibrar */}
      {isAdmin && mode === 'calibrar' && (
        <div className="crm-card p-5 space-y-4">
          <h3 className="font-semibold text-crm-text-primary">Plano del proyecto</h3>
          <BlueprintUploader
            onFileSelect={handleBlueprintFile}
            isUploading={isUploadingBlueprint}
            currentFile={primaryLayer?.url ?? null}
            onDelete={() => {
              setLayers((prev) => prev.map((l) => (l.isPrimary ? { ...l, url: null } : l)));
              setLayersDirty(true);
            }}
            maxSize={20}
            acceptedTypes={['image/jpeg', 'image/png', 'image/webp', 'application/pdf']}
          />
          {primaryLayer?.url && (
            <div className="flex items-center gap-3 pt-2">
              <label className="text-xs text-crm-text-muted w-20 flex-shrink-0">Opacidad</label>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={primaryLayer.opacity ?? 0.7}
                onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                className="flex-1 accent-crm-primary"
              />
              <span className="text-xs text-crm-text-muted w-10 text-right">
                {Math.round((primaryLayer.opacity ?? 0.7) * 100)}%
              </span>
            </div>
          )}
          {primaryLayer?.url && (
            <p className="text-xs text-crm-text-muted">
              Arrastra las esquinas del plano sobre el mapa satelital para alinearlo con la ubicación real.
            </p>
          )}
        </div>
      )}

      {/* Mapa principal */}
      <div className="crm-card overflow-hidden rounded-xl" style={{ height: '600px' }}>
        <GoogleMap
          defaultCenter={mapCenter}
          defaultZoom={17}
          overlayLayers={mapLayers.length > 0 ? mapLayers : null}
          activeOverlayId={primaryLayer?.id ?? null}
          overlayEditable={isAdmin && mode === 'calibrar' && Boolean(primaryLayer?.url)}
          onOverlayBoundsChange={isAdmin ? handleOverlayBoundsChange : undefined}
          lotes={lotesForMap}
          highlightLoteId={selectedLoteId}
          onMapClick={isAdmin && mode === 'pinear' ? handleMapClick : undefined}
          onMarkerDragEnd={isAdmin ? handleMarkerDragEnd : undefined}
          focusLoteRequest={focusRequest}
          onFocusHandled={() => setFocusRequest(null)}
        />
      </div>

      {/* Panel de lotes — modo pinear (admin) */}
      {isAdmin && mode === 'pinear' && (
        <div className="crm-card p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-crm-text-primary text-sm">Lotes</h3>
            <div className="flex gap-3 text-xs text-crm-text-muted">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Ubicados: {lotesUbicados.length}
              </span>
              <span>Pendientes: {lotesSinUbicar.length}</span>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar lote..."
              className="w-full pl-9 pr-3 py-2 border border-crm-border rounded-lg text-sm bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
            />
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1">
            {filteredLotes.map((lote) => (
              <div
                key={lote.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  selectedLoteId === lote.id
                    ? 'bg-crm-primary/10 border border-crm-primary/30'
                    : 'hover:bg-crm-card-hover'
                }`}
                onClick={() => {
                  setSelectedLoteId(lote.id === selectedLoteId ? null : lote.id);
                  if (lote.ubicacion) setFocusRequest({ id: lote.id, ts: Date.now() });
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: ESTADO_COLORES[lote.estado ?? ''] ?? '#6B7280' }}
                />
                <span className="text-sm font-medium text-crm-text-primary flex-1">{lote.codigo}</span>
                {lote.ubicacion ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemovePin(lote.id); }}
                    className="text-crm-text-muted hover:text-red-500 transition-colors p-0.5"
                    title="Quitar pin"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-xs text-crm-text-muted">sin pin</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats — modo ver */}
      {mode === 'ver' && (
        <div className="crm-card p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total lotes', value: stats.total, color: 'text-crm-text-primary' },
              { label: 'Disponibles', value: stats.disponibles, color: 'text-green-600' },
              { label: 'Reservados', value: stats.reservados, color: 'text-yellow-600' },
              { label: 'Vendidos', value: stats.vendidos, color: 'text-red-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-crm-text-muted mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {stats.ubicados < stats.total && (
            <p className="text-xs text-crm-text-muted text-center mt-3">
              {stats.ubicados} de {stats.total} lotes ubicados en el mapa
            </p>
          )}
        </div>
      )}

      {/* Dialog de selección de lote */}
      <PinLoteDialog
        open={pinDialogOpen}
        lotesSinUbicar={lotesSinUbicar}
        onConfirm={handleConfirmPin}
        onCancel={() => { setPinDialogOpen(false); setPendingPin(null); }}
      />
    </div>
  );
}
