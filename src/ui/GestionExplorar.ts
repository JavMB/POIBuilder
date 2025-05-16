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
    coordenadas: {
        latitud: number;
        longitud: number;
        nombre?: string; // Hacemos el nombre opcional para compatibilidad
    };
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

            // Usar solo el HTML original, sin añadir otro footer duplicado
            contenedor.innerHTML = html;

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

        // Botón subir a la nube
        const btnSubirNube = document.getElementById('btn-subir-nube');
        if (btnSubirNube) {
            btnSubirNube.addEventListener('click', async () => {
                if (this.puntoSeleccionado >= 0) {
                    await this.subirPuntoAGitHub(this.puntosInteres[this.puntoSeleccionado]);
                } else {
                    this.mostrarMensaje('Selecciona un punto para subir a la nube', 'error');
                }
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

    /** Muestra un mensaje flotante no bloqueante (tipo error o success) */
    private mostrarMensaje(mensaje: string, tipo: 'error' | 'success' = 'error'): void {
        this.agregarAnimacionCSS();
        const notificacionAnterior = document.getElementById('mensaje-validacion');
        if (notificacionAnterior) notificacionAnterior.remove();
        const colorFondo = tipo === 'error' ? '#ffebee' : '#e8f5e9';
        const colorBorde = tipo === 'error' ? 'var(--color-error)' : 'var(--color-success)';
        const colorTitulo = tipo === 'error' ? 'var(--color-error)' : 'var(--color-success)';
        const titulo = tipo === 'error' ? 'Error' : 'Operación completada';
        const notificacion = document.createElement('div');
        notificacion.id = 'mensaje-validacion';
        notificacion.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 350px;
            background-color: ${colorFondo};
            border-left: 4px solid ${colorBorde};
            padding: 15px;
            border-radius: 4px;
            box-shadow: 0 3px 8px rgba(0,0,0,0.15);
            z-index: 9999;
            font-size: 14px;
            animation: slideIn 0.3s ease-out;
            font-family: var(--font-main);
            backdrop-filter: blur(5px);
        `;
        const tituloElem = document.createElement('div');
        tituloElem.style.cssText = `font-weight: bold; margin-bottom: 8px; display: flex; justify-content: space-between; color: ${colorTitulo};`;
        tituloElem.innerHTML = `${titulo} <span style="cursor: pointer;">✕</span>`;
        const contenido = document.createElement('div');
        contenido.innerHTML = mensaje.replace(/\n/g, '<br>');
        tituloElem.querySelector('span')?.addEventListener('click', () => {
            notificacion.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => {
                if (document.body.contains(notificacion)) notificacion.remove();
            }, 300);
        });
        notificacion.appendChild(tituloElem);
        notificacion.appendChild(contenido);
        document.body.appendChild(notificacion);
        setTimeout(() => {
            if (document.body.contains(notificacion)) {
                notificacion.style.animation = 'fadeOut 0.3s forwards';
                setTimeout(() => notificacion.remove(), 300);
            }
        }, 8000);
    }
    private agregarAnimacionCSS(): void {
        if (document.getElementById('mensaje-animacion-css')) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'mensaje-animacion-css';
        styleEl.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(styleEl);
    }

    /**
     * Procesa un archivo seleccionado por el usuario
     * @param file Archivo seleccionado
     */
    private async procesarArchivoSeleccionado(file: File): Promise<void> {
        if (!file.name.endsWith('.json')) {
            this.mostrarMensaje('Por favor, selecciona un archivo JSON válido', 'error');
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
                this.mostrarMensaje('El formato del archivo no es válido. Debe contener un array de puntos de interés.', 'error');
            }
        } catch (error) {
            console.error('Error al procesar el archivo:', error);
            this.mostrarMensaje('Error al procesar el archivo. Asegúrate de que es un JSON válido.', 'error');
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
                    this.mostrarMensaje('Error al cargar el archivo', 'error');
                }
            }
        } catch (error) {
            console.error('Error al cargar archivo:', error);
            this.mostrarMensaje('Error al cargar el archivo', 'error');
        }
    }

    /**
     * Muestra el contenido del archivo actual
     */
    private mostrarContenidoArchivo(): void {
        if (this.puntosInteres.length === 0) {
            this.mostrarMensaje('El archivo no contiene puntos de interés', 'error');
            return;
        }
        // Mostrar el primer punto por defecto
        this.mostrarPunto(0);
        this.mostrarListaPuntos();
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

        if (nombreElement) nombreElement.textContent = punto.nombre || 'Sin información';
        if (descripcionElement) descripcionElement.textContent = punto.descripcion || 'Sin información';
        if (localidadElement) localidadElement.textContent = punto.localidad || 'Sin información';
        if (coordenadasElement) {
            if (punto.coordenadas && typeof punto.coordenadas.latitud === 'number' && typeof punto.coordenadas.longitud === 'number') {
                coordenadasElement.textContent = `${punto.coordenadas.latitud.toFixed(5)}, ${punto.coordenadas.longitud.toFixed(5)}`;
            } else {
                coordenadasElement.textContent = 'Sin información';
            }
        }
        if (preguntaElement) preguntaElement.textContent = punto.pregunta || 'Sin información';

        // Mostrar respuestas
        if (respuestasElement) {
            respuestasElement.innerHTML = '';
            if (Array.isArray(punto.respuestas) && punto.respuestas.length > 0) {
                punto.respuestas.forEach((resp, idx) => {
                    const li = document.createElement('li');
                    li.textContent = resp || 'Sin información';
                    if (idx === punto.correcta) {
                        li.classList.add('correcta');
                        li.textContent = `${resp || 'Sin información'} (Correcta)`;
                    }
                    respuestasElement.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'Sin respuestas';
                respuestasElement.appendChild(li);
            }
        }

        // Inicializar mapa solo si hay coordenadas válidas
        if (punto.coordenadas && typeof punto.coordenadas.latitud === 'number' && typeof punto.coordenadas.longitud === 'number') {
            this.inicializarMapa(punto.coordenadas.latitud, punto.coordenadas.longitud);
        }
        this.mostrarListaPuntos();
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
            this.mostrarMensaje('Por favor, completa todos los campos obligatorios', 'error');
            return;
        }

        // Obtener respuestas
        const respuestas: string[] = [];
        const respuestaInputs = document.querySelectorAll('.respuesta-edicion input[type="text"]');
        respuestaInputs.forEach(input => {
            const valor = (input as HTMLInputElement).value.trim();
            if (valor) {
                respuestas.push(valor);
            } else {
                this.resaltarCampoConError(input as HTMLInputElement, 'Respuesta obligatoria');
            }
        });

        if (respuestas.length < 2) {
            const container = document.getElementById('edit-respuestas-container');
            if (container) {
                const msg = container.querySelector('.mensaje-error');
                if (!msg) {
                    const newMsg = document.createElement('div');
                    newMsg.className = 'mensaje-error';
                    container.appendChild(newMsg);
                    newMsg.textContent = 'Debe haber al menos 2 respuestas';
                } else {
                    msg.textContent = 'Debe haber al menos 2 respuestas';
                }
            }
        } else {
            const container = document.getElementById('edit-respuestas-container');
            if (container) {
                const msg = container.querySelector('.mensaje-error');
                if (msg) msg.textContent = '';
            }
        }

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

                this.mostrarMensaje('Cambios guardados correctamente', 'success');

                // Volver a la vista de datos
                this.ocultarFormularioEdicion();
                this.mostrarPunto(this.puntoSeleccionado);
                this.mostrarListaPuntos();
            } else {
                throw new Error('No se pudo acceder a electronAPI');
            }
        } catch (error) {
            console.error('Error al guardar cambios:', error);
            this.mostrarMensaje('Error al guardar los cambios', 'error');
        }
    }

    /**
     * Muestra una confirmación para eliminar un punto
     * @param index Índice del punto a eliminar
     */
    private confirmarEliminarPunto(index: number): void {
        if (index < 0 || index >= this.puntosInteres.length) return;

        const punto = this.puntosInteres[index];

        // Popup de confirmación no bloqueante
        this.mostrarMensajeConfirmacion(
            `¿Estás seguro de que deseas eliminar el punto "${punto.nombre}"?`,
            () => this.eliminarPunto(index)
        );
    }

    private mostrarMensajeConfirmacion(mensaje: string, onConfirm: () => void): void {
        this.agregarAnimacionCSS();
        const notificacionAnterior = document.getElementById('mensaje-validacion');
        if (notificacionAnterior) notificacionAnterior.remove();
        const notificacion = document.createElement('div');
        notificacion.id = 'mensaje-validacion';
        notificacion.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 350px;
            background-color: #fffbe6;
            border-left: 4px solid var(--color-warning, #fbc02d);
            padding: 15px;
            border-radius: 4px;
            box-shadow: 0 3px 8px rgba(0,0,0,0.15);
            z-index: 9999;
            font-size: 14px;
            animation: slideIn 0.3s ease-out;
            font-family: var(--font-main);
            backdrop-filter: blur(5px);
        `;
        const tituloElem = document.createElement('div');
        tituloElem.style.cssText = `font-weight: bold; margin-bottom: 8px; color: var(--color-warning, #fbc02d);`;
        tituloElem.textContent = 'Confirmar acción';
        const contenido = document.createElement('div');
        contenido.innerHTML = mensaje.replace(/\n/g, '<br>');
        const botones = document.createElement('div');
        botones.style.cssText = 'margin-top: 12px; display: flex; gap: 10px; justify-content: flex-end;';
        const btnSi = document.createElement('button');
        btnSi.textContent = 'Sí';
        btnSi.style.cssText = 'background: var(--color-success); color: white; border: none; border-radius: 3px; padding: 5px 14px; cursor: pointer;';
        const btnNo = document.createElement('button');
        btnNo.textContent = 'No';
        btnNo.style.cssText = 'background: var(--color-error); color: white; border: none; border-radius: 3px; padding: 5px 14px; cursor: pointer;';
        btnSi.onclick = () => {
            notificacion.remove();
            onConfirm();
        };
        btnNo.onclick = () => notificacion.remove();
        botones.appendChild(btnSi);
        botones.appendChild(btnNo);
        notificacion.appendChild(tituloElem);
        notificacion.appendChild(contenido);
        notificacion.appendChild(botones);
        document.body.appendChild(notificacion);
    }

    /**
     * Elimina un punto del archivo
     * @param index Índice del punto a eliminar
     */
    private async eliminarPunto(index: number): Promise<void> {
        this.puntosInteres.splice(index, 1);
        try {
            if (window.electronAPI) {
                await window.electronAPI.actualizarJson(this.archivoActual, this.puntosInteres);
                this.mostrarMensaje('Punto eliminado correctamente', 'success');
                if (this.puntosInteres.length > 0) {
                    this.mostrarPunto(0);
                    this.mostrarListaPuntos();
                } else {
                    const contenidoVacio = document.getElementById('contenido-vacio');
                    const contenidoDatos = document.getElementById('contenido-datos');
                    if (contenidoVacio) contenidoVacio.style.display = 'flex';
                    if (contenidoDatos) contenidoDatos.style.display = 'none';
                    this.mostrarListaPuntos();
                }
            } else {
                throw new Error('No se pudo acceder a electronAPI');
            }
        } catch (error) {
            console.error('Error al eliminar punto:', error);
            this.mostrarMensaje('Error al eliminar el punto', 'error');
        }
    }
    /** Lista todos los puntos del archivo y permite seleccionarlos */
    private mostrarListaPuntos(): void {
        const lista = document.getElementById('puntos-list');
        if (!lista) return;

        lista.innerHTML = '';
        this.puntosInteres.forEach((punto, idx) => {
            const li = document.createElement('li');
            li.textContent = punto.nombre || `Punto ${idx + 1}`;

            // resaltar el seleccionado
            if (idx === this.puntoSeleccionado) li.classList.add('active');

            li.addEventListener('click', () => {
                this.mostrarPunto(idx);
            });

            lista.appendChild(li);
        });
    }

    /** Resalta un campo con error y muestra un mensaje debajo */
    private resaltarCampoConError(input: HTMLElement, mensaje: string) {
        input.classList.add('input-error');
        let msg = input.parentElement?.querySelector('.mensaje-error');
        if (!msg) {
            msg = document.createElement('div');
            msg.className = 'mensaje-error';
            input.parentElement?.appendChild(msg);
        }
        msg.textContent = mensaje;
        // Elimina el error al escribir
        input.addEventListener('input', () => {
            input.classList.remove('input-error');
            if (msg) msg.textContent = '';
        }, { once: true });
    }

    /**
     * Sube el punto seleccionado a un repositorio de GitHub
     * Integra la API de GitHub: solo tienes que poner tu token y repo.
     */
    private async subirPuntoAGitHub(punto: PuntoInteres): Promise<void> {
        const ciudad = (punto.localidad || 'desconocido').toLowerCase().replace(/\s+/g, '_');
        const nombreArchivo = `${ciudad}.json`;
        const repo = 'JavMB/imagenes';
        const token = ''; // <-- Pega aquí tu token personal de GitHub
        const apiUrl = `https://api.github.com/repos/${repo}/contents/${ciudad}/${nombreArchivo}`;

        // 1. Obtener el contenido actual del archivo (si existe)
        let contenidoActual: PuntoInteres[] = [];
        let sha = '';
        try {
            const res = await fetch(apiUrl, {
                headers: { 'Authorization': `token ${token}` }
            });
            if (res.ok) {
                const json = await res.json();
                const decoded = atob(json.content.replace(/\n/g, ''));
                contenidoActual = JSON.parse(decoded);
                sha = json.sha;
            }
        } catch (e) {
            // Si no existe, se crea nuevo
            contenidoActual = [];
        }

        // 2. Añadir el nuevo punto al array
        contenidoActual.push(punto);
        const nuevoContenido = btoa(unescape(encodeURIComponent(JSON.stringify(contenidoActual, null, 2))));

        // 3. Subir el archivo actualizado
        const body = {
            message: `Añadir punto desde app (${punto.nombre})`,
            content: nuevoContenido,
            ...(sha ? { sha } : {})
        };

        try {
            const res = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                this.mostrarMensaje('Punto subido correctamente a la nube (GitHub)', 'success');
            } else {
                const error = await res.json();
                this.mostrarMensaje('Error al subir a GitHub: ' + (error.message || res.statusText), 'error');
            }
        } catch (e) {
            this.mostrarMensaje('Error de red al subir a GitHub: ' + (e instanceof Error ? e.message : e), 'error');
        }
    }

}
