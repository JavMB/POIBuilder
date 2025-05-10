import { cargarBienvenida } from '../renderer';
export class Contacto {
    private readonly contactoHTML = "contacto.html";

    constructor() {
        this.inicializarEventos();
    }

    private inicializarEventos(): void {
        document.addEventListener('click', async (event) => {
            const target = event.target as HTMLElement;

            // Detectar clic en botón de soporte
            if (target.classList.contains('btn-soporte')) {
                await this.cargarContacto();
            }

            // Detectar clic en botón de volver desde contacto
            if (target.classList.contains('btn-anterior') &&
                document.querySelector('.contacto')) {
                await cargarBienvenida();
            }

            // Detectar envío del formulario
            if (target.classList.contains('btn-enviar')) {
                this.enviarFormulario(event);
            }
        });
    }

    async cargarContacto(): Promise<void> {
        try {
            // Cargar el HTML del contacto
            const response = await fetch(this.contactoHTML);
            const html = await response.text();

            const contenedor = document.getElementById('contenido');
            if (contenedor) {
                contenedor.innerHTML = html;

                // Ocultar los pasos del header si están visibles
                const headerPasos = document.querySelector('.header__pasos');
                if (headerPasos) {
                    headerPasos.classList.add('header__pasos--hidden');
                }

                // Inicializar el formulario
                this.inicializarFormulario();
            }
        } catch (error) {
            console.error('Error al cargar la página de contacto:', error);
        }
    }

    private inicializarFormulario(): void {
        const formulario = document.getElementById('form-contacto');
        if (formulario) {
            formulario.addEventListener('submit', this.enviarFormulario.bind(this));
        }
    }

    private enviarFormulario(event: Event): void {
        event.preventDefault();

        const nombre = (document.getElementById('nombre') as HTMLInputElement).value;
        const email = (document.getElementById('email') as HTMLInputElement).value;
        const asunto = (document.getElementById('asunto') as HTMLInputElement).value;
        const mensaje = (document.getElementById('mensaje') as HTMLTextAreaElement).value;

        alert(`¡Gracias por contactarnos ${nombre}! Tu mensaje ha sido enviado correctamente. Te responderemos lo antes posible en ${email}.`);


        setTimeout(async () => {
            await cargarBienvenida();
        }, 1500);
    }
}