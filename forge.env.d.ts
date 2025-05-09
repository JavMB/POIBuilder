/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

declare global {
    interface Window {
        electronAPI?: {
            guardarJson: (nombreArchivo: string, datos: any) => Promise<void>;
        };
    }
}

export {};