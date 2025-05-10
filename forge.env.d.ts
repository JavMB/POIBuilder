/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

declare global {
    interface Window {
        electronAPI?: {
            guardarJson: (nombreArchivo: string, datos: any) => Promise<{ok: boolean}>;
            listarJsons: () => Promise<{ok: boolean, archivos: string[], error?: string}>;
            leerJson: (nombreArchivo: string) => Promise<{ok: boolean, datos: any, error?: string}>;
            actualizarJson: (nombreArchivo: string, datos: any) => Promise<{ok: boolean, error?: string}>;
        };
    }
}

export {};