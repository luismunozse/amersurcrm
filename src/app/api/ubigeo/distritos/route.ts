import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'data/inei-csvs/distritos.csv');
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ error: 'Archivo de distritos no encontrado' }, { status: 404 });
    }

    const distritos: any[] = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          distritos.push({
            code: row.code,
            name: row.name,
            provincia_code: row.provincia_code,
            departamento_code: row.departamento_code
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    return NextResponse.json(distritos);
  } catch (error) {
    console.error('Error leyendo distritos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}