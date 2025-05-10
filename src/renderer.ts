import '../styles/global.css';
import '../styles/bienvenida.css';
import '../styles/header.css';
import '../styles/pasos.css';
import '../styles/formulario.css';
import '../styles/paso1.css';
import '../styles/paso2.css';
import '../styles/paso3.css';
import '../styles/contacto.css';
import '../styles/explorar.css';

import 'leaflet/dist/leaflet.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import { GestionPasos }       from './ui/GestionPasos';
import { Contacto }           from './ui/Contacto';
import { GestionExplorar }    from './ui/GestionExplorar';
import { cargarVista }        from './ui/CargarVista';

/* ----------  Vista de inicio (bienvenida)  ---------- */
export async function cargarBienvenida(): Promise<void> {

    await cargarVista('/public/bienvenida.html');

    const headerPasos = document.querySelector('.header__pasos') as HTMLElement | null;
    if (headerPasos) headerPasos.style.display = 'none';

    document
        .querySelector('.btn-crear')
        ?.addEventListener('click', async () => {
            await new GestionPasos().iniciarWizard();
        });

    document
        .querySelector('.btn-soporte')
        ?.addEventListener('click', async () => {
            await new Contacto().cargarContacto();
        });

    document
        .querySelector('.btn-guardados')
        ?.addEventListener('click', () => new GestionExplorar());
}

/* ----------  arranque de la ventana  ---------- */
document.addEventListener('DOMContentLoaded', () => {

    cargarBienvenida().catch(console.error);
});