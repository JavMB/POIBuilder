export async function cargarVista(ruta: string): Promise<void> {
    const contenedor = document.getElementById('contenido');
    if (!contenedor) throw new Error('Falta #contenido');

    const resp = await fetch(ruta);
    if (!resp.ok) throw new Error(`No se encontró ${ruta} (${resp.status})`);

    contenedor.innerHTML = await resp.text();
}
