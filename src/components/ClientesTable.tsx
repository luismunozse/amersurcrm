"use client";

import { useState, useTransition, memo, useMemo } from "react";
import { actualizarCliente, eliminarCliente } from "@/app/dashboard/clientes/_actions";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Pagination } from "@/components/Pagination";
import { usePagination } from "@/hooks/usePagination";
import ClienteForm from "@/components/ClienteForm";
import ClienteDetailModalComplete from "@/components/ClienteDetailModalComplete";
import { 
  getEstadoClienteColor, 
  getEstadoClienteLabel, 
  formatCapacidadCompra, 
  formatSaldoPendiente 
} from "@/lib/types/clientes";

// Función para generar proforma PDF profesional
function generarProformaPDF(cliente: Cliente) {
  const { jsPDF } = require('jspdf');
  const doc = new jsPDF();
  
  // Configuración de colores usando la paleta del proyecto
  const primaryColor = '#86901F'; // Verde corporativo AMERSUR
  const secondaryColor = '#6B7319'; // Verde oscuro
  const accentColor = '#9EA64C'; // Verde claro
  const textColor = '#0f172a'; // Texto principal
  const mutedColor = '#64748b'; // Texto secundario
  const lightGray = '#f8fafc'; // Fondo claro
  
  let yPosition = 20;
  
  // ===== ENCABEZADO CORPORATIVO =====
  // Fondo del header con gradiente simulado
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, 210, 45, 'F');
  
  // Logo AMERSUR con estilo corporativo
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('AMERSUR', 20, 18);
  
  // Subtítulo corporativo
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SISTEMA DE GESTIÓN INMOBILIARIA', 20, 25);
  
  // Datos de la empresa en el header
  doc.setFontSize(8);
  doc.text('RUC: 20123456789', 20, 32);
  doc.text('Av. Principal 123, Lima, Perú', 20, 37);
  doc.text('Tel: +51 1 234-5678 | Email: info@amersur.com', 20, 42);
  
  // Número de proforma y fecha (lado derecho)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`PROFORMA N°: ${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`, 150, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-PE')}`, 150, 25);
  doc.text(`Vigencia: 10 días calendario`, 150, 30);
  doc.text(`Válida hasta: ${new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('es-PE')}`, 150, 35);
  
  yPosition = 55;
  
  // ===== TÍTULO PRINCIPAL =====
  doc.setTextColor(textColor);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PROFORMA DE COMPRA/VENTA DE INMUEBLE', 20, yPosition);
  
  // Línea decorativa debajo del título
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(2);
  doc.line(20, yPosition + 3, 190, yPosition + 3);
  
  yPosition += 20;
  
  // ===== DATOS DEL CLIENTE =====
  // Fondo de sección con color corporativo
  doc.setFillColor(lightGray);
  doc.rect(15, yPosition, 180, 10, 'F');
  
  // Borde superior con color corporativo
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(1);
  doc.line(15, yPosition, 195, yPosition);
  
  doc.setTextColor(textColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL CLIENTE', 20, yPosition + 7);
  yPosition += 18;
  
  // Tabla de datos del cliente
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  // Fila 1: Nombre y Tipo
  doc.setFillColor(lightGray);
  doc.rect(15, yPosition, 180, 8, 'F');
  doc.setTextColor(textColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Nombre/Razón Social:', 20, yPosition + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(cliente.nombre, 80, yPosition + 6);
  doc.setFont('helvetica', 'bold');
  doc.text('Tipo:', 120, yPosition + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(cliente.tipo_cliente === 'persona' ? 'Persona' : 'Empresa', 140, yPosition + 6);
  yPosition += 10;
  
  // Fila 2: Documento y Email
  doc.rect(15, yPosition, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Documento:', 20, yPosition + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(cliente.documento_identidad || 'No especificado', 80, yPosition + 6);
  doc.setFont('helvetica', 'bold');
  doc.text('Email:', 120, yPosition + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(cliente.email || 'No especificado', 140, yPosition + 6);
  yPosition += 10;
  
  // Fila 3: Teléfonos
  doc.rect(15, yPosition, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Teléfono:', 20, yPosition + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(cliente.telefono || 'No especificado', 80, yPosition + 6);
  doc.setFont('helvetica', 'bold');
  doc.text('WhatsApp:', 120, yPosition + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(cliente.telefono_whatsapp || 'No especificado', 140, yPosition + 6);
  yPosition += 10;
  
  // Fila 4: Estado y Capacidad
  doc.rect(15, yPosition, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Estado:', 20, yPosition + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(getEstadoClienteLabel(cliente.estado_cliente as any), 80, yPosition + 6);
  doc.setFont('helvetica', 'bold');
  doc.text('Capacidad:', 120, yPosition + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(cliente.capacidad_compra_estimada ? `S/ ${cliente.capacidad_compra_estimada.toLocaleString()}` : 'No especificada', 140, yPosition + 6);
  yPosition += 20;
  
  // ===== DATOS DEL INMUEBLE =====
  // Fondo de sección
  doc.setFillColor(lightGray);
  doc.rect(15, yPosition, 180, 10, 'F');
  
  // Borde superior con color corporativo
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(1);
  doc.line(15, yPosition, 195, yPosition);
  
  doc.setTextColor(textColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL INMUEBLE', 20, yPosition + 7);
  yPosition += 18;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  if (cliente.propiedades && cliente.propiedades.length > 0) {
    cliente.propiedades.forEach((propiedad, index) => {
      if (index > 0) yPosition += 10; // Espacio entre propiedades
      
      // Encabezado de propiedad
      doc.setFillColor(primaryColor);
      doc.rect(15, yPosition, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(`PROPIEDAD ${index + 1}`, 20, yPosition + 6);
      yPosition += 12;
      
      // Datos de la propiedad en tabla
      const propiedadesData = [
        ['Dirección:', propiedad.direccion || 'Por especificar'],
        ['Distrito:', propiedad.distrito || 'Por especificar'],
        ['Provincia:', propiedad.provincia || 'Por especificar'],
        ['Partida SUNARP:', propiedad.partida_sunarp || 'Por especificar'],
        ['Lote/Manzana:', propiedad.lote_manzana || 'Por especificar'],
        ['Área terreno:', `${propiedad.area_terreno || 'Por especificar'} m²`],
        ['Área techada:', `${propiedad.area_techada || 'Por especificar'} m²`],
        ['Estado:', propiedad.estado || 'Primera venta de constructor'],
        ['Precio:', propiedad.precio ? `S/ ${propiedad.precio.toLocaleString()}` : 'Por especificar']
      ];
      
      propiedadesData.forEach(([label, value], i) => {
        doc.setFillColor(i % 2 === 0 ? lightGray : '#ffffff');
        doc.rect(15, yPosition, 180, 8, 'F');
        doc.setTextColor(textColor);
        doc.setFont('helvetica', 'bold');
        doc.text(label, 20, yPosition + 6);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 80, yPosition + 6);
        yPosition += 10;
      });
    });
  } else {
    // Sin propiedades específicas
    doc.setFillColor(lightGray);
    doc.rect(15, yPosition, 180, 8, 'F');
    doc.setTextColor(textColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Estado:', 20, yPosition + 6);
    doc.setFont('helvetica', 'normal');
    doc.text('No hay propiedades específicas asociadas', 80, yPosition + 6);
    yPosition += 10;
    
    doc.rect(15, yPosition, 180, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Observación:', 20, yPosition + 6);
    doc.setFont('helvetica', 'normal');
    doc.text('Se evaluarán opciones según capacidad de compra', 80, yPosition + 6);
    yPosition += 10;
  }
  yPosition += 15;
  
  // ===== PRECIO Y FORMA DE PAGO =====
  // Fondo de sección
  doc.setFillColor(lightGray);
  doc.rect(15, yPosition, 180, 10, 'F');
  
  // Borde superior con color corporativo
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(1);
  doc.line(15, yPosition, 195, yPosition);
  
  doc.setTextColor(textColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PRECIO Y FORMA DE PAGO', 20, yPosition + 7);
  yPosition += 18;
  
  // Tabla de precios y pagos
  const preciosData = [
    ['Precio de lista:', 'A consultar según propiedad seleccionada'],
    ['Descuentos:', 'Según promociones vigentes'],
    ['Medios de pago:', 'Transferencia bancaria'],
    ['ITF:', '0.005% por cada movimiento bancario']
  ];
  
  preciosData.forEach(([label, value], i) => {
    doc.setFillColor(i % 2 === 0 ? lightGray : '#ffffff');
    doc.rect(15, yPosition, 180, 8, 'F');
    doc.setTextColor(textColor);
    doc.setFont('helvetica', 'bold');
    doc.text(label, 20, yPosition + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 80, yPosition + 6);
    yPosition += 10;
  });
  
  // Cronograma de pago
  yPosition += 5;
  doc.setFillColor(primaryColor);
  doc.rect(15, yPosition, 180, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('CRONOGRAMA DE PAGO', 20, yPosition + 6);
  yPosition += 12;
  
  const cronogramaData = [
    ['Reserva/Arras:', '5% del valor de la propiedad'],
    ['Cuota inicial:', '20% del valor de la propiedad'],
    ['Desembolso:', '75% (contado o crédito hipotecario)']
  ];
  
  cronogramaData.forEach(([label, value], i) => {
    doc.setFillColor(i % 2 === 0 ? lightGray : '#ffffff');
    doc.rect(15, yPosition, 180, 8, 'F');
    doc.setTextColor(textColor);
    doc.setFont('helvetica', 'bold');
    doc.text(label, 20, yPosition + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 80, yPosition + 6);
    yPosition += 10;
  });
  
  yPosition += 15;
  
  // ===== IMPUESTOS Y GASTOS =====
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPosition, 180, 8, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPUESTOS Y GASTOS (ESTIMADOS)', 20, yPosition + 6);
  yPosition += 15;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('IGV: 18% (16% IGV + 2% IPM) - Aplica según tipo de operación', 20, yPosition);
  yPosition += 8;
  doc.text('Alcabala: 3% sobre la base después de restar 10 UIT (paga el comprador)', 20, yPosition);
  yPosition += 8;
  doc.text('Gastos notariales y registrales (SUNARP): Se liquidarán con tarifa vigente', 20, yPosition);
  yPosition += 8;
  doc.text('Otros gastos: Tasación, certificaciones municipales, courier, etc.', 20, yPosition);
  yPosition += 15;
  
  // ===== CLÁUSULAS Y CONDICIONES =====
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPosition, 180, 8, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CLÁUSULAS Y CONDICIONES', 20, yPosition + 6);
  yPosition += 15;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('1. Condiciones suspensivas:', 20, yPosition);
  yPosition += 6;
  doc.text('   • Aprobación de crédito hipotecario (si aplica)', 25, yPosition);
  yPosition += 6;
  doc.text('   • Verificación de no tener cargas o gravámenes', 25, yPosition);
  yPosition += 8;
  doc.text('2. Penalidad/Arras: 5% del valor de la propiedad', 20, yPosition);
  yPosition += 8;
  doc.text('3. Fecha tentativa de firma de escritura: A coordinar', 20, yPosition);
  yPosition += 8;
  doc.text('4. Declaración de no tener cargas: Por verificar', 20, yPosition);
  yPosition += 15;
  
  // ===== FIRMAS =====
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('FIRMAS:', 20, yPosition);
  yPosition += 15;
  
  // Vendedor
  doc.setFont('helvetica', 'normal');
  doc.text('VENDEDOR:', 20, yPosition);
  doc.text('AMERSUR', 20, yPosition + 15);
  doc.text('RUC: 20123456789', 20, yPosition + 20);
  doc.text('_________________________', 20, yPosition + 30);
  doc.text('Firma y sello', 20, yPosition + 35);
  
  // Comprador
  doc.text('COMPRADOR:', 120, yPosition);
  doc.text(cliente.nombre, 120, yPosition + 15);
  doc.text(cliente.tipo_cliente === 'persona' ? 'Persona' : 'Empresa', 120, yPosition + 20);
  doc.text('_________________________', 120, yPosition + 30);
  doc.text('Firma', 120, yPosition + 35);
  
  // ===== PIE DE PÁGINA =====
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor);
  doc.text('Generado el: ' + new Date().toLocaleString('es-PE'), 20, pageHeight - 15);
  doc.text('AMERSUR CRM - Sistema de Gestión Inmobiliaria', 20, pageHeight - 10);
  doc.text('Esta proforma es válida por 10 días calendario', 20, pageHeight - 5);
  
  // Guardar PDF
  const fileName = `proforma_${cliente.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

// Función para determinar el nivel del cliente basado en capacidad de compra
function getNivelCliente(capacidad: number | null): { nivel: string; className: string } {
  if (!capacidad) return { 
    nivel: 'No especificado', 
    className: 'text-crm-text-muted bg-crm-border/20' 
  };
  
  if (capacidad >= 500000) return { 
    nivel: 'Alto', 
    className: 'text-green-700 bg-green-100 border border-green-200' 
  };
  if (capacidad >= 100000) return { 
    nivel: 'Medio', 
    className: 'text-yellow-700 bg-yellow-100 border border-yellow-200' 
  };
  return { 
    nivel: 'Desestimado', 
    className: 'text-red-700 bg-red-100 border border-red-200' 
  };
}

type Cliente = { 
  id: string; 
  codigo_cliente: string;
  nombre: string; 
  tipo_cliente: string;
  email: string | null;
  telefono: string | null;
  telefono_whatsapp: string | null;
  documento_identidad: string | null;
  estado_cliente: string;
  origen_lead: string | null;
  vendedor_asignado: string | null;
  fecha_alta: string;
  ultimo_contacto: string | null;
  proxima_accion: string | null;
  interes_principal: string | null;
  capacidad_compra_estimada: number | null;
  forma_pago_preferida: string | null;
  propiedades_reservadas: number;
  propiedades_compradas: number;
  propiedades_alquiladas: number;
  saldo_pendiente: number;
  notas: string | null;
  direccion: any;
};

interface ClientesTableProps {
  clientes: Cliente[];
}

export default function ClientesTable({ clientes }: ClientesTableProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<{ open: boolean; id: string | null; nombre?: string }>({
    open: false,
    id: null,
  });
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    estado: '',
    tipo: '',
    vendedor: '',
    search: ''
  });
  const [sortBy, setSortBy] = useState<keyof Cliente>('fecha_alta');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const router = useRouter();

  // Filtrar y ordenar clientes
  const filteredAndSortedClientes = useMemo(() => {
    let filtered = clientes.filter(cliente => {
      const matchesSearch = !filters.search || 
        cliente.nombre.toLowerCase().includes(filters.search.toLowerCase()) ||
        cliente.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
        cliente.codigo_cliente.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesEstado = !filters.estado || cliente.estado_cliente === filters.estado;
      const matchesTipo = !filters.tipo || cliente.tipo_cliente === filters.tipo;
      const matchesVendedor = !filters.vendedor || cliente.vendedor_asignado === filters.vendedor;
      
      return matchesSearch && matchesEstado && matchesTipo && matchesVendedor;
    });

    // Ordenar
    filtered.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });

    return filtered;
  }, [clientes, filters, sortBy, sortOrder]);

  // Paginación
  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
  } = usePagination({
    items: filteredAndSortedClientes,
    itemsPerPage: 20,
  });

  // Memoizar funciones para evitar re-renders innecesarios
  const handleEdit = useMemo(() => (id: string) => setEditing(id), []);
  const handleCancelEdit = useMemo(() => () => setEditing(null), []);
  const handleAfterSave = useMemo(() => () => {
    setEditing(null);
    router.refresh();
  }, [router]);

  const askDelete = (c: Cliente) => setConfirm({ open: true, id: c.id, nombre: c.nombre });

  const doDelete = () => {
    if (!confirm.id) return;
    startTransition(async () => {
      try {
        await eliminarCliente(confirm.id!);
        toast.success("Cliente eliminado");
        setConfirm({ open: false, id: null });
        router.refresh();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "No se pudo eliminar");
      }
    });
  };

  const handleShowDetail = (cliente: Cliente) => {
    console.log('Opening detail modal for client:', cliente.nombre);
    setSelectedCliente(cliente);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedCliente(null);
  };

  const handleSort = (column: keyof Cliente) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: keyof Cliente) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getVendedores = () => {
    const vendedores = [...new Set(clientes.map(c => c.vendedor_asignado).filter(Boolean))];
    return vendedores;
  };

  if (editing) {
    const cliente = clientes.find(c => c.id === editing);
    if (!cliente) return null;
    
    return (
      <ClienteForm
        cliente={cliente}
        isEditing={true}
        onSuccess={handleAfterSave}
        onCancel={handleCancelEdit}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="crm-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">Buscar</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Nombre, email o código..."
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">Estado</label>
            <select
              value={filters.estado}
              onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value }))}
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            >
              <option value="">Todos los estados</option>
              <option value="por_contactar">Por Contactar</option>
              <option value="contactado">En Contacto</option>
              <option value="transferido">Transferido</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">Tipo</label>
            <select
              value={filters.tipo}
              onChange={(e) => setFilters(prev => ({ ...prev, tipo: e.target.value }))}
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            >
              <option value="">Todos los tipos</option>
              <option value="persona">Persona</option>
              <option value="empresa">Empresa</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">Vendedor</label>
            <select
              value={filters.vendedor}
              onChange={(e) => setFilters(prev => ({ ...prev, vendedor: e.target.value }))}
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            >
              <option value="">Todos los vendedores</option>
              {getVendedores().map(vendedor => (
                <option key={vendedor} value={vendedor}>{vendedor}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="crm-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-crm-card-hover border-b border-crm-border">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-crm-text-muted uppercase tracking-wider cursor-pointer hover:bg-crm-border"
                  onClick={() => handleSort('nombre')}
                >
                  Cliente {getSortIcon('nombre')}
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-crm-text-muted uppercase tracking-wider cursor-pointer hover:bg-crm-border"
                  onClick={() => handleSort('estado_cliente')}
                >
                  Estado {getSortIcon('estado_cliente')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-crm-text-muted uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-crm-text-muted uppercase tracking-wider">
                  Propiedades
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-crm-text-muted uppercase tracking-wider cursor-pointer hover:bg-crm-border"
                  onClick={() => handleSort('fecha_alta')}
                >
                  Fecha Alta {getSortIcon('fecha_alta')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-crm-text-muted uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-crm-border">
              {paginatedItems.map((cliente) => (
                <ClienteRow
                  key={cliente.id}
                  cliente={cliente}
                  onEdit={handleEdit}
                  onDelete={askDelete}
                  onShowDetail={handleShowDetail}
                  isPending={isPending}
                />
              ))}
            </tbody>
          </table>
        </div>

        {paginatedItems.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-crm-card-hover rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
            <h4 className="text-lg font-medium text-crm-text-primary mb-2">No hay clientes</h4>
            <p className="text-crm-text-muted">
              {filters.search || filters.estado || filters.tipo || filters.vendedor
                ? "No se encontraron clientes con los filtros aplicados"
                : "Comienza agregando tu primer cliente"
              }
            </p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-crm-border">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              className="justify-center"
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm.open}
        title="Eliminar cliente"
        description={`Vas a eliminar a "${confirm.nombre ?? ""}". Esta acción no se puede deshacer.`}
        confirmText={isPending ? "Eliminando…" : "Eliminar"}
        onConfirm={doDelete}
        onClose={() => setConfirm({ open: false, id: null })}
        disabled={isPending}
      />

      <ClienteDetailModalComplete
        isOpen={showDetailModal}
        onClose={handleCloseDetail}
        cliente={selectedCliente}
      />
    </div>
  );
}

// Componente memoizado para cada fila de cliente
const ClienteRow = memo(function ClienteRow({
  cliente,
  onEdit,
  onDelete,
  onShowDetail,
  isPending,
}: {
  cliente: Cliente;
  onEdit: (id: string) => void;
  onDelete: (c: Cliente) => void;
  onShowDetail: (c: Cliente) => void;
  isPending: boolean;
}) {
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'por_contactar': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'contactado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'transferido': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <tr className="hover:bg-crm-card-hover transition-colors">
      {/* Cliente */}
      <td className="px-4 py-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-crm-primary/10 rounded-full flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-crm-text-primary">{cliente.nombre}</div>
            <div className="text-xs text-crm-text-muted capitalize">
              {cliente.tipo_cliente === 'persona' ? 'Persona' : 
               cliente.tipo_cliente === 'empresa' ? 'Empresa' : 'No especificado'}
            </div>
          </div>
        </div>
      </td>

      {/* Estado */}
      <td className="px-4 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getEstadoColor(cliente.estado_cliente || 'prospecto')}`}>
          {getEstadoClienteLabel(cliente.estado_cliente as any)}
        </span>
      </td>

      {/* Contacto */}
      <td className="px-4 py-4">
        <div className="space-y-1">
          {cliente.email && (
            <div className="text-sm text-crm-text-primary flex items-center">
              <svg className="w-3 h-3 mr-1 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              {cliente.email}
            </div>
          )}
          {cliente.telefono && (
            <div className="text-sm text-crm-text-muted flex items-center">
              <svg className="w-3 h-3 mr-1 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              {cliente.telefono}
            </div>
          )}
          {!cliente.email && !cliente.telefono && (
            <div className="text-sm text-crm-text-muted">Sin contacto</div>
          )}
        </div>
      </td>


      {/* Propiedades */}
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex space-x-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-crm-text-primary">{cliente.propiedades_reservadas}</div>
            <div className="text-xs text-crm-text-muted">Res.</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-crm-text-primary">{cliente.propiedades_compradas}</div>
            <div className="text-xs text-crm-text-muted">Comp.</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-crm-text-primary">{cliente.propiedades_alquiladas}</div>
            <div className="text-xs text-crm-text-muted">Alq.</div>
          </div>
        </div>
      </td>

      {/* Fecha Alta */}
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="text-sm text-crm-text-primary">
          {formatDate(cliente.fecha_alta)}
        </div>
      </td>

      {/* Acciones */}
      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onShowDetail(cliente)}
            className="text-green-600 hover:text-green-700 transition-colors"
            title="Ver Detalles"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          </button>
          <button
            onClick={() => onEdit(cliente.id)}
            className="text-crm-primary hover:text-crm-primary/80 transition-colors"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          {cliente.telefono && (
            <a
              href={`tel:${cliente.telefono}`}
              className="text-crm-success hover:text-crm-success/80 transition-colors"
              title="Llamar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
            </a>
          )}
          {/* WhatsApp - Mostrar siempre para facilitar el acceso */}
          <a
            href={`https://wa.me/${(cliente.telefono_whatsapp || cliente.telefono || '').replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700 transition-colors"
            title="Enviar WhatsApp"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
            </svg>
          </a>
          <button
            onClick={() => generarProformaPDF(cliente)}
            className="text-crm-info hover:text-crm-info/80 transition-colors"
            title="Exportar Proforma PDF"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </button>
          <button
            onClick={() => onDelete(cliente)}
            className="text-crm-danger hover:text-crm-danger/80 transition-colors"
            disabled={isPending}
            title="Eliminar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
});
