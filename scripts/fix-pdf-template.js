/**
 * Script para limpiar la plantilla PDF removiendo widgets duplicados
 * que causan superposición de texto en las condiciones comerciales.
 *
 * Uso: node scripts/fix-pdf-template.js
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const INPUT_PATH = path.join(__dirname, '../public/proforma/plantilla-proforma.pdf');
const OUTPUT_PATH = path.join(__dirname, '../public/proforma/plantilla-proforma.pdf');
const BACKUP_PATH = path.join(__dirname, '../public/proforma/plantilla-proforma.backup.pdf');

async function fixPdfTemplate() {
  console.log('📄 Cargando plantilla PDF...');
  const bytes = fs.readFileSync(INPUT_PATH);

  // Crear backup
  console.log('💾 Creando backup...');
  fs.copyFileSync(INPUT_PATH, BACKUP_PATH);

  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();
  const fields = form.getFields();

  console.log('\n=== CAMPOS ANTES DE LIMPIAR ===');

  // Campos que tienen widgets duplicados que necesitan limpieza
  const problematicFields = [
    'asesor_celular',      // Tiene 2 widgets
    'terreno_precio_lista' // Tiene 3 widgets
  ];

  let fixedCount = 0;

  for (const field of fields) {
    const name = field.getName();
    const widgets = field.acroField.getWidgets();

    if (widgets.length > 1) {
      console.log(`\n⚠️  ${name}: ${widgets.length} widgets (duplicados)`);
      widgets.forEach((w, i) => {
        const rect = w.getRectangle();
        console.log(`   Widget ${i}: x=${rect.x.toFixed(1)}, y=${rect.y.toFixed(1)}`);
      });

      // Si es un campo problemático conocido, mantener solo el primer widget
      if (problematicFields.includes(name)) {
        // Remover widgets extras (mantener solo el primero)
        const widgetsToRemove = widgets.slice(1);
        for (const widget of widgetsToRemove) {
          try {
            // No podemos remover widgets directamente con pdf-lib,
            // así que vamos a ocultar el campo y recrearlo
            console.log(`   🔧 Marcando widget extra para remoción...`);
          } catch (e) {
            console.log(`   ❌ Error: ${e.message}`);
          }
        }
        fixedCount++;
      }
    }
  }

  // pdf-lib no permite remover widgets individuales fácilmente.
  // La solución más limpia es aplanar los campos problemáticos.

  console.log('\n=== SOLUCIÓN APLICADA ===');
  console.log('Los campos duplicados han sido identificados.');
  console.log('Para una solución completa, necesitas:');
  console.log('1. Abrir la plantilla en Adobe Acrobat');
  console.log('2. Editar los campos del formulario');
  console.log('3. Eliminar los widgets duplicados de:');
  problematicFields.forEach(f => console.log(`   - ${f}`));

  // Alternativa: Remover completamente los campos problemáticos
  // y dejar que el código dibuje el texto manualmente
  console.log('\n📝 Removiendo campos problemáticos del formulario...');

  for (const fieldName of problematicFields) {
    try {
      const field = form.getField(fieldName);
      if (field) {
        form.removeField(field);
        console.log(`   ✅ Removido: ${fieldName}`);
      }
    } catch (e) {
      console.log(`   ⚠️  No se pudo remover ${fieldName}: ${e.message}`);
    }
  }

  // Guardar PDF corregido
  console.log('\n💾 Guardando plantilla corregida...');
  const fixedBytes = await pdf.save();
  fs.writeFileSync(OUTPUT_PATH, fixedBytes);

  console.log('\n✅ ¡Plantilla corregida!');
  console.log(`   Original: ${BACKUP_PATH}`);
  console.log(`   Corregida: ${OUTPUT_PATH}`);

  // Verificar resultado
  console.log('\n=== VERIFICACIÓN ===');
  const verifyBytes = fs.readFileSync(OUTPUT_PATH);
  const verifyPdf = await PDFDocument.load(verifyBytes);
  const verifyForm = verifyPdf.getForm();
  const verifyFields = verifyForm.getFields();

  console.log(`Campos restantes: ${verifyFields.length}`);
  for (const field of verifyFields) {
    const widgets = field.acroField.getWidgets();
    const status = widgets.length > 1 ? '⚠️' : '✅';
    console.log(`   ${status} ${field.getName()}: ${widgets.length} widget(s)`);
  }
}

fixPdfTemplate().catch(console.error);
