import {initMap, getMapCoordinates, MapLocation, getLocalidadFromCoords} from "./Map";

export enum Direccion {
    Adelante = 'adelante',
    Atras = 'atras'
}

interface DatosWizard {
    nombre?: string;
    descripcion?: string;
    coordenadas?: MapLocation;
    localidad?: string;
    pregunta?: string;
    respuestas?: string[];
    correcta?: number; // índice de la respuesta correcta
}

export class GestionPasos {
    private readonly pasos = ["paso1.html", "paso2.html", "paso3.html"];
    private pasoActual = -1;
    private datos: DatosWizard = {};
    private nombreArchivo = "";

    constructor() {
        this.inicializarBotones();
    }

    private inicializarBotones(): void {
        document.addEventListener('click', async (event) => {
            const target = event.target as HTMLElement;
            if (target.classList.contains('btn-siguiente')) {
                await this.cargarPaso(Direccion.Adelante);
            }
            if (target.classList.contains('btn-anterior')) {
                await this.cargarPaso(Direccion.Atras);
            }
        });
    }

    async cargarPaso(direccion?: Direccion): Promise<void> {
        const headerPasos = document.querySelector('.header__pasos') as HTMLElement | null;

        // Si estamos iniciando el wizard
        if (this.pasoActual === -1) {
            this.pasoActual = 0;
            if (headerPasos) headerPasos.style.display = 'flex';
        }
        // Si estamos retrocediendo
        else if (direccion === Direccion.Atras && this.pasoActual > 0) {
            this.pasoActual--;
        }
        // Si estamos avanzando
        else if (direccion === Direccion.Adelante) {
            // Recoger datos del formulario actual
            await this.recogerDatosFormulario(this.pasoActual);

            // Si estamos en el último paso (paso 3, índice 2)
            if (this.pasoActual === this.pasos.length - 1) {
                // Guardar datos si estamos en el último paso
                if (window.electronAPI && this.nombreArchivo) {
                    try {
                        await window.electronAPI.guardarJson(this.nombreArchivo, this.datos);
                        alert('Datos guardados en ' + this.nombreArchivo);

                        // Redirigir al index después de guardar
                        window.location.href = 'index.html';
                    } catch (e) {
                        alert('Error guardando JSON: ' + e);
                    }
                } else {
                    // Si no tenemos electronAPI o nombre de archivo, intentamos redirigir de todas formas
                    window.location.href = 'index.html';
                }
                return; // No avanzar más, ya estamos en el último paso
            } else {
                // Avanzar al siguiente paso si no estamos en el último
                this.pasoActual++;
            }
        }

        // Carga el HTML del paso actual
        const response = await fetch(this.pasos[this.pasoActual]);
        const html = await response.text();
        const contenedor = document.getElementById('contenido');
        if (contenedor) {
            contenedor.innerHTML = html;
            // Inicializa el mapa solo en el primer paso
            if (this.pasoActual === 0) {
                initMap();
            }
            // Rellena datos para revisión en el último paso
            if (this.pasoActual === 2) {
                this.rellenarRevision();
            }
        }

        this.mostrarCirculoActivo(this.pasoActual);
    }
    private async recogerDatosFormulario(paso: number): Promise<void> {
        if (paso === 0) {
            // RECOGE EL NOMBRE AQUÍ
            const nombreInput = document.getElementById('nombre') as HTMLInputElement | null;
            this.datos.nombre = nombreInput?.value.trim() || '';

            const descripcionInput = document.getElementById('descripcion') as HTMLTextAreaElement | null;
            this.datos.descripcion = descripcionInput?.value.trim() || '';

            this.datos.coordenadas = getMapCoordinates();

            if (this.datos.coordenadas) {
                const {latitud, longitud} = this.datos.coordenadas;
                const localidad = await getLocalidadFromCoords(latitud, longitud);
                this.datos.localidad = localidad;
                this.nombreArchivo = `${localidad.toLowerCase().replace(/\s+/g, "_")}.json`;
            }
        }
        if (paso === 1) {
            const preguntaInput = document.getElementById('pregunta') as HTMLInputElement | null;
            this.datos.pregunta = preguntaInput?.value.trim() || '';
            this.datos.respuestas = [1, 2, 3, 4].map(i => {
                const r = document.getElementById(`respuesta${i}`) as HTMLInputElement | null;
                return r?.value.trim() || '';
            });
            // Correcta: radio button con value=0..3
            const correctaInput = document.querySelector('input[name="correcta"]:checked') as HTMLInputElement | null;
            this.datos.correcta = correctaInput ? parseInt(correctaInput.value, 10) : undefined;
        }
        if (paso === 2) {
            // Nombre y descripción editables en revisión
            const nombreInput = document.getElementById('nombre') as HTMLInputElement | null;
            const descripcionInput = document.getElementById('descripcion') as HTMLTextAreaElement | null;
            this.datos.nombre = nombreInput?.value.trim() || '';
            this.datos.descripcion = descripcionInput?.value.trim() || '';
        }
    }

    private rellenarRevision(): void {
        // Nombre y descripción editables
        (document.getElementById('nombre') as HTMLInputElement).value = this.datos.nombre || '';
        (document.getElementById('descripcion') as HTMLTextAreaElement).value = this.datos.descripcion || '';
        // El resto solo lectura
        (document.getElementById('coordenadas') as HTMLInputElement).value =
            this.datos.coordenadas ? `${this.datos.coordenadas.latitud}, ${this.datos.coordenadas.longitud}` : '';
        (document.getElementById('localidad') as HTMLInputElement).value = this.datos.localidad || '';
        (document.getElementById('pregunta') as HTMLInputElement).value = this.datos.pregunta || '';

        // Rellenar lista de respuestas y resaltar la correcta
        const ul = document.getElementById('lista-respuestas');
        if (ul && this.datos.respuestas) {
            ul.innerHTML = '';
            this.datos.respuestas.forEach((resp, idx) => {
                const li = document.createElement('li');
                li.textContent = resp;
                if (idx === this.datos.correcta) {
                    li.classList.add('correcta');
                    li.textContent = `${resp} (Correcta)`;
                }
                ul.appendChild(li);
            });
        }
    }

    private mostrarCirculoActivo(paso: number): void {
        const todosLosCirculos = document.querySelectorAll('.header__paso');
        todosLosCirculos.forEach(c => c.classList.remove('header__paso--active'));
        const circuloActivo = document.querySelector(`.header__paso[data-paso="${paso + 1}"]`);
        circuloActivo?.classList.add('header__paso--active');
    }
}