# PROJECT_CONTEXT — Logos Match

Fecha: 2026-04-15

## Visión General
Logos Match es un juego web mobile-first para partidas rápidas de trivia bíblica, con un Host que crea y controla la sala y jugadores que se unen mediante un código. El objetivo del MVP es habilitar: crear sala, unirse, ver lobby, iniciar partida y mantener presencia básica de jugadores.

## Estado Actual (Implementado)
### Flujos funcionales
- Host:
  - Obtener `hostToken` persistido en `localStorage` y usado para autorizar acciones de host.
  - Elegir plantilla y crear sala.
  - Crear quiz personalizado y crear sala.
  - Iniciar partida desde el lobby (cambia `rooms.status` a `playing`).
- Jugador:
  - Unirse a una sala con código + nombre.
  - Mantener presencia con heartbeat y marcar salida al cerrar pestaña/navegador.
- Lobby:
  - Muestra código de sala, estado, lista de jugadores conectados (polling).

### Páginas (App Router)
- `/` — Home: crear sala (Host) o unirse con código (Jugador). [page.tsx](file:///workspace/logos-match/src/app/page.tsx)
- `/host` — panel host con accesos a plantillas y creador custom. [host/page.tsx](file:///workspace/logos-match/src/app/host/page.tsx)
- `/host/templates` — listado de plantillas y creación de sala. [page.tsx](file:///workspace/logos-match/src/app/host/templates/page.tsx)
- `/host/custom` — constructor de quiz custom + generación con IA. [page.tsx](file:///workspace/logos-match/src/app/host/custom/page.tsx)
- `/room/[roomId]` — lobby unificado para host y jugador. [page.tsx](file:///workspace/logos-match/src/app/room/%5BroomId%5D/page.tsx)

### Backend (Next.js Route Handlers)
Todas las rutas `/api/*` son server-side y usan InsForge DB API con `INSFORGE_SERVICE_KEY`.

- Host session:
  - `POST /api/host/session` → `{ hostToken }` [route.ts](file:///workspace/logos-match/src/app/api/host/session/route.ts)
- Templates:
  - `GET /api/templates` [route.ts](file:///workspace/logos-match/src/app/api/templates/route.ts)
  - `GET /api/templates/[templateId]` [route.ts](file:///workspace/logos-match/src/app/api/templates/%5BtemplateId%5D/route.ts)
- Rooms:
  - `POST /api/rooms` crea sala desde plantilla o custom (también hace snapshot en `game_questions`). [route.ts](file:///workspace/logos-match/src/app/api/rooms/route.ts)
  - `GET /api/rooms/[roomId]` devuelve `{ room, players }` y filtra solo jugadores conectados. [route.ts](file:///workspace/logos-match/src/app/api/rooms/%5BroomId%5D/route.ts)
  - `POST /api/rooms/[roomId]/start` cambia `rooms.status` a `playing` (requiere `hostToken`). [route.ts](file:///workspace/logos-match/src/app/api/rooms/%5BroomId%5D/start/route.ts)
- Join:
  - `POST /api/rooms/join` une jugador por código y devuelve `{ roomId, playerId }`. [route.ts](file:///workspace/logos-match/src/app/api/rooms/join/route.ts)
  - `POST /api/rooms/[roomId]/join` une jugador por `roomId` y devuelve `{ playerId }`. [route.ts](file:///workspace/logos-match/src/app/api/rooms/%5BroomId%5D/join/route.ts)
- Presencia:
  - `POST /api/players/[playerId]/heartbeat` marca actividad (y `status=connected`). [route.ts](file:///workspace/logos-match/src/app/api/players/%5BplayerId%5D/heartbeat/route.ts)
  - `POST /api/players/[playerId]/leave` marca `status=disconnected` (best-effort al cerrar). [route.ts](file:///workspace/logos-match/src/app/api/players/%5BplayerId%5D/leave/route.ts)
- IA (NVIDIA NIM):
  - `POST /api/ai/generate-questions` genera borradores de preguntas. [route.ts](file:///workspace/logos-match/src/app/api/ai/generate-questions/route.ts)

### Presencia de jugadores (detalle)
El lobby usa polling (`/api/rooms/[roomId]`) cada 2.5s. Los jugadores:
- Envían heartbeat cada 10s si entraron desde `/room/[roomId]?playerId=...`.
- Envían leave con `keepalive` en `beforeunload`.

El backend:
- Devuelve solo jugadores con `status='connected'`.
- Expira jugadores (marca disconnected) si `last_seen_at` es muy antiguo (ventana de 90s).

## Datos / Esquema (InsForge SQL)
Los endpoints dependen de que existan tablas en InsForge.

- Esquema base: [001_quizzes.sql](file:///workspace/logos-match/insforge/schema/001_quizzes.sql)
  - `question_templates`, `template_questions`
  - `custom_quizzes`, `custom_quiz_questions`
  - `rooms`, `room_players`
  - `game_questions` (snapshot de preguntas por sala)
- Seed de ejemplo: [003_seed_templates.sql](file:///workspace/logos-match/insforge/schema/003_seed_templates.sql)
- Presencia: [004_player_presence.sql](file:///workspace/logos-match/insforge/schema/004_player_presence.sql)
- RLS (no ejecutar en MVP sin policies): [002_rls.sql](file:///workspace/logos-match/insforge/schema/002_rls.sql)

## Variables de Entorno
### Server-only (Vercel / local)
- `INSFORGE_URL`
- `INSFORGE_SERVICE_KEY`
- `NVIDIA_NIM_API_KEY`
- `NVIDIA_NIM_MODEL` (opcional)
- `NVIDIA_NIM_BASE_URL` (opcional)

### Client (solo si se usa SDK/anon, no requerido para el MVP actual)
- `NEXT_PUBLIC_INSFORGE_URL`
- `NEXT_PUBLIC_INSFORGE_ANON_KEY`

## Decisiones técnicas clave
- Next.js App Router (Route Handlers para API).
- InsForge DB API como persistencia (server-only con service key).
- Estado de Host: `hostToken` generado por el backend y persistido en `localStorage`. [useHostToken](file:///workspace/logos-match/src/hooks/useHostToken.ts)
- Sin WebSockets por ahora: polling para lobby y presencia.
- Snapshot de preguntas en `game_questions` al crear sala (evita inconsistencias si la plantilla cambia).

## Qué falta (Roadmap inmediato)
- Vista de juego (`/room/[roomId]/play`) y lógica de rondas:
  - Selección de pregunta actual, temporizador, bloqueo de respuesta, scoring.
  - Transición `lobby → playing → results → ended`.
- UI/flujo del jugador durante la partida (responder preguntas).
- Reglas de sala:
  - Bloquear late join cuando se inicia la partida (según `game_config`).
  - Mostrar feedback de estado (iniciada, en curso, finalizada).
- Resultados/ranking por ronda y final.

