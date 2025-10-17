"use client";

import {
  Folder,
  FileText,
  FileSignature,
  Image,
  Gavel,
  DollarSign,
  Megaphone,
  Users,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { useState } from "react";

interface Carpeta {
  id: string;
  nombre: string;
  color: string;
  icono: string;
  carpeta_padre_id: string | null;
}

interface CarpetasTreeProps {
  carpetas: Carpeta[];
  carpetaSeleccionada: string | null;
  onSelectCarpeta: (id: string | null) => void;
}

const iconMap: Record<string, any> = {
  'file-text': FileText,
  'file-signature': FileSignature,
  'blueprint': FileText,
  'image': Image,
  'gavel': Gavel,
  'dollar-sign': DollarSign,
  'megaphone': Megaphone,
  'users': Users,
  'folder': Folder
};

const colorMap: Record<string, string> = {
  green: 'text-green-600 bg-green-100',
  blue: 'text-blue-600 bg-blue-100',
  purple: 'text-purple-600 bg-purple-100',
  yellow: 'text-yellow-600 bg-yellow-100',
  red: 'text-red-600 bg-red-100',
  orange: 'text-orange-600 bg-orange-100',
  pink: 'text-pink-600 bg-pink-100',
  indigo: 'text-indigo-600 bg-indigo-100'
};

export default function CarpetasTree({
  carpetas,
  carpetaSeleccionada,
  onSelectCarpeta
}: CarpetasTreeProps) {
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpandidas = new Set(expandidas);
    if (newExpandidas.has(id)) {
      newExpandidas.delete(id);
    } else {
      newExpandidas.add(id);
    }
    setExpandidas(newExpandidas);
  };

  // Organizar carpetas por jerarquía
  const carpetasRaiz = carpetas.filter(c => !c.carpeta_padre_id);
  const subcarpetas = (parentId: string) =>
    carpetas.filter(c => c.carpeta_padre_id === parentId);

  const renderCarpeta = (carpeta: Carpeta, nivel: number = 0) => {
    const Icon = iconMap[carpeta.icono] || Folder;
    const colorClass = colorMap[carpeta.color] || colorMap.blue;
    const hijos = subcarpetas(carpeta.id);
    const tieneHijos = hijos.length > 0;
    const estaExpandida = expandidas.has(carpeta.id);
    const estaSeleccionada = carpetaSeleccionada === carpeta.id;

    return (
      <div key={carpeta.id}>
        <button
          onClick={() => onSelectCarpeta(estaSeleccionada ? null : carpeta.id)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left ${
            estaSeleccionada
              ? 'bg-crm-primary text-white'
              : 'hover:bg-crm-card-hover text-crm-text-primary'
          }`}
          style={{ paddingLeft: `${12 + nivel * 16}px` }}
        >
          {tieneHijos && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(carpeta.id);
              }}
              className="p-0.5"
            >
              {estaExpandida ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}

          <div className={`p-1.5 rounded ${estaSeleccionada ? 'bg-white/20' : colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>

          <span className="text-sm font-medium flex-1">{carpeta.nombre}</span>
        </button>

        {tieneHijos && estaExpandida && (
          <div className="mt-1">
            {hijos.map(hijo => renderCarpeta(hijo, nivel + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {/* Todos los documentos */}
      <button
        onClick={() => onSelectCarpeta(null)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left ${
          carpetaSeleccionada === null
            ? 'bg-crm-primary text-white'
            : 'hover:bg-crm-card-hover text-crm-text-primary'
        }`}
      >
        <div className={`p-1.5 rounded ${carpetaSeleccionada === null ? 'bg-white/20' : 'bg-gray-100'}`}>
          <Folder className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium">Todos los documentos</span>
      </button>

      {/* Carpetas raíz */}
      {carpetasRaiz.map(carpeta => renderCarpeta(carpeta))}
    </div>
  );
}
