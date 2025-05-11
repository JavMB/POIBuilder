/* -------------------------------------------------------------------
 *  Gestión paso‑a‑paso de creación de un Punto de Interés
 *  (Mini‑wizard de 3 pantallas)
 * ------------------------------------------------------------------*/

import {getLocalidadFromCoords, getMapCoordinates, initMap, MapLocation} from './Map';
import {cargarBienvenida} from '../renderer';

export enum Direccion {
    Adelante = 'adelante',
    Atras    = 'atras',
}

/** Estructura de datos que se irá rellenando a lo largo del wizard */
interface DatosWizard {
    nombre?:      string;
    descripcion?: string;
    coordenadas?: MapLocation;
    localidad?:   string;
    pregunta?:    string;
    respuestas?:  string[];
    correcta?:    number;   // índice de la respuesta correcta
}

/**
 * Clase que controla el wizard (paso1→ paso2→ paso3).
 *
 * Cada instancia monta su propio HTML dentro de #contenido
 * y delega todos los clics sobre ese contenedor.
 * Cuando se termina (guardar o cancelar) se desmonta a sí misma,
 * eliminando los listeners para no interferir en futuras ejecuciones.
 */
export class GestionPasos {

    /* ---------------- Propiedades internas ---------------- */

    private readonly pasos = ['paso1.html', 'paso2.html', 'paso3.html'];
    private pasoActual     = -1;
    private datos: DatosWizard = {};
    private nombreArchivo  = '';

    /** <main id="contenido"> se define al iniciar() */
    private root!: HTMLElement;

    /** Referencia al único listener del wizard, para poder quitarlo */
    private onClick!: (e: MouseEvent) => void;

    /* ---------------- API pública ---------------- */

    /** Arranca el wizard mostrando el paso1 */
    async iniciar(): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.root = document.getElementById('contenido')!;
        await this.cargarPaso();          // pinta paso
        this.montarListeners();           // registra eventos *después* del paint
    }

    /* ---------------- Gestión de listeners ---------------- */

    /** Registra un único listener delegado sobre el contenedor del wizard */
    private montarListeners(): void {
        this.onClick = async (ev) => {
            const t = ev.target as HTMLElement;

            if (t.closest('.btn-siguiente')) return this.cargarPaso(Direccion.Adelante);
            if (t.closest('.btn-anterior'))  return this.handleAnterior();
        };

        this.root.addEventListener('click', this.onClick);
    }

    /** Elimina el listener al salir para no dejar fugas */
    private desmontarListeners(): void {
        this.root.removeEventListener('click', this.onClick);
    }

    /* ---------------- Navegación ---------------- */

    /** Botón “Anterior”; si estamos en el paso 0 volvemos a inicio */
    private async handleAnterior(): Promise<void> {
        if (this.pasoActual === 0) {
            this.desmontarListeners();
            await cargarBienvenida();
        } else {
            await this.cargarPaso(Direccion.Atras);
        }
    }

    /**
     * Carga paso 0 / 1 / 2 según la dirección de avance.
     * @param dir  Sentido de la navegación (adelante / atrás)
     */
    private async cargarPaso(dir?: Direccion): Promise<void> {

        /* ---- actualizar índice de paso ---- */
        if (this.pasoActual === -1) {
            this.pasoActual = 0;                               // iniciar
            document.querySelector('.header__pasos')?.setAttribute('style', 'display:flex');
        } else if (dir === Direccion.Adelante) {
            await this.recogerDatosFormulario(this.pasoActual);
            
            // Validar datos del paso actual antes de avanzar
            if (!this.validarDatosPasoActual(this.pasoActual)) {
                return; // Detiene la navegación pero permanece en el paso actual
            }
            
            if (await this.esUltimoPaso()) return;             // guarda y sale
            this.pasoActual++;
        } else if (dir === Direccion.Atras && this.pasoActual > 0) {
            this.pasoActual--;
        }

        /* ---- cargar HTML del paso ---- */
        this.root.innerHTML = await (await fetch(this.pasos[this.pasoActual])).text();

        /* hooks específicos por paso */
        if (this.pasoActual === 0)  initMap();
        if (this.pasoActual === 2)  this.rellenarRevision();

        /* botón “Volver al inicio” sólo en paso 0 */
        if (this.pasoActual === 0) {
            const btn = this.root.querySelector('.btn-anterior');
            if (btn) btn.textContent = 'Volver al inicio';
        }

        this.marcarPasoActivo(this.pasoActual);
    }

    /** Devuelve true si acabamos de guardar el JSON y hemos vuelto al inicio */
    private async esUltimoPaso(): Promise<boolean> {
        const esUltimo = this.pasoActual === this.pasos.length - 1;
        if (!esUltimo) return false;

        // Validar datos antes de guardar
        if (!this.validarDatosCompletos()) {
            return true; // Detiene la navegación pero no sale del wizard
        }

        try {
            if (window.electronAPI && this.nombreArchivo) {
                await window.electronAPI.guardarJson(this.nombreArchivo, this.datos);
                this.mostrarMensaje(`Datos guardados con éxito en ${this.nombreArchivo}`, 'success');
                
                /* salir del wizard */
                this.desmontarListeners();
                await cargarBienvenida();
                return true;
            }
        } catch (err) {
            this.mostrarMensaje(`Error guardando JSON: ${err}`, 'error');
        }
        
        return true;
    }
    
    /** Valida que todos los datos requeridos estén presentes */
    private validarDatosCompletos(): boolean {
        const camposFaltantes: string[] = [];
        // Validar paso 1
        if (!this.datos.nombre || this.datos.nombre.trim() === '') {
            camposFaltantes.push('Nombre');
        }
        if (!this.datos.descripcion || this.datos.descripcion.trim() === '') {
            camposFaltantes.push('Descripción');
        }
        if (!this.datos.coordenadas) {
            camposFaltantes.push('Ubicación en el mapa');
        } else {
            // Nueva validación: no permitir (0,0) ni localidad desconocida
            if (
                (this.datos.coordenadas.latitud === 0 && this.datos.coordenadas.longitud === 0) ||
                !this.datos.localidad || this.datos.localidad.toLowerCase() === 'desconocido'
            ) {
                camposFaltantes.push('Selecciona una ubicación válida en el mapa');
            }
        }
        // Validar paso 2
        if (!this.datos.pregunta || this.datos.pregunta.trim() === '') {
            camposFaltantes.push('Pregunta');
        }
        
        // Validar respuestas
        if (!this.datos.respuestas || this.datos.respuestas.length === 0) {
            camposFaltantes.push('Respuestas');
        } else {
            // Verificar que haya al menos una respuesta no vacía
            const respuestasValidas = this.datos.respuestas.filter(r => r && r.trim() !== '');
            if (respuestasValidas.length === 0) {
                camposFaltantes.push('Al menos una respuesta válida');
            } else if (respuestasValidas.length < 2) {
                camposFaltantes.push('Al menos dos respuestas válidas para crear un cuestionario');
            }
        }
        
        // Validar respuesta correcta
        if (this.datos.correcta === undefined) {
            camposFaltantes.push('Selección de respuesta correcta');
        }
        
        if (camposFaltantes.length > 0) {
            this.mostrarMensaje(`Por favor, completa los siguientes campos antes de guardar:\n- ${camposFaltantes.join('\n- ')}`);
            // En la última pantalla, marcamos los campos del paso 2 porque son los visibles
            this.marcarCamposConError(2, camposFaltantes);
            return false;
        }
        
        return true;
    }

    /** Valida los datos del paso actual */
    private validarDatosPasoActual(paso: number): boolean {
        const camposFaltantes: string[] = [];
        
        if (paso === 0) {
            // Validar paso 1: información básica
            if (!this.datos.nombre || this.datos.nombre.trim() === '') {
                camposFaltantes.push('Nombre');
            }
            if (!this.datos.descripcion || this.datos.descripcion.trim() === '') {
                camposFaltantes.push('Descripción');
            }
            if (!this.datos.coordenadas) {
                camposFaltantes.push('Ubicación en el mapa');
            } else {
                // Nueva validación: no permitir (0,0) ni localidad desconocida
                if (
                    (this.datos.coordenadas.latitud === 0 && this.datos.coordenadas.longitud === 0) ||
                    !this.datos.localidad || this.datos.localidad.toLowerCase() === 'desconocido'
                ) {
                    camposFaltantes.push('Selecciona una ubicación válida en el mapa');
                }
            }
        }
        
        if (paso === 1) {
            // Validar paso 2: pregunta y respuestas
            if (!this.datos.pregunta || this.datos.pregunta.trim() === '') {
                camposFaltantes.push('Pregunta');
            }
            
            // Validar que haya al menos una respuesta no vacía
            if (!this.datos.respuestas) {
                camposFaltantes.push('Al menos una respuesta');
            } else {
                const respuestasValidas = this.datos.respuestas.filter(r => r && r.trim() !== '');
                if (respuestasValidas.length === 0) {
                    camposFaltantes.push('Al menos una respuesta válida');
                } else if (respuestasValidas.length < 2) {
                    camposFaltantes.push('Al menos dos respuestas válidas para crear un cuestionario');
                }
            }
            
            // Validar respuesta correcta
            if (this.datos.correcta === undefined) {
                camposFaltantes.push('Selección de respuesta correcta');
            }
        }
        
        if (camposFaltantes.length > 0) {
            this.mostrarMensaje(`Por favor, completa los siguientes campos antes de continuar:\n- ${camposFaltantes.join('\n- ')}`);
            this.marcarCamposConError(paso, camposFaltantes);
            return false;
        }
        
        return true;
    }

    /** Marca visualmente los campos que necesitan atención */
    private marcarCamposConError(paso: number, camposFaltantes: string[]): void {
        if (paso === 0) {
            if (camposFaltantes.includes('Nombre')) {
                this.resaltarCampoConError('nombre');
            }
            if (camposFaltantes.includes('Descripción')) {
                this.resaltarCampoConError('descripcion');
            }
            if (camposFaltantes.includes('Ubicación en el mapa')) {
                // Resaltar el contenedor del mapa
                const mapaContainer = document.querySelector('.mapa-container') as HTMLElement;
                if (mapaContainer) {
                    mapaContainer.style.border = '2px solid var(--color-error)';
                    mapaContainer.style.borderRadius = '4px';
                }
            }
        }
        
        if (paso === 1) {
            if (camposFaltantes.includes('Pregunta')) {
                this.resaltarCampoConError('pregunta');
            }
            
            // Resaltar respuestas
            if (camposFaltantes.includes('Al menos una respuesta válida') || 
                camposFaltantes.includes('Al menos una respuesta') ||
                camposFaltantes.includes('Al menos dos respuestas válidas para crear un cuestionario')) {
                for (let i = 1; i <= 4; i++) {
                    this.resaltarCampoConError(`respuesta${i}`);
                }
            }
            
            // Resaltar selector de respuesta correcta
            if (camposFaltantes.includes('Selección de respuesta correcta')) {
                const contenedorRadios = document.querySelector('.radio-group') as HTMLElement;
                if (contenedorRadios) {
                    contenedorRadios.style.border = '2px solid var(--color-error)';
                    contenedorRadios.style.borderRadius = '4px';
                    contenedorRadios.style.padding = '5px';
                }
            }
        }
    }
    
    /** Añade estilo visual a un campo con error */
    private resaltarCampoConError(id: string): void {
        const campo = document.getElementById(id) as HTMLElement;
        if (campo) {
            campo.style.border = '2px solid var(--color-error)';
            campo.style.backgroundColor = 'rgba(255, 111, 111, 0.05)';
            
            // Quitar el estilo de error cuando el usuario comience a editar
            campo.addEventListener('input', function handler() {
                campo.style.border = '';
                campo.style.backgroundColor = '';
                campo.removeEventListener('input', handler);
            });
        }
    }

    /* ---------------- Recogida de datos ---------------- */

    /** Lee los campos del paso actual y los mete en this.datos */
    private async recogerDatosFormulario(paso: number): Promise<void> {
        if (paso === 0) {
            this.datos.nombre        = (document.getElementById('nombre')        as HTMLInputElement).value.trim();
            this.datos.descripcion   = (document.getElementById('descripcion')   as HTMLTextAreaElement).value.trim();
            this.datos.coordenadas   = getMapCoordinates();

            if (this.datos.coordenadas) {
                const loc = await getLocalidadFromCoords(this.datos.coordenadas.latitud,
                    this.datos.coordenadas.longitud);
                this.datos.localidad  = loc;
                this.nombreArchivo    = `${loc.toLowerCase().replace(/\s+/g, '_')}.json`;
            }
        }

        if (paso === 1) {
            this.datos.pregunta      = (document.getElementById('pregunta') as HTMLInputElement).value.trim();
            this.datos.respuestas    = [1,2,3,4].map(i => (document.getElementById(`respuesta${i}`) as HTMLInputElement).value.trim());
            const sel                = document.querySelector('input[name="correcta"]:checked') as HTMLInputElement | null;
            this.datos.correcta      = sel ? parseInt(sel.value, 10) : undefined;
        }

        if (paso === 2) {
            this.datos.nombre        = (document.getElementById('nombre')        as HTMLInputElement).value.trim();
            this.datos.descripcion   = (document.getElementById('descripcion')   as HTMLTextAreaElement).value.trim();
        }
    }

    /** Pinta la revisión en el paso 3 */
    private rellenarRevision(): void {
        (document.getElementById('nombre')       as HTMLInputElement).value = this.datos.nombre        ?? '';
        (document.getElementById('descripcion')  as HTMLTextAreaElement).value = this.datos.descripcion ?? '';
        (document.getElementById('coordenadas')  as HTMLInputElement).value =
            this.datos.coordenadas ? `${this.datos.coordenadas.latitud}, ${this.datos.coordenadas.longitud}` : '';
        (document.getElementById('localidad')    as HTMLInputElement).value = this.datos.localidad      ?? '';
        (document.getElementById('pregunta')     as HTMLInputElement).value = this.datos.pregunta       ?? '';

        /* respuestas */
        const ul = document.getElementById('lista-respuestas');
        if (ul && this.datos.respuestas) {
            ul.innerHTML = '';
            this.datos.respuestas.forEach((r, i) => {
                const li = document.createElement('li');
                li.textContent = r;
                if (i === this.datos.correcta) {
                    li.classList.add('correcta');
                    li.textContent += ' (Correcta)';
                }
                ul.appendChild(li);
            });
        }
    }

    /** Muestra un mensaje de error/advertencia sin bloquear la interacción con el formulario */
    private mostrarMensaje(mensaje: string, tipo: 'error' | 'success' = 'error'): void {
        // Asegurar que tenemos las animaciones CSS definidas
        this.agregarAnimacionCSS();
        
        // Eliminar notificación previa si existe
        const notificacionAnterior = document.getElementById('mensaje-validacion');
        if (notificacionAnterior) {
            notificacionAnterior.remove();
        }
        
        // Configurar colores según el tipo de mensaje
        const colorFondo = tipo === 'error' ? '#ffebee' : '#e8f5e9';
        const colorBorde = tipo === 'error' ? 'var(--color-error)' : 'var(--color-success)';
        const colorTitulo = tipo === 'error' ? 'var(--color-error)' : 'var(--color-success)';
        const titulo = tipo === 'error' ? 'Faltan datos requeridos' : 'Operación completada';
        
        // Crear elemento de notificación
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
        
        // Crear título y contenido
        const tituloElem = document.createElement('div');
        tituloElem.style.cssText = `font-weight: bold; margin-bottom: 8px; display: flex; justify-content: space-between; color: ${colorTitulo};`;
        tituloElem.innerHTML = `${titulo} <span style="cursor: pointer;">✕</span>`;
        
        const contenido = document.createElement('div');
        contenido.innerHTML = mensaje.replace(/\n/g, '<br>');
        
        // Agregar evento para cerrar la notificación
        tituloElem.querySelector('span')?.addEventListener('click', () => {
            notificacion.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => {
                if (document.body.contains(notificacion)) {
                    notificacion.remove();
                }
            }, 300);
        });
        
        // Agregar todo al DOM
        notificacion.appendChild(tituloElem);
        notificacion.appendChild(contenido);
        document.body.appendChild(notificacion);
        
        // Auto-eliminar después de 8 segundos
        setTimeout(() => {
            if (document.body.contains(notificacion)) {
                notificacion.style.animation = 'fadeOut 0.3s forwards';
                setTimeout(() => notificacion.remove(), 300);
            }
        }, 8000);
    }

    /** Añade un estilo global para la animación del mensaje */
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

    /* ---------------- UI helpers ---------------- */

    /** Ilumina el círculo activo en el header */
    private marcarPasoActivo(i: number): void {
        document.querySelectorAll('.header__paso')
            .forEach(c => c.classList.toggle('header__paso--active', c.getAttribute('data-paso') === String(i+1)));
    }
}
