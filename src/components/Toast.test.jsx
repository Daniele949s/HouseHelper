import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import ToastContainer from "./Toast";
import { showToast, toast } from "../utils/feedback";

describe("Toast Component", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test("renders null when there are no active toasts", () => {
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  test("displays toast when showToast is called", () => {
    render(<ToastContainer />);

    act(() => {
      showToast("Operazione completata con successo", "success");
    });

    expect(screen.getByText("Operazione completata con successo")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass("toast-success");
  });

  test("assigns role alert for error toasts and status for other types", () => {
    render(<ToastContainer />);

    act(() => {
      toast.error("Errore critico di rete");
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();

    act(() => {
      toast.info("Informazione generale");
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  test("dismisses toast when close button is clicked", () => {
    render(<ToastContainer />);

    act(() => {
      showToast("Notifica da chiudere", "info", 10000);
    });

    expect(screen.getByText("Notifica da chiudere")).toBeInTheDocument();

    const closeBtn = screen.getByLabelText("Chiudi notifica");
    fireEvent.click(closeBtn);

    // Fast-forward exit animation delay (250ms)
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.queryByText("Notifica da chiudere")).toBeNull();
  });

  test("auto-dismisses toast after duration", () => {
    render(<ToastContainer />);

    act(() => {
      showToast("Auto dismiss", "info", 2000);
    });

    expect(screen.getByText("Auto dismiss")).toBeInTheDocument();

    // Fast-forward beyond duration + exit animation
    act(() => {
      jest.advanceTimersByTime(2300);
    });

    expect(screen.queryByText("Auto dismiss")).toBeNull();
  });

  test("enforces maximum stack depth of 5 toasts", () => {
    render(<ToastContainer />);

    act(() => {
      for (let i = 1; i <= 7; i++) {
        showToast(`Toast ${i}`, "info", 5000);
      }
    });

    // Oldest two (1, 2) should be evicted
    expect(screen.queryByText("Toast 1")).toBeNull();
    expect(screen.queryByText("Toast 2")).toBeNull();
    // 3, 4, 5, 6, 7 should be present
    expect(screen.getByText("Toast 3")).toBeInTheDocument();
    expect(screen.getByText("Toast 7")).toBeInTheDocument();
  });
});
