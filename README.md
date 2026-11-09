# Orbita para Android

App de Android (APK) de **Orbita · Laboratorio 3D de química**, hecha con [Capacitor](https://capacitorjs.com).
La app web se mantiene en [Camilo90s/orbit-3d](https://github.com/Camilo90s/orbit-3d); este repositorio solo
la empaqueta. Todo el contenido (modelos 3D, fotos y fichas PDF) queda dentro del APK, así que la app funciona
sin conexión desde la primera vez que se abre.

## Descargar la app

El último APK siempre está en:
**https://github.com/Camilo90s/Orbita-android/releases/latest/download/Orbita.apk**

Al abrirlo en el celular, Android pide permitir la instalación de apps de ese origen. El APK también se puede
compartir por Bluetooth o WhatsApp sin gastar datos.

## Cómo se compila

No hace falta instalar nada en el computador. GitHub Actions (`.github/workflows/android.yml`):

1. Descarga este repositorio y la app web de `orbit-3d` en la carpeta `web/`.
2. Instala Capacitor y sus complementos (`npm install`).
3. Ejecuta `scripts/preparar.js`, que copia la app web a `www`, agrega las adaptaciones para Android
   (`nativo/native.js`), crea el proyecto Android, los íconos y la pantalla de bienvenida.
4. Compila el APK y lo publica en la pestaña **Releases** como `Orbita.apk`.

Se compila al subir cambios a este repositorio. Cuando cambies la app web en `orbit-3d`, entra a
**Actions → APK de Android → Run workflow** para generar un APK con la versión nueva.

## Firma del APK

Para que cada versión nueva se instale encima de la anterior, todas deben firmarse con la misma llave.
Agrega estos dos secretos en **Settings → Secrets and variables → Actions → New repository secret**:

| Nombre | Valor |
|---|---|
| `ORBITA_KEYSTORE_BASE64` | El archivo de la llave codificado en base64 |
| `ORBITA_KEYSTORE_PASSWORD` | La contraseña de la llave |

Sin estos secretos el APK se compila igual, pero con una llave temporal: para actualizarlo habría que
desinstalar la versión anterior. Nunca subas el archivo de la llave (`.jks`) al repositorio.

## Adaptaciones para Android (`nativo/native.js`)

- **Voz:** el navegador interno de Android no trae lectura en voz alta; se usa el motor de voz del celular
  (`@capacitor-community/text-to-speech`), con voz en español.
- **Fichas PDF:** se abren con el lector de PDF del celular (`@capacitor/filesystem` y `@capacitor/file-viewer`).
- **Sin conexión:** como todo viene instalado, no se usa el service worker y la sección Ayuda lo indica.

## Cambiar la versión

Edita `"version"` en `package.json` (por ejemplo, `1.0.3`). El número de compilación aumenta solo en cada ejecución.

## Compilar en un computador (opcional)

Con Node.js 22, JDK 21 y Android Studio:

```
git clone https://github.com/Camilo90s/orbit-3d web
npm install
node scripts/preparar.js
```

Luego abre la carpeta `android` en Android Studio.
