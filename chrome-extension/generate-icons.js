const fs = require('fs');
const path = require('path');

// Script simple para copiar el logo como iconos
// (necesitaremos redimensionar manualmente o usar una herramienta online)

const sourceLogoPath = path.join(__dirname, '../public/ISOTIPOOO.png');
const iconsDir = path.join(__dirname, 'public/icons');

// Verificar que existe el logo
if (!fs.existsSync(sourceLogoPath)) {
  console.error('❌ No se encontró el logo en:', sourceLogoPath);
  process.exit(1);
}

console.log('✓ Logo encontrado:', sourceLogoPath);
console.log('\n📝 Para generar los iconos correctamente:');
console.log('\n1. Abre https://icon.kitchen/');
console.log('2. Sube el archivo:', sourceLogoPath);
console.log('3. Descarga los iconos generados');
console.log('4. Reemplaza los archivos en:', iconsDir);
console.log('\nO usa ImageMagick:');
console.log('sudo apt install imagemagick');
console.log('cd', __dirname);
console.log('convert ../public/ISOTIPOOO.png -resize 16x16 public/icons/icon16.png');
console.log('convert ../public/ISOTIPOOO.png -resize 48x48 public/icons/icon48.png');
console.log('convert ../public/ISOTIPOOO.png -resize 128x128 public/icons/icon128.png');
