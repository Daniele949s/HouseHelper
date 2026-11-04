/**
 * src/utils/feedback.js
 * Central emitter bus for in-app toasts and accessible confirmation modals.
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
    toastListeners.forEach((listener) => {
      try {
        listener(toastItem);
      } catch (err) {
        console.error("Error invoking toast listener:", err);
      }
    });
  } else {
    // Headless / isolated test fallback:
    // If running in Jest without a mounted ToastContainer, fall back to window.alert
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

// Confirmation Modal Bus
const confirmListeners = new Set();
let activeConfirmCancel = null;

export function subscribeConfirm(listener) {
  confirmListeners.add(listener);
  return () => confirmListeners.delete(listener);
}

/**
 * Trigger an accessible confirmation modal.
 * @param {Object} options
 * @param {string} [options.title='Conferma operazione'] - Dialog title
 * @param {string} [options.message='Sei sicuro di voler procedere?'] - Descriptive explanation of consequences
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
  // If a previous modal is still active, safely resolve it to false
  if (activeConfirmCancel) {
    try {
      activeConfirmCancel();
    } catch (err) {
      console.error("Error cancelling superseded confirm modal:", err);
    }
    activeConfirmCancel = null;
  }

  return new Promise((resolve) => {
    let isSettled = false;
    let confirmCalled = false;
    let cancelCalled = false;

    const settle = (val) => {
      if (isSettled) return;
      isSettled = true;
      if (activeConfirmCancel === handleCancelCall) {
        activeConfirmCancel = null;
      }
      resolve(val);
    };

    const handleCancelCall = () => {
      if (confirmCalled || isSettled) return;
      if (activeConfirmCancel === handleCancelCall) {
        activeConfirmCancel = null;
      }
      try {
        if (onCancel && !cancelCalled) {
          cancelCalled = true;
          const ret = onCancel();
          if (ret && typeof ret.catch === 'function') {
            ret.catch((err) => console.error("Error in async onCancel handler:", err));
          }
        }
      } catch (err) {
        console.error("Error in onCancel handler:", err);
      } finally {
        settle(false);
      }
    };

    const handleConfirmCall = async () => {
      if (cancelCalled || isSettled) return;
      confirmCalled = true;
      if (activeConfirmCancel === handleCancelCall) {
        activeConfirmCancel = null;
      }
      try {
        if (onConfirm) {
          await onConfirm();
        }
      } catch (err) {
        console.error("Error in onConfirm handler:", err);
      } finally {
        settle(true);
      }
    };

    activeConfirmCancel = handleCancelCall;

    if (confirmListeners.size > 0) {
      const modalPayload = {
        title,
        message,
        confirmText,
        cancelText,
        isDanger,
        onConfirm: handleConfirmCall,
        onCancel: handleCancelCall
      };
      confirmListeners.forEach((listener) => {
        try {
          listener(modalPayload);
        } catch (err) {
          console.error("Error invoking confirm listener:", err);
        }
      });
    } else {
      // Test environment / unmounted fallback:
      const ok = typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(message)
        : true;
      if (ok) {
        handleConfirmCall();
      } else {
        handleCancelCall();
      }
    }
  });
}
