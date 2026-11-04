import React, { useState, useEffect, useCallback } from "react";
import { subscribeToast } from "../utils/feedback";

const TYPE_ICONS = {
  success: "fas fa-check-circle",
  error: "fas fa-times-circle",
  warning: "fas fa-exclamation-triangle",
  info: "fas fa-info-circle"
};

export function ToastItem({ toast, onDismiss }) {
  const { id, message, type = "info", duration = 3500 } = toast;
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onDismiss, 250);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss, isPaused]);

  const handleManualClose = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 250);
  };

  return (
    <div
      id={`toast-${id}`}
      className={`toast-item toast-${type} ${isExiting ? "toast-exit" : "toast-enter"}`}
      role={type === "error" ? "alert" : "status"}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="toast-icon-wrap">
        <i className={TYPE_ICONS[type] || TYPE_ICONS.info} aria-hidden="true"></i>
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
        <i className="fas fa-times" aria-hidden="true"></i>
      </button>
      <div
        className="toast-progress-bar"
        style={{
          animationDuration: `${duration}ms`,
          animationPlayState: isPaused ? "paused" : "running"
        }}
      />
    </div>
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToast((newToast) => {
      setToasts((prev) => {
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
