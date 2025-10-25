import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

interface ProvinciaItem {
  code: string;
  name: string;
  departamento_code: string;
}

interface ProvinciaCsvRow extends Partial<ProvinciaItem> {
  [key: string]: string | undefined;
}

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'data/inei-csvs/provincias.csv');
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ error: 'Archivo de provincias no encontrado' }, { status: 404 });
    }

    const provincias: ProvinciaItem[] = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row: ProvinciaCsvRow) => {
          if (!row.code || !row.name || !row.departamento_code) return;

          provincias.push({
            code: row.code,
            name: row.name,
            departamento_code: row.departamento_code
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    return NextResponse.json(provincias);
  } catch (error) {
    console.error('Error leyendo provincias:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
