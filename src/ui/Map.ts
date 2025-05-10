import L from 'leaflet';
import 'leaflet-control-geocoder';

/**
 * Interfaz que define la estructura de un punto de interés en el mapa.
 * @property {string} nombre - Nombre descriptivo de la ubicación
 * @property {number} latitud - Coordenada de latitud
 * @property {number} longitud - Coordenada de longitud
 */
export interface MapLocation {
    nombre: string;
    latitud: number;
    longitud: number;
}

/**
 * Almacena la ubicación actual seleccionada en el mapa.
 * Se inicializa con valores vacíos.
 */
let currentMapLocation: MapLocation = {
    nombre: '',
    latitud: 0,
    longitud: 0
};

/** Referencia al marcador actual en el mapa. Null si no hay ninguno. */
let currentMarker: L.Marker | null = null;

/** Instancia del mapa de Leaflet. */
let map: L.Map;

/**
 * Inicializa el mapa con geolocalización y buscador.
 * Configura los listeners para eventos de clic en el mapa y búsqueda.
 *
 * @returns {L.Map} Instancia del mapa creado
 */
export function initMap(): L.Map {
    // Centrado provisional en Madrid hasta geolocalización
    map = L.map('map', {
        zoomControl: true,
        attributionControl: false
    }).setView([40.416775, -3.703790], 16); // Vista inicial con zoom 16

    /**
     * Añade la capa base de CartoDB estilo Voyager.
     * Este estilo proporciona un fondo de mapa limpio y profesional.
     */
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        tileSize: 256,
        keepBuffer: 4,
        updateWhenIdle: true,
        updateWhenZooming: false,
        crossOrigin: true
    }).addTo(map);

    /**
     * Intenta geolocalizar al usuario si el navegador lo permite.
     * Si tiene éxito, centra el mapa en la ubicación del usuario.
     * Si falla, utiliza Madrid como ubicación predeterminada.
     */
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                // Colocar marcador y centrar vista en la ubicación del usuario con zoom 17
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

    /**
     * Añade el control de búsqueda (geocoder) al mapa.
     * Permite al usuario buscar ubicaciones por nombre.
     * Al seleccionar un resultado, mueve el mapa y el marcador a esa ubicación.
     */
    (L.Control as any).geocoder({
        defaultMarkGeocode: false,
        placeholder: 'Buscar sitio...',
        errorMessage: 'No encontrado'
    })
        .on('markgeocode', function(e: any) {
            const latlng = e.geocode.center;
            // IMPORTANTE: Evitamos usar setView aquí para prevenir conflictos
            // con la actualización de vista en setOrMoveMarker
            setOrMoveMarker(latlng.lat, latlng.lng, e.geocode.name, 18); // Pasamos zoom 18
        })
        .addTo(map);

    /**
     * Configura el evento de clic en el mapa.
     * Permite al usuario seleccionar una ubicación haciendo clic en cualquier punto.
     */
    map.on('click', (e: L.LeafletMouseEvent) => {
        // Actualiza marcador usando el zoom actual del mapa
        setOrMoveMarker(e.latlng.lat, e.latlng.lng);
    });

    return map;
}

/**
 * Crea o mueve el marcador a la posición especificada.
 * Actualiza el estado interno y la vista del mapa.
 *
 * @param {number} lat - Latitud de la nueva posición
 * @param {number} lng - Longitud de la nueva posición
 * @param {string} [nombre] - Nombre opcional para la ubicación
 * @param {number} [newZoom] - Nivel de zoom opcional para la vista del mapa
 */
function setOrMoveMarker(lat: number, lng: number, nombre?: string, newZoom?: number): void {
    // Primero actualizamos los datos para evitar desincronización
    updateAll(lat, lng, nombre);

    // Si no existe un marcador, lo creamos con la posición dada
    if (!currentMarker) {
        currentMarker = L.marker([lat, lng], { draggable: true })
            .addTo(map)
            .bindPopup('Arrastra el marcador o haz clic en el mapa para ubicar el punto de interés')
            .openPopup();

        /**
         * Configura el evento de arrastre para el marcador.
         * Permite al usuario ajustar la ubicación arrastrando el marcador.
         */
        currentMarker.on('dragend', (event: L.LeafletEvent) => {
            const marker = event.target as L.Marker;
            const position = marker.getLatLng();
            // Tras arrastrar, actualiza marcador y vista del mapa usando zoom actual
            setOrMoveMarker(position.lat, position.lng);
        });
    } else {
        // IMPORTANTE: Aseguramos que el marcador siempre esté visible en el mapa
        // Soluciona el problema de que el marcador no siga al hacer búsquedas
        if (!map.hasLayer(currentMarker)) {
            currentMarker.addTo(map);
        }
        // Actualizamos la posición del marcador existente
        currentMarker.setLatLng([lat, lng]);
    }

    // Centra la vista del mapa en la posición del marcador
    // Usa newZoom si se proporciona, o mantiene el zoom actual
    map.setView([lat, lng], newZoom !== undefined ? newZoom : map.getZoom());

    // Aseguramos que el popup se actualice y se abra con la nueva información
    if (currentMarker) {
        currentMarker.bindPopup(
            `Localización: ${nombre ? nombre + '<br>' : ''}${lat.toFixed(5)}, ${lng.toFixed(5)}`
        ).openPopup();
    }
}

/**
 * Actualiza los datos de la ubicación seleccionada.
 *
 * @param {number} lat - Latitud de la ubicación
 * @param {number} lng - Longitud de la ubicación
 * @param {string} [nombre] - Nombre opcional para la ubicación
 */
function updateAll(lat: number, lng: number, nombre?: string): void {
    updateCurrentLocation(lat, lng, nombre);
}

/**
 * Actualiza el objeto con la ubicación y el nombre.
 * Si no se proporciona un nombre, intenta obtenerlo del input del formulario.
 *
 * @param {number} lat - Latitud de la ubicación
 * @param {number} lng - Longitud de la ubicación
 * @param {string} [nombre] - Nombre opcional para la ubicación
 */
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

/**
 * Devuelve la ubicación actualmente seleccionada en el mapa.
 *
 * @returns {MapLocation} Objeto con los datos de la ubicación
 */
export function getMapCoordinates(): MapLocation {
    return currentMapLocation;
}

/**
 * Obtiene el nombre de la localidad (ciudad, pueblo, etc.) para unas coordenadas.
 * Utiliza el servicio de geocodificación inversa de Nominatim (OpenStreetMap).
 *
 * @async
 * @param {number} lat - Latitud de la ubicación
 * @param {number} lon - Longitud de la ubicación
 * @returns {Promise<string>} Nombre de la localidad o "desconocido" si no se encuentra
 */
export async function getLocalidadFromCoords(lat: number, lon: number): Promise<string> {
    try {
        // Valida las coordenadas para asegurar que están dentro de rangos válidos
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            throw new Error('Coordenadas inválidas');
        }

        // Construye la URL para la petición a Nominatim
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=es`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'appeducativa javiermengual@live.com'
            }
        });

        // Comprueba si la petición fue exitosa
        if (!response.ok) {
            throw new Error(`Error en la petición: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Verifica que los datos y la dirección existan
        if (!data || !data.address) {
            return "desconocido";
        }

        // Devuelve el primer campo de localidad disponible, en orden de preferencia
        // Puedes ajustar este orden según tus necesidades
        return (
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.hamlet ||
            data.address.municipality ||
            data.address.county ||
            data.address.state ||
            "desconocido"
        );
    } catch (error) {
        console.error('Error al obtener la localidad:', error);
        return "desconocido";
    }
}