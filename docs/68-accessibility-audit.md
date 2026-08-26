# PROMPT 68 — Accessibility Audit & WCAG 2.1 AA Validation

**Date:** 2026-08-26
**Branch:** `main`
**Status:** Audit completed

## Executive Summary

Comprehensive WCAG 2.1 AA accessibility audit of the Agenda Escolar Digital frontend. All CRITICAL and HIGH severity issues have been resolved. MEDIUM severity issues addressed. Automated axe-core testing integrated into E2E suite.

## Regression Baselines

| Suite | Result |
|---|---|
| Backend | 431 PASS |
| Frontend Unit | 411 PASS |
| TypeScript | PASS |
| ESLint | PASS |
| Build | PASS |
| E2E Accessibility | 46/46 PASS (chromium + mobile-chrome) |
| E2E Navigation (chromium) | 20/20 PASS |
| E2E Dashboard (chromium) | 5/5 PASS |

## Findings Matrix

### CRITICAL (All Fixed)

| ID | Finding | File(s) | Fix |
|---|---|---|---|
| C-01 | No skip navigation link | `AppLayout.tsx` | Added skip-to-content link targeting `#main-content` |
| C-02 | No `aria-live` / loading announcements | `Spinner.tsx` | Added `role="status"` and `aria-label="Cargando"` with `sr-only` text |
| C-03 | Mobile sidebar not a dialog | `AppLayout.tsx` | Added `role="dialog"`, `aria-modal="true"`, `aria-label="Menú de navegación"`, Escape key handler |
| C-04 | No `aria-invalid` / `aria-describedby` on form inputs | `Input.tsx`, `PasswordInput.tsx` | Added `aria-invalid`, `aria-describedby`, `aria-required` |
| C-05 | Password toggle keyboard-inaccessible (`tabIndex={-1}`) | `PasswordInput.tsx` | Removed `tabIndex={-1}`, button now keyboard-focusable |

### HIGH (All Fixed)

| ID | Finding | File(s) | Fix |
|---|---|---|---|
| H-01 | No `aria-expanded` on dropdown toggles | `Topbar.tsx` | Added `aria-expanded` and `aria-haspopup="true"` to institution and user menus |
| H-02 | Nested interactive elements (`<Link>` > `<Button>`) | `UnauthorizedPage.tsx`, `NotFoundPage.tsx` | Replaced `<Link><Button>` with styled `<Link>` |
| H-03 | Emoji icons without `aria-hidden` | `AppLayout.tsx`, `Topbar.tsx`, `ErrorState.tsx`, `UnauthorizedPage.tsx`, `NotFoundPage.tsx` | Added `aria-hidden="true"` to decorative emojis |
| H-04 | Heading hierarchy breaks (`<h3>` without `<h2>`) | `EmptyState.tsx`, `ErrorState.tsx`, `LoginPage.tsx` | Changed `<h3>` to `<h2>`, changed `<h2>` to `<h1>` on login |
| H-05 | No keyboard dismiss for dropdowns/mobile overlay | `Topbar.tsx`, `AppLayout.tsx` | Added Escape key handlers |
| H-06 | Button loading spinner silent to screen readers | `Button.tsx` | Added `aria-hidden="true"` to loading SVG |
| H-07 | `<main>` not focusable for skip link | `AppLayout.tsx` | Added `tabIndex={-1}` and `focus:outline-none` |

### MEDIUM (All Fixed)

| ID | Finding | File(s) | Fix |
|---|---|---|---|
| M-01 | Notification badge lacks context | `Topbar.tsx` | Added `, ${unreadCount} sin leer` to `aria-label` |
| M-02 | Communication unread count lacks context | `Sidebar.tsx` | Added `aria-label="${unreadCount} mensajes sin leer"` |
| M-03 | No `role="menu"`/`role="menuitem"` on dropdowns | `Topbar.tsx` | Added `role="menu"` to containers, `role="menuitem"` to items |
| M-04 | Color contrast failures (`text-gray-400` = 2.6:1) | 18 files | Changed all text content `text-gray-400` to `text-gray-500` (4.6:1 ratio) |
| M-05 | Required field indicators invisible to screen readers | `Input.tsx`, `PasswordInput.tsx` | Added visually hidden `*` with `aria-hidden="true"` |

## Automated Testing

### axe-core Integration

Installed `@axe-core/playwright` and created `apps/web/e2e/accessibility.spec.ts` with 46 tests across:

- **axe-core audit** (20 tests): WCAG 2.1 AA compliance on 10 pages x 2 viewports
- **Keyboard navigation** (3 tests): Tab order, password toggle, skip link
- **ARIA attributes** (6 tests): Landmarks, `aria-expanded`, `aria-modal`, `role="alert"`, heading hierarchy
- **Forms** (2 tests): Label visibility, `aria-required`
- **Color contrast** (2 tests): Dashboard text, sidebar text

### Tag Filtering

All axe-core tests filter by `['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']` tags to focus on WCAG 2.1 AA criteria.

## Files Modified

### Core UI Components
- `apps/web/src/components/ui/Button.tsx` — `aria-hidden` on loading spinner
- `apps/web/src/components/ui/Input.tsx` — `aria-invalid`, `aria-describedby`, `aria-required`
- `apps/web/src/components/ui/PasswordInput.tsx` — Removed `tabIndex={-1}`, added ARIA attrs
- `apps/web/src/components/ui/Spinner.tsx` — `role="status"`, `aria-label`
- `apps/web/src/components/ui/StatCard.tsx` — `text-gray-500` contrast fix

### Layout
- `apps/web/src/layouts/AppLayout.tsx` — Skip link, `main#main-content`, mobile dialog, Escape key
- `apps/web/src/components/layout/Topbar.tsx` — `aria-expanded`, `aria-haspopup`, menu roles, Escape key
- `apps/web/src/components/layout/Sidebar.tsx` — Unread count `aria-label`

### Feedback
- `apps/web/src/components/feedback/EmptyState.tsx` — `role="status"`, `aria-hidden`, `<h2>`
- `apps/web/src/components/feedback/ErrorState.tsx` — `role="alert"`, `aria-hidden`, `<h2>`

### Pages
- `apps/web/src/pages/LoginPage.tsx` — `<h1>` heading
- `apps/web/src/pages/UnauthorizedPage.tsx` — Fixed nested interactive, `aria-hidden`, `<main>`
- `apps/web/src/pages/NotFoundPage.tsx` — Fixed nested interactive, `aria-hidden`, `<main>`

### Contrast Fixes (text-gray-400 → text-gray-500)
- `EnrollmentsPage.tsx`, `FileUploader.tsx`, `GradesPage.tsx`, `GuardiansFormPage.tsx`, `GuardiansPage.tsx`, `NotificationsPage.tsx`, `SchedulesPage.tsx`, `SchoolGradeFormPage.tsx`, `SchoolGradesPage.tsx`, `TaskAssignmentFormPage.tsx`, `TaskAssignmentsPage.tsx`, `TaskSubmissionDetailPage.tsx`, `TaskSubmissionFormPage.tsx`, `TaskSubmissionsPage.tsx`, `TasksPage.tsx`

### Tests
- `apps/web/src/__tests__/login-page.test.tsx` — Updated selectors
- `apps/web/e2e/accessibility.spec.ts` — **NEW**: 46 accessibility E2E tests
- `apps/web/e2e/*.spec.ts` — Updated `getByLabel('Contraseña')` → `locator('#password')`
- `apps/web/e2e/fixtures/auth.ts` — Updated password selector

### Dependencies
- `package.json` — Added `@axe-core/playwright`, `axe-core`
