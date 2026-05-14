"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { ScrollText, Plus, ExternalLink, FileText, Upload } from "lucide-react";
import { obtenerContratosCliente, crearContrato, actualizarContrato } from "../_actions-contrato";
import { ESTADOS_CONTRATO } from "@/lib/types/contrato";
import type { Contrato } from "@/lib/types/contrato";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";

const ContratoViewer = dynamic(() => import("@/components/ContratoViewer"), { ssr: false });

interface Props {
  clienteId: string;
  clienteNombre: string;
  cliente?: {
    documento_identidad?: string;
    estado_civil?: string;
    direccion?: { calle?: string; numero?: string; distrito?: string; ciudad?: string; departamento?: string };
    telefono?: string;
    email?: string;
  };
  ventas: any[];
}

export default function TabContrato({ clienteId, clienteNombre, cliente, ventas }: Props) {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [viewerContrato, setViewerContrato] = useState<Contrato | null>(null);

  const [formData, setFormData] = useState({ ventaId: '', notaria: '', notario: '', notas: '' });
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ contratoId: string; tipo: string } | null>(null);

  useEffect(() => { loadContratos(); }, [clienteId]);

  async function loadContratos() {
    const result = await obtenerContratosCliente(clienteId);
    if (result.success) setContratos(result.data as Contrato[]);
    setLoading(false);
  }

  async function handleCrear() {
    if (!formData.ventaId) { toast.error('Selecciona una venta'); return; }
    startTransition(async () => {
      const venta = ventas.find((v: any) => v.id === formData.ventaId);
      const result = await crearContrato({
        ventaId: formData.ventaId,
        clienteId,
        loteId: venta?.lote_id,
        notaria: formData.notaria,
        notario: formData.notario,
        notas: formData.notas,
      });
      if (result.success) {
        toast.success('Contrato creado');
        setShowForm(false);
        setFormData({ ventaId: '', notaria: '', notario: '', notas: '' });
        loadContratos();
      } else {
        toast.error(result.error || 'Error');
      }
    });
  }

  async function handleCambiarEstado(id: string, estado: string) {
    startTransition(async () => {
      const result = await actualizarContrato(id, { estado, clienteId });
      if (result.success) { toast.success('Estado actualizado'); loadContratos(); }
      else toast.error(result.error || 'Error');
    });
  }

  function triggerUpload(contratoId: string, tipo: string) {
    setUploadTarget({ contratoId, tipo });
    fileInputRef.current?.click();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    setUploading(uploadTarget.contratoId);
    try {
      const fd = new FormData();
      fd.append('archivo', file);
      fd.append('contratoId', uploadTarget.contratoId);
      fd.append('tipoDocumento', uploadTarget.tipo);

      const res = await fetch('/api/contratos/upload', { method: 'POST', body: fd });
      const result = await res.json();

      if (result.success) {
        toast.success('Documento subido correctamente');
        loadContratos();
      } else {
        toast.error(result.error || 'Error subiendo documento');
      }
    } catch {
      toast.error('Error al subir el documento');
    } finally {
      setUploading(null);
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function getEstadoBadge(estado: string) {
    const e = ESTADOS_CONTRATO.find(ec => ec.value === estado);
    const colors: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700', orange: 'bg-orange-100 text-orange-700',
      blue: 'bg-blue-100 text-blue-700', purple: 'bg-purple-100 text-purple-700',
      green: 'bg-green-100 text-green-700',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[e?.color || 'gray']}`}>{e?.label || estado}</span>;
  }

  function buildDireccionString() {
    if (!cliente?.direccion) return '';
    const d = cliente.direccion;
    const parts = [d.calle, d.numero, d.distrito, d.ciudad, d.departamento].filter(Boolean);
    return parts.join(', ');
  }

  function buildContratoVariables(contrato: Contrato) {
    const venta = ventas.find((v: any) => v.id === contrato.venta_id);
    const fmt = (n?: number) => n ? n.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : '';
    return {
      // Cliente - datos reales
      cliente_nombre: clienteNombre,
      cliente_dni: cliente?.documento_identidad || '',
      cliente_estado_civil: cliente?.estado_civil || '',
      cliente_direccion: buildDireccionString(),
      cliente_telefono: cliente?.telefono || '',
      cliente_email: cliente?.email || '',

      // Proyecto / Lote
      proyecto_nombre: venta?.lote?.proyecto?.nombre || '',
      lote_codigo: venta?.lote?.codigo || '',
      lote_area: venta?.lote?.sup_m2 ? `${venta.lote.sup_m2}` : '',

      // Financiero
      precio_total: fmt(venta?.precio_total),
      moneda: venta?.moneda || 'PEN',
      moneda_simbolo: venta?.moneda === 'USD' ? '$' : 'S/',
      monto_separacion: fmt(venta?.monto_inicial),
      saldo_pendiente: fmt(venta?.saldo_pendiente),
      numero_cuotas: venta?.numero_cuotas ? `${venta.numero_cuotas}` : '',
      forma_pago: venta?.forma_pago || 'contado',

      // Contrato
      contrato_codigo: contrato.codigo_contrato,
      contrato_fecha: new Date().toLocaleDateString('es-PE'),

      // Notarial
      notaria: contrato.notaria || '',
      notario: contrato.notario || '',
      partida_registral: contrato.partida_registral || '',
    };
  }

  const siguienteEstado: Record<string, string> = {
    borrador: 'pendiente_firma', pendiente_firma: 'firmado', firmado: 'en_notaria', en_notaria: 'inscrito_sunarp',
  };

  if (loading) return <div className="text-center py-8 text-crm-text-muted">Cargando contratos...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-crm-text flex items-center gap-2">
          <ScrollText className="h-5 w-5" /> Contratos / Minutas
        </h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 bg-crm-primary text-white rounded-lg text-sm hover:bg-crm-primary/90">
          <Plus className="h-4 w-4" /> Nuevo Contrato
        </button>
      </div>

      {showForm && (
        <div className="bg-crm-background border border-crm-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-crm-text mb-1">Venta *</label>
              <select value={formData.ventaId} onChange={e => setFormData(prev => ({ ...prev, ventaId: e.target.value }))} className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card">
                <option value="">Seleccionar venta</option>
                {ventas.filter((v: any) => v.estado !== 'cancelada').map((v: any) => (
                  <option key={v.id} value={v.id}>{v.codigo_venta}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text mb-1">Notaría</label>
              <input type="text" value={formData.notaria} onChange={e => setFormData(prev => ({ ...prev, notaria: e.target.value }))} className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card" />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text mb-1">Notario</label>
              <input type="text" value={formData.notario} onChange={e => setFormData(prev => ({ ...prev, notario: e.target.value }))} className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card" />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text mb-1">Notas</label>
              <input type="text" value={formData.notas} onChange={e => setFormData(prev => ({ ...prev, notas: e.target.value }))} className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCrear} disabled={isPending} className="px-4 py-2 bg-crm-primary text-white rounded-lg text-sm disabled:opacity-50">{isPending ? 'Creando...' : 'Crear Contrato'}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-crm-border rounded-lg text-sm text-crm-text-muted">Cancelar</button>
          </div>
        </div>
      )}

      {contratos.length === 0 ? (
        <div className="text-center py-10 sm:py-12 px-4 bg-crm-background rounded-lg">
          <ScrollText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-crm-text-muted opacity-50" aria-hidden />
          <p className="text-sm sm:text-base font-semibold text-crm-text-primary mb-1">No hay contratos registrados</p>
          <p className="text-xs sm:text-sm text-crm-text-muted mb-4 max-w-sm mx-auto">
            Al formalizar una venta se genera el contrato; quedará listado acá con su estado y documentos.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 h-10 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-dark transition-colors font-medium text-sm"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Crear primer contrato
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {contratos.map((c) => (
            <div key={c.id} className="border border-crm-border rounded-lg p-4 bg-crm-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-crm-text">{c.codigo_contrato}</span>
                  {getEstadoBadge(c.estado)}
                </div>
                <div className="flex items-center gap-2">
                  {/* Botón Generar/Ver Contrato */}
                  <button
                    onClick={() => setViewerContrato(c)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100"
                  >
                    <FileText className="h-3 w-3" /> Ver Documento
                  </button>

                  {siguienteEstado[c.estado] && (
                    <button onClick={() => handleCambiarEstado(c.id, siguienteEstado[c.estado])} className="px-3 py-1 text-xs bg-crm-primary/10 text-crm-primary rounded hover:bg-crm-primary/20" disabled={isPending}>
                      Avanzar a {ESTADOS_CONTRATO.find(e => e.value === siguienteEstado[c.estado])?.label}
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {c.notaria && <div><span className="text-crm-text-muted">Notaría:</span> <span className="text-crm-text">{c.notaria}</span></div>}
                {c.notario && <div><span className="text-crm-text-muted">Notario:</span> <span className="text-crm-text">{c.notario}</span></div>}
                {c.numero_escritura && <div><span className="text-crm-text-muted">Escritura:</span> <span className="text-crm-text">{c.numero_escritura}</span></div>}
                {c.partida_registral && <div><span className="text-crm-text-muted">Partida SUNARP:</span> <span className="text-crm-text">{c.partida_registral}</span></div>}
                {c.fecha_firma && <div><span className="text-crm-text-muted">Firma:</span> <span className="text-crm-text">{new Date(c.fecha_firma).toLocaleDateString('es-PE')}</span></div>}
                {c.fecha_inscripcion_sunarp && <div><span className="text-crm-text-muted">Inscripción:</span> <span className="text-crm-text">{new Date(c.fecha_inscripcion_sunarp).toLocaleDateString('es-PE')}</span></div>}
              </div>
              {/* Documentos adjuntos y upload */}
              <div className="mt-3 pt-3 border-t border-crm-border">
                <p className="text-xs font-medium text-crm-text-muted mb-2">Documentos adjuntos</p>
                <div className="flex flex-wrap gap-2">
                  {/* Contrato firmado */}
                  {c.contrato_url ? (
                    <a href={c.contrato_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100">
                      <ExternalLink className="h-3 w-3" /> Contrato firmado
                    </a>
                  ) : (
                    <button
                      onClick={() => triggerUpload(c.id, 'contrato')}
                      disabled={uploading === c.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-50 text-gray-600 rounded border border-dashed border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Upload className="h-3 w-3" /> {uploading === c.id ? 'Subiendo...' : 'Subir contrato firmado'}
                    </button>
                  )}

                  {/* Escritura pública */}
                  {c.escritura_url ? (
                    <a href={c.escritura_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100">
                      <ExternalLink className="h-3 w-3" /> Escritura pública
                    </a>
                  ) : (
                    <button
                      onClick={() => triggerUpload(c.id, 'escritura')}
                      disabled={uploading === c.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-50 text-gray-600 rounded border border-dashed border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Upload className="h-3 w-3" /> {uploading === c.id ? 'Subiendo...' : 'Subir escritura'}
                    </button>
                  )}

                  {/* Constancia SUNARP */}
                  {c.constancia_sunarp_url ? (
                    <a href={c.constancia_sunarp_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100">
                      <ExternalLink className="h-3 w-3" /> Constancia SUNARP
                    </a>
                  ) : (
                    <button
                      onClick={() => triggerUpload(c.id, 'constancia_sunarp')}
                      disabled={uploading === c.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-50 text-gray-600 rounded border border-dashed border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Upload className="h-3 w-3" /> {uploading === c.id ? 'Subiendo...' : 'Subir constancia SUNARP'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input file oculto para uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Visor de contrato generado */}
      {viewerContrato && (
        <ContratoViewer
          isOpen={!!viewerContrato}
          onClose={() => setViewerContrato(null)}
          variables={buildContratoVariables(viewerContrato)}
          clienteEmail={cliente?.email}
        />
      )}
    </div>
  );
}
