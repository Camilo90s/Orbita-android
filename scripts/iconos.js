// Dibuja los íconos y la pantalla de bienvenida de la app (PNG) a partir de los SVG de assets/,
// para que @capacitor/assets genere todos los tamaños de Android.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = path.resolve(__dirname, '../assets');
const tamanos = { 'icon-only': 1024, 'icon-foreground': 1024, 'icon-background': 1024, splash: 2732, 'splash-dark': 2732 };

module.exports = async function iconos() {
  for (const [nombre, px] of Object.entries(tamanos)) {
    const svg = fs.readFileSync(path.join(DIR, nombre + '.svg'), 'utf8').replace('<svg ', `<svg width="${px}" height="${px}" `);
    await sharp(Buffer.from(svg)).png().toFile(path.join(DIR, nombre + '.png'));
  }
  console.log('✓ Íconos y pantalla de bienvenida dibujados');
};
if (require.main === module) module.exports().catch(e => { console.error(e); process.exit(1); });
