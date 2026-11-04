import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import ConfirmModal from "../../components/ConfirmModal";
import { showConfirm, subscribeConfirm } from "../../utils/feedback";

describe("Milestone 4 Challenger: Concurrency Stress & Exception Edge Cases", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("BUG-CHECK: async onConfirm in-flight must NOT be corrupted to false by a subsequent showConfirm", async () => {
    render(<ConfirmModal />);

    let p1Completed = false;
    let p1Result = null;

    let resolveAsyncWork;
    const asyncWork = new Promise((resolve) => {
      resolveAsyncWork = resolve;
    });

    let p1;
    act(() => {
      p1 = showConfirm({
        title: "Delete Critical Resource",
        message: "Are you sure?",
        onConfirm: async () => {
          await asyncWork;
        }
      });
    });

    p1.then((val) => {
      p1Completed = true;
      p1Result = val;
    });

    // User clicks Confirm on Modal 1
    const confirmBtn = screen.getByRole("button", { name: "Conferma" });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    // At this moment, Modal 1 has been confirmed by the user.
    // However, onConfirm is still awaiting asyncWork.
    // Now an asynchronous event or secondary action triggers showConfirm:
    let p2;
    act(() => {
      p2 = showConfirm({
        title: "Secondary Notice",
        message: "Do you want to continue?"
      });
    });

    // Complete the asyncWork
    await act(async () => {
      resolveAsyncWork();
      await asyncWork;
    });

    const res1 = await p1;
    // CRITICAL INVARIANT: The user confirmed Modal 1! It MUST resolve to true, NOT false!
    expect(res1).toBe(true);
  });

  test("BUG-CHECK: nested confirmation dialog inside onConfirm callback", async () => {
    render(<ConfirmModal />);

    let innerResolved = false;
    let outerPromise;

    act(() => {
      outerPromise = showConfirm({
        title: "Step 1: Danger Action",
        message: "Proceed to step 2 confirmation?",
        onConfirm: async () => {
          // Nested confirmation
          const innerPromise = showConfirm({
            title: "Step 2: Are you ABSOLUTELY sure?",
            message: "Final confirmation required"
          });

          // Confirm the inner dialog
          const innerConfirmBtn = screen.getByRole("button", { name: "Conferma" });
          fireEvent.click(innerConfirmBtn);

          const innerRes = await innerPromise;
          if (innerRes) {
            innerResolved = true;
          }
        }
      });
    });

    // Confirm outer dialog
    const outerConfirmBtn = screen.getByRole("button", { name: "Conferma" });
    await act(async () => {
      fireEvent.click(outerConfirmBtn);
    });

    const outerRes = await outerPromise;
    expect(innerResolved).toBe(true);
    expect(outerRes).toBe(true);
  });

  test("concurrency scale: 50 concurrent showConfirm requests resolve first 49 to false and 50th on confirm", async () => {
    render(<ConfirmModal />);

    const promises = [];
    const cancelCalls = [];

    act(() => {
      for (let i = 0; i < 50; i++) {
        const spy = jest.fn();
        cancelCalls.push(spy);
        promises.push(
          showConfirm({
            title: `Scale Modal ${i}`,
            message: `Message ${i}`,
            onCancel: spy
          })
        );
      }
    });

    // Check dialog shows latest modal
    expect(screen.getByText("Scale Modal 49")).toBeInTheDocument();

    // First 49 must resolve to false
    const first49Results = await Promise.all(promises.slice(0, 49));
    for (let i = 0; i < 49; i++) {
      expect(first49Results[i]).toBe(false);
      expect(cancelCalls[i]).toHaveBeenCalledTimes(1);
    }

    // Confirm the 50th modal
    const confirmBtn = screen.getByRole("button", { name: "Conferma" });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    const res50 = await promises[49];
    expect(res50).toBe(true);
    expect(cancelCalls[49]).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("rapid double-click during sync and async transitions does not double-execute", async () => {
    render(<ConfirmModal />);

    const onConfirmSpy = jest.fn(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    let p;
    act(() => {
      p = showConfirm({
        title: "Throttle Test",
        onConfirm: onConfirmSpy
      });
    });

    const confirmBtn = screen.getByRole("button", { name: "Conferma" });
    await act(async () => {
      fireEvent.click(confirmBtn);
      fireEvent.click(confirmBtn);
      fireEvent.click(confirmBtn);
    });

    const res = await p;
    expect(res).toBe(true);
    expect(onConfirmSpy).toHaveBeenCalledTimes(1);
  });
});
