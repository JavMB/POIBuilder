# POI Builder 

## Descripción del Proyecto

POI Builder es una aplicación de escritorio desarrollada con Electron y TypeScript que permite a funcionarios y personal de ayuntamientos crear y gestionar puntos de interés (POI) para juegos educativos móviles. Esta herramienta forma parte de un proyecto más amplio cuyo objetivo es crear experiencias interactivas para que grupos de estudiantes descubran lugares emblemáticos, históricos o curiosos de sus pueblos.

![image](https://github.com/user-attachments/assets/36fe42ba-8b1c-420c-9f09-9e2740d72da0)

![Captura desde 2025-06-18 10-52-43](https://github.com/user-attachments/assets/3a2d3830-81fa-4e54-8b50-4cd245946262)

![Captura desde 2025-06-18 10-54-03](https://github.com/user-attachments/assets/1d2f46ba-cf9f-4a1a-aed8-3baa8e1e1314)

![Captura desde 2025-06-18 10-54-28](https://github.com/user-attachments/assets/519dfebf-2d7f-47f4-a627-8e87bc6c7d61)

![Captura desde 2025-06-18 10-55-21](https://github.com/user-attachments/assets/28a2dcb5-8745-42d0-ba8d-83b3e8481fe5)

![Captura desde 2025-06-18 10-55-30](https://github.com/user-attachments/assets/ade0544b-6dd2-4d4f-8ffd-4786367be425)





## Arquitectura del Proyecto Completo

El proyecto se divide en tres fases principales:

### 1. Aplicación de Escritorio con Electron 

**Funcionalidades:**
- Seleccionar pueblo o zona
- Crear marcadores (puntos de interés) con:
  - Título del lugar
  - Descripción breve
  - 1 pregunta tipo test (4 respuestas y solo una correcta)
  - Coordenadas del lugar (seleccionables en mapa o introducción manual)
- Visualización de los puntos en un mapa interactivo
- Edición y eliminación de marcadores existentes
- Exportación del fichero como `nombrepueblo.json`
- Gestión de múltiples pueblos (Javea, Denia, etc.)

### 2. Repositorio de JSONs en GitHub
Almacenamiento público de los ficheros `.json` generados, accesibles vía URL para dispositivos móviles.

### 3. Web Móvil para el Juego
Aplicación web responsive donde los estudiantes pueden seleccionar pueblos, visualizar puntos en mapa y responder preguntas.

## Tecnologías Utilizadas

- **Electron Forge** - Herramienta para empaquetar y distribuir
- **TypeScript** - Lenguaje de programación principal
- **HTML/CSS/JavaScript** - Tecnologías web base
- **Leaflet** - Librería de mapas interactivos
- **OpenStreetMap** - Proveedor de mapas
- **Node.js** - Entorno de ejecución

## Instalación y Configuración

### Prerrequisitos
- Node.js (versión 16 o superior)
- npm o yarn

### Pasos de instalación

1. Clona el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd POIBuilder
```

2. Instala las dependencias:
```bash
npm install
```

3. Ejecuta la aplicación en modo desarrollo:
```bash
npm start
```

4. Para construir la aplicación:
```bash
npm run make
```





