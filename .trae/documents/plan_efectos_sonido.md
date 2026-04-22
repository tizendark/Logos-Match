# Plan de Implementación: Efectos de Sonido en Logos Match

## Resumen
Vamos a enriquecer la experiencia y el "game feel" de Logos Match implementando efectos de sonido. Se utilizará la librería `use-sound` para una integración sencilla y robusta en React. Añadiremos sonidos para las interacciones clave: clics de interfaz, notificaciones de unión al lobby, colocación de fichas en el Triqui, resultados de trivia (correcto/incorrecto) y victoria final.

## Análisis del Estado Actual
- Actualmente el proyecto es silencioso. Toda la retroalimentación es puramente visual.
- Las lógicas de juego están bien centralizadas en `useGameState` y los componentes como `GameView`, `RoomLobby` y `TicTacToeBoard` exponen claramente los momentos en los que ocurre una acción.
- Los navegadores modernos bloquean el audio automático (*autoplay*) hasta que el usuario interactúa con la página, lo cual ya ocurre al hacer clic en "Unirse" o "Crear sala".

## Cambios Propuestos

### 1. Dependencias y Recursos
- **Instalar librería**: Ejecutar `npm install use-sound`.
- **Directorio de Sonidos**: Crear la carpeta `public/sounds/`.
- **Descarga de Audios**: Descargaremos un paquete básico de efectos de sonido libres de derechos (CC0) mediante `curl` o crearemos archivos de audio genéricos (ej. `click.mp3`, `join.mp3`, `place.mp3`, `correct.mp3`, `wrong.mp3`, `win.mp3`). Si lo deseas, posteriormente podrás reemplazar estos archivos por los tuyos manteniendo los mismos nombres.

### 2. Hook Personalizado (`src/hooks/useGameSounds.ts`)
Crearemos un hook centralizado para que cualquier componente pueda disparar un sonido sin importar múltiples veces la misma lógica:
- Retornará funciones como `playClick()`, `playJoin()`, `playPlace()`, `playCorrect()`, `playWrong()`, y `playWin()`.
- (Opcional) Incluirá un estado global o persistente en `localStorage` para habilitar/deshabilitar (mutear) los sonidos, mejorando la UX.

### 3. Integración en Componentes (UI / Game)
- **`src/components/RoomLobby.tsx`**: 
  - Monitorear la longitud del arreglo `players`. Cuando se incremente, disparar `playJoin()`.
- **`src/components/TicTacToeBoard.tsx`**:
  - Al hacer clic en una celda válida, disparar `playPlace()`.
- **`src/components/GameView.tsx`**:
  - Cuando `gameState.questionRevealed` pase a `true`, verificar si la respuesta fue correcta o incorrecta y reproducir `playCorrect()` o `playWrong()`.
  - Al entrar a la fase `RESULTS`, reproducir `playWin()`.
- **`src/components/ResultsView.tsx`**:
  - Al montarse el podio, reproducir `playWin()` o un sonido de aplausos.
- **Botones Globales** (`src/app/page.tsx`, `src/app/host/page.tsx`, etc.):
  - Añadir un sonido sutil `playClick()` a los botones de navegación principales (Unirse, Crear Sala, etc.).
- **Control de Volumen (Botón Mute)**:
  - Añadir un pequeño icono de altavoz en el header del juego o lobby para que los jugadores puedan silenciar la pestaña sin tener que silenciar todo el sistema.

## Suposiciones y Decisiones
- Se usará `use-sound` por su excelente manejo de caché y rendimiento en React.
- Debido a que omitiste las preguntas aclaratorias, asumiré que no tienes los archivos de audio preparados aún. Por lo tanto, descargaré unos genéricos gratuitos (Open Source) para que la funcionalidad quede 100% operativa y probada. Luego podrás reemplazarlos por tus propios audios en la carpeta `public/sounds/`.

## Pasos de Verificación
1. Ejecutar `npm install use-sound` y verificar que el build sea exitoso.
2. Revisar que los archivos de audio se descarguen correctamente en `public/sounds/`.
3. Iniciar una partida local de prueba y comprobar en la consola y la UI que los hooks no causen re-renderizados infinitos (ej. dependencias mal configuradas en `useEffect`).
4. Verificar que al entrar como jugador el navegador permita reproducir el sonido al tocar botones.