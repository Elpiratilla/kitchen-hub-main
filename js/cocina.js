/* ===== DATOS =====
   Datos de ejemplo: cambia nombres, coordenadas, precios y fotos por los reales.
   Para sacar lat/lng: clic derecho sobre el lugar en Google Maps y copia los dos números. */

const cocinas = [
    {
        id: 'escalon',
        nombre: 'Cocina Escalón',
        zona: 'San Salvador',
        direccion: 'Colonia Escalón, San Salvador',
        lat: 13.7012,
        lng: -89.2406,
        precio: 'Desde $12 por hora',
        horario: 'Lun a Sáb, 6:00 a. m. a 10:00 p. m.',
        equipo: 'Estufa industrial, horno, refrigeración, mesas de acero',
        foto: '../img/cocina.webp'
    },
    {
        id: 'santa-tecla',
        nombre: 'Cocina Santa Tecla',
        zona: 'La Libertad',
        direccion: 'Santa Tecla, La Libertad',
        lat: 13.6769,
        lng: -89.2797,
        precio: 'Desde $10 por hora',
        horario: 'Lun a Dom, 5:00 a. m. a 11:00 p. m.',
        equipo: 'Plancha, freidoras, campana extractora, cuarto frío',
        foto: '../img/cocina.webp'
    },
    {
        id: 'san-benito',
        nombre: 'Cocina San Benito',
        zona: 'San Salvador',
        direccion: 'Colonia San Benito, San Salvador',
        lat: 13.6935,
        lng: -89.2381,
        precio: 'Desde $14 por hora',
        horario: 'Lun a Vie, 7:00 a. m. a 9:00 p. m.',
        equipo: 'Horno de convección, batidoras, área de empaque',
        foto: '../img/cocina.webp'
    },
    {
        id: 'antiguo-cuscatlan',
        nombre: 'Cocina Antiguo Cuscatlán',
        zona: 'La Libertad',
        direccion: 'Antiguo Cuscatlán, La Libertad',
        lat: 13.6718,
        lng: -89.2535,
        precio: 'Desde $11 por hora',
        horario: 'Lun a Sáb, 6:00 a. m. a 10:00 p. m.',
        equipo: 'Estufa de 6 quemadores, refrigeración, lavaplatos industrial',
        foto: '../img/cocina.webp'
    }
];

/* ===== MAPA ===== */

const mapa = L.map('mapa', {
    scrollWheelZoom: false, // evita que el mapa atrape el scroll de la página
    zoomControl: true
});

// Mapa oscuro para que combine con el sitio (datos de OpenStreetMap, estilo CARTO)
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(mapa);

// Punto rojo en SVG
const iconoRojo = L.divIcon({
    className: 'pin-rojo',
    html: '<svg viewBox="0 0 24 32" width="28" height="36" aria-hidden="true">' +
          '<path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#e5252a" stroke="#fff" stroke-width="1.5"/>' +
          '<circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    tooltipAnchor: [0, -34]
});

function tarjetaHTML(c) {
    return '<img src="' + c.foto + '" alt="" width="260" height="120">' +
           '<div class="cuerpo">' +
           '<h3>' + c.nombre + '</h3>' +
           '<p>' + c.direccion + '</p>' +
           '<p>' + c.horario + '</p>' +
           '<p>' + c.equipo + '</p>' +
           '<p class="precio">' + c.precio + '</p>' +
           '</div>';
}

const lista = document.getElementById('lista-cocinas');
const marcadores = {};
const items = {};

function marcarActivo(id, activo) {
    const el = marcadores[id].getElement();
    if (el) el.classList.toggle('activo', activo);
    items[id].classList.toggle('activa', activo);
}

cocinas.forEach(function (c) {
    // Marcador + tarjeta (aparece al pasar el cursor; en táctil, al tocar)
    const marcador = L.marker([c.lat, c.lng], {
        icon: iconoRojo,
        title: c.nombre,
        alt: c.nombre,
        keyboard: true
    }).addTo(mapa);

    marcador.bindTooltip(tarjetaHTML(c), {
        className: 'tarjeta',
        direction: 'top',
        opacity: 1
    });

    marcadores[c.id] = marcador;

    // Fila de la lista
    const li = document.createElement('li');
    li.className = 'cocina-item';
    li.innerHTML =
        '<div><strong>' + c.nombre + '</strong><span class="zona">' + c.zona + '</span></div>' +
        '<p class="detalle"><b>' + c.precio + '</b><br>' + c.equipo + '<br>' +
        '<a href="/app/?cocina=' + encodeURIComponent(c.nombre) + '">Ver equipos de esta cocina</a></p>' +
        '<button type="button" class="ver-mapa" aria-label="Ver ' + c.nombre + ' en el mapa">Ver en el mapa</button>';
    lista.appendChild(li);
    items[c.id] = li;

    // Resaltar la fila cuando se abre la tarjeta
    marcador.on('tooltipopen', function () { marcarActivo(c.id, true); });
    marcador.on('tooltipclose', function () { marcarActivo(c.id, false); });

    // Teclado: mostrar la tarjeta al enfocar el punto
    const el = marcador.getElement();
    if (el) {
        el.addEventListener('focus', function () { marcador.openTooltip(); });
        el.addEventListener('blur', function () { marcador.closeTooltip(); });
    }

    // Pasar el cursor por la fila abre la tarjeta del punto
    li.addEventListener('mouseenter', function () { marcador.openTooltip(); });
    li.addEventListener('mouseleave', function () { marcador.closeTooltip(); });

    // Botón: lleva al mapa y centra el punto
    li.querySelector('.ver-mapa').addEventListener('click', function () {
        const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        document.getElementById('mapa').scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'center' });
        mapa.setView([c.lat, c.lng], 15, { animate: !reducir });
        marcador.openTooltip();
    });
});

// Encuadra todos los puntos; margen superior extra para que quepa la tarjeta
mapa.fitBounds(
    L.latLngBounds(cocinas.map(function (c) { return [c.lat, c.lng]; })),
    { paddingTopLeft: [60, 220], paddingBottomRight: [60, 60], maxZoom: 14 }
);