import L from 'leaflet';
import 'leaflet-control-geocoder';
import { MapLocation } from "./Map";
import { cargarBienvenida } from '../renderer';

/**
 * Interfaz que representa un punto de interés completo
 * con todos los campos necesarios para mostrar, editar y guardar
 */
interface PuntoInteres {
    nombre: string;
    descripcion: string;
    coordenadas: MapLocation;
    localidad: string;
    pregunta: string;
    respuestas: string[];
    correcta: number;
}

/**
 * Clase que gestiona la exploración, visualización, edición y eliminación
 * de archivos JSON con puntos de interés guardados por el usuario.
 */
export class GestionExplorar {
    private puntosInteres: PuntoInteres[] = [];
    private puntoSeleccionado = -1;
    private archivoActual = '';
    private map: L.Map | null = null;
    private marker: L.Marker | null = null;

    /**
     * Constructor de la clase
     * Inicializa los componentes necesarios para la exploración
     */
    constructor() {
        this.cargarInterfazExploracion();
    }

    /**
     * Carga la interfaz de exploración y configura los eventos
     */
    private async cargarInterfazExploracion(): Promise<void> {
        // Obtener el contenedor principal
        const contenedor = document.getElementById('contenido');
        if (!contenedor) return;

        // Cargar el HTML desde el archivo
        try {
            const response = await fetch('explorar.html');
            const html = await response.text();

            // Crear un contenedor para toda la estructura
            contenedor.innerHTML = `
            <div class="explorar-wrapper">
                ${html}
                <div class="explorar__footer">
                    <button class="btn-anterior btn-volver-inicio">Volver al inicio</button>
                </div>
            </div>
        `;

            // Inicializar eventos y cargar datos
            this.inicializarEventos();
            this.cargarArchivosRecientes();
        } catch (error) {
            console.error("Error al cargar la interfaz de exploración:", error);
            contenedor.innerHTML = `
            <div class="error-mensaje">
                <h3>Error al cargar la interfaz</h3>
                <p>No se pudo cargar la interfaz de exploración.</p>
                <button class="btn-anterior" onclick="await cargarBienvenida();">Volver al inicio</button>
            </div>
        `;
        }
    }

    /**
     * Inicializa todos los eventos de la interfaz
     */
    private inicializarEventos(): void {
        // Evento para arrastrar y soltar archivos
        const dropzone = document.getElementById('dropzone');
        if (dropzone) {
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('explorar__dropzone--active');
            });

            dropzone.addEventListener('dragleave', () => {
                dropzone.classList.remove('explorar__dropzone--active');
            });

            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('explorar__dropzone--active');

                if (e.dataTransfer?.files.length) {
                    this.procesarArchivoSeleccionado(e.dataTransfer.files[0]);
                }
            });
        }

        // Evento para seleccionar archivo con el input
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) {
            fileInput.addEventListener('change', () => {
                if (fileInput.files && fileInput.files.length > 0) {
                    this.procesarArchivoSeleccionado(fileInput.files[0]);
                }
            });
        }

        // Botones de edición y eliminación
        const btnEditar = document.getElementById('btn-editar');
        if (btnEditar) {
            btnEditar.addEventListener('click', () => {
                if (this.puntoSeleccionado >= 0) {
                    this.mostrarFormularioEdicion(this.puntoSeleccionado);
                }
            });
        }

        const btnEliminar = document.getElementById('btn-eliminar');
        if (btnEliminar) {
            btnEliminar.addEventListener('click', () => {
                if (this.puntoSeleccionado >= 0) {
                    this.confirmarEliminarPunto(this.puntoSeleccionado);
                }
            });
        }

        // Eventos del formulario de edición
        const btnCancelar = document.getElementById('btn-cancelar');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => {
                this.ocultarFormularioEdicion();
            });
        }

        const formEdicion = document.getElementById('form-edicion');
        if (formEdicion) {
            formEdicion.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardarCambiosEdicion();
            });
        }

        // Botón para volver al inicio
        const btnVolverInicio = document.querySelector('.btn-volver-inicio');
        if (btnVolverInicio) {
            btnVolverInicio.addEventListener('click', () => {
                cargarBienvenida().catch(console.error);

            });
        }
    }

    /**
     * Carga la lista de archivos recientes
     */
    private async cargarArchivosRecientes(): Promise<void> {
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.listarJsons();

                if (result.ok && result.archivos.length > 0) {
                    this.mostrarArchivosRecientes(result.archivos);
                } else {
                    this.mostrarMensajeArchivosVacios();
                }
            }
        } catch (error) {
            console.error('Error al cargar archivos recientes:', error);
            this.mostrarMensajeArchivosVacios();
        }
    }

    /**
     * Muestra la lista de archivos recientes
     * @param archivos Lista de nombres de archivos
     */
    private mostrarArchivosRecientes(archivos: string[]): void {
        const listaArchivos = document.getElementById('archivos-recientes');
        if (!listaArchivos) return;

        listaArchivos.innerHTML = '';

        archivos.forEach(archivo => {
            const nombreLegible = this.obtenerNombreLegible(archivo);

            const li = document.createElement('li');
            li.textContent = nombreLegible;
            li.addEventListener('click', () => {
                this.cargarArchivo(archivo);
            });

            listaArchivos.appendChild(li);
        });
    }

    /**
     * Muestra un mensaje cuando no hay archivos recientes
     */
    private mostrarMensajeArchivosVacios(): void {
        const listaArchivos = document.getElementById('archivos-recientes');
        if (listaArchivos) {
            listaArchivos.innerHTML = '<li class="explorar__lista-vacio">No hay archivos recientes</li>';
        }
    }

    /**
     * Obtiene un nombre legible a partir del nombre del archivo
     * @param archivo Nombre del archivo con extensión
     * @returns Nombre legible para mostrar
     */
    private obtenerNombreLegible(archivo: string): string {
        return archivo
            .replace('.json', '')
            .split('_')
            .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
            .join(' ');
    }

    /**
     * Procesa un archivo seleccionado por el usuario
     * @param file Archivo seleccionado
     */
    private async procesarArchivoSeleccionado(file: File): Promise<void> {
        if (!file.name.endsWith('.json')) {
            alert('Por favor, selecciona un archivo JSON válido');
            return;
        }

        try {
            const contenido = await this.leerArchivoComoTexto(file);
            const datos = JSON.parse(contenido);

            if (Array.isArray(datos)) {
                this.puntosInteres = datos;
                this.archivoActual = file.name;
                this.mostrarContenidoArchivo();
            } else {
                alert('El formato del archivo no es válido. Debe contener un array de puntos de interés.');
            }
        } catch (error) {
            console.error('Error al procesar el archivo:', error);
            alert('Error al procesar el archivo. Asegúrate de que es un JSON válido.');
        }
    }

    /**
     * Lee un archivo como texto
     * @param file Archivo a leer
     * @returns Promesa con el contenido del archivo como texto
     */
    private leerArchivoComoTexto(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve(e.target?.result as string);
            };
            reader.onerror = (e) => {
                reject(e);
            };
            reader.readAsText(file);
        });
    }

    /**
     * Carga un archivo por su nombre desde el almacenamiento de la aplicación
     * @param nombreArchivo Nombre del archivo a cargar
     */
    private async cargarArchivo(nombreArchivo: string): Promise<void> {
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.leerJson(nombreArchivo);

                if (result.ok && result.datos) {
                    this.puntosInteres = result.datos;
                    this.archivoActual = nombreArchivo;
                    this.mostrarContenidoArchivo();
                } else {
                    alert('Error al cargar el archivo');
                }
            }
        } catch (error) {
            console.error('Error al cargar archivo:', error);
            alert('Error al cargar el archivo');
        }
    }

    /**
     * Muestra el contenido del archivo actual
     */
    private mostrarContenidoArchivo(): void {
        if (this.puntosInteres.length === 0) {
            alert('El archivo no contiene puntos de interés');
            return;
        }

        // Mostrar el primer punto por defecto
        this.mostrarPunto(0);
    }

    /**
     * Muestra los datos de un punto específico
     * @param index Índice del punto a mostrar
     */
    private mostrarPunto(index: number): void {
        if (index < 0 || index >= this.puntosInteres.length) return;

        const punto = this.puntosInteres[index];
        this.puntoSeleccionado = index;

        // Ocultar mensaje de vacío y mostrar datos
        const contenidoVacio = document.getElementById('contenido-vacio');
        const contenidoDatos = document.getElementById('contenido-datos');

        if (contenidoVacio) contenidoVacio.style.display = 'none';
        if (contenidoDatos) contenidoDatos.style.display = 'block';

        // Actualizar datos en la interfaz
        const nombreElement = document.getElementById('punto-nombre');
        const descripcionElement = document.getElementById('punto-descripcion');
        const localidadElement = document.getElementById('punto-localidad');
        const coordenadasElement = document.getElementById('punto-coordenadas');
        const preguntaElement = document.getElementById('punto-pregunta');
        const respuestasElement = document.getElementById('punto-respuestas');

        if (nombreElement) nombreElement.textContent = punto.nombre;
        if (descripcionElement) descripcionElement.textContent = punto.descripcion;
        if (localidadElement) localidadElement.textContent = punto.localidad;
        if (coordenadasElement) {
            coordenadasElement.textContent = `${punto.coordenadas.latitud.toFixed(5)}, ${punto.coordenadas.longitud.toFixed(5)}`;
        }
        if (preguntaElement) preguntaElement.textContent = punto.pregunta;

        // Mostrar respuestas
        if (respuestasElement) {
            respuestasElement.innerHTML = '';
            punto.respuestas.forEach((resp, idx) => {
                const li = document.createElement('li');
                li.textContent = resp;
                if (idx === punto.correcta) {
                    li.classList.add('correcta');
                    li.textContent = `${resp} (Correcta)`;
                }
                respuestasElement.appendChild(li);
            });
        }

        // Inicializar mapa
        this.inicializarMapa(punto.coordenadas.latitud, punto.coordenadas.longitud);
    }

    /**
     * Inicializa el mapa con la ubicación del punto
     * @param lat Latitud
     * @param lng Longitud
     */
    private inicializarMapa(lat: number, lng: number): void {
        const contenedorMapa = document.getElementById('mapa-preview');
        if (!contenedorMapa) return;

        // Limpiar mapa si ya existe
        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        // Crear el mapa
        this.map = L.map(contenedorMapa, {
            zoomControl: true,
            attributionControl: false
        }).setView([lat, lng], 16);

        // Añadir capa
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        // Añadir marcador
        this.marker = L.marker([lat, lng]).addTo(this.map);
    }

    /**
     * Muestra el formulario de edición para un punto
     * @param index Índice del punto a editar
     */
    private mostrarFormularioEdicion(index: number): void {
        if (index < 0 || index >= this.puntosInteres.length) return;

        const punto = this.puntosInteres[index];

        // Ocultar vista de datos y mostrar formulario
        const contenidoDatos = document.getElementById('contenido-datos');
        const formularioEdicion = document.getElementById('formulario-edicion');

        if (contenidoDatos) contenidoDatos.style.display = 'none';
        if (formularioEdicion) formularioEdicion.style.display = 'block';

        // Rellenar formulario con datos del punto
        const nombreInput = document.getElementById('edit-nombre') as HTMLInputElement;
        const descripcionInput = document.getElementById('edit-descripcion') as HTMLTextAreaElement;
        const preguntaInput = document.getElementById('edit-pregunta') as HTMLInputElement;
        const respuestasContainer = document.getElementById('edit-respuestas-container');

        if (nombreInput) nombreInput.value = punto.nombre;
        if (descripcionInput) descripcionInput.value = punto.descripcion;
        if (preguntaInput) preguntaInput.value = punto.pregunta;

        // Generar campos para respuestas - MODIFICADO para mantener solo el radio button
        if (respuestasContainer) {
            respuestasContainer.innerHTML = '';

            punto.respuestas.forEach((resp, idx) => {
                const div = document.createElement('div');
                div.className = 'respuesta-edicion';

                // Radio button para marcar respuesta correcta
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = 'correcta';
                radio.value = idx.toString();
                radio.id = `correcta-${idx}`;
                radio.checked = idx === punto.correcta;
                radio.title = 'Marcar como respuesta correcta'; // Agregar tooltip para claridad

                // Etiqueta invisible (para mantener accesibilidad pero no mostrarla)
                const label = document.createElement('label');
                label.htmlFor = `correcta-${idx}`;
                label.textContent = 'Correcta';
                label.style.display = 'none'; // Ocultar pero mantener para accesibilidad

                // Campo de texto para la respuesta
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'formulario__input';
                input.name = `respuesta-${idx}`;
                input.value = resp;
                input.required = true;
                input.placeholder = 'Escribe una respuesta';

                div.appendChild(radio);
                div.appendChild(label);
                div.appendChild(input);

                respuestasContainer.appendChild(div);
            });
        }
    }

    /**
     * Oculta el formulario de edición y muestra la vista de datos
     */
    private ocultarFormularioEdicion(): void {
        const contenidoDatos = document.getElementById('contenido-datos');
        const formularioEdicion = document.getElementById('formulario-edicion');

        if (contenidoDatos) contenidoDatos.style.display = 'block';
        if (formularioEdicion) formularioEdicion.style.display = 'none';
    }

    /**
     * Guarda los cambios realizados en el formulario de edición
     */
    private async guardarCambiosEdicion(): Promise<void> {
        if (this.puntoSeleccionado < 0) return;

        // Obtener datos del formulario
        const nombreInput = document.getElementById('edit-nombre') as HTMLInputElement;
        const descripcionInput = document.getElementById('edit-descripcion') as HTMLTextAreaElement;
        const preguntaInput = document.getElementById('edit-pregunta') as HTMLInputElement;

        // Validar
        if (!nombreInput.value.trim() || !descripcionInput.value.trim() || !preguntaInput.value.trim()) {
            alert('Por favor, completa todos los campos obligatorios');
            return;
        }

        // Obtener respuestas
        const respuestas: string[] = [];
        const respuestaInputs = document.querySelectorAll('.respuesta-edicion input[type="text"]');
        respuestaInputs.forEach(input => {
            const valor = (input as HTMLInputElement).value.trim();
            if (valor) {
                respuestas.push(valor);
            }
        });

        if (respuestas.length < 2) {
            alert('Debe haber al menos 2 respuestas');
            return;
        }

        // Obtener respuesta correcta
        const correctaInput = document.querySelector('input[name="correcta"]:checked') as HTMLInputElement;
        const correcta = correctaInput ? parseInt(correctaInput.value) : 0;

        // Actualizar punto
        const puntoActual = this.puntosInteres[this.puntoSeleccionado];

        const puntoEditado: PuntoInteres = {
            ...puntoActual,
            nombre: nombreInput.value.trim(),
            descripcion: descripcionInput.value.trim(),
            pregunta: preguntaInput.value.trim(),
            respuestas: respuestas,
            correcta: correcta
        };

        // Actualizar en el array
        this.puntosInteres[this.puntoSeleccionado] = puntoEditado;

        try {
            // Guardar cambios en el archivo
            if (window.electronAPI) {
                await window.electronAPI.actualizarJson(this.archivoActual, this.puntosInteres);

                alert('Cambios guardados correctamente');

                // Volver a la vista de datos
                this.ocultarFormularioEdicion();
                this.mostrarPunto(this.puntoSeleccionado);
            } else {
                throw new Error('No se pudo acceder a electronAPI');
            }
        } catch (error) {
            console.error('Error al guardar cambios:', error);
            alert('Error al guardar los cambios');
        }
    }

    /**
     * Muestra una confirmación para eliminar un punto
     * @param index Índice del punto a eliminar
     */
    private confirmarEliminarPunto(index: number): void {
        if (index < 0 || index >= this.puntosInteres.length) return;

        const punto = this.puntosInteres[index];

        if (confirm(`¿Estás seguro de que deseas eliminar el punto "${punto.nombre}"?`)) {
            this.eliminarPunto(index);
        }
    }

    /**
     * Elimina un punto del archivo
     * @param index Índice del punto a eliminar
     */
    private async eliminarPunto(index: number): Promise<void> {
        // Eliminar del array
        this.puntosInteres.splice(index, 1);

        try {
            // Guardar cambios en el archivo
            if (window.electronAPI) {
                await window.electronAPI.actualizarJson(this.archivoActual, this.puntosInteres);

                alert('Punto eliminado correctamente');

                // Mostrar otro punto o mensaje vacío
                if (this.puntosInteres.length > 0) {
                    this.mostrarPunto(0);
                } else {
                    // Mostrar mensaje de vacío
                    const contenidoVacio = document.getElementById('contenido-vacio');
                    const contenidoDatos = document.getElementById('contenido-datos');

                    if (contenidoVacio) contenidoVacio.style.display = 'flex';
                    if (contenidoDatos) contenidoDatos.style.display = 'none';
                }
            } else {
                throw new Error('No se pudo acceder a electronAPI');
            }
        } catch (error) {
            console.error('Error al eliminar punto:', error);
            alert('Error al eliminar el punto');
        }
    }
}