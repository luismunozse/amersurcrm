import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'data/inei-csvs/departamentos.csv');
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ error: 'Archivo de departamentos no encontrado' }, { status: 404 });
    }

    const departamentos: any[] = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          departamentos.push({
            code: row.code,
            name: row.name
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    return NextResponse.json(departamentos);
  } catch (error) {
    console.error('Error leyendo departamentos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}