import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'data/inei-csvs/provincias.csv');
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ error: 'Archivo de provincias no encontrado' }, { status: 404 });
    }

    const provincias: any[] = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
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