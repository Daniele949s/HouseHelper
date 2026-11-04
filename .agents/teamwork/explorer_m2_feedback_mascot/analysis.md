# Technical Analysis & Implementation Specification: Modern Feedback & Household Status

**Agent:** `explorer_m2_feedback_mascot`  
**Milestone:** Milestone 2 (Modern Feedback, Accessible Dialogs & Household Status)  
**Date:** 2026-11-02  
**Target Output Files:**
- `src/utils/feedback.js` (Toast & Confirmation Modal Emitter Utility)
- `src/components/Toast.js` (Non-blocking In-App Toast Container & Items)
- `src/components/ConfirmModal.js` (Accessible Confirmation Modal Dialog)
- `src/components/HouseholdStatus.js` (Modern Household Status & Presence Component)

---

## 1. Executive Summary & Context

The HouseHelper application currently relies on synchronous, blocking native browser APIs (`window.alert()` and `window.confirm()`) across 20 distinct interaction points in primary pages (`SceltaCasa.js`, `homeUtente.js`, `viewTurni.js`, `modificaTurno.js`, `ViewDebiti.js`, `ViewBacheca.js`, and `ModificaNota.js`). These browser dialogs halt JavaScript execution, break single-page application navigation, cannot be styled or themed, and introduce jarring visual friction.

Simultaneously, the application features quirky legacy cartoon widgets:
1. `src/components/InteractiveMascot.js`: A 135px cartoon eye-tracking blob with mouse-following physics, manual dragging, and pointer-capture listeners that clashes with a modern SaaS household tool.
2. `src/components/MiniGuy.js`: A 44-frame canvas animation of Monkey Island Guybrush running recursive `setTimeout` loops with hardcoded Unicode emojis (`🏴‍☠️` in title).
3. `src/components/Celebration.js`: A confetti generator that appends raw `<canvas>` elements to `document.body` and executes unbounded `requestAnimationFrame` loops causing memory leaks in long-lived sessions and test runs.

This specification delivers production-grade designs for:
1. **In-App Toast Notification System** (`Toast.js` + `feedback.js`) supporting `success`, `error`, `info`, and `warning` with smooth non-blocking animations, automatic dismissal, manual dismiss, and zero emojis.
2. **Accessible Confirmation Modal Dialog** (`ConfirmModal.js`) providing backdrop blur, title, descriptive message, keyboard navigation (Escape, focus trapping), and styled actions (`isDanger`).
3. **Modern Household Status Component** (`HouseholdStatus.js`) replacing retro mascots with a clean vector-based presence card showing household identity, active roommate count, next chore status, and one-click copyable invite code.

---

## 2. In-App Toast Notification System

### 2.1 Emitter Architecture (`src/utils/feedback.js`)

To ensure decoupling between page logic and UI rendering, `src/utils/feedback.js` implements a lightweight publish-subscribe event emitter. Any page or utility can import `showToast` directly without needing React component tree prop drilling or complex hook dependencies.

```javascript
/**
 * src/utils/feedback.js
 * Central emitter for in-app toasts and accessible confirmation modals.
 */

// Toast Subscription Bus
const toastListeners = new Set();

export function subscribeToast(listener) {
  toastListeners.add(listener);
  return () => toastListeners.delete(listener);
}

/**
 * Display an in-app non-blocking toast notification.
 * @param {string} message - Notification text (strictly zero emojis)
 * @param {'info'|'success'|'warning'|'error'} [type='info'] - Status type
 * @param {number} [duration=3500] - Auto-dismiss delay in ms
 * @returns {{ id: string, message: string, type: string, duration: number }}
 */
export function showToast(message, type = 'info', duration = 3500) {
  const toastItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    type,
    duration
  };

  if (toastListeners.size > 0) {
    toastListeners.forEach((listener) => listener(toastItem));
  } else {
    // Headless / isolated test fallback:
    // If running in Jest without a mounted ToastContainer, fall back to window.alert
    // so legacy tests expecting alert spy calls pass without regression.
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(message);
    }
  }

  return toastItem;
}

// Convenience wrappers
export const toast = {
  info: (msg, dur) => showToast(msg, 'info', dur),
  success: (msg, dur) => showToast(msg, 'success', dur),
  warning: (msg, dur) => showToast(msg, 'warning', dur),
  error: (msg, dur) => showToast(msg, 'error', dur)
};
```

### 2.2 Component Specification: `src/components/Toast.js`

`Toast.js` renders a fixed-position container at the top-right viewport corner. The container itself has `pointer-events: none` so clicks pass through to underlying application elements, while individual toast items have `pointer-events: auto`.

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { subscribeToast } from '../utils/feedback';

const TYPE_ICONS = {
  success: 'fas fa-check-circle',
  error: 'fas fa-times-circle',
  warning: 'fas fa-exclamation-triangle',
  info: 'fas fa-info-circle'
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToast((newToast) => {
      setToasts((prev) => {
        // Enforce maximum stack depth of 5 toasts (FIFO eviction)
        const updated = [...prev, newToast];
        if (updated.length > 5) {
          return updated.slice(updated.length - 5);
        }
        return updated;
      });
    });

    return () => unsubscribe();
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Notifiche applicazione"
      aria-live="polite"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} toast={item} onDismiss={() => removeToast(item.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const { id, message, type, duration } = toast;
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onDismiss, 250); // match fadeOut animation duration
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss, isPaused]);

  const handleManualClose = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 250);
  };

  return (
    <div
      className={`toast-item toast-${type} ${isExiting ? 'toast-exit' : 'toast-enter'}`}
      role={type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="toast-icon-wrap">
        <i className={TYPE_ICONS[type] || TYPE_ICONS.info}></i>
      </div>
      <div className="toast-body">
        <p className="toast-message">{message}</p>
      </div>
      <button
        type="button"
        className="toast-close-btn"
        onClick={handleManualClose}
        aria-label="Chiudi notifica"
      >
        <i className="fas fa-times"></i>
      </button>
      <div
        className="toast-progress-bar"
        style={{
          animationDuration: `${duration}ms`,
          animationPlayState: isPaused ? 'paused' : 'running'
        }}
      />
    </div>
  );
}
```

### 2.3 Visual Design & CSS Tokens

```css
/* Toast Container */
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
  max-width: 420px;
  width: calc(100vw - 48px);
}

/* Individual Toast Card */
.toast-item {
  position: relative;
  overflow: hidden;
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-card);
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.toast-enter {
  animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.toast-exit {
  animation: toastSlideOut 0.25s ease forwards;
}

@keyframes toastSlideIn {
  from {
    transform: translateX(120%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes toastSlideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(120%);
    opacity: 0;
  }
}

/* Status Type Colors & Left Accents */
.toast-success {
  border-left: 4px solid var(--color-success);
}
.toast-success .toast-icon-wrap {
  color: var(--color-success);
}

.toast-error {
  border-left: 4px solid var(--color-danger);
}
.toast-error .toast-icon-wrap {
  color: var(--color-danger);
}

.toast-warning {
  border-left: 4px solid var(--color-warning);
}
.toast-warning .toast-icon-wrap {
  color: var(--color-warning);
}

.toast-info {
  border-left: 4px solid var(--color-primary);
}
.toast-info .toast-icon-wrap {
  color: var(--color-primary);
}

.toast-icon-wrap {
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast-body {
  flex: 1;
  min-width: 0;
}

.toast-message {
  margin: 0;
  color: var(--text-main);
  font-size: 0.92rem;
  font-weight: 500;
  line-height: 1.4;
  word-break: break-word;
}

.toast-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  font-size: 0.9rem;
  border-radius: var(--radius-xs);
  transition: color 0.2s ease, background 0.2s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-close-btn:hover {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.08);
}

/* Auto-dismiss progress indicator */
.toast-progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background: currentColor;
  opacity: 0.25;
  animation: toastProgress linear forwards;
}

@keyframes toastProgress {
  from { width: 100%; }
  to { width: 0%; }
}

@media (max-width: 600px) {
  .toast-container {
    top: 16px;
    right: 16px;
    left: 16px;
    width: auto;
  }
}
```

---

## 3. Accessible Confirmation Modal Dialog

### 3.1 Modal Dispatcher Architecture (`src/utils/feedback.js`)

The confirmation modal must handle both:
1. Modern Promise-based syntax: `const confirmed = await showConfirm({ title, message, isDanger: true });`
2. Callback-based syntax: `showConfirm({ title, message, onConfirm: () => ..., onCancel: () => ... });`
3. Fallback for test harness: When no `<ConfirmModal />` component is mounted in headless tests, fallback to `window.confirm(message)` ensures existing tests pass seamlessly.

```javascript
// Confirmation Modal Bus in src/utils/feedback.js
const confirmListeners = new Set();

export function subscribeConfirm(listener) {
  confirmListeners.add(listener);
  return () => confirmListeners.delete(listener);
}

/**
 * Trigger an accessible confirmation modal.
 * @param {Object} options
 * @param {string} [options.title='Conferma operazione'] - Dialog title
 * @param {string} options.message - Descriptive explanation of consequences
 * @param {string} [options.confirmText='Conferma'] - Label for action button
 * @param {string} [options.cancelText='Annulla'] - Label for cancel button
 * @param {boolean} [options.isDanger=false] - If true, highlights destructive action in danger red
 * @param {Function} [options.onConfirm] - Callback executed on confirm
 * @param {Function} [options.onCancel] - Callback executed on cancel
 * @returns {Promise<boolean>} Resolves to true on confirm, false on cancel/dismiss
 */
export function showConfirm({
  title = 'Conferma operazione',
  message = 'Sei sicuro di voler procedere?',
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  isDanger = false,
  onConfirm,
  onCancel
} = {}) {
  return new Promise((resolve) => {
    if (confirmListeners.size > 0) {
      const modalPayload = {
        title,
        message,
        confirmText,
        cancelText,
        isDanger,
        onConfirm: async () => {
          if (onConfirm) await onConfirm();
          resolve(true);
        },
        onCancel: () => {
          if (onCancel) onCancel();
          resolve(false);
        }
      };
      confirmListeners.forEach((listener) => listener(modalPayload));
    } else {
      // Test environment / unmounted fallback:
      const ok = typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(message)
        : true;
      if (ok) {
        if (onConfirm) onConfirm();
        resolve(true);
      } else {
        if (onCancel) onCancel();
        resolve(false);
      }
    }
  });
}
```

### 3.2 Component Specification: `src/components/ConfirmModal.js`

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { subscribeConfirm } from '../utils/feedback';

export default function ConfirmModal() {
  const [modalData, setModalData] = useState(null);
  const cancelBtnRef = useRef(null);
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeConfirm((payload) => {
      setModalData(payload);
    });
    return () => unsubscribe();
  }, []);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!modalData) return;

    // Lock background scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus default button (focus Cancel for danger actions to prevent accidental deletion)
    const timer = setTimeout(() => {
      if (modalData.isDanger && cancelBtnRef.current) {
        cancelBtnRef.current.focus();
      } else if (confirmBtnRef.current) {
        confirmBtnRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
      // Simple focus trap
      if (e.key === 'Tab') {
        const focusable = [cancelBtnRef.current, confirmBtnRef.current].filter(Boolean);
        if (focusable.length < 2) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalData]);

  if (!modalData) return null;

  const handleConfirm = () => {
    const cb = modalData.onConfirm;
    setModalData(null);
    if (cb) cb();
  };

  const handleCancel = () => {
    const cb = modalData.onCancel;
    setModalData(null);
    if (cb) cb();
  };

  return (
    <div
      className="confirm-modal-backdrop"
      onClick={handleCancel}
      role="presentation"
    >
      <div
        className="confirm-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-modal-header">
          <div className={`confirm-icon-badge ${modalData.isDanger ? 'badge-danger' : 'badge-primary'}`}>
            <i className={modalData.isDanger ? 'fas fa-exclamation-triangle' : 'fas fa-question-circle'}></i>
          </div>
          <h3 id="confirm-modal-title" className="confirm-modal-title">
            {modalData.title}
          </h3>
          <button
            type="button"
            className="confirm-modal-close"
            onClick={handleCancel}
            aria-label="Chiudi finestra modale"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="confirm-modal-body">
          <p id="confirm-modal-desc" className="confirm-modal-message">
            {modalData.message}
          </p>
        </div>

        <div className="confirm-modal-footer">
          <button
            type="button"
            ref={cancelBtnRef}
            className="btn-secondary"
            onClick={handleCancel}
          >
            {modalData.cancelText || 'Annulla'}
          </button>
          <button
            type="button"
            ref={confirmBtnRef}
            className={modalData.isDanger ? 'btn-danger' : 'btn-primary'}
            onClick={handleConfirm}
          >
            {modalData.confirmText || 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3.3 Visual Design & CSS Tokens

```css
/* Modal Backdrop Overlay */
.confirm-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 99998;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: modalBackdropFadeIn 0.2s ease-out forwards;
}

@keyframes modalBackdropFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Modal Dialog Card */
.confirm-modal-card {
  width: 100%;
  max-width: 440px;
  background: var(--bg-card);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: 24px;
  position: relative;
  animation: modalScaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes modalScaleUp {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.confirm-modal-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.confirm-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
}

.badge-danger {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-danger);
}

.badge-primary {
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-primary);
}

.confirm-modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-main);
  flex: 1;
}

.confirm-modal-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-xs);
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-modal-close:hover {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.08);
}

.confirm-modal-body {
  margin-bottom: 24px;
}

.confirm-modal-message {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.confirm-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.confirm-modal-footer button {
  width: auto;
  min-width: 100px;
  padding: 10px 18px;
  font-size: 0.92rem;
}

/* Danger Button Style */
.btn-danger {
  background: var(--color-danger);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.15s ease;
}

.btn-danger:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}
```

---

## 4. Modern Household Status Component

### 4.1 Retiring Legacy Mascots & Fixing Leaks

| Component | Current Issue / Violation | Modern Replacement Strategy |
|---|---|---|
| `InteractiveMascot.js` | 135px cartoon eye-tracking blob with dragging physics and window pointer capture. Irrelevant to house management. | Replaced in Auth views (`homeAutenticazione`, `viewLogin`, `viewRegistrazione`) and `SceltaCasa` with sleek household branding and security badge. |
| `MiniGuy.js` | 44-frame canvas animation (Monkey Island Guybrush) using recursive `setTimeout` and hardcoded Unicode emoji (`🏴‍☠️` in title). | Replaced in `homeUtente.js` dashboard with `HouseholdStatus.js` presence widget. |
| `Celebration.js` | Appends raw `<canvas>` to `document.body` with `requestAnimationFrame` loop, causing memory leaks in long sessions and tests. | Replaced by safe, declarative `showToast(..., 'success')` feedback and clean CSS transitions. Leaking canvas loop eliminated. |

### 4.2 Component Specification: `src/components/HouseholdStatus.js`

`HouseholdStatus.js` is a 100% declarative, memory-safe component that provides an immediate, unified status overview of the user's active household. It features:
1. **Household Identity Badge**: Displays the household name with a clean vector icon (`fas fa-home`) and an active verification chip (`fas fa-check-shield`).
2. **Roommate Presence Counter**: Displays the number of active roommates (`fas fa-users`) linked to the household.
3. **Upcoming Chore Indicator**: Displays the next scheduled cleaning duty (`fas fa-broom`), assignee, and formatted relative date.
4. **One-Click Invite Code Badge**: Displays the unique join code (`casa.codiceUnivoco`), formatted copy button (`far fa-copy`), instant visual feedback (`fas fa-check` "Copiato!"), and dispatches a non-blocking toast confirmation.
5. **Zero Emoticons/Emojis**: All iconography utilizes vector FontAwesome classes.
6. **Zero Memory Leaks**: No canvas creation, no recursive timers, no DOM mutation outside the React tree.

```jsx
import React, { useState } from 'react';
import { showToast } from '../utils/feedback';

/**
 * Modern Household Status & Presence Component
 * @param {Object} props
 * @param {Object} props.casa - Household entity { id, nome, codiceUnivoco }
 * @param {number} props.roommateCount - Number of registered household roommates
 * @param {Object} [props.prossimoTurno] - Next chore item { mansione, data, utenteNome }
 * @param {'full'|'compact'} [props.variant='full'] - Layout variant
 */
export default function HouseholdStatus({
  casa,
  roommateCount = 1,
  prossimoTurno = null,
  variant = 'full'
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!casa?.codiceUnivoco) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(casa.codiceUnivoco);
      }
      setCopied(true);
      showToast('Codice invito copiato negli appunti!', 'success', 2500);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast("Impossibile copiare il codice negli appunti.", "warning");
    }
  };

  const formattedDate = prossimoTurno?.data
    ? new Date(prossimoTurno.data).toLocaleDateString('it-IT', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      })
    : null;

  if (variant === 'compact') {
    return (
      <div className="household-status-compact">
        <div className="status-compact-brand">
          <i className="fas fa-home"></i>
          <span>{casa?.nome || 'La tua Casa'}</span>
        </div>
        <div className="status-compact-badge" onClick={handleCopyCode} title="Copia codice invito">
          <i className={copied ? 'fas fa-check' : 'far fa-copy'}></i>
          <span>{copied ? 'Copiato' : casa?.codiceUnivoco}</span>
        </div>
      </div>
    );
  }

  return (
    <section className="household-status-card" aria-label="Stato Abitazione">
      {/* Top Row: Household Identity & Protection Seal */}
      <div className="household-status-header">
        <div className="household-identity">
          <div className="household-icon-wrap">
            <i className="fas fa-home"></i>
          </div>
          <div>
            <h2 className="household-name">{casa?.nome || 'La tua Casa'}</h2>
            <div className="household-security-tag">
              <i className="fas fa-shield-alt"></i>
              <span>Spazio Condiviso Protetto</span>
            </div>
          </div>
        </div>

        {/* Invite Code Badge with One-Click Copy */}
        <button
          type="button"
          className={`invite-code-card-btn ${copied ? 'is-copied' : ''}`}
          onClick={handleCopyCode}
          title="Clicca per copiare il codice invito per i tuoi coinquilini"
          aria-label={`Codice invito ${casa?.codiceUnivoco || ''}. Clicca per copiare.`}
        >
          <div className="invite-label">
            <span>Codice Invito</span>
            {copied && <span className="copy-feedback"><i className="fas fa-check"></i> Copiato!</span>}
          </div>
          <div className="invite-code-val">
            <code>{casa?.codiceUnivoco || '------'}</code>
            <i className={copied ? 'fas fa-check' : 'far fa-copy'}></i>
          </div>
        </button>
      </div>

      {/* Grid: Roommates Count & Upcoming Chore Status */}
      <div className="household-status-grid">
        {/* Metric 1: Roommates count */}
        <div className="household-metric-box">
          <div className="metric-icon-wrap icon-roommates">
            <i className="fas fa-users"></i>
          </div>
          <div className="metric-info">
            <span className="metric-label">Coinquilini Attivi</span>
            <span className="metric-val">
              {roommateCount} {roommateCount === 1 ? 'membro' : 'membri'}
            </span>
          </div>
        </div>

        {/* Metric 2: Next Chore */}
        <div className="household-metric-box">
          <div className="metric-icon-wrap icon-chore">
            <i className="fas fa-broom"></i>
          </div>
          <div className="metric-info">
            <span className="metric-label">Prossimo Turno</span>
            {prossimoTurno ? (
              <span className="metric-val">
                {prossimoTurno.mansione || 'Pulizia'} ({formattedDate})
              </span>
            ) : (
              <span className="metric-val-empty">
                <i className="fas fa-check-circle"></i> Tutto in ordine
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
```

### 4.3 Visual Styling & Layout Tokens

```css
/* Modern Household Status Card */
.household-status-card {
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-subtle);
  transition: border-color var(--transition);
}

.household-status-card:hover {
  border-color: var(--border-highlight);
}

.household-status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 20px;
}

.household-identity {
  display: flex;
  align-items: center;
  gap: 14px;
}

.household-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.3rem;
  box-shadow: var(--shadow-glow);
}

.household-name {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.02em;
}

.household-security-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 0.78rem;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}

/* One-Click Copy Badge */
.invite-code-card-btn {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 10px 16px;
  cursor: pointer;
  text-align: left;
  transition: all var(--transition);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.invite-code-card-btn:hover {
  border-color: var(--color-accent);
  background: rgba(20, 184, 166, 0.08);
}

.invite-code-card-btn.is-copied {
  border-color: var(--color-success);
  background: rgba(16, 185, 129, 0.1);
}

.invite-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.copy-feedback {
  color: var(--color-success);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
}

.invite-code-val {
  display: flex;
  align-items: center;
  gap: 10px;
}

.invite-code-val code {
  font-family: 'Lexend', monospace;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: var(--color-accent);
}

.invite-code-val i {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

/* Status Grid (Roommates & Chores) */
.household-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.household-metric-box {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.metric-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
}

.icon-roommates {
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-primary);
}

.icon-chore {
  background: rgba(245, 158, 11, 0.15);
  color: var(--color-warning);
}

.metric-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.metric-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.metric-val {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-val-empty {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-success);
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 680px) {
  .household-status-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .invite-code-card-btn {
    width: 100%;
  }
}
```

---

## 5. Comprehensive Audit & Migration Plan: Replacing `alert()` and `confirm()`

### 5.1 Complete Mapping of Native `alert()` Calls

Every instance of `alert()` across the codebase is identified below with its exact location, target toast type, and modernized copy guaranteeing zero emojis:

| File | Line | Current Alert Code | Modernized Replacement | Type | Notes |
|---|---|---|---|---|---|
| `src/pages/SceltaCasa.js` | 52 | `alert(\`Casa creata con successo! Il tuo codice invito è: ${codice}\`);` | `showToast(\`Casa creata con successo! Codice invito: ${codice}\`, 'success', 5000);` | `success` | Displays toast during navigation to `/home` |
| `src/pages/SceltaCasa.js` | 92 | `alert(\`Benvenuto in ${casaDoc.data().nome}! 🎉\`);` | `showToast(\`Benvenuto in ${casaDoc.data().nome}!\`, 'success', 4000);` | `success` | Strict R2 compliance: eliminates emoji `🎉` |
| `src/pages/homeUtente.js` | 117 | `alert("Errore durante l'uscita.");` | `showToast("Errore durante l'uscita dall'abitazione. Riprova.", 'error');` | `error` | Failure in `lasciaCasa` |
| `src/pages/TurniPulizia/viewTurni.js` | 51 | `alert("Operazione non autorizzata: turno non appartenente alla tua abitazione.");` | `showToast("Operazione non autorizzata: il turno appartiene a un'altra abitazione.", 'warning');` | `warning` | Multi-tenant security violation |
| `src/pages/TurniPulizia/viewTurni.js` | 61 | `alert("Errore nell'eliminazione del turno.");` | `showToast("Errore durante l'eliminazione del turno.", 'error');` | `error` | Deletion error |
| `src/pages/TurniPulizia/modificaTurno.js` | 43 | `alert("Turno non trovato o precedentemente rimosso.");` | `showToast("Turno non trovato o precedentemente rimosso.", 'error');` | `error` | Followed by `navigate("/turni")` |
| `src/pages/TurniPulizia/modificaTurno.js` | 52 | `alert("Accesso non consentito: questo turno appartiene a un'altra abitazione.");` | `showToast("Accesso non consentito: questo turno appartiene a un'altra abitazione.", 'warning');` | `warning` | Followed by `navigate("/turni")` |
| `src/pages/Debiti/ViewDebiti.js` | 90 | `alert("Operazione non autorizzata: debito non appartenente alla tua abitazione.");` | `showToast("Operazione non autorizzata: spesa appartenente a un'altra abitazione.", 'warning');` | `warning` | Multi-tenant security check |
| `src/pages/Debiti/ViewDebiti.js` | 106 | `alert("Errore nell'eliminazione.");` | `showToast("Errore durante l'aggiornamento della spesa.", 'error');` | `error` | Error handler |
| `src/pages/Bacheca/ViewBacheca.js` | 67 | `alert("Operazione non autorizzata: avviso non appartenente alla tua abitazione.");` | `showToast("Operazione non autorizzata: avviso di un'altra abitazione.", 'warning');` | `warning` | Multi-tenant check |
| `src/pages/Bacheca/ViewBacheca.js` | 72 | `alert("Puoi eliminare solo i tuoi avvisi!");` | `showToast("Permesso negato: puoi eliminare solo i tuoi avvisi.", 'warning');` | `warning` | Authorization check |
| `src/pages/Bacheca/ViewBacheca.js` | 82 | `alert("Errore durante l'eliminazione.");` | `showToast("Errore durante l'eliminazione dell'avviso.", 'error');` | `error` | Delete error |
| `src/pages/Bacheca/ModificaNota.js` | 27 | `alert("Avviso non trovato o rimosso.");` | `showToast("Avviso non trovato o rimosso.", 'error');` | `error` | Followed by `navigate("/bacheca")` |
| `src/pages/Bacheca/ModificaNota.js` | 36 | `alert("Accesso non consentito: questo avviso appartiene a un'altra abitazione.");` | `showToast("Accesso non consentito: avviso appartenente a un'altra abitazione.", 'warning');` | `warning` | Followed by `navigate("/bacheca")` |
| `src/pages/Bacheca/ModificaNota.js` | 43 | `alert("Non sei l'autore di questo avviso!");` | `showToast("Permesso negato: solo l'autore può modificare questo avviso.", 'warning');` | `warning` | Followed by `navigate("/bacheca")` |

### 5.2 Complete Mapping of Native `window.confirm()` Calls

All 5 instances of `window.confirm()` are replaced by asynchronous `showConfirm(...)`:

#### 1. Departure from Household (`homeUtente.js:109`)
- **Current:**
  ```javascript
  if (!window.confirm("Sei sicuro di voler uscire da questa casa?")) return;
  ```
- **Modernized:**
  ```javascript
  const confirmed = await showConfirm({
    title: "Lascia Abitazione",
    message: "Sei sicuro di voler uscire da questa casa? Perderai l'accesso a turni, spese e bacheca condivisa fino a un nuovo invito.",
    confirmText: "Lascia Casa",
    cancelText: "Annulla",
    isDanger: true
  });
  if (!confirmed) return;
  ```

#### 2. Chore Shift Deletion (`viewTurni.js:55`)
- **Current:**
  ```javascript
  if (!window.confirm("Sei sicuro di voler eliminare questo turno?")) return;
  ```
- **Modernized:**
  ```javascript
  const confirmed = await showConfirm({
    title: "Elimina Turno di Pulizia",
    message: "Sei sicuro di voler eliminare questo turno? L'operazione non può essere annullata.",
    confirmText: "Elimina Turno",
    cancelText: "Annulla",
    isDanger: true
  });
  if (!confirmed) return;
  ```

#### 3. Expense Deletion (`ViewDebiti.js:95`)
- **Current:**
  ```javascript
  if (!window.confirm("Sei sicuro di voler eliminare questa spesa?")) return;
  ```
- **Modernized:**
  ```javascript
  const confirmed = await showConfirm({
    title: "Elimina Spesa",
    message: "Sei sicuro di voler eliminare definitivamente questa spesa condivisa?",
    confirmText: "Elimina Spesa",
    cancelText: "Annulla",
    isDanger: true
  });
  if (!confirmed) return;
  ```

#### 4. Debt Settlement (`ViewDebiti.js:97`)
- **Current:**
  ```javascript
  if (!window.confirm("Confermi di aver saldato questo importo?")) return;
  ```
- **Modernized:**
  ```javascript
  const confirmed = await showConfirm({
    title: "Conferma Saldo Debito",
    message: "Confermi che l'importo è stato interamente saldato tra coinquilini?",
    confirmText: "Salda Importo",
    cancelText: "Annulla",
    isDanger: false
  });
  if (!confirmed) return;
  ```

#### 5. Note Deletion (`ViewBacheca.js:76`)
- **Current:**
  ```javascript
  if (!window.confirm("Sicuro di voler eliminare questa nota?")) return;
  ```
- **Modernized:**
  ```javascript
  const confirmed = await showConfirm({
    title: "Elimina Avviso",
    message: "Sei sicuro di voler eliminare questo avviso dalla bacheca comune?",
    confirmText: "Elimina",
    cancelText: "Annulla",
    isDanger: true
  });
  if (!confirmed) return;
  ```

---

## 6. Layout Integration in `src/App.js` & Test Harness

### 6.1 Mounting in `App.js`

In `src/App.js`, `<ToastContainer />` and `<ConfirmModal />` must be mounted inside the root `<ThemeProvider>`:

```jsx
// src/App.js additions
import ToastContainer from "./components/Toast";
import ConfirmModal from "./components/ConfirmModal";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <ScrollProgressBar />
          <BackgroundSlideshow />
          <ToastContainer />
          <ConfirmModal />
          <div className="app-container">
            <AppHeader />
            <Routes>
              {/* All application routes */}
            </Routes>
            <AppFooter />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

### 6.2 Test Harness Compatibility (`src/test/testUtils.jsx`)

To ensure tests can either verify modern modals or use existing `window.confirm` / `window.alert` mocks without breakage:
1. `src/utils/feedback.js` checks whether any modal/toast listener is registered. If none is registered (e.g., in unit tests rendering subcomponents directly), it safely calls `window.alert` / `window.confirm`.
2. When testing UI modals directly, `Wrapper` in `testUtils.jsx` can mount `<ToastContainer />` and `<ConfirmModal />`, enabling `@testing-library/react` queries such as `screen.findByRole('dialog')` and `screen.findByText('Elimina Turno')`.

---

## 7. Verification Plan & Test Matrix

| Area | Test Case | Expected Behavior |
|---|---|---|
| **Toast System** | Call `showToast('Test info', 'info')` | Renders `.toast-info` with `fas fa-info-circle`, auto-dismisses after duration. |
| **Toast Types** | `success`, `error`, `warning`, `info` | Distinct border colors, icons, and accessible roles (`alert` vs `status`). |
| **Toast Stack** | Rapid fire 6 toasts | Oldest toast is evicted; at most 5 toasts visible simultaneously. |
| **Confirm Modal** | `await showConfirm({ title: 'T', message: 'M', isDanger: true })` | Displays modal backdrop with blur, locks body scroll, focuses cancel button. Resolves to `true` on confirm click, `false` on cancel/escape. |
| **Confirm Modal Esc** | Press `Escape` key | Dialog closes immediately, resolves promise to `false`, restores body scroll. |
| **Household Status** | Render `HouseholdStatus` with house & chore data | Displays house name, roommate count, upcoming chore, invite code. Zero emojis. |
| **One-Click Copy** | Click invite code badge | Copies code to clipboard, shows "Copiato!" state, triggers success toast. |
| **Emoji Scan** | Run `scripts/verify-zero-emojis.js` on new components | 0 emojis detected in `Toast.js`, `ConfirmModal.js`, `HouseholdStatus.js`, `feedback.js`. |
| **Leak Verification** | Check timer/canvas cleanup on unmount | Zero recursive `setTimeout` loops; zero appended `<canvas>` elements. |
