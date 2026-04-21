# Logos Match - Project Context

## Overview
Logos Match is a web-based multiplayer game combining Bible Trivia with Tic-Tac-Toe. It allows a Host to create custom or template-based quizzes, while players join via a room code and compete on a 3x3 board.

## Tech Stack
- Framework: Next.js (App Router, React 18)
- Styling: Tailwind CSS
- Backend/DB: InsForge (Supabase-compatible PostgreSQL)
- Deployment: Vercel

## Recent Updates & Features
1. **Player Presence & Timeout**: Implemented a heartbeat mechanism (`usePlayerPresence.ts`). Players ping the server every 15 seconds. If a player closes the browser or disconnects for more than 2 minutes, they are automatically kicked from the room to prevent "ghost" players.
2. **Reconnection System**: Players' session data (`roomId`, `playerId`, `name`) is saved to `localStorage`. If they accidentally close the tab, they can seamlessly reconnect without needing the PIN again.
3. **Design Guidelines**: Established a comprehensive `DESIGN.md` file detailing the visual mood (modern, spiritual, clean), typography, and color palette (Amber, Deep Blues, Warm Grays/Whites). These guidelines have been applied to the existing UI.
4. **End-of-Game & Results View**: Created a dynamic `ResultsView.tsx` showing a podium for the top 3 players using `framer-motion`. The Host can manually close the session, which automatically deletes the room from the database. Also, the room is automatically deleted if all players leave.
5. **Bug Fixes**: Resolved interactive tic-tac-toe permissions, ensuring only the Host and the current player can interact with the board. Added visual turn feedback to clearly indicate whose turn it is.

## Current State & Known Issues
- **UI/UX Blockers**: There is a known issue on the `/host` page where the Host session token (`useHostToken`) might fail to hydrate or fetch correctly on the client side, causing the "Usar plantilla" and "Crear personalizado" buttons to remain permanently disabled.
- **Next Steps**: Need to fix the `useHostToken` hydration/fetching issue to unblock the Host creation flow.
