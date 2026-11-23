import React, { useState, useEffect, useRef, useCallback } from "react";
import { subscribeConfirm } from "../utils/feedback";
import { useLanguage } from "../contexts/LanguageContext";

const openDialogs = [];
const focusableSelector = [
  "a[href]", "button", "input:not([type='hidden'])", "select", "textarea",
  "summary", "[contenteditable='true']", "[tabindex]",
].join(", ");

function getTabStops(dialog) {
  const view = dialog.ownerDocument.defaultView;
  return Array.from(dialog.querySelectorAll(focusableSelector))
    .filter((element) => {
      if (
        element.tabIndex < 0 ||
        element.matches(":disabled") ||
        element.closest("[hidden], [inert], [aria-hidden='true']")
      ) return false;

      if (view.getComputedStyle(element).visibility !== "visible") return false;

      for (let parent = element; parent; parent = parent.parentElement) {
        if (view.getComputedStyle(parent).display === "none") return false;
      }
      return true;
    })
    .sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity));
}

// Give the dialog tabIndex={-1} so it can receive focus when it has no tab stops.
export function useModalFocusTrap(isOpen, modalRef, onClose) {
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = modalRef.current;
    if (!isOpen || !dialog) return;

    const { ownerDocument } = dialog;
    const view = ownerDocument.defaultView;
    const entry = { previousFocus: ownerDocument.activeElement };
    openDialogs.push(entry);

    const tabStops = getTabStops(dialog);
    const initialFocus = tabStops.find((element) => element.hasAttribute("data-modal-initial-focus"));
    (initialFocus || tabStops[0] || dialog).focus({ preventScroll: true });

    const handleKeyDown = (event) => {
      if (openDialogs[openDialogs.length - 1] !== entry || event.defaultPrevented) return;

      if (event.key === "Escape" && closeRef.current) {
        event.preventDefault();
        closeRef.current();
      }

      if (event.key === "Tab") {
        const stops = getTabStops(dialog);
        const activeIndex = stops.indexOf(ownerDocument.activeElement);
        const atBoundary = event.shiftKey ? activeIndex === 0 : activeIndex === stops.length - 1;
        if (activeIndex === -1 || atBoundary) {
          event.preventDefault();
          (stops[event.shiftKey ? stops.length - 1 : 0] || dialog).focus();
        }
      }
    };

    view.addEventListener("keydown", handleKeyDown);
    return () => {
      view.removeEventListener("keydown", handleKeyDown);
      const index = openDialogs.indexOf(entry);
      const nextDialog = openDialogs[index + 1];
      openDialogs.splice(index, 1);
      if (nextDialog) {
        if (dialog.contains(nextDialog.previousFocus)) nextDialog.previousFocus = entry.previousFocus;
      } else if (entry.previousFocus?.isConnected) {
        entry.previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isOpen, modalRef]);
}

export default function ConfirmModal() {
  const { t } = useLanguage();
  const [modalData, setModalData] = useState(null);
  const modalDataRef = useRef(null);
  const modalRef = useRef(null);
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

  const isOpen = Boolean(modalData);
  useModalFocusTrap(isOpen, modalRef, handleCancel);

  // A new confirmation can replace the current one while the dialog stays open.
  useEffect(() => {
    if (modalData) {
      modalRef.current?.querySelector("[data-modal-initial-focus]")?.focus({ preventScroll: true });
    }
  }, [modalData]);

  useEffect(() => {
    if (!isOpen) return;

    const { style } = document.body;
    const originalOverflow = style.overflow;
    style.overflow = "hidden";
    return () => {
      style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!modalData) return null;

  return (
    <div
      className="confirm-modal-backdrop"
      onClick={handleCancel}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="confirm-modal-card"
        tabIndex={-1}
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
            {modalData.title || t("common.confirmOperation", {}, "Conferma operazione")}
          </h3>
          <button
            type="button"
            className="confirm-modal-close"
            tabIndex={-1}
            onClick={handleCancel}
            aria-label={t("common.closeModal", {}, "Chiudi finestra modale")}
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
            data-modal-initial-focus={modalData.isDanger ? "" : undefined}
            className="btn-secondary"
            onClick={handleCancel}
          >
            {modalData.cancelText || t("common.cancel", {}, "Annulla")}
          </button>
          <button
            type="button"
            data-modal-initial-focus={modalData.isDanger ? undefined : ""}
            className={modalData.isDanger ? "btn-danger" : "btn-primary"}
            onClick={handleConfirm}
          >
            {modalData.confirmText || t("common.confirm", {}, "Conferma")}
          </button>
        </div>
      </div>
    </div>
  );
}
