// Prepara el proyecto Android de Orbita a partir de la app web de la raíz del repositorio.
// Lo ejecuta GitHub Actions antes de compilar el APK; también funciona en un computador con Node.
//   node scripts/preparar.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APP = path.resolve(__dirname, '..');        // raíz de este repositorio (Orbita-android)
// App web de Orbita: GitHub Actions la descarga del repositorio orbit-3d en la carpeta web/
const RAIZ = path.resolve(APP, process.env.ORBITA_WEB || 'web');
if (!fs.existsSync(path.join(RAIZ, 'index.html'))) throw new Error('No se encontró la app web en ' + RAIZ + '. Descarga el repositorio orbit-3d en la carpeta web/.');
const WWW = path.join(APP, 'www');
const run = cmd => { console.log('› ' + cmd); execSync(cmd, { cwd: APP, stdio: 'inherit' }); };
const reemplazar = (archivo, buscar, poner, nombre, marca) => {
  const t = fs.readFileSync(archivo, 'utf8');
  if (t.includes(poner) || (marca && t.includes(marca))) return;
  if (!t.includes(buscar)) throw new Error(`No se encontró el punto para "${nombre}" en ${path.relative(APP, archivo)}`);
  fs.writeFileSync(archivo, t.replace(buscar, poner));
  console.log('  ✓ ' + nombre);
};

(async () => {
// 1) Copiar la app web a www (todo queda dentro del APK para usarse sin conexión)
fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(WWW);
for (const f of ['index.html', 'manifest.webmanifest', 'css', 'fonts', 'img', 'js', 'models', 'recursos', 'vendor']) {
  fs.cpSync(path.join(RAIZ, f), path.join(WWW, f), { recursive: true });
}
fs.copyFileSync(path.join(APP, 'node_modules/@capacitor/core/dist/capacitor.js'), path.join(WWW, 'js/capacitor.js'));
fs.copyFileSync(path.join(APP, 'nativo/native.js'), path.join(WWW, 'js/native.js'));
console.log('✓ App web copiada en www');

// 2) Cargar Capacitor y las adaptaciones nativas antes que la app
reemplazar(path.join(WWW, 'index.html'), '  <script src="js/data.js"></script>',
  '  <script src="js/capacitor.js"></script>\n  <script src="js/native.js"></script>\n  <script src="js/data.js"></script>', 'scripts nativos en index.html');

// 3) Ganchos de la app instalada (si la app web todavía no los tiene)
const appJs = path.join(WWW, 'js/app.js');
reemplazar(appJs, "    init: function () {\n      if (window.ORBITA_DEMO",
  "    init: function () {\n      /* App de Android: todo el contenido viene instalado y no se usa el service worker */\n      if (window.ORBITA_NATIVE) { Offline.state = 'ready'; if (typeof precargarVisor === 'function') precargarVisor(600); return; }\n      if (window.ORBITA_DEMO", 'sin service worker en la app', "if (window.ORBITA_NATIVE) { Offline.state");
reemplazar(appJs, "    moduleStatus: function (mid) {\n",
  "    moduleStatus: function (mid) {\n      if (window.ORBITA_NATIVE) return Promise.resolve('ok');\n", 'módulos instalados', "if (window.ORBITA_NATIVE) return Promise.resolve('ok')");
reemplazar(appJs, "  function paintOffline(box) {\n    if (!box) return;\n",
  "  function paintOffline(box) {\n    if (!box) return;\n    if (window.ORBITA_NATIVE) { box.innerHTML = '<div class=\"status-line ok\"><span class=\"dot\"></span>Orbita está instalada completa en este celular: los cuatro módulos, los modelos 3D, las fotos y las fichas PDF funcionan sin conexión.</div>'; return; }\n",
  'mensaje de uso sin conexión', "if (window.ORBITA_NATIVE) { box.innerHTML");

// 4) Proyecto Android, íconos y pantalla de bienvenida
if (!fs.existsSync(path.join(APP, 'android'))) run('npx cap add android');
  await require('./iconos')();
  run('npx capacitor-assets generate --android');

// 5) Versión, firma y color de la pantalla de bienvenida
const pkg = JSON.parse(fs.readFileSync(path.join(APP, 'package.json'), 'utf8'));
const gradle = path.join(APP, 'android/app/build.gradle');
let g = fs.readFileSync(gradle, 'utf8');
g = g.replace(/versionCode \d+/, 'versionCode ' + (parseInt(process.env.GITHUB_RUN_NUMBER || '1', 10)))
     .replace(/versionName "[^"]*"/, `versionName "${pkg.version}"`);
fs.writeFileSync(gradle, g);
reemplazar(gradle, `    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }`, `    // Firma: con la llave de Orbita si existe (GitHub Actions la crea con los secretos del repositorio);
    // si no, con la llave de depuración, para que la compilación nunca falle.
    def llave = System.getenv("ORBITA_KEYSTORE_FILE")
    signingConfigs {
        orbita {
            if (llave) {
                storeFile file(llave)
                storePassword System.getenv("ORBITA_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ORBITA_KEY_ALIAS") ?: "orbita"
                keyPassword System.getenv("ORBITA_KEYSTORE_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
            signingConfig llave ? signingConfigs.orbita : signingConfigs.debug
        }
    }`, 'firma del APK');
reemplazar(path.join(APP, 'android/app/src/main/res/values/styles.xml'),
  '        <item name="android:background">@drawable/splash</item>\n',
  '        <item name="android:background">@drawable/splash</item>\n        <item name="windowSplashScreenBackground">#F3F4FB</item>\n', 'color de la pantalla de bienvenida');
console.log(`✓ Versión ${pkg.version} (compilación ${process.env.GITHUB_RUN_NUMBER || 1})`);

// 6) Copiar www y los complementos al proyecto Android
run('npx cap sync android');
console.log('✓ Proyecto Android listo en la carpeta android');
})().catch(e => { console.error(e); process.exit(1); });
