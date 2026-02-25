"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  FolderOpen,
  Search,
  Grid,
  List,
  Cloud,
  File,
  RefreshCw,
  Clock,
  Folder,
  X,
} from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import GoogleDriveFolders from "./_GoogleDriveFolders";
import DocumentosList, { GoogleDriveDocumento } from "./_DocumentosList";
import GoogleDriveStatus from "./_GoogleDriveStatus";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface DocumentosClientProps {
  googleDriveConectado: boolean;
  ultimaSincronizacion: string | null;
  stats: {
    total: number;
    tamanoTotal: number;
  };
  googleDriveStatus?: {
    hasConfig: boolean;
    envReady: boolean;
    serviceRoleReady: boolean;
    configError?: string | null;
  };
}

export default function DocumentosClient({
  googleDriveConectado,
  ultimaSincronizacion,
  stats,
  googleDriveStatus
}: DocumentosClientProps) {
  const [vistaActual, setVistaActual] = useState<'grid' | 'list'>('grid');
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [sincronizando, setSincronizando] = useState(false);
  const [documentosEnCarpeta, setDocumentosEnCarpeta] = useState<GoogleDriveDocumento[]>([]);
  const [cargandoDocumentos, setCargandoDocumentos] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<'all' | 'carpetas' | 'pdf' | 'images' | 'docs' | 'sheets' | 'other'>('all');
  const [orden, setOrden] = useState<'recientes' | 'antiguos' | 'nombre-asc' | 'nombre-desc' | 'tamano-desc' | 'tamano-asc'>('recientes');
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; name: string }>>([{ id: 'root', name: 'Mi Drive' }]);
  const [mostrarCarpetasMovil, setMostrarCarpetasMovil] = useState(false);
  const [mostrarFiltrosMovil, setMostrarFiltrosMovil] = useState(false);

  const cargarDocumentosDeCarpeta = useCallback(async (folderId: string | null, source: "cache" | "drive" = "cache") => {
    // No intentar cargar si Google Drive no está conectado y se solicita desde drive
    if (source === 'drive' && !googleDriveConectado) {
      setDocumentosEnCarpeta([]);
      setCargandoDocumentos(false);
      return;
    }

    setCargandoDocumentos(true);
    try {
      const params = new URLSearchParams();
      if (folderId) {
        params.set('folderId', folderId);
      }
      params.set('pageSize', '200');
      params.set('source', source);

      const response = await fetch(`/api/google-drive/files?${params}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        // Si es un error 503 (Service Unavailable) y no hay conexión, no mostrar error
        if (response.status === 503 && !googleDriveConectado) {
          setDocumentosEnCarpeta([]);
          setCargandoDocumentos(false);
          return;
        }
        throw new Error(data.message || 'Error al cargar archivos');
      }

      // Solo intentar cargar desde drive si hay conexión activa
      if (data.source === 'cache' && !data.cacheHit && googleDriveConectado && source !== 'drive') {
        await cargarDocumentosDeCarpeta(folderId, 'drive');
        return;
      }

      // Convertir formato de Google Drive a formato de documento
      const documentos = (data.files || []).map((file: any) => {
        const esCarpeta = file.mimeType === 'application/vnd.google-apps.folder';
        const extension = !esCarpeta && file.name.includes('.')
          ? file.name.split('.').pop()!.toLowerCase()
          : null;

        return {
          id: file.id,
          nombre: file.name,
          google_drive_file_id: file.id,
          google_drive_web_view_link: file.webViewLink,
          tipo_mime: file.mimeType,
          tamano_bytes: !esCarpeta && file.size ? parseInt(file.size) : null,
          extension,
          created_at: file.createdTime,
          updated_at: file.modifiedTime,
          es_carpeta: esCarpeta,
          modificado_at: file.modifiedTime,
          carpeta: file.folderName
            ? { nombre: file.folderName as string, color: '', id: file.parents?.[0] }
            : undefined,
        };
      });

      setDocumentosEnCarpeta(documentos);
    } catch (error) {
      console.error('Error cargando documentos:', error);
      // Si el error es sobre falta de conexión y no está conectado, no mostrar toast
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes('No hay conexión activa') && !googleDriveConectado) {
        // Silenciar el error si Google Drive no está conectado
        setDocumentosEnCarpeta([]);
      } else {
        // Mostrar error solo si es inesperado
        toast.error(errorMessage);
        setDocumentosEnCarpeta([]);
      }
    } finally {
      setCargandoDocumentos(false);
    }
  }, [googleDriveConectado]);

  // Cargar documentos de la carpeta actual desde Google Drive
  useEffect(() => {
    if (googleDriveConectado) {
      cargarDocumentosDeCarpeta(carpetaSeleccionada);
    } else {
      // Si no hay conexión, limpiar documentos y estado de carga
      setDocumentosEnCarpeta([]);
      setCargandoDocumentos(false);
    }
  }, [carpetaSeleccionada, googleDriveConectado, cargarDocumentosDeCarpeta]);

  useEffect(() => {
    const cargarBreadcrumbs = async (folderId: string | null) => {
      if (!googleDriveConectado) return;

      if (!folderId || folderId === 'root') {
        setBreadcrumbs([{ id: 'root', name: 'Mi Drive' }]);
        return;
      }

      try {
        const response = await fetch(`/api/google-drive/folders/${folderId}/path`);
        const data = await response.json();

        if (response.ok && data.success) {
          setBreadcrumbs(data.path);
        }
      } catch (error) {
        console.error('Error cargando breadcrumbs principales:', error);
      }
    };

    cargarBreadcrumbs(carpetaSeleccionada);
  }, [carpetaSeleccionada, googleDriveConectado]);

  // Filtrar documentos
  const documentosFiltrados = useMemo(() => {
    const coincideTipo = (doc: GoogleDriveDocumento) => {
      switch (filtroTipo) {
        case 'carpetas':
          return doc.es_carpeta;
        case 'pdf':
          return doc.tipo_mime?.includes('pdf');
        case 'images':
          return doc.tipo_mime?.startsWith('image/');
        case 'docs':
          return doc.tipo_mime?.includes('word') || doc.tipo_mime?.includes('document');
        case 'sheets':
          return doc.tipo_mime?.includes('spreadsheet') || doc.tipo_mime?.includes('excel');
        case 'other':
          return !doc.es_carpeta && !(
            doc.tipo_mime?.includes('pdf') ||
            doc.tipo_mime?.startsWith('image/') ||
            doc.tipo_mime?.includes('word') ||
            doc.tipo_mime?.includes('document') ||
            doc.tipo_mime?.includes('spreadsheet') ||
            doc.tipo_mime?.includes('excel')
          );
        default:
          return true;
      }
    };

    const filtrados = documentosEnCarpeta.filter((doc) => {
      if (busqueda && !doc.nombre.toLowerCase().includes(busqueda.toLowerCase())) {
        return false;
      }

      return coincideTipo(doc);
    });

    const sorted = [...filtrados].sort((a, b) => {
      const fechaA = new Date(a.modificado_at || a.updated_at || a.created_at || 0).getTime();
      const fechaB = new Date(b.modificado_at || b.updated_at || b.created_at || 0).getTime();
      const tamA = a.tamano_bytes ?? 0;
      const tamB = b.tamano_bytes ?? 0;

      switch (orden) {
        case 'recientes':
          return fechaB - fechaA;
        case 'antiguos':
          return fechaA - fechaB;
        case 'nombre-asc':
          return a.nombre.localeCompare(b.nombre);
        case 'nombre-desc':
          return b.nombre.localeCompare(a.nombre);
        case 'tamano-desc':
          return tamB - tamA;
        case 'tamano-asc':
          return tamA - tamB;
        default:
          return 0;
      }
    });

    return sorted;
  }, [documentosEnCarpeta, busqueda, filtroTipo, orden]);


  // Sincronizar con Google Drive
  const handleSincronizar = async () => {
    if (!googleDriveConectado) {
      toast.error('Google Drive no está conectado');
      return;
    }

    setSincronizando(true);
    const toastId = toast.loading('Sincronizando con Google Drive...');

    try {
      const response = await fetch('/api/google-drive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullSync: false })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al sincronizar');
      }

      // Mostrar mensaje de éxito con estadísticas
      let mensaje = `Sincronización completada: ${data.stats.inserted} nuevos, ${data.stats.updated} actualizados`;

      if (data.stats.errors > 0) {
        mensaje += `, ${data.stats.errors} errores`;
        console.error('Errores de sincronización:', data.errorsDetails);
      }

      if (data.stats.total === 0) {
        toast('No se encontraron archivos en Google Drive', { id: toastId, icon: '⚠️' });
      } else {
        toast.success(mensaje, { id: toastId, duration: 5000 });
      }

      // Recargar la página para mostrar los nuevos documentos
      window.location.reload();

    } catch (error) {
      console.error('Error sincronizando:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al sincronizar',
        { id: toastId }
      );
    } finally {
      setSincronizando(false);
    }
  };

  return (
    <>
      <div className="space-y-6 px-4 py-6 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-crm-text-primary font-display flex items-center gap-3">
            <div className="p-2 bg-crm-primary rounded-xl">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            Documentos de Google Drive
          </h1>
          <p className="text-crm-text-secondary mt-1">
            Consulta y descarga documentos desde Google Drive
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSincronizar}
            disabled={!googleDriveConectado || sincronizando}
            className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${sincronizando ? 'animate-spin' : ''}`} />
            {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:gap-4 md:pb-0">
        <div className="crm-card p-4 rounded-xl min-w-[14rem] md:min-w-0">
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

        <div className="crm-card p-4 rounded-xl min-w-[14rem] md:min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-crm-text-muted">Google Drive</p>
              <p className="text-2xl font-bold text-crm-text-primary mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Cloud className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="crm-card p-4 rounded-xl min-w-[14rem] md:min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-crm-text-muted">Última Sincronización</p>
              <p className="text-sm font-medium text-crm-text-primary mt-1">
                {ultimaSincronizacion
                  ? formatDistanceToNow(new Date(ultimaSincronizacion), { addSuffix: true, locale: es })
                  : 'Nunca'
                }
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Clock className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Google Drive Status */}
      <GoogleDriveStatus
        conectado={googleDriveConectado}
        onSincronizar={handleSincronizar}
        sincronizando={sincronizando}
        hasConfig={googleDriveStatus?.hasConfig}
        envReady={googleDriveStatus?.envReady}
        serviceRoleReady={googleDriveStatus?.serviceRoleReady}
        configError={googleDriveStatus?.configError}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar - Carpetas de Google Drive */}
        <div className="hidden lg:block lg:col-span-3">
          <div className="crm-card p-4 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-crm-text-primary">Carpetas de Drive</h3>
            </div>
            <GoogleDriveFolders
              carpetaActual={carpetaSeleccionada}
              onSelectCarpeta={setCarpetaSeleccionada}
              googleDriveConectado={googleDriveConectado}
            />
          </div>
        </div>

        {/* Main - Documentos */}
        <div className="lg:col-span-9 space-y-4">
          {/* Toolbar */}
          <div className="crm-card p-4 rounded-xl space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center gap-4">
              {/* Búsqueda */}
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-crm-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar documentos..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-crm-border rounded-lg bg-white text-crm-text-primary placeholder:text-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary/20 dark:bg-crm-card dark:text-white dark:placeholder:text-crm-text-muted dark:border-crm-border"
                />
              </div>

              {/* Botón carpetas móvil */}
              <div className="flex items-center gap-2 lg:hidden">
                <button
                  onClick={() => setMostrarCarpetasMovil(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-crm-border text-sm font-medium text-crm-text-primary bg-white hover:bg-crm-card-hover transition-colors dark:bg-crm-card dark:text-white"
                >
                  <Folder className="w-4 h-4" />
                  Carpetas
                </button>
                <button
                  onClick={() => setMostrarFiltrosMovil(!mostrarFiltrosMovil)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-crm-border text-sm font-medium text-crm-text-primary bg-white hover:bg-crm-card-hover transition-colors dark:bg-crm-card dark:text-white"
                >
                  Filtros
                  <span className="text-xs text-crm-text-muted">{mostrarFiltrosMovil ? '▲' : '▼'}</span>
                </button>
              </div>

              {/* Filtros */}
              <div className="hidden sm:flex sm:flex-row gap-3 sm:items-center">
                <div className="flex items-center gap-2">
                  <label htmlFor="filtroTipo" className="text-sm text-crm-text-muted">Tipo</label>
                  <select
                    id="filtroTipo"
                    value={filtroTipo}
                    onChange={(event) => setFiltroTipo(event.target.value as typeof filtroTipo)}
                    className="px-3 py-2 border border-crm-border rounded-lg bg-white text-sm text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary/20 dark:bg-crm-card dark:text-white dark:border-crm-border"
                  >
                    <option value="all">Todos</option>
                    <option value="carpetas">Carpetas</option>
                    <option value="pdf">PDF</option>
                    <option value="images">Imágenes</option>
                    <option value="docs">Documentos</option>
                    <option value="sheets">Hojas de cálculo</option>
                    <option value="other">Otros</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="orden" className="text-sm text-crm-text-muted">Ordenar por</label>
                  <select
                    id="orden"
                    value={orden}
                    onChange={(event) => setOrden(event.target.value as typeof orden)}
                    className="px-3 py-2 border border-crm-border rounded-lg bg-white text-sm text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary/20 dark:bg-crm-card dark:text-white dark:border-crm-border"
                  >
                    <option value="recientes">Más recientes</option>
                    <option value="antiguos">Más antiguos</option>
                    <option value="nombre-asc">Nombre A-Z</option>
                    <option value="nombre-desc">Nombre Z-A</option>
                    <option value="tamano-desc">Tamaño (mayor a menor)</option>
                    <option value="tamano-asc">Tamaño (menor a mayor)</option>
                  </select>
                </div>
              </div>

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

            {mostrarFiltrosMovil && (
              <div className="grid grid-cols-1 gap-3 sm:hidden">
                <div className="flex items-center gap-2">
                  <label htmlFor="filtroTipoMovil" className="text-sm text-crm-text-muted">Tipo</label>
                  <select
                    id="filtroTipoMovil"
                    value={filtroTipo}
                    onChange={(event) => setFiltroTipo(event.target.value as typeof filtroTipo)}
                    className="flex-1 px-3 py-2 border border-crm-border rounded-lg bg-white text-sm text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary/20 dark:bg-crm-card dark:text-white dark:border-crm-border"
                  >
                    <option value="all">Todos</option>
                    <option value="carpetas">Carpetas</option>
                    <option value="pdf">PDF</option>
                    <option value="images">Imágenes</option>
                    <option value="docs">Documentos</option>
                    <option value="sheets">Hojas de cálculo</option>
                    <option value="other">Otros</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="ordenMovil" className="text-sm text-crm-text-muted">Ordenar por</label>
                  <select
                    id="ordenMovil"
                    value={orden}
                    onChange={(event) => setOrden(event.target.value as typeof orden)}
                    className="flex-1 px-3 py-2 border border-crm-border rounded-lg bg-white text-sm text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary/20 dark:bg-crm-card dark:text-white dark:border-crm-border"
                  >
                    <option value="recientes">Más recientes</option>
                    <option value="antiguos">Más antiguos</option>
                    <option value="nombre-asc">Nombre A-Z</option>
                    <option value="nombre-desc">Nombre Z-A</option>
                    <option value="tamano-desc">Tamaño (mayor a menor)</option>
                    <option value="tamano-asc">Tamaño (menor a mayor)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Lista de Documentos */}
          <div className="flex flex-col gap-2">
            {/* Breadcrumb principal */}
            <div className="flex items-center flex-wrap gap-2 text-sm text-crm-text-secondary">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.id} className="flex items-center gap-2">
                  {index > 0 && <span className="text-crm-border">/</span>}
                  <button
                    onClick={() => setCarpetaSeleccionada(crumb.id === 'root' ? null : crumb.id)}
                    className={`hover:text-crm-primary transition-colors ${
                      index === breadcrumbs.length - 1 ? 'text-crm-primary font-medium' : ''
                    }`}
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
              <span className="ml-auto text-xs text-crm-text-muted">
                {documentosFiltrados.length} resultado{documentosFiltrados.length === 1 ? '' : 's'}
              </span>
            </div>

            {cargandoDocumentos ? (
              <div className="crm-card p-12 rounded-xl text-center">
                <PageLoader size="sm" text="Obteniendo archivos desde Google Drive" />
              </div>
            ) : (
              <DocumentosList
                documentos={documentosFiltrados}
                vista={vistaActual}
                onOpenFolder={(doc) => {
                  if (doc.es_carpeta && doc.google_drive_file_id) {
                    setCarpetaSeleccionada(doc.google_drive_file_id);
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Panel de carpetas móvil */}
      {mostrarCarpetasMovil && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMostrarCarpetasMovil(false)}
            aria-hidden="true"
          />
          <div className="relative ml-auto h-full w-full max-w-sm bg-white dark:bg-crm-card shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-crm-border">
              <div className="flex items-center gap-2 text-crm-text-primary dark:text-white">
                <Folder className="w-5 h-5" />
                <span className="font-semibold text-sm">Carpetas de Drive</span>
              </div>
              <button
                onClick={() => setMostrarCarpetasMovil(false)}
                className="p-2 rounded-full hover:bg-crm-card-hover transition-colors text-crm-text-muted"
                aria-label="Cerrar panel de carpetas"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <GoogleDriveFolders
                carpetaActual={carpetaSeleccionada}
                onSelectCarpeta={(id) => {
                  setCarpetaSeleccionada(id);
                  setMostrarCarpetasMovil(false);
                }}
                googleDriveConectado={googleDriveConectado}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
