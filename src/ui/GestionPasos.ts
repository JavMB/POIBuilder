import {initMap, getMapCoordinates, MapLocation} from "./Map";

export enum Direccion {
    Adelante = 'adelante',
    Atras = 'atras'
}

interface DatosWizard {
    nombre?: string;
    descripcion?: string;
    coordenadas?: MapLocation;
    pregunta?: string;
    respuestas?: string[];
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
        if (this.pasoActual === -1) {
            this.pasoActual = 0;
            if (headerPasos) headerPasos.style.display = 'flex';
        } else if (direccion === Direccion.Atras && this.pasoActual > 0) {
            this.pasoActual--;
        } else if (direccion === Direccion.Adelante && this.pasoActual < this.pasos.length - 1) {
            // Recoge datos del paso actual antes de avanzar
            this.recogerDatosFormulario(this.pasoActual);

            // Establece el nombre de archivo en el paso 1
            if (this.pasoActual === 0 && this.datos.nombre) {
                this.nombreArchivo = `${this.datos.nombre.toLowerCase()}.json`;
            }

            // Guarda el JSON si tenemos nombre de archivo
            if (window.electronAPI && this.nombreArchivo) {
                try {
                    await window.electronAPI.guardarJson(this.nombreArchivo, this.datos);
                    console.log('Datos guardados en', this.nombreArchivo);
                } catch (e) {
                    console.error('Error guardando JSON:', e);
                }
            }
            this.pasoActual++;
        }

        // Carga el HTML del paso
        const response = await fetch(this.pasos[this.pasoActual]);
        const html = await response.text();
        const contenedor = document.getElementById('contenido');
        if (contenedor) {
            contenedor.innerHTML = html;
            if (this.pasoActual === 0) {
                initMap();
            }
        }

        this.mostrarCirculoActivo(this.pasoActual);
    }

    // Recoge los datos del formulario según el paso actual
    private recogerDatosFormulario(paso: number): void {
        if (paso === 0) {
            this.datos.coordenadas = getMapCoordinates();
            const nombreInput = document.getElementById('nombre') as HTMLInputElement | null;
            const descripcionInput = document.getElementById('descripcion') as HTMLTextAreaElement | null;
            this.datos.nombre = nombreInput?.value.trim() || '';
            this.datos.descripcion = descripcionInput?.value.trim() || '';
        }
        if (paso === 1) {
            const preguntaInput = document.getElementById('pregunta') as HTMLInputElement | null;
            this.datos.pregunta = preguntaInput?.value.trim() || '';
            this.datos.respuestas = [1, 2, 3, 4].map(i => {
                const r = document.getElementById(`respuesta${i}`) as HTMLInputElement | null;
                return r?.value.trim() || '';
            });
        }
        // permitir editar el JSON completo si lo deseas
    }

    private mostrarCirculoActivo(paso: number): void {
        const todosLosCirculos = document.querySelectorAll('.header__paso');
        todosLosCirculos.forEach(c => c.classList.remove('header__paso--active'));
        const circuloActivo = document.querySelector(`.header__paso[data-paso="${paso + 1}"]`);
        circuloActivo?.classList.add('header__paso--active');
    }
}