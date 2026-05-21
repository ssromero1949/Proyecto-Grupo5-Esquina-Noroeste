# Solucionador del Método de la Esquina Noroeste (MEN)

## Descripción del Proyecto
Este proyecto es un software interactivo y educativo diseñado para resolver problemas de transporte de la asignatura de Investigación de Operaciones utilizando el Método de la Esquina Noroeste (MEN). 

El objetivo principal es proveer una herramienta visual avanzada que genere ejercicios aleatorios, valide su estado (oferta vs demanda), resuelva el modelo paso a paso documentando cada acción de forma narrativa y permita exportar un reporte detallado en formato PDF. El sistema final está diseñado para ser distribuido como una aplicación de escritorio nativa para Windows con su propio instalador.

## Tecnologías Utilizadas
- **Frontend / Interfaz:** React.js (construido con Vite).
- **Contenedor de Escritorio:** Electron.js.
- **Estilos:** Vanilla CSS (Enfoque en diseño UI Premium, moderno y dinámico).
- **Generación de Reportes:** Librerías de conversión de HTML a PDF (`jspdf` / `html2pdf.js`).
- **Empaquetado e Instalador:** `electron-builder` (genera ejecutable NSIS para Windows).

## Arquitectura por Módulos
El desarrollo del proyecto está estructurado en 5 módulos fundamentales:

### 1. Módulo de Generación Automática
- Generador de lotes de ejercicios (al menos 5 distintos) con dimensiones variadas (ej. entre 3x3 y 5x5).
- Lógica para crear tanto escenarios **equilibrados** como **desequilibrados**.
- Panel interactivo para seleccionar y cargar el ejercicio deseado.

### 2. Módulo de Validación y Balanceo Automático
- Análisis matemático en tiempo real al seleccionar un lote (Oferta Total vs Demanda Total).
- Alertas visuales dinámicas que indican si el problema está Equilibrado o Desequilibrado.
- Algoritmo de **auto-balanceo lógico** que, de forma transparente, inyecta filas (origen) o columnas (destino) ficticias con costos cero para cuadrar el modelo antes de su resolución.

### 3. Módulo de Solución y Reproducción Paso a Paso
- **Motor Matemático:** Implementación pura y estricta del algoritmo del Método de la Esquina Noroeste.
- **Historial de Estados:** Procesamiento en segundo plano que almacena "fotografías" exactas de la matriz en cada iteración.
- **Reproductor Visual:** Interfaz con controles (Anterior / Siguiente) para visualizar cómo se resuelven las asignaciones. Incluye una narrativa de texto que describe la acción y efectos visuales de tachado/sombreado de celdas agotadas.

### 4. Módulo de Exportación y Reportes
- Consolidación del ejercicio en un formato amigable para impresión o guardado digital.
- El archivo exportado contendrá la matriz inicial, el listado completo de la narrativa paso a paso, la matriz final resuelta y el costo total de transporte desglosado.

### 5. Distribución del Software
- Configuración de empaquetado para convertir el código en una app nativa (`.exe`).
- Generación de un **asistente de instalación** tradicional para el usuario final (profesor/estudiante).

## Guía para el Equipo de Desarrollo (Cómo correr el proyecto)

Si eres miembro del Grupo 5 y acabas de clonar este repositorio, sigue estos pasos para poder correr y editar el programa en tu computadora:

### Requisitos Previos
- Tener instalado **Node.js** en tu computadora.
- Tener instalado **Git**.

### Pasos para ejecutar en modo Desarrollo
1. Abre tu terminal y clona el repositorio:
   ```bash
   git clone https://github.com/yairochoa709-ops/Proyecto-Grupo5-Esquina-Noroeste.git
   ```
2. Entra a la carpeta principal de la aplicación:
   ```bash
   cd Proyecto-Grupo5-Esquina-Noroeste/men-desktop
   ```
3. Instala todas las dependencias:
   ```bash
   npm install
   ```
4. Inicia el entorno de desarrollo (esto abrirá la aplicación de escritorio automáticamente):
   ```bash
   npm run dev
   ```

### Pasos para compilar un nuevo instalador (.exe)
Si hacen mejoras en el código y quieren generar un nuevo instalador, solo deben ejecutar:
```bash
npm run build
```
El instalador final aparecerá en la carpeta `men-desktop/dist-electron/`.

---
*Proyecto desarrollado para la asignatura de Investigación de Operaciones - Grupo 5*
