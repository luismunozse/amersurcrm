'use client';

import BlueprintUploader from '@/components/BlueprintUploader';
import type { OverlayLayerConfig } from '@/types/overlay-layers';
import { ButtonHTMLAttributes } from 'react';
import { Layers, Eye, EyeOff, Star, Trash2 } from 'lucide-react';

interface OverlayLayersPanelProps {
  layers: OverlayLayerConfig[];
  activeLayerId: string | null;
  overlayDirty: boolean;
  isSaving: boolean;
  isUploading: boolean;
  uploadingLayerId: string | null;
  onAddLayer: () => void;
  onSaveLayers: () => Promise<void>;
  onSetActive: (layerId: string) => void;
  onSetPrimary: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onOpacityChange: (layerId: string, value: number) => void;
  onUploadLayer: (layerId: string, file: File) => Promise<void>;
  onRemoveLayerImage: (layerId: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onNameChange: (layerId: string, value: string) => void;
}

const IconButton = ({
  disabled,
  title,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    disabled={disabled}
    title={title}
    className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm transition ${
      disabled
        ? 'cursor-not-allowed border-gray-200 text-gray-300'
        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
);

export function OverlayLayersPanel({
  layers,
  activeLayerId,
  overlayDirty,
  isSaving,
  isUploading,
  uploadingLayerId,
  onAddLayer,
  onSaveLayers,
  onSetActive,
  onSetPrimary,
  onToggleVisibility,
  onOpacityChange,
  onUploadLayer,
  onRemoveLayerImage,
  onDeleteLayer,
  onNameChange,
}: OverlayLayersPanelProps) {
  return (
    <div className="space-y-4 rounded-xl border border-crm-border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-crm-text-primary">
          <Layers className="h-4 w-4 text-crm-primary" />
          Capas del plano
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddLayer}
            className="rounded-lg border border-crm-border px-3 py-1 text-xs font-semibold text-crm-primary hover:bg-crm-primary/5"
          >
            + Agregar capa
          </button>
          <button
            type="button"
            disabled={!overlayDirty || isSaving}
            onClick={onSaveLayers}
            className={`rounded-lg px-3 py-1 text-xs font-semibold text-white ${
              !overlayDirty || isSaving
                ? 'bg-crm-primary/40 cursor-not-allowed'
                : 'bg-crm-primary hover:bg-crm-primary-dark'
            }`}
          >
            {isSaving ? 'Guardando...' : 'Guardar capas'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {layers.map((layer) => {
          const isActive = activeLayerId === layer.id;
          return (
            <div
              key={layer.id}
              className={`rounded-xl border p-3 ${
                isActive ? 'border-crm-primary bg-crm-primary/5' : 'border-crm-border bg-crm-card'
              }`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={layer.name ?? ''}
                    onChange={(event) => onNameChange(layer.id, event.target.value)}
                    className="flex-1 rounded-md border border-crm-border px-2 py-1 text-sm focus:border-crm-primary focus:outline-none"
                    placeholder="Nombre de la capa"
                  />
                  {layer.isPrimary && (
                    <span className="rounded-full bg-crm-primary/10 px-2 py-0.5 text-xs font-semibold text-crm-primary">
                      Principal
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <IconButton
                    title="Activar para editar"
                    className={isActive ? 'border-crm-primary text-crm-primary' : ''}
                    onClick={() => onSetActive(layer.id)}
                  >
                    <Layers className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    title="Marcar como principal"
                    className={layer.isPrimary ? 'border-amber-500 text-amber-600' : ''}
                    onClick={() => onSetPrimary(layer.id)}
                  >
                    <Star className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    title={layer.visible === false ? 'Mostrar' : 'Ocultar'}
                    onClick={() => onToggleVisibility(layer.id)}
                  >
                    {layer.visible === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </IconButton>
                  <IconButton
                    title="Eliminar capa"
                    onClick={() => onDeleteLayer(layer.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>

                <div>
                  <p className="text-xs font-semibold text-crm-text-muted">Opacidad</p>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={layer.opacity ?? 0.7}
                    onChange={(event) => onOpacityChange(layer.id, Number(event.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <BlueprintUploader
                    key={layer.id}
                    onFileSelect={(file) => onUploadLayer(layer.id, file)}
                    isUploading={isUploading && uploadingLayerId === layer.id}
                    currentFile={layer.url}
                    onDelete={() => onRemoveLayerImage(layer.id)}
                    acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                    maxSize={10}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
