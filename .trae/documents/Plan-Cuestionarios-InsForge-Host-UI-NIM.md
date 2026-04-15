# Plan: Cuestionarios (InsForge) + Host UI + Generación IA (NVIDIA NIM)

## Resumen
Implementar un modelo de datos en InsForge para “plantillas” y “quizzes personalizados”, más el concepto de “preguntas de sesión” (`game_questions`) copiadas a nivel de sala para asegurar consistencia durante partidas en curso. Añadir un flujo UI mobile-first para Host que permita: elegir plantilla o crear personalizado, componer un quiz, y crear una sala. Integrar un endpoint server-only en Next.js para generar preguntas con NVIDIA NIM (Nemotron) sin exponer credenciales al frontend.

## Estado actual (repo)
- App base en Next.js App Router con página placeholder: [page.tsx](file:///workspace/logos-match/src/app/page.tsx#L1-L65).
- Estado de juego aún es un placeholder (solo types + `useState`): [useGameState.ts](file:///workspace/logos-match/src/hooks/useGameState.ts#L1-L25).
- Cliente InsForge mínimo ya existe (headers `apikey` + `authorization`) y config vía env: [insforgeClient.ts](file:///workspace/logos-match/src/lib/insforgeClient.ts#L1-L61), [insforge.ts](file:///workspace/logos-match/src/lib/insforge.ts#L1-L9), [useInsForgeClient.ts](file:///workspace/logos-match/src/hooks/useInsForgeClient.ts#L1-L15).
- No hay rutas de `/room/*` ni UI de Host implementadas todavía.

## Objetivo y criterios de éxito
**Objetivo**
- Tener la base para rejugabilidad: templates + quizzes personalizados + snapshot a `game_questions` por sala.
- Permitir crear y arrancar partidas desde el panel del Host en móvil.
- Permitir generación de preguntas con IA (NVIDIA NIM) sin filtrar keys.

**Éxito**
- Existe un esquema SQL claro (tablas + índices) que refleja: `question_templates`, `custom_quizzes`, `game_questions` (y entidades soporte).
- UI de Host (mobile-first) permite: seleccionar plantilla o crear desde cero; editar preguntas (2–6 opciones); crear sala; ver código de sala.
- Endpoint server-only `/api/ai/generate-questions` devuelve preguntas estructuradas y se consume desde el Host UI.
- No se almacenan ni commitean secretos (keys) en el repo; todo va por variables de entorno.

## Decisiones ya confirmadas
- Backend: **InsForge**.
- Identidad/permiso inicial: **sin login** (Host/players entran por código).
- Entregable: **Host UI mínimo** + **IA ahora (server-only)**.
- Formato de preguntas: **opciones variables (2–6)** con **1 correcta**.
- Estrategia de escrituras en DB: **API routes en Vercel** con credencial server-only (service/admin) para insertar/actualizar; el cliente con anon key se usa solo si hace falta para lecturas públicas.

## Consideraciones de seguridad (importante)
- La API key de NVIDIA NIM y cualquier credencial “service/admin” de InsForge deben estar SOLO en variables de entorno (Vercel / local), nunca en archivos versionados.
- Si alguna key se compartió por chat o quedó en commits previos, se debe rotar de nuevo.

## Arquitectura de datos propuesta (InsForge / Postgres)
> Nota: Los nombres pueden ajustarse, pero el modelo conserva las 3 capas: templates → custom → game snapshot.

### 1) Templates (maestro)
- `question_templates`
  - `id uuid pk`
  - `title text not null`
  - `description text null`
  - `difficulty text null` (o enum)
  - `category text null`
  - `is_published boolean not null default true`
  - `created_at timestamptz not null default now()`
- `template_questions`
  - `id uuid pk`
  - `template_id uuid fk -> question_templates(id) on delete cascade`
  - `prompt text not null`
  - `options jsonb not null` (array de strings 2–6)
  - `correct_index int not null` (0..n-1)
  - `explanation text null`
  - `tags text[] null`
  - `created_at timestamptz not null default now()`
  - Índice: `(template_id)`

### 2) Quizzes personalizados (del Host)
- `custom_quizzes`
  - `id uuid pk`
  - `title text not null`
  - `host_token text not null` (secreto local del host, no es login; se guarda en localStorage)
  - `created_at timestamptz not null default now()`
  - Índice: `(host_token)`
- `custom_quiz_questions`
  - `id uuid pk`
  - `quiz_id uuid fk -> custom_quizzes(id) on delete cascade`
  - `prompt text not null`
  - `options jsonb not null`
  - `correct_index int not null`
  - `explanation text null`
  - `created_at timestamptz not null default now()`
  - Índice: `(quiz_id)`

### 3) Juego / sesión (snapshot)
- `rooms`
  - `id uuid pk`
  - `code text not null unique` (código corto para compartir, p.ej. 6–8 chars)
  - `host_token text not null`
  - `status text not null` (`lobby|playing|results|ended`)
  - `game_config jsonb not null` (usa el shape de [gameConfig.ts](file:///workspace/logos-match/src/lib/gameConfig.ts#L1-L56))
  - `created_at timestamptz not null default now()`
  - Índices: `(code)`, `(host_token)`
- `room_players`
  - `id uuid pk`
  - `room_id uuid fk -> rooms(id) on delete cascade`
  - `name text not null`
  - `score int not null default 0`
  - `status text not null default 'connected'`
  - `created_at timestamptz not null default now()`
  - Índice: `(room_id)`
- `game_questions`
  - `id uuid pk`
  - `room_id uuid fk -> rooms(id) on delete cascade`
  - `source_type text not null` (`template|custom`)
  - `source_id uuid null` (template_id o quiz_id, opcional)
  - `prompt text not null`
  - `options jsonb not null`
  - `correct_index int not null`
  - `order_index int not null` (orden en la partida)
  - `created_at timestamptz not null default now()`
  - Índices: `(room_id, order_index)`

### RLS / permisos
Como no hay login, el enfoque recomendado es:
- **Frontend no escribe directo** a InsForge.
- Las escrituras pasan por **Route Handlers** en Next.js (server) con credencial admin/service.
- Lecturas públicas (si se requieren directas al cliente) deben ser mínimas y “no sensibles”, o también pasar por server para evitar exponer datos globales.

## Cambios propuestos (código)

### A) Base de datos: scripts de esquema
Crear archivos SQL versionables (no secretos) con el esquema:
- `logos-match/insforge/schema/001_quizzes.sql`
  - `CREATE TABLE ...` + índices.
- `logos-match/insforge/schema/002_rls.sql`
  - Policies mínimas si se habilitan lecturas directas (opcional); de lo contrario documentar “todo via server”.

### B) Capa InsForge (cliente REST mínimo)
Objetivo: encapsular URLs y shapes para DB API.
- `logos-match/src/lib/insforgeDb.ts`
  - Helpers `dbSelect`, `dbInsert`, `dbUpdate` que llamen a `/api/database/records/{table}`.
  - En client-side, usar `useInsForgeClient()` solo para lecturas públicas.
- `logos-match/src/lib/models/quiz.ts`
  - Tipos TS: `QuestionTemplate`, `TemplateQuestion`, `CustomQuiz`, `CustomQuizQuestion`, `Room`, `RoomPlayer`, `GameQuestion`.
- `logos-match/src/lib/roomCode.ts`
  - Generación de códigos (sin dependencias externas): alfanumérico sin caracteres ambiguos.

### C) API routes (server-only) para escrituras + lógica de snapshot
Crear route handlers en `logos-match/src/app/api/**/route.ts`:
- `POST /api/host/session`
  - Genera y devuelve `host_token` (guardar en localStorage).
- `POST /api/quizzes/custom`
  - Crea `custom_quizzes` + `custom_quiz_questions`.
- `GET /api/templates`
  - Lista templates publicados (para el selector).
- `GET /api/templates/[templateId]`
  - Trae preguntas del template para previsualización/edición.
- `POST /api/rooms`
  - Body: `{ mode: 'template'|'custom', templateId?, quizDraft?, gameConfig? }`
  - Crea `rooms` y genera `game_questions` copiando preguntas (snapshot).
  - Devuelve `{ roomId, code }`.
- `POST /api/rooms/[roomId]/join`
  - Crea `room_players` (name) y devuelve `playerId`.

**Credenciales server-only necesarias**
- `INSFORGE_URL` (base URL del proyecto).
- `INSFORGE_SERVICE_KEY` (credencial con permiso de escritura; no pública).

> Nota: el frontend sigue usando `NEXT_PUBLIC_INSFORGE_URL`/`NEXT_PUBLIC_INSFORGE_ANON_KEY` si necesitas lecturas directas; pero el “camino seguro” para todo es usar estas rutas.

### D) Host UI (mobile-first)
Rutas sugeridas (App Router):
- `logos-match/src/app/page.tsx`
  - Home: “Crear sala” (Host) / “Unirse” (Jugador).
- `logos-match/src/app/host/page.tsx`
  - “Selector de modo”: plantilla vs personalizado.
- `logos-match/src/app/host/templates/page.tsx`
  - Cards de templates (tema, dificultad, # preguntas).
- `logos-match/src/app/host/custom/page.tsx`
  - Editor quick-add:
    - Agregar pregunta
    - Opciones (2–6)
    - Marcar correcta
    - Reordenar / borrar
    - Botón “Generar con IA”
- `logos-match/src/app/room/[roomId]/page.tsx`
  - Lobby básico: código, jugadores, botón “Iniciar”.

Componentes sugeridos:
- `logos-match/src/components/QuizBuilder/*` (formulario y lista de preguntas).
- `logos-match/src/components/TemplateCard.tsx`
- `logos-match/src/components/RoomCodeBadge.tsx`

### E) IA: generación de preguntas con NVIDIA NIM (Nemotron)
Implementar endpoint server-only:
- `POST /api/ai/generate-questions`
  - Input: `{ topic: string, count: number, difficulty?: string }`
  - Output: `{ questions: Array<{ prompt: string, options: string[], correct_index: number, explanation?: string }> }`
  - Variables env:
    - `NVIDIA_NIM_API_KEY`
    - `NVIDIA_NIM_MODEL` (por ejemplo, un Nemotron Chat model)
    - `NVIDIA_NIM_BASE_URL` si aplica

En el Host UI:
- Botón “Generar con IA”
  - Solicita topic + count (default 5)
  - Inserta preguntas en el builder (el host puede editar antes de crear sala)

## Supuestos (para ejecución)
- La URL de InsForge expone el endpoint de DB según docs: `/api/database/records/{table}` y respeta headers de autorización.
- Dispones de una credencial server-only con permiso de escritura (service/admin) para usar en Vercel.
- La anon key (NEXT_PUBLIC) solo se usa para lecturas no sensibles o se evita por completo usando `/api/*`.

## Verificación (cuando se ejecute el plan)
- Local:
  - `npm run lint`
  - `npm run build`
  - Smoke test manual:
    - Crear host session → crear quiz personalizado → crear sala → ver código → abrir lobby.
    - Generar preguntas con IA desde topic y verificar estructura (2–6 opciones, 1 correcta).
- Vercel:
  - Confirmar env vars configuradas:
    - `NEXT_PUBLIC_INSFORGE_URL`, `NEXT_PUBLIC_INSFORGE_ANON_KEY` (si se usan)
    - `INSFORGE_URL`, `INSFORGE_SERVICE_KEY`
    - `NVIDIA_NIM_API_KEY`, `NVIDIA_NIM_MODEL` (+ base URL si aplica)
  - Probar endpoints `/api/*` en preview/prod sin exponer secretos.

