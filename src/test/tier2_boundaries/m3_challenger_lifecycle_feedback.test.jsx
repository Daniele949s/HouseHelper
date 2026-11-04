import React, { createRef } from "react";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import InteractiveMascot from "../../components/InteractiveMascot";
import MiniGuy from "../../components/MiniGuy";
import ToastContainer, { ToastItem } from "../../components/Toast";
import ConfirmModal from "../../components/ConfirmModal";
import {
  showToast,
  toast,
  showConfirm,
  subscribeToast,
  subscribeConfirm
} from "../../utils/feedback";
import { renderWithProviders, mockStore } from "../testUtils";

// Active domain pages
import HomeAutenticazione from "../../pages/Autenticazione/homeAutenticazione";
import ViewLogin from "../../pages/Autenticazione/viewLogin";
import ViewRegistrazione from "../../pages/Autenticazione/viewRegistrazione";
import SceltaCasa from "../../pages/SceltaCasa";
import HomeUtente from "../../pages/homeUtente";

describe("Milestone 3 Challenger 2: Feedback & Lifecycle Cleanliness Suite", () => {
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    mockStore.reset();
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  // =========================================================================
  // 1. MASCOT RETIREMENT & LIFECYCLE CLEANLINESS
  // =========================================================================
  describe("Mascot Retirement & Unmounting Verification", () => {
    test("Auth & Onboarding pages render zero mascots and zero canvas elements", async () => {
      // 1. HomeAutenticazione
      const { container: c1, unmount: u1 } = renderWithProviders(<HomeAutenticazione />, { user: null });
      expect(c1.querySelector(".mascot-widget-wrapper")).toBeNull();
      expect(c1.querySelector(".mini-guy-container")).toBeNull();
      expect(c1.querySelector("canvas")).toBeNull();
      u1();

      // 2. ViewLogin
      const { container: c2, unmount: u2 } = renderWithProviders(<ViewLogin />, { user: null });
      expect(c2.querySelector(".mascot-widget-wrapper")).toBeNull();
      expect(c2.querySelector(".mini-guy-container")).toBeNull();
      expect(c2.querySelector("canvas")).toBeNull();
      u2();

      // 3. ViewRegistrazione
      const { container: c3, unmount: u3 } = renderWithProviders(<ViewRegistrazione />, { user: null });
      expect(c3.querySelector(".mascot-widget-wrapper")).toBeNull();
      expect(c3.querySelector(".mini-guy-container")).toBeNull();
      expect(c3.querySelector("canvas")).toBeNull();
      u3();

      // 4. SceltaCasa
      const { container: c4, unmount: u4 } = renderWithProviders(<SceltaCasa />, {
        user: { uid: "u_onboard", email: "onboard@test.com" },
        userData: { username: "Onboarder", casaId: "" }
      });
      expect(c4.querySelector(".mascot-widget-wrapper")).toBeNull();
      expect(c4.querySelector(".mini-guy-container")).toBeNull();
      expect(c4.querySelector("canvas")).toBeNull();
      u4();
    });

    test("Dashboard (HomeUtente) renders zero canvas elements and zero mascot timers", async () => {
      mockStore.seed("case", [{
        id: "casa_active",
        nome: "Casa Test",
        codiceUnivoco: "CASA12"
      }]);

      const { container, unmount } = renderWithProviders(<HomeUtente />, {
        user: { uid: "u_dash", email: "dash@test.com" },
        userData: { username: "Dasher", casaId: "casa_active" }
      });

      await waitFor(() => {
        expect(container.querySelector(".dashboard-welcome-banner")).toBeInTheDocument();
      });

      // No canvas, no mini-guy, no mascot
      expect(container.querySelector("canvas")).toBeNull();
      expect(container.querySelector(".mini-guy-container")).toBeNull();
      expect(container.querySelector(".mascot-widget-wrapper")).toBeNull();

      unmount();
    });

    test("InteractiveMascot: cleans up window pointermove event listener on unmount", () => {
      const addSpy = jest.spyOn(window, "addEventListener");
      const removeSpy = jest.spyOn(window, "removeEventListener");

      const inputRef = createRef();
      const { unmount } = render(
        <div>
          <input ref={inputRef} />
          <InteractiveMascot targetInputRef={inputRef} isError={false} errorMessage="" />
        </div>
      );

      expect(addSpy).toHaveBeenCalledWith("pointermove", expect.any(Function));

      // Capture registered handler
      const pointerHandler = addSpy.mock.calls.find(call => call[0] === "pointermove")[1];

      // Unmount mascot
      unmount();

      expect(removeSpy).toHaveBeenCalledWith("pointermove", pointerHandler);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    test("MiniGuy: schedules animation timers and cleanly cancels them on unmount", () => {
      jest.useFakeTimers();
      const setTimeoutSpy = jest.spyOn(global, "setTimeout");
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

      const { unmount } = render(<MiniGuy />);

      expect(setTimeoutSpy).toHaveBeenCalled();
      const initialTimerCount = setTimeoutSpy.mock.calls.length;

      // Advance timers by 100ms
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(setTimeoutSpy.mock.calls.length).toBeGreaterThan(initialTimerCount);

      // Unmount MiniGuy
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      // Advancing timer further does NOT trigger any new setTimeout calls
      const callsAfterUnmount = setTimeoutSpy.mock.calls.length;
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(setTimeoutSpy.mock.calls.length).toBe(callsAfterUnmount);

      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
      jest.useRealTimers();
    });
  });

  // =========================================================================
  // 2. STOPCOLOR SVG PROPERTY WARNING SILENCING
  // =========================================================================
  describe("SVG stopColor React DOM Warning Silencing", () => {
    test("InteractiveMascot renders SVG gradients with stopColor attribute without React DOM warnings", () => {
      const inputRef = createRef();

      render(
        <InteractiveMascot
          targetInputRef={inputRef}
          isError={true}
          errorMessage="Errore di test"
        />
      );

      // Assert zero console warnings or errors regarding stop-color or stopColor
      const stopColorWarnings = consoleErrorSpy.mock.calls.filter(call =>
        call.some(arg => typeof arg === "string" && (
          arg.includes("stop-color") ||
          arg.includes("stopColor") ||
          arg.includes("Invalid DOM property")
        ))
      );

      expect(stopColorWarnings).toHaveLength(0);

      // Verify SVG elements exist with linearGradient definitions
      const svgDefs = document.querySelectorAll("defs linearGradient");
      expect(svgDefs.length).toBeGreaterThan(0);

      // Verify all stops inside SVG gradients render without issue
      const allStops = document.querySelectorAll("defs linearGradient stop");
      expect(allStops.length).toBe(8); // exactly 8 stops in InteractiveMascot
    });
  });

  // =========================================================================
  // 3. NON-BLOCKING SHOWTOAST ADVERSARIAL STRESS
  // =========================================================================
  describe("showToast Adversarial Edge Conditions", () => {
    test("handles extreme payload lengths and rapid queuing (50 toasts) capped at 5", () => {
      jest.useFakeTimers();
      const { container } = render(<ToastContainer />);

      // Extremely long message (10,000 chars)
      const hugeMessage = "A".repeat(10000);
      act(() => {
        showToast(hugeMessage, "error", 2000);
      });

      expect(container.querySelector(".toast-message").textContent).toHaveLength(10000);

      // Burst of 50 rapid toasts
      act(() => {
        for (let i = 1; i <= 50; i++) {
          showToast(`Burst message ${i}`, "info", 5000);
        }
      });

      const toasts = container.querySelectorAll(".toast-item");
      expect(toasts.length).toBe(5);
      expect(screen.getByText("Burst message 50")).toBeInTheDocument();
      expect(screen.getByText("Burst message 46")).toBeInTheDocument();
      expect(screen.queryByText("Burst message 45")).toBeNull();

      act(() => {
        jest.runOnlyPendingTimers();
      });
      jest.useRealTimers();
    });

    test("pauses and resumes auto-dismiss progress on mouse hover", () => {
      jest.useFakeTimers();
      const { container } = render(<ToastContainer />);

      act(() => {
        showToast("Hoverable Toast", "warning", 3000);
      });

      const toastItem = container.querySelector(".toast-item");
      expect(toastItem).toBeInTheDocument();

      // Mouse enter: paused
      fireEvent.mouseEnter(toastItem);
      const progressBar = container.querySelector(".toast-progress-bar");
      expect(progressBar.style.animationPlayState).toBe("paused");

      // Advance time past 3000ms: toast should still remain because paused!
      act(() => {
        jest.advanceTimersByTime(4000);
      });
      expect(screen.getByText("Hoverable Toast")).toBeInTheDocument();

      // Mouse leave: resumes
      fireEvent.mouseLeave(toastItem);
      expect(progressBar.style.animationPlayState).toBe("running");

      // Advance remaining time: toast auto-dismisses
      act(() => {
        jest.advanceTimersByTime(3500);
      });
      expect(screen.queryByText("Hoverable Toast")).toBeNull();

      jest.useRealTimers();
    });

    test("manual close button dismisses toast with exit animation transition", () => {
      jest.useFakeTimers();
      const { container } = render(<ToastContainer />);

      act(() => {
        showToast("Manual Dismiss Toast", "info", 10000);
      });

      const closeBtn = screen.getByRole("button", { name: /Chiudi notifica/i });
      fireEvent.click(closeBtn);

      // Verify exit animation class applied
      const toastItem = container.querySelector(".toast-item");
      expect(toastItem).toHaveClass("toast-exit");

      // Advance 250ms transition
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(screen.queryByText("Manual Dismiss Toast")).toBeNull();

      jest.useRealTimers();
    });

    test("handles non-string primitives and rapid repeated clicks on close button", () => {
      jest.useFakeTimers();
      const { container } = render(<ToastContainer />);

      // Number primitive
      act(() => {
        showToast(404, "error", 5000);
      });
      expect(screen.getByText("404")).toBeInTheDocument();

      // Rapid double click on close button
      const closeBtn = screen.getByRole("button", { name: /Chiudi notifica/i });
      fireEvent.click(closeBtn);
      fireEvent.click(closeBtn); // duplicate click during exit transition

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(screen.queryByText("404")).toBeNull();
      jest.useRealTimers();
    });
  });

  // =========================================================================
  // 4. NON-BLOCKING SHOWCONFIRM ADVERSARIAL STRESS
  // =========================================================================
  describe("showConfirm Adversarial Edge Conditions", () => {
    test("handles async onConfirm callback with internal async resolution", async () => {
      render(<ConfirmModal />);

      let asyncFinished = false;
      let confirmPromise;

      act(() => {
        confirmPromise = showConfirm({
          title: "Async Mutation",
          message: "Perform async update",
          onConfirm: async () => {
            await new Promise((r) => setTimeout(r, 10));
            asyncFinished = true;
          }
        });
      });

      const confirmBtn = screen.getByRole("button", { name: "Conferma" });
      fireEvent.click(confirmBtn);

      const result = await confirmPromise;
      expect(result).toBe(true);
      expect(asyncFinished).toBe(true);
    });
    test("danger modal auto-focuses Cancel button to guard against accidental confirmation", async () => {
      jest.useFakeTimers();
      render(<ConfirmModal />);

      act(() => {
        showConfirm({
          title: "Elimina elemento critico",
          message: "Sei sicuro di voler eliminare?",
          confirmText: "Elimina",
          cancelText: "Annulla",
          isDanger: true
        });
      });

      // Advance focus timer (50ms)
      act(() => {
        jest.advanceTimersByTime(60);
      });

      const cancelBtn = screen.getByRole("button", { name: "Annulla" });
      expect(document.activeElement).toBe(cancelBtn);

      jest.useRealTimers();
    });

    test("non-danger modal auto-focuses Confirm button", async () => {
      jest.useFakeTimers();
      render(<ConfirmModal />);

      act(() => {
        showConfirm({
          title: "Azione standard",
          message: "Vuoi procedere?",
          confirmText: "Procedi",
          cancelText: "Annulla",
          isDanger: false
        });
      });

      act(() => {
        jest.advanceTimersByTime(60);
      });

      const confirmBtn = screen.getByRole("button", { name: "Procedi" });
      expect(document.activeElement).toBe(confirmBtn);

      jest.useRealTimers();
    });

    test("tab focus trap cycles strictly between Cancel and Confirm buttons", () => {
      render(<ConfirmModal />);

      act(() => {
        showConfirm({
          title: "Focus Trap Test",
          message: "Testing tab navigation",
          confirmText: "Conferma",
          cancelText: "Annulla"
        });
      });

      const cancelBtn = screen.getByRole("button", { name: "Annulla" });
      const confirmBtn = screen.getByRole("button", { name: "Conferma" });

      // Focus Cancel button
      cancelBtn.focus();
      expect(document.activeElement).toBe(cancelBtn);

      // Shift + Tab from first element (Cancel) -> jumps to last (Confirm)
      fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(confirmBtn);

      // Tab from last element (Confirm) -> jumps back to first (Cancel)
      fireEvent.keyDown(window, { key: "Tab", shiftKey: false });
      expect(document.activeElement).toBe(cancelBtn);
    });

    test("backdrop click dismisses modal without triggering confirmation", async () => {
      render(<ConfirmModal />);

      let resultPromise;
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      act(() => {
        resultPromise = showConfirm({
          title: "Backdrop Click Test",
          message: "Click backdrop to cancel",
          onConfirm,
          onCancel
        });
      });

      const backdrop = document.querySelector(".confirm-modal-backdrop");
      expect(backdrop).toBeInTheDocument();

      // Click card itself does NOT dismiss due to stopPropagation
      const card = document.querySelector(".confirm-modal-card");
      fireEvent.click(card);
      expect(document.querySelector(".confirm-modal-backdrop")).toBeInTheDocument();

      // Click backdrop dismisses modal
      fireEvent.click(backdrop);

      const resolved = await resultPromise;
      expect(resolved).toBe(false);
      expect(onCancel).toHaveBeenCalled();
      expect(onConfirm).not.toHaveBeenCalled();
      expect(document.querySelector(".confirm-modal-backdrop")).toBeNull();
    });

    test("unmounting ConfirmModal cleanly restores document.body.style.overflow", () => {
      const { unmount } = render(<ConfirmModal />);

      expect(document.body.style.overflow).toBe("");

      act(() => {
        showConfirm({
          title: "Scroll Lock Test",
          message: "Modal is open"
        });
      });

      expect(document.body.style.overflow).toBe("hidden");

      // Unmount unexpectedly while modal is open
      unmount();

      // Cleaned up!
      expect(document.body.style.overflow).toBe("");
    });

    test("concurrency challenge: multiple rapid showConfirm calls clobber active modal", async () => {
      render(<ConfirmModal />);

      let p1;
      let p2;

      act(() => {
        p1 = showConfirm({ title: "Modal 1", message: "First action" });
        p2 = showConfirm({ title: "Modal 2", message: "Second action" });
      });

      // Active dialog shows Modal 2
      expect(screen.getByText("Modal 2")).toBeInTheDocument();
      expect(screen.queryByText("Modal 1")).toBeNull();

      // Confirm Modal 2
      const confirmBtn = screen.getByRole("button", { name: "Conferma" });
      fireEvent.click(confirmBtn);

      const res2 = await p2;
      expect(res2).toBe(true);

      // Observe p1: since Modal 1 was superseded by Modal 2, p1 was safely resolved to false (preventing hanging promises)
      let p1Resolved = false;
      let p1Result = null;
      p1.then((val) => {
        p1Resolved = true;
        p1Result = val;
      });

      await new Promise(r => setTimeout(r, 50));
      expect(p1Resolved).toBe(true);
      expect(p1Result).toBe(false);
    });
  });
});
