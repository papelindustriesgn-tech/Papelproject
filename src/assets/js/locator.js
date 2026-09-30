/**
 * PAPEL — page « Où acheter » : filtre par ville / quartier + carte légère.
 * La carte (Leaflet + OpenStreetMap, ~45 Ko) n'est téléchargée que si
 * l'utilisateur appuie sur « Afficher la carte », pour économiser les données.
 */
(function () {
  'use strict';
  var box = document.querySelector('[data-locator]');
  if (!box) return;
  var T = (window.PAPEL || {}).i18n || {};
  var stores = [].slice.call(box.querySelectorAll('.store'));
  var input = box.querySelector('#loc-search');
  var filters = [].slice.call(box.querySelectorAll('.filter'));
  var count = box.querySelector('.locator__count');
  var none = box.querySelector('.locator__none');
  var city = '';
  var map = null, layer = null;

  /* Recherche sans accents ni majuscules (« Kipé » = « kipe »). */
  function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  function visible() { return stores.filter(function (s) { return !s.hidden; }); }

  function apply() {
    var q = norm(input.value.trim());
    stores.forEach(function (s) {
      var okCity = !city || s.getAttribute('data-city') === city;
      var okText = !q || norm(s.getAttribute('data-search')).indexOf(q) > -1;
      s.hidden = !(okCity && okText);
    });
    var n = visible().length;
    count.textContent = (T.results || '{n}').replace('{n}', n);
    none.hidden = n > 0;
    if (map) drawMarkers();
  }

  input.addEventListener('input', apply);
  filters.forEach(function (b) {
    b.addEventListener('click', function () {
      filters.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true');
      city = b.getAttribute('data-city');
      apply();
    });
  });

  /* ---------------- Carte (chargée à la demande) ---------------- */
  var toggle = box.querySelector('[data-map-toggle]');
  var mapEl = document.getElementById('map');

  function load(tag, attrs) {
    return new Promise(function (ok, ko) {
      var el = document.createElement(tag);
      Object.keys(attrs).forEach(function (k) { el[k] = attrs[k]; });
      el.onload = ok; el.onerror = ko;
      document.head.appendChild(el);
    });
  }

  function drawMarkers() {
    layer.clearLayers();
    var pts = [];
    visible().forEach(function (s) {
      var lat = parseFloat(s.getAttribute('data-lat')), lng = parseFloat(s.getAttribute('data-lng'));
      if (isNaN(lat) || isNaN(lng)) return;
      pts.push([lat, lng]);
      var link = 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng;
      var popup = document.createElement('div');
      var b = document.createElement('strong'); b.textContent = s.getAttribute('data-name');
      var a = document.createElement('a'); a.href = link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = T.directions;
      popup.appendChild(b); popup.appendChild(document.createElement('br')); popup.appendChild(a);
      window.L.circleMarker([lat, lng], { radius: 9, color: '#FFFFFF', weight: 2, fillColor: '#06534D', fillOpacity: 1 })
        .bindPopup(popup).addTo(layer);
    });
    if (pts.length) map.fitBounds(pts, { padding: [32, 32], maxZoom: 14 });
  }

  function initMap() {
    var css = load('link', { rel: 'stylesheet', href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' });
    var js = load('script', { src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js' });
    return Promise.all([css, js]).then(function () {
      map = window.L.map(mapEl, { scrollWheelZoom: false }).setView([9.64, -13.58], 11);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: '&copy; OpenStreetMap'
      }).addTo(map);
      layer = window.L.layerGroup().addTo(map);
      drawMarkers();
    });
  }

  toggle.addEventListener('click', function () {
    var open = mapEl.hidden;
    mapEl.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('span').textContent = open ? T.hideMap : T.showMap;
    if (open && !map) {
      initMap().catch(function () {
        mapEl.textContent = T.mapError; mapEl.style.padding = '24px';
      });
    } else if (open && map) {
      map.invalidateSize();
    }
    if (open && window.papelTrack) window.papelTrack('map_open', {});
  });

  apply();
})();
