import React, { useState, useEffect, useRef, useCallback } from "react";
import { subscribeConfirm } from "../utils/feedback";

export default function ConfirmModal() {
  const [modalData, setModalData] = useState(null);
  const modalDataRef = useRef(null);
  const cancelBtnRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const confirmingModalsRef = useRef(new Set());
  const isConfirmingRef = useRef(false);

  useEffect(() => {
    if (modalData) {
      modalDataRef.current = modalData;
    }
  }, [modalData]);

  const handleCancel = useCallback(() => {
    const current = modalDataRef.current || modalData;
    if (!current) return;
    modalDataRef.current = null;
    setModalData(null);
    if (current.onCancel) {
      try {
        const ret = current.onCancel();
        if (ret && typeof ret.catch === "function") {
          ret.catch((err) => console.error("Error in ConfirmModal handleCancel:", err));
        }
      } catch (err) {
        console.error("Error in ConfirmModal handleCancel:", err);
      }
    }
  }, [modalData]);

  const handleConfirm = useCallback(async () => {
    const current = modalDataRef.current || modalData;
    if (!current || confirmingModalsRef.current.has(current)) return;
    confirmingModalsRef.current.add(current);
    isConfirmingRef.current = true;
    modalDataRef.current = null;
    setModalData(null);
    try {
      if (current.onConfirm) {
        await current.onConfirm();
      }
    } catch (err) {
      console.error("Error in ConfirmModal handleConfirm:", err);
    } finally {
      confirmingModalsRef.current.delete(current);
      isConfirmingRef.current = confirmingModalsRef.current.size > 0;
    }
  }, [modalData]);

  useEffect(() => {
    const confirmingModals = confirmingModalsRef.current;
    const unsubscribe = subscribeConfirm((payload) => {
      modalDataRef.current = payload;
      setModalData((prev) => {
        if (
          prev &&
          prev !== payload &&
          prev.onCancel &&
          !confirmingModals.has(prev)
        ) {
          try {
            const ret = prev.onCancel();
            if (ret && typeof ret.catch === "function") {
              ret.catch((err) =>
                console.error("Error cancelling previous modal in ConfirmModal:", err)
              );
            }
          } catch (err) {
            console.error("Error cancelling previous modal in ConfirmModal:", err);
          }
        }
        return payload;
      });
    });

    return () => {
      unsubscribe();
      if (
        modalDataRef.current &&
        modalDataRef.current.onCancel &&
        !confirmingModals.has(modalDataRef.current)
      ) {
        try {
          const ret = modalDataRef.current.onCancel();
          if (ret && typeof ret.catch === "function") {
            ret.catch((err) => console.error("Error cancelling modal on unmount:", err));
          }
        } catch (err) {
          console.error("Error cancelling modal on unmount:", err);
        }
      }
      modalDataRef.current = null;
      confirmingModals.clear();
      isConfirmingRef.current = false;
    };
  }, []);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!modalData) return;

    // Lock background scroll
    const originalOverflow = document.body ? document.body.style.overflow : "";
    if (document.body) {
      document.body.style.overflow = "hidden";
    }

    // Focus default button (focus Cancel for danger actions to prevent accidental deletion)
    const timer = setTimeout(() => {
      if (modalData.isDanger && cancelBtnRef.current) {
        cancelBtnRef.current.focus();
      } else if (confirmBtnRef.current) {
        confirmBtnRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
      // Focus trap between Cancel and Confirm buttons
      if (e.key === "Tab") {
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

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      if (document.body) {
        document.body.style.overflow = originalOverflow;
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalData, handleCancel]);

  if (!modalData) return null;

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
          <div className={`confirm-icon-badge ${modalData.isDanger ? "badge-danger" : "badge-primary"}`}>
            <i
              className={modalData.isDanger ? "fas fa-exclamation-triangle" : "fas fa-question-circle"}
              aria-hidden="true"
            ></i>
          </div>
          <h3 id="confirm-modal-title" className="confirm-modal-title">
            {modalData.title || "Conferma operazione"}
          </h3>
          <button
            type="button"
            className="confirm-modal-close"
            onClick={handleCancel}
            aria-label="Chiudi finestra modale"
          >
            <i className="fas fa-times" aria-hidden="true"></i>
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
            {modalData.cancelText || "Annulla"}
          </button>
          <button
            type="button"
            ref={confirmBtnRef}
            className={modalData.isDanger ? "btn-danger" : "btn-primary"}
            onClick={handleConfirm}
          >
            {modalData.confirmText || "Conferma"}
          </button>
        </div>
      </div>
    </div>
  );
}
