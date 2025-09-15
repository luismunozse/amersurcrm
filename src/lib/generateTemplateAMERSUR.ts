import * as XLSX from "xlsx";

export function generateAMERSURTemplate() {
  // Datos de ejemplo basados en el formato de AMERSUR
  const templateData = [
    {
      "Nombre": "JUAN PÉREZ GARCÍA",
      "Celular": "51987654321",
      "Año": "2025"
    },
    {
      "Nombre": "MARÍA LÓPEZ RODRIGUEZ", 
      "Celular": "51912345678",
      "Año": "2025"
    },
    {
      "Nombre": "CARLOS MARTÍNEZ SILVA",
      "Celular": "51987654322",
      "Año": "2025"
    },
    {
      "Nombre": "ANA GUTIÉRREZ FERNÁNDEZ",
      "Celular": "51912345679",
      "Año": "2025"
    },
    {
      "Nombre": "LUIS HERNÁNDEZ MORALES",
      "Celular": "51987654323",
      "Año": "2025"
    }
  ];

  // Crear workbook
  const wb = XLSX.utils.book_new();
  
  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(templateData);
  
  // Ajustar ancho de columnas
  const colWidths = [
    { wch: 30 }, // Nombre
    { wch: 15 }, // Celular
    { wch: 8 }   // Año
  ];
  
  ws['!cols'] = colWidths;
  
  // Agregar worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, "Contactos AMERSUR");
  
  // Generar archivo
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadAMERSURTemplate() {
  const blob = generateAMERSURTemplate();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plantilla_contactos_amersur.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
