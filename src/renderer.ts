/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 */
import '../styles/global.css';
import '../styles/header.css';
import '../styles/pasos.css';
import '../styles/formulario.css';
import '../styles/bienvenida.css';
import '../styles/paso1.css';
import '../styles/paso2.css';
import '../styles/paso3.css';
import '../styles/contacto.css';
import '../styles/explorar.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';

import {GestionPasos} from './ui/GestionPasos';
import {Contacto} from './ui/Contacto';
import {GestionExplorar} from './ui/GestionExplorar';

document.addEventListener('DOMContentLoaded', () => {

    const esPaginaInicio = document.querySelector('.bienvenida');

    if (esPaginaInicio) {


        // Botón "Crear" de la página principal
        const botonCrear = document.querySelector('.bienvenida .btn-siguiente');
        if (botonCrear) {
            botonCrear.addEventListener('click', async () => {
                try {
                    const gestorPasos = new GestionPasos();
                    await gestorPasos.iniciarWizard();
                } catch (error) {
                    console.error('Error al iniciar el wizard:', error);
                }
            });
        }

        // Botón "Contactar" de la página principal
        const botonSoporte = document.querySelector('.bienvenida .btn-soporte');
        if (botonSoporte) {
            botonSoporte.addEventListener('click', async () => {
                try {
                    const gestorContacto = new Contacto();
                    await gestorContacto.cargarContacto();
                } catch (error) {
                    console.error('Error al cargar contacto:', error);
                }
            });
        }

        // Botón "Explorar" de la página principal
        const botonExplorar = document.querySelector('.bienvenida .btn-guardados');
        if (botonExplorar) {
            botonExplorar.addEventListener('click', () => {
                new GestionExplorar();
            });
        }
    }
});