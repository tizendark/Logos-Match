# Dogfood QA Report

**Target:** `http://localhost:3000`
**Session:** `logos-match-qa`
**Date:** 2026-04-21

## Summary

- **Total Issues Found:** 1
- **Critical:** 1
- **High:** 0
- **Medium:** 0
- **Low:** 0

### Key Findings

1. **Host Panel is completely blocked:** The "Usar plantilla" and "Crear personalizado" buttons on the `/host` page are permanently disabled because the `useHostToken` hook fails to properly fetch or re-render the token on the client side, causing a hydration/render mismatch where `hostToken` is always evaluated as falsy.

---

## Issues

### ISSUE-001: Host Panel buttons are permanently disabled

- **Severity:** Critical
- **Type:** Functional / Blocker
- **URL:** `http://localhost:3000/host`
- **Repro Video:** N/A (Tested manually via headless browser)

**Description:**
When a user navigates to the "Crear sala (Host)" page (`/host`), the primary action buttons ("Usar plantilla" and "Crear personalizado") are grayed out and disabled. This prevents any user from creating a room, effectively blocking the core functionality of the application.

**Repro Steps:**
1. Navigate to the homepage (`http://localhost:3000`).
2. Click on the **"Crear sala (Host)"** button.
3. Observe the `/host` page loads.
4. The two buttons ("Usar plantilla", "Crear personalizado") are disabled and cannot be clicked.

**Expected Behavior:**
The page should quickly initialize the Host session via `/api/host/session` and enable the buttons, allowing the user to proceed with room creation.

**Actual Behavior:**
The buttons remain disabled indefinitely. The `useEffect` inside `useHostToken.ts` seems to either not fire or the state update does not trigger a re-render to enable the buttons.

**Evidence:**
Screenshot analysis confirmed the `disabled` attribute is present on both buttons:
```yaml
    - role: button
      name: Usar plantilla
      ref: e56
      states: [disabled]
    - role: button
      name: Crear personalizado
      ref: e57
      states: [disabled]
```