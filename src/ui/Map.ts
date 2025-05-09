import L from 'leaflet';

export function initMap() {

    // Crear el mapa con coordenadas iniciales
    const map = L.map('map').setView([40.416775, -3.703790], 13);

    // Agregar capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Agregar un marcador
    L.marker([40.416775, -3.703790])
        .addTo(map)
        .bindPopup('suelte el marcador')
        .openPopup();

    return map;
}