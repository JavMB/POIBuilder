import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    guardarJson: (nombreArchivo: string, datos: any) => ipcRenderer.invoke('guardar-json', nombreArchivo, datos)
});