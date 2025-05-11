/* ------------------------------------------------------------------
 *  MÓDULO  ▸  Mapa Leaflet + geocoder + marcador arrastrable
 * -----------------------------------------------------------------*/

import L from 'leaflet';
import 'leaflet-control-geocoder';

/* ‑‑‑‑‑‑‑‑‑‑‑  Tipos públicos  ‑‑‑‑‑‑‑‑‑‑‑ */

export interface MapLocation {
    nombre: string;   // nombre legible (“Jávea”)
    latitud: number;
    longitud: number;
}

/* ‑‑‑‑‑‑‑‑‑‑‑  Estado interno  ‑‑‑‑‑‑‑‑‑‑‑ */

let map: L.Map;                   // instancia de Leaflet
let marker: L.Marker;             // marcador único y arrastrable
let current: MapLocation = {      // última posición escogida
    nombre: '',
    latitud: 0,
    longitud: 0
};

/* ==================================================================
 *  API PÚBLICA
 * ==================================================================*/

/**
 * Crea el mapa dentro de #map, coloca un marcador arrastrable
 * y habilita el buscador + clic en el mapa.
 *
 * Se debe llamar **una sola vez** por pantalla.
 */
export function initMap(): L.Map {
    map = L.map('map', {
        zoomControl: true,
        attributionControl: false
    }).setView([40.4168, -3.7038], 16);           // Madrid por defecto

    añadirCapaBase();
    crearMarcadorInicial();
    geolocalizarUsuario();
    activarGeocoder();
    activarClicEnMapa();

    return map;
}

/** Devuelve la última ubicación elegida por el usuario. */
export function getMapCoordinates(): MapLocation {
    return current;
}

/* ==================================================================
 *  Detalle interno
 * ==================================================================*/

function añadirCapaBase(): void {
    L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {subdomains: 'abcd', maxZoom: 19}
    ).addTo(map);
}

function crearMarcadorInicial(): void {
    marker = L.marker(map.getCenter(), {draggable: true})
        .addTo(map)
        .bindPopup('Arrastra el marcador o busca una dirección')
        .openPopup();

    marker.on('dragend', () => {
        const p = marker.getLatLng();
        actualizarEstado(p.lat, p.lng);
    });
}

function geolocalizarUsuario(): void {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
        (pos) => moverMarcador(pos.coords.latitude, pos.coords.longitude, undefined, 17),
        (err) => console.warn('Geolocalización desactivada o denegada:', err)
    );

}

function activarGeocoder(): void {
    (L.Control as any).geocoder({
        defaultMarkGeocode: false,
        placeholder: 'Buscar sitio…',
        errorMessage: 'No encontrado'
    })
        .on('markgeocode', (e: any) => {
            const {lat, lng} = e.geocode.center;
            moverMarcador(lat, lng, e.geocode.name, 18);
        })
        .addTo(map);
}

function activarClicEnMapa(): void {
    map.on('click', (e: L.LeafletMouseEvent) => {
        moverMarcador(e.latlng.lat, e.latlng.lng);
    });
}

/* ------------------------------------------------------------------
 *  moverMarcador()
 * ------------------------------------------------------------------
 *  - Re‑utiliza el mismo marker (performance)
 *  - Actualiza estado + popup
 *  - Centra el mapa (ajustando zoom opcionalmente)
 * -----------------------------------------------------------------*/
function moverMarcador(lat: number, lng: number, nombre?: string, nuevoZoom?: number): void {
    marker.setLatLng([lat, lng]);

    actualizarEstado(lat, lng, nombre);

    marker.getPopup()
        ?.setContent(`Localización: ${current.nombre}<br>${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        .openOn(map);

    map.setView([lat, lng], nuevoZoom ?? map.getZoom());
}

/** Actualiza la variable `current` y (si procede) el input #coordenadas del paso 1 */
function actualizarEstado(lat: number, lng: number, nombre?: string): void {
    // nombre ⇢ “nombre” pasado || valor del input oculto || “Punto de interés”
    const nombreInput = document.getElementById('nombreLocalizacion') as HTMLInputElement | null;
    current = {
        nombre: nombre || nombreInput?.value.trim() || 'Punto de interés',
        latitud: lat,
        longitud: lng
    };

    // si existe un input de coordenadas visible, lo rellenamos para feedback inmediato
    const inpCoord = document.getElementById('coordenadas') as HTMLInputElement | null;
    if (inpCoord) inpCoord.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/* ==================================================================
 *  Funciones auxiliares (geocodificación inversa externa)
 * ==================================================================*/

/**
 * Devuelve la localidad más probable para unas coordenadas usando Nominatim.
 * Está desacoplada del resto del módulo∙ Se exporta porque la necesita el wizard.
 */
export async function getLocalidadFromCoords(lat: number, lon: number): Promise<string> {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=es`;
        const r = await fetch(url, {headers: {'User-Agent': 'mapa-pdi-app'}});
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const ad = j.address ?? {};
        return ad.city || ad.town || ad.village || ad.hamlet || ad.county || 'desconocido';
    } catch (e) {
        console.error('Nominatim error', e);
        return 'desconocido';
    }
}
