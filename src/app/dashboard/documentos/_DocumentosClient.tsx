"use client";

import { useState } from "react";
import {
  FolderOpen,
  Upload,
  Search,
  Grid,
  List,
  Filter,
  HardDrive,
  Cloud,
  File,
  Download,
  Trash2,
  Share2,
  Eye,
  MoreVertical,
  Plus,
  Settings
} from "lucide-react";
import DocumentoUploader from "./_DocumentoUploader";
import CarpetasTree from "./_CarpetasTree";
import DocumentosList from "./_DocumentosList";
import GoogleDriveStatus from "./_GoogleDriveStatus";

interface DocumentosClientProps {
  carpetas: any[];
  documentosIniciales: any[];
  googleDriveConectado: boolean;
  stats: {
    total: number;
    supabase: number;
    googleDrive: number;
    tamanoTotal: number;
  };
}

export default function DocumentosClient({
  carpetas,
  documentosIniciales,
  googleDriveConectado,
  stats
}: DocumentosClientProps) {
  const [vistaActual, setVistaActual] = useState<'grid' | 'list'>('grid');
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [mostrarUploader, setMostrarUploader] = useState(false);

  // Filtrar documentos
  const documentosFiltrados = documentosIniciales.filter(doc => {
    // Filtro por carpeta
    if (carpetaSeleccionada && doc.carpeta_id !== carpetaSeleccionada) {
      return false;
    }

    // Filtro por búsqueda
    if (busqueda && !doc.nombre.toLowerCase().includes(busqueda.toLowerCase())) {
      return false;
    }

    // Filtro por tipo
    if (filtroTipo !== 'todos' && doc.storage_tipo !== filtroTipo) {
      return false;
    }

    return true;
  });

  // Formatear tamaño
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-crm-text-primary font-display flex items-center gap-3">
            <div className="p-2 bg-crm-primary rounded-xl">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            Documentos
          </h1>
          <p className="text-crm-text-secondary mt-1">
            Gestiona y organiza todos tus documentos en un solo lugar
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setMostrarUploader(true)}
            className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors"
          >
            <Upload className="w-4 h-4" />
            Subir Archivo
          </button>
          <button className="p-2 border border-crm-border rounded-lg hover:bg-crm-card-hover transition-colors">
            <Settings className="w-5 h-5 text-crm-text-secondary" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="crm-card p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-crm-text-muted">Total Documentos</p>
              <p className="text-2xl font-bold text-crm-text-primary mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-crm-primary/10 rounded-lg">
              <File className="w-6 h-6 text-crm-primary" />
            </div>
          </div>
        </div>

        <div className="crm-card p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-crm-text-muted">Supabase Storage</p>
              <p className="text-2xl font-bold text-crm-text-primary mt-1">{stats.supabase}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <HardDrive className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="crm-card p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-crm-text-muted">Google Drive</p>
              <p className="text-2xl font-bold text-crm-text-primary mt-1">{stats.googleDrive}</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Cloud className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="crm-card p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-crm-text-muted">Espacio Usado</p>
              <p className="text-2xl font-bold text-crm-text-primary mt-1">
                {formatBytes(stats.tamanoTotal)}
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Download className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Google Drive Status */}
      <GoogleDriveStatus conectado={googleDriveConectado} />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar - Carpetas */}
        <div className="lg:col-span-3">
          <div className="crm-card p-4 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-crm-text-primary">Carpetas</h3>
              <button className="p-1 hover:bg-crm-card-hover rounded">
                <Plus className="w-4 h-4 text-crm-text-secondary" />
              </button>
            </div>
            <CarpetasTree
              carpetas={carpetas}
              carpetaSeleccionada={carpetaSeleccionada}
              onSelectCarpeta={setCarpetaSeleccionada}
            />
          </div>
        </div>

        {/* Main - Documentos */}
        <div className="lg:col-span-9 space-y-4">
          {/* Toolbar */}
          <div className="crm-card p-4 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Búsqueda */}
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-crm-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar documentos..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-crm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-crm-primary/20"
                />
              </div>

              {/* Filtros */}
              <div className="flex items-center gap-2">
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary/20"
                >
                  <option value="todos">Todos</option>
                  <option value="supabase">Supabase</option>
                  <option value="google_drive">Google Drive</option>
                  <option value="externo">Enlaces</option>
                </select>

                {/* Vista */}
                <div className="flex items-center gap-1 p-1 bg-crm-card-hover rounded-lg">
                  <button
                    onClick={() => setVistaActual('grid')}
                    className={`p-2 rounded ${
                      vistaActual === 'grid'
                        ? 'bg-white shadow-sm'
                        : 'hover:bg-white/50'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setVistaActual('list')}
                    className={`p-2 rounded ${
                      vistaActual === 'list'
                        ? 'bg-white shadow-sm'
                        : 'hover:bg-white/50'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Documentos */}
          <DocumentosList
            documentos={documentosFiltrados}
            vista={vistaActual}
          />
        </div>
      </div>

      {/* Modal Uploader */}
      {mostrarUploader && (
        <DocumentoUploader
          carpetaId={carpetaSeleccionada}
          onClose={() => setMostrarUploader(false)}
          onSuccess={() => {
            setMostrarUploader(false);
            // Recargar página
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
