export async function generateAMERSURTemplate() {
  const { buildExcelBlob } = await import("@/lib/excel/adapter");

  // Datos de ejemplo basados en el formato de AMERSUR
  const templateData = [
    { "Nombre": "JUAN PÉREZ GARCÍA", "Celular": "51987654321", "Año": "2025" },
    { "Nombre": "MARÍA LÓPEZ RODRIGUEZ", "Celular": "51912345678", "Año": "2025" },
    { "Nombre": "CARLOS MARTÍNEZ SILVA", "Celular": "51987654322", "Año": "2025" },
    { "Nombre": "ANA GUTIÉRREZ FERNÁNDEZ", "Celular": "51912345679", "Año": "2025" },
    { "Nombre": "LUIS HERNÁNDEZ MORALES", "Celular": "51987654323", "Año": "2025" },
  ];

  return buildExcelBlob([
    {
      name: "Contactos AMERSUR",
      objects: templateData,
      columnWidths: [30, 15, 8], // Nombre, Celular, Año
    },
  ]);
}

export async function downloadAMERSURTemplate() {
  const blob = await generateAMERSURTemplate();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plantilla_contactos_amersur.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
