import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import * as fs from 'fs/promises';

// @ts-expect-error -> In vite there are no types for the following line. Electron forge error
import started from 'electron-squirrel-startup';

// IPC handler para guardar JSON acumulando puntos en un array
ipcMain.handle('guardar-json', async (_event, nombreArchivo: string, datos: any) => {
  const ruta = path.join(app.getPath('userData'), nombreArchivo);
  let arr = [];
  try {
    const contenido = await fs.readFile(ruta, 'utf-8');
    arr = JSON.parse(contenido);
    if (!Array.isArray(arr)) arr = [];
  } catch (e) {
    arr = [];
  }
  arr.push(datos);
  await fs.writeFile(ruta, JSON.stringify(arr, null, 2), 'utf-8');
  return { ok: true };
});

// Añade estos manejadores si no los tienes ya
// IPC handler para listar todos los archivos JSON en el directorio de datos
ipcMain.handle('listar-jsons', async () => {
  const directorioUsuario = app.getPath('userData');
  try {
    const archivos = await fs.readdir(directorioUsuario);
    const archivosJson = archivos.filter(archivo => archivo.endsWith('.json'));
    return { ok: true, archivos: archivosJson };
  } catch (e) {
    console.error('Error al listar archivos JSON:', e);
    return { ok: false, error: String(e), archivos: [] };
  }
});

// IPC handler para leer el contenido de un archivo JSON
ipcMain.handle('leer-json', async (_event, nombreArchivo: string) => {
  const ruta = path.join(app.getPath('userData'), nombreArchivo);
  try {
    const contenido = await fs.readFile(ruta, 'utf-8');
    const datos = JSON.parse(contenido);
    return { ok: true, datos };
  } catch (e) {
    console.error(`Error al leer ${nombreArchivo}:`, e);
    return { ok: false, error: String(e), datos: [] };
  }
});

// IPC handler para actualizar un archivo JSON completo
ipcMain.handle('actualizar-json', async (_event, nombreArchivo: string, datos: any) => {
  const ruta = path.join(app.getPath('userData'), nombreArchivo);
  try {
    await fs.writeFile(ruta, JSON.stringify(datos, null, 2), 'utf-8');
    return { ok: true };
  } catch (e) {
    console.error(`Error al actualizar ${nombreArchivo}:`, e);
    return { ok: false, error: String(e) };
  }
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    frame: true,
    autoHideMenuBar: true
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});