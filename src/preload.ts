import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    guardarJson: (nombreArchivo: string, datos: any) => ipcRenderer.invoke('guardar-json', nombreArchivo, datos),
    listarJsons: () => ipcRenderer.invoke('listar-jsons'),
    leerJson: (nombreArchivo: string) => ipcRenderer.invoke('leer-json', nombreArchivo),
    actualizarJson: (nombreArchivo: string, datos: any) => ipcRenderer.invoke('actualizar-json', nombreArchivo, datos)
});