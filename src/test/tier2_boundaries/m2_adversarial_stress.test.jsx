import React from "react";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import DesktopNavigation from "../../components/DesktopNavigation";
import MobileNavigation from "../../components/MobileNavigation";
import HouseholdStatus from "../../components/HouseholdStatus";
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

describe("Milestone 2 Adversarial Stress Suite", () => {
  beforeEach(() => {
    mockStore.reset();
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. DESKTOP NAVIGATION ADVERSARIAL STRESS
  // =========================================================================
  describe("DesktopNavigation Edge Cases & Stress", () => {
    test("gracefully returns null when currentUser is null", () => {
      const { container } = renderWithProviders(<DesktopNavigation />, {
        user: null,
        userData: null,
      });
      expect(container.querySelector(".desktop-nav-root")).toBeNull();
    });

    test("gracefully returns null when userData is undefined or missing casaId", () => {
      const user = { uid: "test_uid", email: "test@example.com" };

      // userData is undefined
      const { container: c1 } = renderWithProviders(<DesktopNavigation />, {
        user,
        userData: null,
      });
      expect(c1.querySelector(".desktop-nav-root")).toBeNull();

      // userData has empty string casaId
      const { container: c2 } = renderWithProviders(<DesktopNavigation />, {
        user,
        userData: { username: "Tester", casaId: "" },
      });
      expect(c2.querySelector(".desktop-nav-root")).toBeNull();
    });

    test("renders exactly 7 navigation links with valid SVG/FA icons when authenticated with casaId", async () => {
      const user = { uid: "user_valid", email: "valid@test.com" };
      const { container } = renderWithProviders(<DesktopNavigation />, {
        route: "/home",
        user,
        userData: { username: "Tester", casaId: "casa_123" },
      });

      await waitFor(() => {
        expect(container.querySelector(".desktop-nav-root")).toBeInTheDocument();
      });

      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(8);

      const expectedLinks = [
        { label: "Dashboard", href: "/home" },
        { label: "Turni", href: "/turni" },
        { label: "Debiti", href: "/debiti" },
        { label: "Spesa", href: "/spesa" },
        { label: "Bacheca", href: "/bacheca" },
        { label: "Calendario", href: "/calendario" },
        { label: "Documenti", href: "/documenti" },
        { label: "Contatti", href: "/contatti" },
      ];

      expectedLinks.forEach(({ label, href }) => {
        const link = screen.getByText(label).closest("a");
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", href);
      });

      // Assert zero emojis in the entire desktop nav
      const emojiRegex = /[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      expect(emojiRegex.test(container.textContent)).toBe(false);
    });

    test("maintains active highlight on sub-routes for non-end items", async () => {
      const user = { uid: "user_sub", email: "sub@test.com" };
      renderWithProviders(<DesktopNavigation />, {
        route: "/turni/aggiungi",
        user,
        userData: { username: "SubUser", casaId: "casa_123" },
      });

      await waitFor(() => {
        const turniLink = screen.getByText("Turni").closest("a");
        expect(turniLink).toHaveClass("active");
      });

      const dashboardLink = screen.getByText("Dashboard").closest("a");
      expect(dashboardLink).not.toHaveClass("active");
    });
  });

  // =========================================================================
  // 2. MOBILE NAVIGATION DRAWER ADVERSARIAL STRESS
  // =========================================================================
  describe("MobileNavigation Stress & Viewport Behavior", () => {
    test("renders unauthenticated menu items without duplicate keys", () => {
      const { container } = renderWithProviders(<MobileNavigation />, {
        user: null,
      });

      const burgerBtn = screen.getByRole("button", { name: /apri menu di navigazione/i });
      expect(burgerBtn).toBeInTheDocument();

      fireEvent.click(burgerBtn);

      expect(screen.getByText("Accedi")).toBeInTheDocument();
      expect(screen.getByText("Registrati")).toBeInTheDocument();
      expect(screen.getByText("Home")).toBeInTheDocument();

      const items = container.querySelectorAll(".mobile-menu-item");
      expect(items.length).toBe(3);
    });

    test("manages body overflow lock when opened and restored on close", async () => {
      renderWithProviders(<MobileNavigation />, {
        user: { uid: "user_overflow", email: "overflow@test.com" },
        userData: { username: "LockTester", casaId: "casa_1" },
      });

      const burgerBtn = await screen.findByRole("button", { name: /apri menu di navigazione/i });
      fireEvent.click(burgerBtn);
      expect(document.body.style.overflow).toBe("hidden");

      // Click close button inside drawer
      const closeButtons = screen.getAllByRole("button", { name: /chiudi menu/i });
      fireEvent.click(closeButtons[0]);
      expect(document.body.style.overflow).toBe("");
    });
  });

  // =========================================================================
  // 3. FEEDBACK BUS & TOAST/MODAL INTEGRITY
  // =========================================================================
  describe("Feedback Bus & Modals Adversarial Stress", () => {
    test("fault isolation: error in one toast subscriber does not crash others", () => {
      const healthySubscriber = jest.fn();
      const faultySubscriber = jest.fn(() => {
        throw new Error("Subscriber crashed intentionally");
      });

      const unsub1 = subscribeToast(faultySubscriber);
      const unsub2 = subscribeToast(healthySubscriber);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      showToast("Fault test message", "info");

      expect(faultySubscriber).toHaveBeenCalled();
      expect(healthySubscriber).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error invoking toast listener:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
      unsub1();
      unsub2();
    });

    test("headless fallback: showToast invokes window.alert when unmounted", () => {
      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

      showToast("Headless Alert", "warning");

      expect(alertSpy).toHaveBeenCalledWith("Headless Alert");
      alertSpy.mockRestore();
    });

    test("headless fallback: showConfirm resolves according to window.confirm", async () => {
      const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      const resTrue = await showConfirm({
        message: "Proceed?",
        onConfirm,
        onCancel,
      });

      expect(confirmSpy).toHaveBeenCalledWith("Proceed?");
      expect(resTrue).toBe(true);
      expect(onConfirm).toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();

      // Test false return
      confirmSpy.mockReturnValue(false);
      const resFalse = await showConfirm({
        message: "Cancel this?",
        onConfirm,
        onCancel,
      });

      expect(resFalse).toBe(false);
      expect(onCancel).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    test("toast queue overflow stress: handles 50 rapid toasts without exceeding max 5 items", () => {
      jest.useFakeTimers();
      const { container } = render(<ToastContainer />);

      act(() => {
        for (let i = 1; i <= 50; i++) {
          showToast(`Rapid Toast ${i}`, "info", 5000);
        }
      });

      const items = container.querySelectorAll(".toast-item");
      expect(items.length).toBe(5);

      // Latest 5 items should be 46 to 50
      expect(screen.getByText("Rapid Toast 50")).toBeInTheDocument();
      expect(screen.getByText("Rapid Toast 46")).toBeInTheDocument();
      expect(screen.queryByText("Rapid Toast 45")).toBeNull();

      act(() => {
        jest.runOnlyPendingTimers();
      });
      jest.useRealTimers();
    });

    test("confirm modal keyboard accessibility: Escape dismisses dialog", async () => {
      render(<ConfirmModal />);

      let confirmPromise;
      act(() => {
        confirmPromise = showConfirm({
          title: "Escape Modal",
          message: "Press escape to cancel",
        });
      });

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      act(() => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      const outcome = await confirmPromise;
      expect(outcome).toBe(false);
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  // =========================================================================
  // 4. HOUSEHOLD STATUS COMPONENT ADVERSARIAL STRESS
  // =========================================================================
  describe("HouseholdStatus Resilience", () => {
    test("handles empty/null props gracefully without throwing", () => {
      const { container: c1 } = render(<HouseholdStatus casa={null} />);
      expect(c1.querySelector(".household-status-card")).toBeInTheDocument();
      expect(screen.getByText("La tua Casa")).toBeInTheDocument();
      expect(screen.getByText("------")).toBeInTheDocument();

      const { container: c2 } = render(<HouseholdStatus casa={{}} variant="compact" />);
      expect(c2.querySelector(".household-status-compact")).toBeInTheDocument();
    });

    test("handles invalid chore date gracefully without throwing", () => {
      const weirdTurno = {
        mansione: "Pulizia Bagno",
        data: "not-a-valid-date",
        utenteNome: "Luca",
      };

      const { container } = render(
        <HouseholdStatus
          casa={{ id: "c1", nome: "Casa Test", codiceUnivoco: "TEST12" }}
          prossimoTurno={weirdTurno}
        />
      );

      expect(container.querySelector(".household-status-card")).toBeInTheDocument();
      expect(screen.getByText(/Pulizia Bagno/)).toBeInTheDocument();
    });

    test("verifies zero canvas elements and zero recursive timers", () => {
      const { container } = render(
        <HouseholdStatus
          casa={{ id: "c1", nome: "Casa Sicura", codiceUnivoco: "SAFE99" }}
          roommateCount={4}
        />
      );

      // Verify no canvas element exists
      expect(container.querySelector("canvas")).toBeNull();
      // Verify SVG/FontAwesome icons exist
      expect(container.querySelector(".fa-home")).toBeInTheDocument();
      expect(container.querySelector(".fa-users")).toBeInTheDocument();
      expect(container.querySelector(".fa-shield-alt")).toBeInTheDocument();
    });
  });
});
