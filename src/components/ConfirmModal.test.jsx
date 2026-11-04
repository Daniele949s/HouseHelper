import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import ConfirmModal from "./ConfirmModal";
import { showConfirm } from "../utils/feedback";

describe("ConfirmModal Component", () => {
  test("renders null when no confirmation is requested", () => {
    const { container } = render(<ConfirmModal />);
    expect(container.firstChild).toBeNull();
  });

  test("renders modal dialog when showConfirm is invoked", async () => {
    render(<ConfirmModal />);

    let promise;
    act(() => {
      promise = showConfirm({
        title: "Elimina Elemento",
        message: "Vuoi davvero eliminare questo elemento?",
        confirmText: "Elimina",
        cancelText: "Annulla",
        isDanger: true,
      });
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Elimina Elemento")).toBeInTheDocument();
    expect(screen.getByText("Vuoi davvero eliminare questo elemento?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elimina" })).toHaveClass("btn-danger");

    // Click confirm
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Elimina" }));
    });

    const result = await promise;
    expect(result).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("resolves false when cancel button is clicked", async () => {
    render(<ConfirmModal />);

    let promise;
    act(() => {
      promise = showConfirm({
        title: "Annulla Operazione",
        message: "Messaggio di prova",
      });
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Annulla" }));
    });

    const result = await promise;
    expect(result).toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("resolves false and closes modal on Escape key press", async () => {
    render(<ConfirmModal />);

    let promise;
    act(() => {
      promise = showConfirm({
        title: "Test Escape",
        message: "Premere Escape per chiudere",
      });
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    const result = await promise;
    expect(result).toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  describe("Tier 5 Adversarial Coverage Hardening", () => {
    let consoleErrorSpy;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    test("concurrent modal requests: superseding an active modal safely resolves previous promise to false", async () => {
      render(<ConfirmModal />);

      let p1;
      let p2;
      const onCancel1 = jest.fn();
      const onConfirm2 = jest.fn();

      act(() => {
        p1 = showConfirm({
          title: "Modal 1",
          message: "First action",
          onCancel: onCancel1,
        });
      });

      expect(screen.getByText("Modal 1")).toBeInTheDocument();

      act(() => {
        p2 = showConfirm({
          title: "Modal 2",
          message: "Second action",
          onConfirm: onConfirm2,
        });
      });

      // Active dialog shows Modal 2 and replaces Modal 1
      expect(screen.getByText("Modal 2")).toBeInTheDocument();
      expect(screen.queryByText("Modal 1")).toBeNull();

      // p1 must resolve to false immediately without hanging
      const res1 = await p1;
      expect(res1).toBe(false);
      expect(onCancel1).toHaveBeenCalledTimes(1);

      // Confirm Modal 2
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Conferma" }));
      });

      const res2 = await p2;
      expect(res2).toBe(true);
      expect(onConfirm2).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    test("burst of multiple concurrent showConfirm requests resolves all superseded modals to false", async () => {
      render(<ConfirmModal />);

      const promises = [];
      const cancelSpies = [];

      act(() => {
        for (let i = 0; i < 5; i++) {
          const spy = jest.fn();
          cancelSpies.push(spy);
          promises.push(
            showConfirm({
              title: `Burst Modal ${i}`,
              message: `Message ${i}`,
              onCancel: spy,
            })
          );
        }
      });

      // Dialog shows the latest modal
      expect(screen.getByText("Burst Modal 4")).toBeInTheDocument();

      // First 4 modals must have resolved to false
      const settledFirst4 = await Promise.all(promises.slice(0, 4));
      expect(settledFirst4).toEqual([false, false, false, false]);
      for (let i = 0; i < 4; i++) {
        expect(cancelSpies[i]).toHaveBeenCalledTimes(1);
      }

      // Cancel the final active modal
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Annulla" }));
      });

      const resLast = await promises[4];
      expect(resLast).toBe(false);
      expect(cancelSpies[4]).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    test("unmounting ConfirmModal while open safely resolves active promise to false and restores scroll", async () => {
      const { unmount } = render(<ConfirmModal />);

      let promise;
      const onCancel = jest.fn();

      act(() => {
        promise = showConfirm({
          title: "Unmount Modal",
          message: "Will unmount while open",
          onCancel,
        });
      });

      expect(screen.getByText("Unmount Modal")).toBeInTheDocument();
      expect(document.body.style.overflow).toBe("hidden");

      // Unmount unexpectedly while modal is displayed
      act(() => {
        unmount();
      });

      const res = await promise;
      expect(res).toBe(false);
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(document.body.style.overflow).toBe("");
    });

    test("async onConfirm rejection guard: handles rejected promise without leaving modal wedged", async () => {
      render(<ConfirmModal />);

      const rejectedError = new Error("Async network failure during confirmation");
      let promise;

      act(() => {
        promise = showConfirm({
          title: "Async Error Modal",
          message: "This will reject asynchronously",
          onConfirm: async () => {
            throw rejectedError;
          },
        });
      });

      expect(screen.getByText("Async Error Modal")).toBeInTheDocument();

      // Click Confirm button
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Conferma" }));
      });

      // Promise settles to true, modal is closed, error was caught
      const res = await promise;
      expect(res).toBe(true);
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test("synchronous exception in onConfirm is safely caught and modal is closed", async () => {
      render(<ConfirmModal />);

      let promise;
      act(() => {
        promise = showConfirm({
          title: "Sync Error Modal",
          message: "Throws synchronous error",
          onConfirm: () => {
            throw new Error("Synchronous throw inside onConfirm");
          },
        });
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Conferma" }));
      });

      const res = await promise;
      expect(res).toBe(true);
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test("synchronous exception in onCancel is safely caught and modal is closed", async () => {
      render(<ConfirmModal />);

      let promise;
      act(() => {
        promise = showConfirm({
          title: "Cancel Error Modal",
          message: "Throws synchronous error on cancel",
          onCancel: () => {
            throw new Error("Synchronous throw inside onCancel");
          },
        });
      });

      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Annulla" }));
      });

      const res = await promise;
      expect(res).toBe(false);
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test("guards against duplicate executions on rapid double clicks", async () => {
      render(<ConfirmModal />);

      const asyncCallback = jest.fn(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });

      let promise;
      act(() => {
        promise = showConfirm({
          title: "Double Click Modal",
          message: "Testing click throttle",
          onConfirm: asyncCallback,
        });
      });

      const confirmBtn = screen.getByRole("button", { name: "Conferma" });
      await act(async () => {
        fireEvent.click(confirmBtn);
        fireEvent.click(confirmBtn);
      });

      await promise;
      expect(asyncCallback).toHaveBeenCalledTimes(1);
    });
  });
});
