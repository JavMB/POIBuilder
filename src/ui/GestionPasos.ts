import { initMap, getMapCoordinates } from "./Map";


export enum Direccion {
    Adelante = 'adelante',
    Atras = 'atras'
}

export class GestionPasos {
    private readonly pasos: string[];
    private pasoActual: number;

    constructor() {
        this.pasos = ["paso1.html", "paso2.html", "paso3.html"];
        this.pasoActual = -1;
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
        const headerPasos = document.querySelector('.header__pasos') as HTMLElement;
        if (this.pasoActual === -1) {
            this.pasoActual = 0;
            if (headerPasos) {
                headerPasos.style.display = 'flex';
            }
        } else if (direccion === Direccion.Atras && this.pasoActual > 0) {
            this.pasoActual--;
        } else if (direccion === Direccion.Adelante && this.pasoActual < this.pasos.length - 1) {
            // --- GUARDAR DATOS SOLO AL PASAR DE PASO 1 ---
            if (this.pasoActual === 0) {
                const datos = this.recogerDatosFormulario();
                const nombreArchivo = `${datos.coordenadas.nombre.toLowerCase()}.json`;
                // Llama a la API expuesta desde preload
                if (window.electronAPI) {
                    try {
                        await window.electronAPI.guardarJson(nombreArchivo, datos);
                        console.log('Datos guardados en', nombreArchivo);
                    } catch (e) {
                        console.error('Error guardando JSON:', e);
                    }
                }
            }
            this.pasoActual++;
        }

        const response: Response = await fetch(this.pasos[this.pasoActual]);
        const html: string = await response.text();

        const contenedor = document.getElementById('contenido');
        if (contenedor) {
            contenedor.innerHTML = html;
            if (this.pasoActual === 0) {
                initMap();
            }
        }

        this.mostrarCirculoActivo(this.pasoActual);
    }

    recogerDatosFormulario(): any {
        // Coger datos del mapa
        const coords = getMapCoordinates();

        // Coger datos del formulario
        const nombreInput = document.getElementById('nombre') as HTMLInputElement;
        const descripcionInput = document.getElementById('descripcion') as HTMLTextAreaElement;

        const nombre = nombreInput?.value || '';
        const descripcion = descripcionInput?.value || '';

        return {
            nombre,
            descripcion,
            coordenadas: coords
        };
    }

    mostrarCirculoActivo(paso: number): void {
        const todosLosCirculos = document.querySelectorAll('.header__paso');
        todosLosCirculos.forEach(c => c.classList.remove('header__paso--active'));

        const circuloActivo = document.querySelector(`.header__paso[data-paso="${paso + 1}"]`);
        circuloActivo?.classList.add('header__paso--active');
    }
}