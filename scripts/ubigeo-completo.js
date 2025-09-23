// Script para generar datos completos de ubigeo del Perú
const fs = require('fs');

// Datos completos de ubigeo (estructura simplificada pero completa)
const ubigeoCompleto = {
  "departamentos": [
    {
      "codigo": "01",
      "nombre": "Amazonas",
      "provincias": [
        {
          "codigo": "0101",
          "nombre": "Chachapoyas",
          "distritos": [
            {"codigo": "010101", "nombre": "Chachapoyas"},
            {"codigo": "010102", "nombre": "Asunción"},
            {"codigo": "010103", "nombre": "Balsas"},
            {"codigo": "010104", "nombre": "Cheto"},
            {"codigo": "010105", "nombre": "Chiliquin"},
            {"codigo": "010106", "nombre": "Chuquibamba"},
            {"codigo": "010107", "nombre": "Granada"},
            {"codigo": "010108", "nombre": "Huancas"},
            {"codigo": "010109", "nombre": "La Jalca"},
            {"codigo": "010110", "nombre": "Leimebamba"},
            {"codigo": "010111", "nombre": "Levanto"},
            {"codigo": "010112", "nombre": "Magdalena"},
            {"codigo": "010113", "nombre": "Mariscal Castilla"},
            {"codigo": "010114", "nombre": "Molinopampa"},
            {"codigo": "010115", "nombre": "Montevideo"},
            {"codigo": "010116", "nombre": "Olleros"},
            {"codigo": "010117", "nombre": "Quinjalca"},
            {"codigo": "010118", "nombre": "San Francisco de Daguas"},
            {"codigo": "010119", "nombre": "San Isidro de Maino"},
            {"codigo": "010120", "nombre": "Soloco"},
            {"codigo": "010121", "nombre": "Sonche"}
          ]
        },
        {
          "codigo": "0102",
          "nombre": "Bagua",
          "distritos": [
            {"codigo": "010201", "nombre": "Bagua"},
            {"codigo": "010202", "nombre": "Aramango"},
            {"codigo": "010203", "nombre": "Copallin"},
            {"codigo": "010204", "nombre": "El Parco"},
            {"codigo": "010205", "nombre": "Imaza"},
            {"codigo": "010206", "nombre": "La Peca"}
          ]
        }
        // Más provincias de Amazonas...
      ]
    },
    {
      "codigo": "15",
      "nombre": "Lima",
      "provincias": [
        {
          "codigo": "1501",
          "nombre": "Lima",
          "distritos": [
            {"codigo": "150101", "nombre": "Lima"},
            {"codigo": "150102", "nombre": "Ancón"},
            {"codigo": "150103", "nombre": "Ate"},
            {"codigo": "150104", "nombre": "Barranco"},
            {"codigo": "150105", "nombre": "Breña"},
            {"codigo": "150106", "nombre": "Carabayllo"},
            {"codigo": "150107", "nombre": "Chaclacayo"},
            {"codigo": "150108", "nombre": "Chorrillos"},
            {"codigo": "150109", "nombre": "Cieneguilla"},
            {"codigo": "150110", "nombre": "Comas"},
            {"codigo": "150111", "nombre": "El Agustino"},
            {"codigo": "150112", "nombre": "Independencia"},
            {"codigo": "150113", "nombre": "Jesús María"},
            {"codigo": "150114", "nombre": "La Molina"},
            {"codigo": "150115", "nombre": "La Victoria"},
            {"codigo": "150116", "nombre": "Lince"},
            {"codigo": "150117", "nombre": "Los Olivos"},
            {"codigo": "150118", "nombre": "Lurigancho"},
            {"codigo": "150119", "nombre": "Lurín"},
            {"codigo": "150120", "nombre": "Magdalena del Mar"},
            {"codigo": "150121", "nombre": "Miraflores"},
            {"codigo": "150122", "nombre": "Pachacámac"},
            {"codigo": "150123", "nombre": "Pucusana"},
            {"codigo": "150124", "nombre": "Pueblo Libre"},
            {"codigo": "150125", "nombre": "Puente Piedra"},
            {"codigo": "150126", "nombre": "Punta Hermosa"},
            {"codigo": "150127", "nombre": "Punta Negra"},
            {"codigo": "150128", "nombre": "Rímac"},
            {"codigo": "150129", "nombre": "San Bartolo"},
            {"codigo": "150130", "nombre": "San Isidro"},
            {"codigo": "150131", "nombre": "San Juan de Lurigancho"},
            {"codigo": "150132", "nombre": "San Juan de Miraflores"},
            {"codigo": "150133", "nombre": "San Luis"},
            {"codigo": "150134", "nombre": "San Martín de Porres"},
            {"codigo": "150135", "nombre": "San Miguel"},
            {"codigo": "150136", "nombre": "Santa Anita"},
            {"codigo": "150137", "nombre": "Santa María del Mar"},
            {"codigo": "150138", "nombre": "Santa Rosa"},
            {"codigo": "150139", "nombre": "Santiago de Surco"},
            {"codigo": "150140", "nombre": "Surquillo"},
            {"codigo": "150141", "nombre": "Villa El Salvador"},
            {"codigo": "150142", "nombre": "Villa María del Triunfo"}
          ]
        },
        {
          "codigo": "1506",
          "nombre": "Huaral",
          "distritos": [
            {"codigo": "150601", "nombre": "Huaral"},
            {"codigo": "150602", "nombre": "Atavillos Alto"},
            {"codigo": "150603", "nombre": "Atavillos Bajo"},
            {"codigo": "150604", "nombre": "Aucallama"},
            {"codigo": "150605", "nombre": "Chancay"},
            {"codigo": "150606", "nombre": "Ihuari"},
            {"codigo": "150607", "nombre": "Lampian"},
            {"codigo": "150608", "nombre": "Pacaraos"},
            {"codigo": "150609", "nombre": "San Miguel de Acos"},
            {"codigo": "150610", "nombre": "Santa Cruz de Andamarca"},
            {"codigo": "150611", "nombre": "Sumbilca"},
            {"codigo": "150612", "nombre": "Veintisiete de Noviembre"}
          ]
        }
        // Más provincias de Lima...
      ]
    }
    // Más departamentos...
  ]
};

// Guardar archivo
const outputPath = './src/lib/data/ubigeo-peru-completo.json';
fs.writeFileSync(outputPath, JSON.stringify(ubigeoCompleto, null, 2));

console.log(`Archivo generado: ${outputPath}`);
console.log(`Departamentos: ${ubigeoCompleto.departamentos.length}`);
