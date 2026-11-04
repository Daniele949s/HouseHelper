# Milestone 2 Adversarial Challenge Analysis

**Author**: `challenger_m2_2` (`teamwork_challenger`)  
**Target**: Milestone 2: Navigation, Design System & Feedback Integrity  
**Date**: 2026-11-02  
**Working Directory**: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/challenger_m2_2/`

---

## Challenge Summary

**Overall risk assessment**: LOW to MEDIUM

Milestone 2 implementation is structurally solid and passes all primary functional requirements:
- Desktop navigation renders the full set of 6 route items with vector iconography when authenticated with an active household (`casaId`).
- Unauthenticated and house-less states are cleanly guarded, rendering `null` without throwing errors.
- Theme tokens in `src/index.css` and `src/App.css` define 80 custom CSS variables across light and dark palettes; empirical analysis revealed zero undefined CSS variable references across all 49 usage sites.
- Headless test fallbacks for toasts and confirmation modals successfully fall back to `window.alert` and `window.confirm`.
- `HouseholdStatus.js` contains zero `<canvas>` elements and zero recursive timers.
- Production build compiles cleanly with zero warnings (`build/` generated in 221.23 kB JS / 8.87 kB CSS).
- Full test suite passes 100% across 21 test suites (135 tests total, including 14 newly authored adversarial stress tests).

However, rigorous white-box stress testing revealed two edge-case vulnerabilities in the feedback subsystem and one DOM attribute lint issue in legacy components.

---

## Challenges

### [Medium] Challenge 1: Concurrent `showConfirm` Invocations Cause Promise Starvation (Clobbering)

- **Assumption challenged**: The confirmation dialog bus assumes only one modal confirmation will ever be in-flight at any given time.
- **Attack scenario**: If user interactions or rapid asynchronous triggers invoke `showConfirm()` while a modal dialog is already open, `ConfirmModal` replaces its local `modalData` state (`setModalData(payload)`) with the new request. The previous modal's `onConfirm` and `onCancel` callbacks are overwritten without ever being invoked or rejected.
- **Empirical reproduction**:
  ```javascript
  const feedback = require("./src/utils/feedback");
  let currentModal = null;
  feedback.subscribeConfirm((payload) => { currentModal = payload; });
  let p1Settled = false;
  const p1 = feedback.showConfirm({ message: "Modal 1" }).then(() => { p1Settled = true; });
  const p2 = feedback.showConfirm({ message: "Modal 2" });
  await currentModal.onConfirm();
  // Result: p1Settled remains false indefinitely; Promise p1 never settles.
  ```
- **Blast radius**: Low in current single-dialog UI flows, but could cause memory leaks or hung `await` promises in complex workflows or automated test scripts if multiple operations dispatch confirmations simultaneously.
- **Mitigation**: In `src/utils/feedback.js` or `src/components/ConfirmModal.js`:
  1. Auto-resolve any preceding open confirm promise with `false` before dispatching a new modal payload, OR
  2. Implement an in-memory queue that displays modals sequentially.

---

### [Low] Challenge 2: Unhandled Promise Rejections in Asynchronous `onConfirm` Handlers

- **Assumption challenged**: `showConfirm` wraps `onConfirm` with `try { if (onConfirm) await onConfirm(); } finally { resolve(true); }`, assuming errors are gracefully handled.
- **Attack scenario**: In `src/utils/feedback.js` (lines 93–99), there is no `catch` block within the async `onConfirm` executor. If a caller passes an async callback that rejects (`async () => { throw new Error(...) }`), the rejection escapes the handler. In `src/components/ConfirmModal.js` (line 20), `cb()` is executed synchronously without `.catch()`:
  ```javascript
  const handleConfirm = useCallback(() => {
    if (!modalData) return;
    const cb = modalData.onConfirm;
    setModalData(null);
    if (cb) cb(); // Unhandled promise rejection if cb rejects!
  }, [modalData]);
  ```
- **Empirical reproduction**:
  Triggering `showConfirm` with an async throwing function emitted an `unhandledRejection` event in Node/JSDOM runtime.
- **Blast radius**: May trigger unhandled promise rejection errors in browser console or telemetry if an API request fails inside `onConfirm`.
- **Mitigation**: Add a `.catch(err => { ... })` block in `src/utils/feedback.js` (or `ConfirmModal.js`) to swallow or log the error safely, or let the caller catch it through `showConfirm`'s promise.

---

### [Low] Challenge 3: React DOM Property Warning on Retained Legacy Mascot (`stop-color` vs `stopColor`)

- **Assumption challenged**: Retained legacy components run cleanly without console warnings.
- **Observation**: `src/components/InteractiveMascot.js` lines 110, 111, 129, 130, 141-144 use HTML syntax `stop-color` rather than JSX `stopColor`:
  `console.error: Invalid DOM property 'stop-color'. Did you mean 'stopColor'?`
- **Blast radius**: Non-blocking dev console warning during tests where `InteractiveMascot` is rendered.
- **Mitigation**: Will be naturally resolved in Milestone 3 when `InteractiveMascot.js` is fully superseded by `HouseholdStatus.js`.

---

## Stress Test Results

| # | Stress Scenario | Expected Behavior | Actual Behavior | Verdict |
|---|-----------------|-------------------|-----------------|---------|
| 1 | `DesktopNavigation` mounted with `currentUser = null` | Returns `null`, no DOM nodes | Returned `null` (container empty) | **PASS** |
| 2 | `DesktopNavigation` mounted with `userData.casaId = ""` / `null` | Returns `null` without throwing | Returned `null` | **PASS** |
| 3 | `DesktopNavigation` with authenticated household user | Renders all 6 links with FA icons | Rendered exactly 6 links (`/home`, `/turni`, `/debiti`, `/spesa`, `/bacheca`, `/calendario`) | **PASS** |
| 4 | `DesktopNavigation` subroute highlight (`/turni/aggiungi`) | Parent section "Turni" has `.active` class | Class `.active` applied cleanly | **PASS** |
| 5 | `MobileNavigation` drawer open/close body scroll | `document.body.style.overflow` toggles `hidden` / `""` | Toggled `hidden` on open, restored `""` on close | **PASS** |
| 6 | Subscriber fault isolation in `subscribeToast` | Throwing listener does not abort other subscribers | Error caught via try/catch; subsequent listener executed | **PASS** |
| 7 | Headless fallback in `feedback.showToast` (unmounted) | Falls back to `window.alert` | `window.alert` called with message | **PASS** |
| 8 | Headless fallback in `feedback.showConfirm` (unmounted) | Falls back to `window.confirm` | Resolves boolean matching `window.confirm` return value | **PASS** |
| 9 | High-frequency toast burst (50 toasts in loop) | FIFO bounds queue to maximum 5 items | Exactly 5 newest items retained in DOM; memory bounded | **PASS** |
| 10 | Confirm modal keyboard accessibility (Escape key) | Closes modal and resolves promise with `false` | Modal unmounted, promise resolved to `false` | **PASS** |
| 11 | `HouseholdStatus` with `casa = null` / `casa = {}` | Renders placeholder gracefully | Rendered "La tua Casa" and "------" fallback | **PASS** |
| 12 | `HouseholdStatus` with invalid chore date string | Renders without crashing | Handled gracefully without thrown error | **PASS** |
| 13 | `HouseholdStatus` zero canvas check | Zero `<canvas>` elements | Confirmed `canvas` is null; purely modern CSS & vector icons | **PASS** |
| 14 | CSS custom property reference integrity | 0 undefined variables in `var(--...)` usages | 80 defined, 49 referenced, 0 undefined | **PASS** |
| 15 | Circular dependencies & Zero-Emoji verification | 0 circular cycles; 0 emoji characters | 0 cycles (madge); 0 emojis across 74 files | **PASS** |
| 16 | Production build compilation | Zero errors, zero ESLint warnings | Built cleanly (221 kB JS / 8.87 kB CSS) | **PASS** |

---

## Unchallenged Areas

- **Backend Firebase Firestore Rules & Real Network Latency**: Tested using the in-memory mock harness (`mockFirebase.js`) in accordance with the project's offline testing protocol.
- **Physical Touch Gestures**: Mobile drawer swipe gestures were verified via DOM event triggers (`click`), as headless JSDOM does not emulate touch hardware coordinates.
