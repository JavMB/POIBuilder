# POI Builder - Herramienta de Creación de Puntos de Interés

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

### 1. Aplicación de Escritorio con Electron (Esta aplicación)
**Responsables:** Alumnos de DAM

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

## Estructura del Proyecto

```
POIBuilder/
├── src/
│   ├── main.ts          # Proceso principal de Electron
│   ├── preload.ts       # Script de precarga
│   ├── renderer.ts      # Proceso de renderizado
│   └── ui/              # Módulos de interfaz de usuario
│       ├── CargarVista.ts
│       ├── Contacto.ts
│       ├── GestionExplorar.ts
│       ├── GestionPasos.ts
│       └── Map.ts
├── public/              # Páginas HTML
│   ├── bienvenida.html
│   ├── contacto.html
│   ├── explorar.html
│   ├── paso1.html
│   ├── paso2.html
│   └── paso3.html
├── styles/              # Hojas de estilo CSS modulares
│   ├── global.css
│   ├── header.css
│   └── [componente].css
└── package.json
```

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

## Características Técnicas

### Arquitectura de Componentes
La aplicación está estructurada en módulos reutilizables siguiendo principios de separación de responsabilidades:

- **Gestión de vistas**: Navegación entre diferentes pantallas
- **Gestión de mapas**: Integración con Leaflet para mapas interactivos
- **Gestión de datos**: Creación y manipulación de POIs
- **Exportación**: Generación de archivos JSON estructurados

### Metodología CSS
- **BEM (Block Element Modifier)**: Convención de nomenclatura para CSS
- **CSS Modular**: Archivos separados por componente
- **Paleta de colores consistente**: Diseño visual cohesivo

### Manejo de Estado
- Gestión local de datos de POIs
- Persistencia mediante archivos JSON
- Interfaz reactiva a cambios de estado

## Experiencia de Desarrollo

Este proyecto representa mi primera incursión seria en TypeScript, viniendo de un background en Java. La transición desde un lenguaje fuertemente tipado como Java a JavaScript, y posteriormente a TypeScript, presentó desafíos interesantes:

### Aprendizajes Clave
- **TypeScript**: Aprovechamiento del sistema de tipos para mayor robustez
- **Electron**: Comprensión de la arquitectura de procesos múltiples
- **Desarrollo sin framework**: Creación de componentes modulares en JavaScript vanilla
- **CSS avanzado**: Implementación de metodologías como BEM
- **Mapas web**: Integración de librerías de mapas interactivos

### Decisiones de Diseño
- **Modularización**: A pesar de no usar un framework como React o Vue, la aplicación está estructurada en módulos reutilizables
- **Separación de responsabilidades**: Cada componente tiene una función específica
- **Diseño responsive**: Consideración de diferentes tamaños de pantalla
- **Experiencia de usuario**: Interfaz intuitiva para usuarios no técnicos


