/*
 * Orbita · adaptaciones para la app de Android (Capacitor)
 * Solo se activa dentro de la app instalada; en el navegador no hace nada.
 * - Lectura en voz alta con el motor de voz del celular (el WebView de Android no trae speechSynthesis).
 * - Las fichas PDF se abren con el lector de PDF del celular.
 * - Todo el contenido viene dentro de la app, así que no se usa el service worker.
 */
(function () {
  var C = window.Capacitor;
  if (!C || typeof C.isNativePlatform !== 'function' || !C.isNativePlatform()) return;
  window.ORBITA_NATIVE = true;

  var reg = function (name) {
    if (window.capacitorExports && window.capacitorExports.registerPlugin) return window.capacitorExports.registerPlugin(name);
    if (C.registerPlugin) return C.registerPlugin(name);
    return C.Plugins && C.Plugins[name];
  };
  var TTS = reg('TextToSpeech'), FS = reg('Filesystem'), FV = reg('FileViewer');

  var aviso = function (msg) {
    var t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(aviso.timer); aviso.timer = setTimeout(function () { t.hidden = true; }, 3500);
  };

  /* ---------- Voz: se ofrece la misma interfaz de speechSynthesis que usa la app ---------- */
  var idioma = 'es-US';
  var idiomaListo = TTS.getSupportedLanguages().then(function (r) {
    var ls = (r && r.languages) || [];
    var pref = ['es-CO', 'es-419', 'es-US', 'es-MX', 'es-ES', 'es'];
    for (var i = 0; i < pref.length; i++) {
      var f = ls.filter(function (l) { return String(l).replace('_', '-').indexOf(pref[i]) === 0; })[0];
      if (f) { idioma = String(f).replace('_', '-'); return; }
    }
  }).catch(function () { /* se usa el valor por defecto */ });

  var actual = null;
  function Utterance(text) { this.text = text || ''; this.lang = idioma; this.rate = 1; this.voice = null; this.onend = null; this.onerror = null; }
  var definir = function (nombre, valor) { Object.defineProperty(window, nombre, { value: valor, configurable: true, writable: true }); };
  definir('SpeechSynthesisUtterance', Utterance);
  definir('speechSynthesis', {
    speaking: false,
    onvoiceschanged: null,
    getVoices: function () { return []; },
    speak: function (u) {
      var self = this;
      actual = u; self.speaking = true;
      idiomaListo.then(function () {
        return TTS.speak({ text: u.text, lang: idioma, rate: u.rate || 1, pitch: 1, volume: 1, category: 'playback', queueStrategy: 0 });
      }).then(function () {
        if (actual === u) { self.speaking = false; if (u.onend) u.onend({}); }
      }).catch(function (e) {
        self.speaking = false;
        if (u.onerror) u.onerror(e);
        var m = String((e && e.message) || e || '');
        if (!/interrupt|stop|cancel/i.test(m)) aviso('Para escuchar, instala o activa una voz en español en los ajustes del celular (Texto a voz).');
      });
    },
    cancel: function () { actual = null; this.speaking = false; TTS.stop().catch(function () {}); }
  });

  /* ---------- Fichas PDF: se copian a la caché y se abren con el lector del celular ---------- */
  function base64(buf) {
    var bytes = new Uint8Array(buf), out = '', step = 0x8000;
    for (var i = 0; i < bytes.length; i += step) out += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    return btoa(out);
  }
  function abrirPdf(href) {
    var nombre = href.split('/').pop().split('?')[0];
    aviso('Abriendo la ficha…');
    return fetch(href).then(function (r) { if (!r.ok) throw new Error('No se encontró el PDF'); return r.arrayBuffer(); })
      .then(function (buf) { return FS.writeFile({ path: nombre, data: base64(buf), directory: 'CACHE' }); })
      .then(function (res) {
        var uri = res.uri, ruta = uri.replace(/^file:\/\//, '');
        return FV.openDocumentFromLocalPath({ path: ruta }).catch(function () { return FV.openDocumentFromLocalPath({ path: uri }); });
      })
      .then(function () { var t = document.getElementById('toast'); if (t) t.hidden = true; })
      .catch(function () { aviso('No se pudo abrir la ficha. Instala un lector de PDF, como Google Drive o Adobe Acrobat.'); });
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href$=".pdf"]') : null;
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    abrirPdf(a.getAttribute('href'));
  }, true);
})();
