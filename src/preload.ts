import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    guardarJson: (nombreArchivo: string, datos: any): Promise<void> =>
        ipcRenderer.invoke('guardar-json', nombreArchivo, datos)
});