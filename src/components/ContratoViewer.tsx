"use client";

import { useState, useRef, useTransition } from "react";
import { Printer, FileDown, Send, X, FileText } from "lucide-react";
import { generarHTMLContrato, type ContratoVariables } from "@/lib/contratos/plantilla-compraventa";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  variables: ContratoVariables;
  clienteEmail?: string;
}

export default function ContratoViewer({ isOpen, onClose, variables, clienteEmail }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPending, startTransition] = useTransition();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailTo, setEmailTo] = useState(clienteEmail || '');

  if (!isOpen) return null;

  const htmlContent = generarHTMLContrato(variables);

  function handlePrint() {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.print();
  }

  async function handleExportWord() {
    startTransition(async () => {
      const filename = `Contrato_${variables.contrato_codigo}_${variables.cliente_nombre.replace(/\s+/g, '_')}.docx`;

      try {
        const res = await fetch('/api/contratos/docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: htmlContent, filename }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const docxBlob = await res.blob();
        const url = URL.createObjectURL(docxBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Documento Word descargado');
      } catch (error) {
        console.error('Error exportando a Word:', error);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Contrato_${variables.contrato_codigo}.html`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Documento descargado (HTML)');
      }
    });
  }

  function handleSendEmail() {
    if (!emailTo) { toast.error('Ingresa un email'); return; }

    const subject = encodeURIComponent(`Contrato de Compraventa ${variables.contrato_codigo} - ${variables.proyecto_nombre}`);
    const body = encodeURIComponent(
      `Estimado/a ${variables.cliente_nombre},\n\n` +
      `Adjunto encontrará el Contrato de Compraventa ${variables.contrato_codigo} correspondiente al lote ${variables.lote_codigo} del proyecto ${variables.proyecto_nombre}.\n\n` +
      `Precio total: ${variables.moneda_simbolo} ${variables.precio_total}\n` +
      `Forma de pago: ${variables.forma_pago}\n\n` +
      `Por favor revise el documento y no dude en contactarnos ante cualquier consulta.\n\n` +
      `Atentamente,\n${variables.empresa_nombre || 'AMERSUR INMOBILIARIA'}`
    );

    window.open(`mailto:${emailTo}?subject=${subject}&body=${body}`, '_blank');
    setShowEmailForm(false);
    toast.success('Se abrió su cliente de correo');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-5xl max-h-[95vh] flex flex-col pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200" onClick={e => e.stopPropagation()}>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50 rounded-t-xl shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="h-4 w-4" />
            <span className="font-medium">{variables.contrato_codigo}</span>
            <span className="text-gray-400">|</span>
            <span>{variables.cliente_nombre}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" /> Imprimir
            </button>

            <button
              onClick={() => setShowEmailForm(!showEmailForm)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              <Send className="h-4 w-4" /> Enviar
            </button>

            <button
              onClick={handleExportWord}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" /> {isPending ? 'Exportando...' : 'Exportar Word'}
            </button>

            <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Email form (expandible) */}
        {showEmailForm && (
          <div className="px-6 py-3 bg-blue-50 border-b flex items-center gap-3 shrink-0">
            <label className="text-sm text-blue-700 font-medium whitespace-nowrap">Enviar a:</label>
            <input
              type="email"
              value={emailTo}
              onChange={e => setEmailTo(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="correo@ejemplo.com"
            />
            <button
              onClick={handleSendEmail}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Enviar
            </button>
            <button onClick={() => setShowEmailForm(false)} className="text-blue-400 hover:text-blue-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Previsualizador del contrato */}
        <div className="flex-1 min-h-0 bg-gray-100 p-4 overflow-auto">
          <div className="max-w-[800px] mx-auto bg-white shadow-lg rounded">
            <iframe
              ref={iframeRef}
              srcDoc={htmlContent}
              className="w-full border-0"
              style={{ minHeight: '1100px', height: '100%' }}
              title="Vista previa del contrato"
              onLoad={() => {
                const iframe = iframeRef.current;
                if (iframe?.contentDocument?.body) {
                  iframe.style.height = iframe.contentDocument.body.scrollHeight + 'px';
                }
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
