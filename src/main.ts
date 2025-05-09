import { app, BrowserWindow, ipcMain, session } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';

// @ts-expect-error -> In vite there are no types for the following line. Electron forge error
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // ATENCIÓN: el build de preload.ts genera preload.js
      contextIsolation: true,
      nodeIntegration: false
    },
  });

  // Permitir geolocalización
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'geolocation') {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Cargar el index.html o el servidor de Vite
  const viteDevServerUrl = (process.env as any).MAIN_WINDOW_VITE_DEV_SERVER_URL as string | undefined;
  const viteName = (process.env as any).MAIN_WINDOW_VITE_NAME as string | undefined;
  if (viteDevServerUrl) {
    mainWindow.loadURL(viteDevServerUrl);
  } else if (viteName) {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${viteName}/index.html`));
  } else {
    // Fallback
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Opcional: abrir DevTools
  // mainWindow.webContents.openDevTools();
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC para guardar JSON desde el renderer (TypeScript)
ipcMain.handle('guardar-json', async (_event, nombreArchivo: string, datos: any) => {
  const ruta = path.join(app.getPath('userData'), nombreArchivo);
  fs.writeFileSync(ruta, JSON.stringify(datos, null, 2), 'utf-8');
});