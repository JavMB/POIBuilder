import L from 'leaflet';
import 'leaflet-control-geocoder';

// --- Tipado para el punto de interés seleccionado ---
interface MapLocation {
    nombre: string;
    latitud: number;
    longitud: number;
}
let currentMapLocation: MapLocation = {
    nombre: '',
    latitud: 0,
    longitud: 0
};

let currentMarker: L.Marker | null = null;
let map: L.Map;

// --- Inicializa el mapa con geolocalización y buscador ---
export function initMap(): L.Map {
    // Centrado provisional en Madrid hasta geolocalización
    map = L.map('map', {
        zoomControl: true,
        attributionControl: false
    }).setView([40.416775, -3.703790], 16); // Initial view with zoom 16

    // Capa base limpia estilo Voyager de CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        tileSize: 256,
        keepBuffer: 4,
        updateWhenIdle: true,
        updateWhenZooming: false,
        crossOrigin: true
    }).addTo(map);

    // Geolocalizar usuario si es posible
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                // Set marker and view to user's location with zoom 17
                setOrMoveMarker(lat, lng, undefined, 17);
            },
            () => {
                // Si falla, Madrid, con el zoom actual del mapa (inicialmente 16)
                setOrMoveMarker(40.416775, -3.703790);
            }
        );
    } else {
        // Si no hay API de geolocalización, Madrid, con el zoom actual del mapa (inicialmente 16)
        setOrMoveMarker(40.416775, -3.703790);
    }

    // Añadir buscador (Leaflet Control Geocoder)
    (L.Control as any).geocoder({
        defaultMarkGeocode: false,
        placeholder: 'Buscar sitio...',
        errorMessage: 'No encontrado'
    })
        .on('markgeocode', function(e: any) {
            const latlng = e.geocode.center;
            map.setView(latlng, 18); // Geocoder sets its own zoom
            setOrMoveMarker(latlng.lat, latlng.lng, e.geocode.name); // Update marker, using current map zoom (18)
        })
        .addTo(map);

    // Permitir click en mapa para mover el marcador
    map.on('click', (e: L.LeafletMouseEvent) => {
        // Update marker, using current map zoom
        setOrMoveMarker(e.latlng.lat, e.latlng.lng);
    });

    return map;
}

// --- Crea o mueve el marcador a la posición dada, actualiza estado y vista del mapa ---
function setOrMoveMarker(lat: number, lng: number, nombre?: string, newZoom?: number): void {
    if (!currentMarker) {
        currentMarker = L.marker([lat, lng], { draggable: true })
            .addTo(map)
            .bindPopup('Arrastra el marcador o haz clic en el mapa para ubicar el punto de interés')
            .openPopup();

        currentMarker.on('dragend', (event: L.LeafletEvent) => {
            const marker = event.target as L.Marker;
            const position = marker.getLatLng();
            // After drag, update marker and map view using current map zoom
            setOrMoveMarker(position.lat, position.lng);
        });
    } else {
        currentMarker.setLatLng([lat, lng]);
    }
    updateAll(lat, lng, nombre);
    // Set map view to marker's position, using newZoom if provided, otherwise current map zoom
    map.setView([lat, lng], newZoom !== undefined ? newZoom : map.getZoom());
}

// --- Actualiza datos y popup ---
function updateAll(lat: number, lng: number, nombre?: string): void {
    updateCurrentLocation(lat, lng, nombre);
    if (currentMarker) {
        currentMarker.bindPopup(
            `Localización: ${nombre ? nombre + '<br>' : ''}${lat.toFixed(5)}, ${lng.toFixed(5)}`
        ).openPopup();
    }
}

// --- Actualiza el objeto con la ubicación y el nombre (si hay input de nombre) ---
function updateCurrentLocation(lat: number, lng: number, nombre?: string): void {
    const nombreInput = document.getElementById('nombreLocalizacion') as HTMLInputElement | null;
    const name = nombre || (nombreInput && nombreInput.value.trim() !== '' ? nombreInput.value : 'Punto de interés');
    currentMapLocation = {
        nombre: name,
        latitud: lat,
        longitud: lng
    };
    console.log(`Ubicación actualizada: ${name} en ${lat}, ${lng}`);
}

// --- Devuelve la ubicación seleccionada ---
export function getMapCoordinates(): MapLocation {
    return currentMapLocation;
}