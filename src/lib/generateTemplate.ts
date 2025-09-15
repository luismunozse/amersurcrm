import * as XLSX from "xlsx";

export function generateClientesTemplate() {
  // Datos de ejemplo para la plantilla
  const templateData = [
    {
      nombre: "Juan Pérez García",
      email: "juan.perez@email.com",
      telefono: "+51 987 654 321",
      tipo_cliente: "persona",
      documento_identidad: "12345678",
      telefono_whatsapp: "+51 987 654 321",
      direccion_calle: "Av. Principal",
      direccion_numero: "123",
      direccion_barrio: "Centro",
      direccion_ciudad: "Huaral",
      direccion_provincia: "Lima",
      direccion_pais: "Perú",
      estado_cliente: "prospecto",
      origen_lead: "web",
      vendedor_asignado: "Vendedor 1",
      proxima_accion: "llamar",
      interes_principal: "lotes",
      capacidad_compra_estimada: 150000,
      forma_pago_preferida: "contado",
      notas: "Cliente interesado en lotes residenciales"
    },
    {
      nombre: "Empresa Constructora ABC S.A.C.",
      email: "contacto@empresaabc.com",
      telefono: "+51 1 234 5678",
      tipo_cliente: "empresa",
      documento_identidad: "20123456789",
      telefono_whatsapp: "+51 987 123 456",
      direccion_calle: "Av. Comercial",
      direccion_numero: "456",
      direccion_barrio: "Zona Industrial",
      direccion_ciudad: "Lima",
      direccion_provincia: "Lima",
      direccion_pais: "Perú",
      estado_cliente: "lead",
      origen_lead: "recomendacion",
      vendedor_asignado: "Vendedor 2",
      proxima_accion: "reunion",
      interes_principal: "oficinas",
      capacidad_compra_estimada: 500000,
      forma_pago_preferida: "financiacion",
      notas: "Empresa constructora interesada en oficinas comerciales"
    }
  ];

  // Crear workbook
  const wb = XLSX.utils.book_new();
  
  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(templateData);
  
  // Ajustar ancho de columnas
  const colWidths = [
    { wch: 25 }, // nombre
    { wch: 30 }, // email
    { wch: 15 }, // telefono
    { wch: 12 }, // tipo_cliente
    { wch: 15 }, // documento_identidad
    { wch: 15 }, // telefono_whatsapp
    { wch: 20 }, // direccion_calle
    { wch: 8 },  // direccion_numero
    { wch: 15 }, // direccion_barrio
    { wch: 15 }, // direccion_ciudad
    { wch: 15 }, // direccion_provincia
    { wch: 10 }, // direccion_pais
    { wch: 12 }, // estado_cliente
    { wch: 15 }, // origen_lead
    { wch: 15 }, // vendedor_asignado
    { wch: 15 }, // proxima_accion
    { wch: 15 }, // interes_principal
    { wch: 20 }, // capacidad_compra_estimada
    { wch: 15 }, // forma_pago_preferida
    { wch: 30 }  // notas
  ];
  
  ws['!cols'] = colWidths;
  
  // Agregar worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, "Clientes");
  
  // Generar archivo
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadTemplate() {
  const blob = generateClientesTemplate();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plantilla_clientes.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
