/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */
import '../styles/global.css';
import '../styles/header.css';
import '../styles/pasos.css';
import '../styles/formulario.css';
import '../styles/bienvenida.css';
import '../styles/paso1.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';


import {GestionPasos} from './ui/GestionPasos';

const gestorPasos = new GestionPasos();

const botonSiguiente = document.getElementById('btn-siguiente');

botonSiguiente?.addEventListener('click', async () => {
    await gestorPasos.cargarPaso();
});











