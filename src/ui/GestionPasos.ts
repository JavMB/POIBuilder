import {initMap} from "./Map";

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

        // Instalar los listeners solo UNA VEZ
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
        const headerPasos: HTMLElement = document.querySelector('.header__pasos');
        if (this.pasoActual === -1) {
            this.pasoActual = 0;
            if (headerPasos) {
                headerPasos.style.display = 'flex';
            }
        } else if (direccion === Direccion.Atras && this.pasoActual > 0) {
            this.pasoActual--;
        } else if (direccion === Direccion.Adelante && this.pasoActual < this.pasos.length - 1) {
            this.pasoActual++;
        }

        const response: Response = await fetch(this.pasos[this.pasoActual]);
        const html: string = await response.text();

        const contenedor = document.getElementById('contenido');
        if (contenedor) {
            contenedor.innerHTML = html;

            //  Llamar a initMap solo si estamos en paso 1
            if (this.pasoActual === 0) {
                initMap();

            } else if (this.pasoActual === 1) {

            }
        }

        this.mostrarCirculoActivo(this.pasoActual);
    }


    mostrarCirculoActivo(paso: number): void {
        const todosLosCirculos = document.querySelectorAll('.header__paso');
        todosLosCirculos.forEach(c => c.classList.remove('header__paso--active'));

        const circuloActivo = document.querySelector(`.header__paso[data-paso="${paso + 1}"]`);
        circuloActivo?.classList.add('header__paso--active');
    }
}
