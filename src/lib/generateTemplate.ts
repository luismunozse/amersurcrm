import * as XLSX from "xlsx";

export function generateClientesTemplate() {
  // Crear workbook
  const wb = XLSX.utils.book_new();

  // ==================== HOJA DE INSTRUCCIONES ====================
  const instrucciones = [
    ['INSTRUCCIONES PARA IMPORTACIÓN DE CLIENTES'],
    [''],
    ['FORMATO DEL ARCHIVO:'],
    ['El archivo debe contener las siguientes columnas (en cualquier orden):'],
    [''],
    ['COLUMNA', 'REQUERIDO', 'DESCRIPCIÓN', 'EJEMPLO'],
    ['nombre', 'SÍ', 'Nombre(s) del cliente', 'Juan Carlos'],
    ['apellido', 'SÍ', 'Apellido(s) del cliente', 'Pérez García'],
    ['telefono', 'SÍ', 'Teléfono o celular (con código de país)', '51987654321 o +51 987 654 321'],
    ['proyecto_interes', 'NO', 'Proyecto de interés del cliente', 'Residencial Las Palmeras'],
    [''],
    ['NOTAS IMPORTANTES:'],
    ['• Los campos "nombre", "apellido" y "telefono" son OBLIGATORIOS'],
    ['• El teléfono debe incluir el código de país (Ej: 51 para Perú)'],
    ['• El teléfono NO debe estar duplicado en la base de datos'],
    ['• El sistema detecta automáticamente duplicados y los omite'],
    ['• Límite máximo: 20,000 registros por archivo'],
    ['• Formatos soportados: Excel (.xlsx, .xls) o CSV (.csv)'],
    [''],
    ['FORMATOS DE TELÉFONO VÁLIDOS:'],
    ['• 51987654321 (recomendado)'],
    ['• +51 987 654 321'],
    ['• 51 987654321'],
    ['• 0051987654321'],
    [''],
    ['PROCESO DE IMPORTACIÓN:'],
    ['1. Complete la hoja "Plantilla" con los datos de sus clientes'],
    ['2. Guarde el archivo'],
    ['3. En el CRM, vaya a "Clientes" > "Importar Masivamente"'],
    ['4. Seleccione este archivo'],
    ['5. Revise la vista previa de datos'],
    ['6. Valide los datos (el sistema detectará errores)'],
    ['7. Si hay errores, puede exportarlos a CSV para corregirlos'],
    ['8. Confirme la importación'],
    [''],
    ['EJEMPLOS DE USO:'],
    ['Ver la hoja "Plantilla" para ejemplos completos'],
    [''],
    ['¿NECESITA AYUDA?'],
    ['Contacte al equipo de soporte técnico'],
  ];

  const wsInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones);

  // Ajustar ancho de columnas para instrucciones
  wsInstrucciones['!cols'] = [
    { wch: 20 },  // Columna A
    { wch: 12 },  // Columna B
    { wch: 50 },  // Columna C
    { wch: 40 }   // Columna D
  ];

  // Estilos para la hoja de instrucciones (si el formato lo soporta)
  // Hacer el título en negrita (row 1)
  if (wsInstrucciones['A1']) {
    wsInstrucciones['A1'].s = {
      font: { bold: true, sz: 14 }
    };
  }

  // ==================== HOJA DE PLANTILLA ====================
  const templateData = [
    {
      nombre: 'Juan Carlos',
      apellido: 'Pérez García',
      telefono: '51987654321',
      proyecto_interes: 'Residencial Las Palmeras'
    },
    {
      nombre: 'María Elena',
      apellido: 'López Rodríguez',
      telefono: '51912345678',
      proyecto_interes: 'Condominio Vista Mar'
    },
    {
      nombre: 'Carlos Alberto',
      apellido: 'Martínez Silva',
      telefono: '51987654322',
      proyecto_interes: 'Torre Empresarial Centro'
    },
    {
      nombre: 'Ana Lucía',
      apellido: 'Gutiérrez Fernández',
      telefono: '51912345679',
      proyecto_interes: ''
    },
    {
      nombre: 'Luis Fernando',
      apellido: 'Hernández Morales',
      telefono: '51987654323',
      proyecto_interes: 'Lotes Campiña Verde'
    },
    // Filas vacías para que el usuario pueda empezar a llenar
    {
      nombre: '',
      apellido: '',
      telefono: '',
      proyecto_interes: ''
    },
    {
      nombre: '',
      apellido: '',
      telefono: '',
      proyecto_interes: ''
    },
    {
      nombre: '',
      apellido: '',
      telefono: '',
      proyecto_interes: ''
    },
  ];

  const wsPlantilla = XLSX.utils.json_to_sheet(templateData);

  // Ajustar ancho de columnas para plantilla
  wsPlantilla['!cols'] = [
    { wch: 20 }, // nombre
    { wch: 25 }, // apellido
    { wch: 18 }, // telefono
    { wch: 35 }  // proyecto_interes
  ];

  // Agregar ambas hojas al workbook
  XLSX.utils.book_append_sheet(wb, wsInstrucciones, "Instrucciones");
  XLSX.utils.book_append_sheet(wb, wsPlantilla, "Plantilla");

  // Generar archivo
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadTemplate() {
  const blob = generateClientesTemplate();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `plantilla_importacion_clientes_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
