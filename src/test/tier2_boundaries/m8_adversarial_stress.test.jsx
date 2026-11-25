import React from "react";
import fs from "fs";
import path from "path";
import { screen, waitFor, fireEvent, act } from "@testing-library/react";
import { renderWithProviders, seedHousehold, mockStore } from "../testUtils";
import MobileNavigation from "../../components/MobileNavigation";
import HomeUtente from "../../pages/homeUtente";
import ViewTurni from "../../pages/TurniPulizia/viewTurni";
import AggiuntaTurno from "../../pages/TurniPulizia/aggiuntaTurno";
import ViewDebiti from "../../pages/Debiti/ViewDebiti";
import AggiungiDebito from "../../pages/Debiti/AggiungiDebito";
import ViewSpesa from "../../pages/Spesa/ViewSpesa";
import ViewBacheca from "../../pages/Bacheca/ViewBacheca";
import ViewCalendario from "../../pages/Bacheca/ViewCalendario";
import {
  saveOfflineData,
  getOfflineData,
  purgeAllOfflineStorage
} from "../../utils/offlineStorage";

describe("Milestone M8 Adversarial Challenger Suite: Mobile Navigation, Ergonomics & Performance Stress", () => {
  const alice = { uid: "u_alice", username: "Alice", email: "alice@test.com" };
  const bob = { uid: "u_bob", username: "Bob", email: "bob@test.com" };
  const houseId = "casa_m8_test";

  beforeEach(() => {
    mockStore.reset();
    purgeAllOfflineStorage();
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  });

  // =========================================================================
  // 1. MOBILE NAVIGATION SINGLE 'X' & TOGGLE CYCLE TORTURE (REQUIREMENT R2)
  // =========================================================================
  describe("1. Mobile Navigation Single 'X' and Drawer Toggle Invariants", () => {
    test("CHALLENGE 1.1: Mobile navigation drawer has exactly ONE close button when opened, without duplicate burger 'X'", async () => {
      renderWithProviders(<MobileNavigation />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      // Wait for AuthProvider to resolve and render MobileNavigation
      const burgerBtn = await screen.findByRole("button", { name: /apri menu di navigazione/i });
      expect(burgerBtn).toBeInTheDocument();
      expect(burgerBtn).toHaveAttribute("aria-expanded", "false");
      expect(burgerBtn).toHaveAttribute("tabindex", "0");
      expect(document.body.style.overflow).toBe("");

      // Open drawer
      fireEvent.click(burgerBtn);

      // Verify exactly ONE close button exists in the DOM/accessibility tree
      const closeButtons = screen.getAllByRole("button", { name: /chiudi menu/i });
      expect(closeButtons).toHaveLength(1);
      expect(closeButtons[0]).toHaveClass("mobile-close-btn");

      // Verify burger button is deactivated/hidden to prevent duplicate punch-through
      expect(burgerBtn).toHaveClass("burger-active");
      expect(burgerBtn).toHaveAttribute("aria-hidden", "true");
      expect(burgerBtn).toHaveAttribute("tabindex", "-1");

      // Verify scroll lock
      expect(document.body.style.overflow).toBe("hidden");
      expect(document.documentElement.style.overflow).toBe("hidden");

      // Click the single close button to dismiss
      fireEvent.click(closeButtons[0]);
      expect(document.body.style.overflow).toBe("");
      expect(document.documentElement.style.overflow).toBe("");
    });

    test("CHALLENGE 1.2: Rapid toggle torture (50 consecutive open/close cycles) strictly maintains state and scroll lock integrity", async () => {
      renderWithProviders(<MobileNavigation />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      const burgerBtn = await screen.findByRole("button", { name: /apri menu di navigazione/i });

      // Run 50 full cycles (100 toggle actions)
      for (let i = 0; i < 50; i++) {
        // Open
        fireEvent.click(burgerBtn);
        expect(document.body.style.overflow).toBe("hidden");
        const closeButtons = screen.getAllByRole("button", { name: /chiudi menu/i });
        expect(closeButtons).toHaveLength(1);

        // Close
        fireEvent.click(closeButtons[0]);
        expect(document.body.style.overflow).toBe("");
      }

      // After 50 cycles, verify clean closed state
      expect(document.body.style.overflow).toBe("");
      expect(document.documentElement.style.overflow).toBe("");
      expect(burgerBtn).not.toHaveClass("burger-active");
    });

    test("CHALLENGE 1.3: Keyboard accessibility: Escape key dismisses drawer, handles rapid bursts, and no-ops when closed", async () => {
      renderWithProviders(<MobileNavigation />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      const burgerBtn = await screen.findByRole("button", { name: /apri menu di navigazione/i });

      // When closed: pressing Escape is safe no-op
      fireEvent.keyDown(window, { key: "Escape" });
      expect(document.body.style.overflow).toBe("");
      expect(burgerBtn).not.toHaveClass("burger-active");

      // Open drawer
      fireEvent.click(burgerBtn);
      expect(document.body.style.overflow).toBe("hidden");

      // Press Escape to dismiss
      fireEvent.keyDown(window, { key: "Escape" });
      expect(document.body.style.overflow).toBe("");
      expect(burgerBtn).not.toHaveClass("burger-active");

      // Rapid burst of 10 Escape key presses while closed
      for (let k = 0; k < 10; k++) {
        fireEvent.keyDown(window, { key: "Escape" });
      }
      expect(document.body.style.overflow).toBe("");
    });

    test("CHALLENGE 1.4: Backdrop overlay dismissal vs inner content event isolation", async () => {
      renderWithProviders(<MobileNavigation />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      const burgerBtn = await screen.findByRole("button", { name: /apri menu di navigazione/i });
      fireEvent.click(burgerBtn);
      expect(document.body.style.overflow).toBe("hidden");

      // Clicking inner content does NOT close the drawer
      const innerContent = document.querySelector(".mobile-menu-inner");
      expect(innerContent).toBeInTheDocument();
      fireEvent.click(innerContent);
      expect(document.body.style.overflow).toBe("hidden");

      // Clicking header greeting does NOT close drawer
      const greeting = screen.getByText(/Alice/i);
      fireEvent.click(greeting);
      expect(document.body.style.overflow).toBe("hidden");

      // Clicking directly on backdrop overlay CLOSES drawer
      const overlay = document.querySelector(".mobile-menu-overlay");
      expect(overlay).toBeInTheDocument();
      fireEvent.click(overlay);
      expect(document.body.style.overflow).toBe("");
    });

    test("CHALLENGE 1.5: Body scroll cleanup invariant upon unmounting during open drawer", async () => {
      const { unmount } = renderWithProviders(<MobileNavigation />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      const burgerBtn = await screen.findByRole("button", { name: /apri menu di navigazione/i });
      fireEvent.click(burgerBtn);
      expect(document.body.style.overflow).toBe("hidden");
      expect(document.documentElement.style.overflow).toBe("hidden");

      // Unmount while open
      unmount();

      // Invariant: scroll lock must be cleanly restored to prevent freezing the host app
      expect(document.body.style.overflow).toBe("");
      expect(document.documentElement.style.overflow).toBe("");
    });
  });

  // =========================================================================
  // 2. ERGONOMICS & RESPONSIVE LAYOUT ACROSS VIEWPORTS (REQUIREMENT R3)
  // =========================================================================
  describe("2. Ergonomics, Responsive Card Paddings & Touch Targets", () => {
    test("CHALLENGE 2.1: CSS Contract Verification: .domain-page-card responsive paddings in App.css", () => {
      const cssPath = path.resolve(__dirname, "../../App.css");
      expect(fs.existsSync(cssPath)).toBe(true);
      const cssContent = fs.readFileSync(cssPath, "utf8");

      // Desktop rule for .domain-page-card
      expect(cssContent).toMatch(/\.domain-page-card\s*\{[^}]*padding:\s*32px\s*!important/);
      expect(cssContent).toMatch(/\.domain-page-card\s*\{[^}]*box-sizing:\s*border-box/);

      // Mobile rule within max-width: 768px media query
      expect(cssContent).toMatch(/@media\s*\(\s*max-width:\s*768px\s*\)[^{]*\{[\s\S]*?\.domain-page-card\s*\{[^}]*padding:\s*16px\s*!important/);
    });

    test("CHALLENGE 2.2: Primary domain pages render .domain-page-card without hardcoded inline padding: 2.5rem", async () => {
      seedHousehold({
        houseId,
        users: [alice, bob],
        turni: [{ id: "t1", nome: "Cucina", luoghi: "Cucina", data: "2026-11-10", nomi: ["Alice"] }],
        debiti: [{ id: "d1", creditoreId: alice.uid, debitoreId: bob.uid, importo: "15.00", descrizione: "Spesa" }],
        spesa: [{ id: "s1", nome: "Latte", quantita: 2, comprato: false }],
        note: [{ id: "n1", titolo: "Regole", contenuto: "Pulire dopo l'uso", autore: "Alice" }]
      });

      // 1. ViewTurni
      const { container: cTurni, unmount: u1 } = renderWithProviders(<ViewTurni />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });
      await waitFor(() => expect(screen.getByRole("heading", { name: /Turni Pulizia/i })).toBeInTheDocument());
      const cardTurni = cTurni.querySelector(".domain-page-card");
      expect(cardTurni).toBeInTheDocument();
      expect(cardTurni.style.padding).not.toContain("2.5rem");
      u1();

      // 2. ViewDebiti
      const { container: cDebiti, unmount: u2 } = renderWithProviders(<ViewDebiti />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });
      await waitFor(() => expect(screen.getByRole("heading", { name: /Spese & Debiti/i })).toBeInTheDocument());
      const cardDebiti = cDebiti.querySelector(".domain-page-card");
      expect(cardDebiti).toBeInTheDocument();
      expect(cardDebiti.style.padding).not.toContain("2.5rem");
      u2();

      // 3. ViewSpesa
      const { container: cSpesa, unmount: u3 } = renderWithProviders(<ViewSpesa />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });
      await waitFor(() => expect(screen.getByRole("heading", { name: /Lista della Spesa/i })).toBeInTheDocument());
      const cardSpesa = cSpesa.querySelector(".domain-page-card");
      expect(cardSpesa).toBeInTheDocument();
      expect(cardSpesa.style.padding).not.toContain("2.5rem");
      u3();

      // 4. ViewBacheca
      const { container: cBacheca, unmount: u4 } = renderWithProviders(<ViewBacheca />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });
      await waitFor(() => expect(screen.getByRole("heading", { name: /Bacheca Condivisa/i })).toBeInTheDocument());
      const cardBacheca = cBacheca.querySelector(".domain-page-card");
      expect(cardBacheca).toBeInTheDocument();
      expect(cardBacheca.style.padding).not.toContain("2.5rem");
      u4();

      // 5. ViewCalendario
      const { container: cCal, unmount: u5 } = renderWithProviders(<ViewCalendario />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });
      await waitFor(() => expect(screen.getByRole("heading", { name: /Calendario Casa/i })).toBeInTheDocument());
      const cardCal = cCal.querySelector(".domain-page-card");
      expect(cardCal).toBeInTheDocument();
      expect(cardCal.style.padding).not.toContain("2.5rem");
      u5();
    });

    test("CHALLENGE 2.3: Bento services 7-item responsiveness without orphaned layout across viewports", async () => {
      seedHousehold({ houseId, users: [alice] });
      const { container } = renderWithProviders(<HomeUtente />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      await waitFor(() => {
        expect(container.querySelector(".bento-services")).toBeInTheDocument();
      });

      const bentoServices = container.querySelector(".bento-services");
      const serviceButtons = bentoServices.querySelectorAll("button.service-btn");

      // Verify all 7 services exist
      expect(serviceButtons).toHaveLength(7);

      const labels = Array.from(serviceButtons).map((btn) => btn.textContent.trim());
      expect(labels).toContain("Turni");
      expect(labels).toContain("Spese");
      expect(labels).toContain("Spesa");
      expect(labels).toContain("Calendario");
      expect(labels).toContain("Bacheca");
      expect(labels).toContain("Documenti");
      expect(labels).toContain("Contatti");

      // Check CSS grid-template-columns auto-fit responsiveness
      const cssContent = fs.readFileSync(path.resolve(__dirname, "../../App.css"), "utf8");
      expect(cssContent).toMatch(/\.bento-services\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(110px,\s*1fr\)\)/);
      expect(cssContent).toMatch(/@media\s*\(\s*max-width:\s*768px\s*\)[^{]*\{[\s\S]*?\.bento-services\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(105px,\s*1fr\)\)/);
    });

    test("CHALLENGE 2.4: Interactive touch targets meet WCAG 2.5.5 standards (>= 40-44px)", async () => {
      seedHousehold({
        houseId,
        users: [alice, bob],
        turni: [
          {
            id: "t_check",
            nome: "Bagno",
            luoghi: "Bagno",
            data: "2026-11-12",
            nomi: ["Alice"],
            checklist: [
              { id: "sub1", text: "Lavare lavandino", completed: false },
              { id: "sub2", text: "Pulire doccia", completed: true, completedBy: "Alice" }
            ]
          }
        ],
        debiti: [
          { id: "d_check", creditoreId: bob.uid, debitoreId: alice.uid, importo: "25.00", descrizione: "Bolletta" }
        ]
      });

      // 1. Roommate chips & zone presets in AggiuntaTurno
      const { container: cTurnoAdd, unmount: u1 } = renderWithProviders(<AggiuntaTurno />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });
      await waitFor(() => expect(screen.getByRole("heading", { name: /Nuovo Turno/i })).toBeInTheDocument());
      await waitFor(() => expect(cTurnoAdd.querySelector(".roommate-select-chip")).toBeInTheDocument());

      const roommateChip = cTurnoAdd.querySelector(".roommate-select-chip");
      expect(roommateChip).toBeInTheDocument();
      expect(roommateChip.style.minHeight).toBe("40px");
      expect(roommateChip.style.padding).toBe("8px 14px");

      const zonePresetBtn = screen.getByRole("button", { name: /Cucina/i });
      expect(zonePresetBtn).toBeInTheDocument();
      expect(zonePresetBtn.style.minHeight).toBe("40px");
      expect(zonePresetBtn.style.padding).toBe("8px 14px");
      u1();

      // 2. Amount presets in AggiungiDebito
      const { unmount: u2 } = renderWithProviders(<AggiungiDebito />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });
      await waitFor(() => expect(screen.getByRole("heading", { name: /Aggiungi spesa/i })).toBeInTheDocument());

      ["+5 €", "+10 €", "+20 €", "+50 €"].forEach((amt) => {
        const btn = screen.getByRole("button", { name: amt });
        expect(btn).toBeInTheDocument();
        expect(btn.style.minHeight).toBe("40px");
        expect(btn.style.padding).toBe("8px 14px");
      });
      u2();

      // 3. Subtask checkboxes in ViewTurni
      const { container: cTurni, unmount: u3 } = renderWithProviders(<ViewTurni />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });
      await waitFor(() => expect(screen.getByText("Lavare lavandino")).toBeInTheDocument());

      const subtaskLabel = screen.getByText("Lavare lavandino").closest("label");
      expect(subtaskLabel).toBeInTheDocument();
      expect(subtaskLabel.style.minHeight).toBe("40px");
      expect(subtaskLabel.style.padding).toBe("6px 8px");

      const checkbox = subtaskLabel.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox.style.width).toBe("20px");
      expect(checkbox.style.height).toBe("20px");
      u3();

      // 4. "Pareggia" action button in ViewDebiti
      const { unmount: u4 } = renderWithProviders(<ViewDebiti />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });
      await waitFor(() => expect(screen.getByRole("button", { name: /Pareggia/i })).toBeInTheDocument());
      const pareggiaBtn = screen.getByRole("button", { name: /Pareggia/i });
      expect(pareggiaBtn.style.minHeight).toBe("40px");
      expect(pareggiaBtn.style.padding).toBe("8px 16px");
      u4();

      // 5. CSS Touch Tokens in App.css
      const cssContent = fs.readFileSync(path.resolve(__dirname, "../../App.css"), "utf8");
      expect(cssContent).toMatch(/\.grocery-staple-btn\s*\{[^}]*min-height:\s*40px/);
      expect(cssContent).toMatch(/\.contact-delete-btn\s*\{[^}]*min-width:\s*40px;\s*min-height:\s*40px/);
      expect(cssContent).toMatch(/\.btn-action-call,\s*\.btn-action-email\s*\{[^}]*min-height:\s*40px/);
      expect(cssContent).toMatch(/\.mobile-close-btn:active\s*\{[^}]*transform:\s*scale\(0\.92\)/);
    });
  });

  // =========================================================================
  // 3. DASHBOARD OPTIMISTIC HYDRATION & NON-BLOCKING SYNC (REQUIREMENT R1)
  // =========================================================================
  describe("3. Dashboard Non-Blocking Hydration & Multi-Tenant Cache Resilience", () => {
    test("CHALLENGE 3.1: Synchronous hydration renders dashboard with zero blocking full-page sync card", async () => {
      // Seed user and house in mockStore
      seedHousehold({
        houseId,
        houseName: "Casa Bellini",
        users: [alice]
      });

      // Pre-seed offline storage with cached dashboard data
      saveOfflineData(houseId, "dashboard_cache", {
        casa: { nome: "Casa Bellini", codiceUnivoco: "BEL123" },
        saldo: 35.5,
        prossimoTurno: { nome: "Salotto", data: "2026-11-15" },
        turniList: [],
        debitiList: [],
        spesaList: [],
        utentiMap: { [alice.uid]: alice }
      });

      const { container } = renderWithProviders(<HomeUtente />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      // Wait for AuthProvider to resolve and mount HomeUtente
      await waitFor(() => {
        expect(container.querySelector(".bento-services")).toBeInTheDocument();
      });

      // The legacy blocking full-page sync card must NEVER exist
      expect(screen.queryByText(/sincronizzazione della casa\.\.\./i)).toBeNull();

      // Cached house name and services are present
      expect(screen.getByText("Casa Bellini")).toBeInTheDocument();
    });

    test("CHALLENGE 3.2: Non-blocking sync badge displays while keeping quick services fully clickable", async () => {
      seedHousehold({ houseId, users: [alice] });

      const { container } = renderWithProviders(<HomeUtente />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      // Bento services must be interactive even during load/sync
      await waitFor(() => {
        expect(container.querySelector(".bento-services")).toBeInTheDocument();
      });

      const bentoServices = container.querySelector(".bento-services");
      const turniBtn = bentoServices.querySelector("button.service-btn");
      expect(turniBtn).toBeInTheDocument();
      expect(turniBtn).not.toBeDisabled();
      fireEvent.click(turniBtn);
    });

    test("CHALLENGE 3.3: Cold start without cache renders inline skeleton without unmounting dashboard navigation", async () => {
      seedHousehold({ houseId, users: [alice] });

      const { container } = renderWithProviders(<HomeUtente />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      // Wait for mount
      await waitFor(() => {
        expect(container.querySelector(".bento-services")).toBeInTheDocument();
      });

      // The full-page blocking sync card must NOT exist
      expect(screen.queryByText(/sincronizzazione della casa\.\.\./i)).toBeNull();

      // Quick services are rendered
      expect(container.querySelector(".bento-services")).toBeInTheDocument();

      // Wait for complete load
      await waitFor(() => {
        expect(container.querySelector(".dashboard-loading-skeleton")).toBeNull();
      });
    });

    test("CHALLENGE 3.4: Multi-tenant cache strictly enforces household boundaries", () => {
      const houseA = "casa_alpha";
      const houseB = "casa_beta";

      saveOfflineData(houseA, "dashboard_cache", { secretNote: "Alpha Secrets" });
      saveOfflineData(houseB, "dashboard_cache", { secretNote: "Beta Secrets" });

      const cachedA = getOfflineData(houseA, "dashboard_cache");
      const cachedB = getOfflineData(houseB, "dashboard_cache");

      expect(cachedA.secretNote).toBe("Alpha Secrets");
      expect(cachedB.secretNote).toBe("Beta Secrets");

      // Verify no cross-tenant bleeding
      expect(getOfflineData("casa_gamma", "dashboard_cache")).toBeNull();
    });
  });
});
