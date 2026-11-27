import React from "react";
import fs from "fs";
import path from "path";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders, seedHousehold } from "../testUtils";
import mockStore from "../mockFirebase";

// Views under test
import HomeUtente from "../../pages/homeUtente";
import ViewTurni from "../../pages/TurniPulizia/viewTurni";
import ViewDebiti from "../../pages/Debiti/ViewDebiti";
import ViewSpesa from "../../pages/Spesa/ViewSpesa";

describe("Milestone M9 Empirical Challenger: Signature Elements & Invariant Stress", () => {
  const alice = { uid: "u_alice", email: "alice@test.com", username: "Alice" };
  const bob = { uid: "u_bob", email: "bob@test.com", username: "Bob" };
  const houseId = "casa_m9_signature_stress";

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockStore.reset();
    const routerMock = require("react-router-dom");
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
  });

  // =========================================================================
  // 1. COMMAND CENTER HERO ON DASHBOARD (homeUtente.js)
  // =========================================================================
  describe("1. Command Center Hero on Dashboard", () => {
    test("1.1: Invite code copy interaction triggers clipboard API and visual feedback", async () => {
      // Mock clipboard writeText
      const originalClipboard = navigator.clipboard;
      let copiedText = "";
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn(async (text) => {
            copiedText = text;
          }),
        },
      });

      seedHousehold({
        houseId,
        users: [alice, bob],
        inviteCode: "CASA-DUOMO-99",
      });

      renderWithProviders(<HomeUtente />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/home",
      });

      // Find invite code button
      const inviteBtn = await screen.findByRole("button", { name: /codice invito/i }, { timeout: 4000 });
      expect(inviteBtn).toBeInTheDocument();

      // Click to copy
      fireEvent.click(inviteBtn);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("CASA-DUOMO-99");
      expect(copiedText).toBe("CASA-DUOMO-99");

      // Visual feedback "Copiato!"
      await waitFor(() => {
        const copiatoElements = screen.getAllByText(/Copiato!/i);
        expect(copiatoElements.length).toBeGreaterThan(0);
      });

      // Restore clipboard
      Object.assign(navigator, { clipboard: originalClipboard });
    });

    test("1.2: Roommate avatar list handles diverse object and string shapes without runtime crashes", async () => {
      seedHousehold({
        houseId,
        users: [
          { uid: alice.uid, username: "Alice" },
          { uid: bob.uid, nome: "BobRoberto" },
          { uid: "u_charlie", username: "Charlie" },
        ],
      });

      renderWithProviders(<HomeUtente />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/home",
      });

      // Ensure presence bar renders
      await screen.findByText(/Coinquilini:/i);
      const presenceBar = document.querySelector(".roommate-presence-bar");
      expect(presenceBar).toBeInTheDocument();

      // Check avatar chips
      const chips = presenceBar.querySelectorAll(".roommate-avatar-chip");
      expect(chips.length).toBeGreaterThan(0);

      // Verify initials and names rendered safely
      const chipTexts = Array.from(chips).map((c) => c.textContent);
      expect(chipTexts.some((t) => t.includes("Alice"))).toBe(true);
    });

    test("1.3: Quiet status pill correctly reflects chore state (today, future, and no turns)", async () => {
      const oggi = new Date().toISOString().split("T")[0];

      // A) Case 1: Today assigned to Alice -> "Tocca a te oggi"
      seedHousehold({
        houseId,
        users: [alice, bob],
        turni: [
          {
            id: "t_today_alice",
            mansione: "Cucina",
            data: oggi,
            utenteId: alice.uid,
            nomi: ["Alice"],
            completato: false,
          },
        ],
      });

      const { unmount: u1 } = renderWithProviders(<HomeUtente />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/home",
      });

      await waitFor(() => {
        const pill1 = document.querySelector(".command-status-pill");
        expect(pill1).toBeInTheDocument();
        expect(pill1.textContent).toContain("Tocca a te oggi");
        expect(pill1).toHaveClass("status-urgent");
      });
      u1();

      // B) Case 2: Today assigned to Bob -> "Nessun turno oggi" for Alice
      localStorage.clear();
      mockStore.reset();
      seedHousehold({
        houseId,
        users: [alice, bob],
        turni: [
          {
            id: "t_today_bob",
            mansione: "Bagno",
            data: oggi,
            utenteId: bob.uid,
            nomi: ["Bob"],
            completato: false,
          },
        ],
      });

      const { unmount: u2 } = renderWithProviders(<HomeUtente />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/home",
      });

      await waitFor(() => {
        const pill2 = document.querySelector(".command-status-pill");
        expect(pill2).toBeInTheDocument();
        expect(pill2.textContent).toContain("Nessun turno oggi");
        expect(pill2).toHaveClass("status-success");
      });
      u2();

      // C) Case 3: No turns at all -> "Nessun turno oggi"
      localStorage.clear();
      mockStore.reset();
      seedHousehold({
        houseId,
        users: [alice, bob],
        turni: [],
      });

      const { unmount: u3 } = renderWithProviders(<HomeUtente />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/home",
      });

      await waitFor(() => {
        const pill3 = document.querySelector(".command-status-pill");
        expect(pill3).toBeInTheDocument();
        expect(pill3.textContent).toContain("Nessun turno oggi");
        expect(pill3).toHaveClass("status-success");
      });
      u3();
    });
  });

  // =========================================================================
  // 2. CHORE SPOTLIGHT CARD (viewTurni.js)
  // =========================================================================
  describe("2. Chore Spotlight Card in viewTurni.js", () => {
    test("2.1: Imminent chore is elevated into .chore-spotlight-card with avatar and progress count", async () => {
      const oggi = new Date().toISOString().split("T")[0];

      seedHousehold({
        houseId,
        users: [alice, bob],
        turni: [
          {
            id: "t_spotlight",
            mansione: "Pulizia Cucina",
            luoghi: ["Cucina"],
            data: oggi,
            nomi: ["Alice"],
            completato: false,
            checklist: [
              { id: "sub1", text: "Pulire fornelli", completed: true },
              { id: "sub2", text: "Lavare lavello", completed: false },
            ],
          },
          {
            id: "t_second",
            mansione: "Salotto",
            luoghi: ["Salotto"],
            data: "2099-12-31",
            nomi: ["Bob"],
            completato: false,
            checklist: [],
          },
        ],
      });

      renderWithProviders(<ViewTurni />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/turni",
      });

      await screen.findByText(/Cucina/i);

      // Verify Spotlight Card exists
      const spotlightCard = document.querySelector(".chore-spotlight-card");
      expect(spotlightCard).toBeInTheDocument();

      // Check spotlight tag
      expect(spotlightCard.textContent).toMatch(/Oggi tocca a\.\.\./i);

      // Check checklist count pill (1/2 mansioni)
      expect(spotlightCard.textContent).toMatch(/1\/2 mansioni/i);

      // Check assignee avatar initial 'A'
      const avatar = spotlightCard.querySelector(".spotlight-avatar");
      expect(avatar).toBeInTheDocument();
      expect(avatar.textContent.trim()).toBe("A");

      // Verify second chore renders in standard row, not spotlight
      const allSpotlights = document.querySelectorAll(".chore-spotlight-card");
      expect(allSpotlights.length).toBe(1);
    });

    test("2.2: Subtask checklist items have WCAG touch height >= 40px and allow toggle", async () => {
      const oggi = new Date().toISOString().split("T")[0];

      seedHousehold({
        houseId,
        users: [alice],
        turni: [
          {
            id: "t_checklist",
            mansione: "Cucina",
            luoghi: ["Cucina"],
            data: oggi,
            nomi: ["Alice"],
            completato: false,
            checklist: [
              { id: "sub_a", text: "Asciugare piatti", completed: false },
            ],
          },
        ],
      });

      renderWithProviders(<ViewTurni />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/turni",
      });

      const label = await screen.findByText("Asciugare piatti");
      const labelElement = label.closest("label");
      expect(labelElement).toBeInTheDocument();
      expect(labelElement.style.minHeight).toBe("40px");

      // Toggle subtask checkbox
      const checkbox = labelElement.querySelector('input[type="checkbox"]');
      expect(checkbox.checked).toBe(false);
      fireEvent.click(checkbox);
    });

    test("2.3: Empty state renders 'Crea il primo turno' button without query collision with 'Nuovo Turno'", async () => {
      seedHousehold({
        houseId,
        users: [alice],
        turni: [],
      });

      renderWithProviders(<ViewTurni />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/turni",
      });

      // Top action button has exact text "Nuovo Turno"
      const headerBtn = await screen.findByRole("button", { name: "Nuovo Turno" });
      expect(headerBtn).toBeInTheDocument();

      // Empty state button has text "Crea il primo turno"
      const emptyStateBtn = screen.getByRole("button", { name: /Crea il primo turno/i });
      expect(emptyStateBtn).toBeInTheDocument();

      // Regex /Nuovo Turno/i must find exactly 1 button, ensuring NO duplicate element error
      const nuovoTurnoButtons = screen.getAllByRole("button", { name: /Nuovo Turno/i });
      expect(nuovoTurnoButtons.length).toBe(1);
    });
  });

  // =========================================================================
  // 3. FINANCIAL LEDGER HERO (ViewDebiti.js)
  // =========================================================================
  describe("3. Financial Ledger Hero in ViewDebiti.js", () => {
    test("3.1: Net balance renders formatted currency and sentiment without gradient washes", async () => {
      // Positive balance: Bob owes Alice 25.50 €
      seedHousehold({
        houseId,
        users: [alice, bob],
        debiti: [
          {
            id: "deb1",
            creditoreId: alice.uid,
            creditore: "Alice",
            debitoreId: bob.uid,
            debitore: "Bob",
            importo: 25.5,
            descrizione: "Cena",
            saldato: false,
          },
        ],
      });

      const { unmount: u1 } = renderWithProviders(<ViewDebiti />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/debiti",
      });

      // Check positive balance +25.50 €
      expect(await screen.findByText("+25.50 €")).toBeInTheDocument();
      expect(screen.getByText(/Gli altri coinquilini ti devono dei soldi/i)).toBeInTheDocument();

      // Verify absence of gradient wash on debt hero card and throughout ViewDebiti.js
      const heroCard = document.querySelector(".debt-hero-card");
      expect(heroCard).toBeInTheDocument();
      const styleAttr = heroCard.getAttribute("style") || "";
      expect(styleAttr).not.toContain("linear-gradient");

      // Verify source code of ViewDebiti.js has zero linear-gradient
      const debitiSrc = fs.readFileSync(path.resolve(__dirname, "../../pages/Debiti/ViewDebiti.js"), "utf8");
      expect(debitiSrc).not.toMatch(/linear-gradient/i);
      u1();

      // Negative balance: Alice owes Bob 10.00 €
      mockStore.reset();
      seedHousehold({
        houseId,
        users: [alice, bob],
        debiti: [
          {
            id: "deb2",
            creditoreId: bob.uid,
            creditore: "Bob",
            debitoreId: alice.uid,
            debitore: "Alice",
            importo: 10.0,
            descrizione: "Detersivi",
            saldato: false,
          },
        ],
      });

      const { unmount: u2 } = renderWithProviders(<ViewDebiti />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/debiti",
      });

      expect(await screen.findByText("-10.00 €")).toBeInTheDocument();
      expect(screen.getByText(/Hai debiti pendenti da restituire/i)).toBeInTheDocument();
      u2();

      // Zero balance
      mockStore.reset();
      seedHousehold({
        houseId,
        users: [alice, bob],
        debiti: [],
      });

      const { unmount: u3 } = renderWithProviders(<ViewDebiti />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/debiti",
      });

      expect(await screen.findByText("0.00 €")).toBeInTheDocument();
      expect(screen.getByText(/Nessun debito in sospeso\. Perfetta parità!/i)).toBeInTheDocument();
      u3();
    });

    test("3.2: Export modal supports backdrop click and Escape key dismissal", async () => {
      seedHousehold({
        houseId,
        users: [alice, bob],
        debiti: [],
      });

      renderWithProviders(<ViewDebiti />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/debiti",
      });

      // Open export modal
      const exportBtn = await screen.findByRole("button", { name: /Esporta Resoconto/i });
      fireEvent.click(exportBtn);

      // Verify modal is visible
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Esporta resoconto spese/i)).toBeInTheDocument();

      // Test 1: Escape key dismisses modal
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();

      // Re-open modal
      fireEvent.click(exportBtn);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Test 2: Backdrop click dismisses modal
      const backdrop = screen.getByRole("dialog");
      fireEvent.click(backdrop);
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  // =========================================================================
  // 4. SPESA HUB (ViewSpesa.js)
  // =========================================================================
  describe("4. Spesa Hub in ViewSpesa.js", () => {
    test("4.1: Progress indicator correctly calculates comprati vs total and track percentage", async () => {
      seedHousehold({
        houseId,
        users: [alice],
        spesa: [
          { id: "s1", nome: "Pane", comprato: true },
          { id: "s2", nome: "Latte", comprato: false },
          { id: "s3", nome: "Uova", comprato: false },
        ],
      });

      renderWithProviders(<ViewSpesa />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/spesa",
      });

      // Verify hub title: 1 su 3 presi (2 da comprare)
      expect(await screen.findByText(/1 su 3 presi \(2 da comprare\)/i)).toBeInTheDocument();

      // Verify da comprare badge (2) and presi badge (1)
      expect(screen.getByText(/Da comprare:/i)).toBeInTheDocument();
      expect(screen.getByText(/Presi:/i)).toBeInTheDocument();

      // Verify progress fill is 33%
      const fill = document.querySelector(".grocery-progress-fill");
      expect(fill).toBeInTheDocument();
      expect(fill.style.width).toBe("33%");
    });

    test("4.2: Quick staple chips allow one-tap item addition", async () => {
      seedHousehold({
        houseId,
        users: [alice],
        spesa: [],
      });

      renderWithProviders(<ViewSpesa />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/spesa",
      });

      // Find staple chip for "Latte"
      const latteBtn = await screen.findByRole("button", { name: /Latte/i });
      expect(latteBtn).toBeInTheDocument();

      // Click staple button
      fireEvent.click(latteBtn);

      // Verify "Latte" appears in the grocery list (alongside the staple chip)
      await waitFor(() => {
        expect(screen.getAllByText(/Latte/i).length).toBeGreaterThanOrEqual(2);
      });
    });

    test("4.3: Fluid strike-through styling on completed items", async () => {
      seedHousehold({
        houseId,
        users: [alice],
        spesa: [
          { id: "s1", nome: "Caffè", comprato: true },
          { id: "s2", nome: "Biscotti", comprato: false },
        ],
      });

      renderWithProviders(<ViewSpesa />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/spesa",
      });

      // Find Caffè item
      await screen.findByText(/Lista della Spesa/i);
      const itemsContainer = document.querySelector(".sidemenu-list-container");
      expect(itemsContainer).toBeInTheDocument();

      const itemRows = itemsContainer.querySelectorAll(".sidemenu-entry-item");
      expect(itemRows.length).toBe(2);

      // Find completed row
      const completedRow = document.querySelector(".sidemenu-entry-item.item-completed");
      expect(completedRow).toBeInTheDocument();
      expect(completedRow.textContent).toContain("Caffè");

      const span = completedRow.querySelector("span");
      expect(span.style.textDecoration).toBe("line-through");

      // Verify checkbox is checked
      const checkbox = completedRow.querySelector('input[type="checkbox"]');
      expect(checkbox.checked).toBe(true);

      // Verify uncompleted item row
      const uncompletedRow = document.querySelectorAll(".sidemenu-entry-item")[0];
      const uncompletedSpan = uncompletedRow.querySelector("span");
      expect(uncompletedSpan.style.textDecoration).toBe("none");

      // Verify source code defines muted text color for completed items
      const spesaSrc = fs.readFileSync(path.resolve(__dirname, "../../pages/Spesa/ViewSpesa.js"), "utf8");
      expect(spesaSrc).toMatch(/color:\s*item\.comprato\s*\?\s*"var\(--text-muted\)"\s*:\s*"var\(--text-main\)"/);
    });
  });

  // =========================================================================
  // 5. INVARIANT: STRICT ZERO "DISPENSA"
  // =========================================================================
  describe("5. Invariant: Strict Zero 'Dispensa' Occurrences", () => {
    test("5.1: Static source file ViewSpesa.js contains 0 occurrences of 'Dispensa'", () => {
      const spesaPath = path.resolve(__dirname, "../../pages/Spesa/ViewSpesa.js");
      expect(fs.existsSync(spesaPath)).toBe(true);
      const content = fs.readFileSync(spesaPath, "utf8");

      const matches = content.match(/Dispensa/i);
      expect(matches).toBeNull();
    });

    test("5.2: Rendered ViewSpesa DOM contains 0 occurrences of 'Dispensa' in empty and populated states", async () => {
      // Empty state
      seedHousehold({ houseId, users: [alice], spesa: [] });
      const { unmount: u1 } = renderWithProviders(<ViewSpesa />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/spesa",
      });

      await screen.findByText(/Lista della Spesa/i);
      expect(document.body.innerHTML).not.toMatch(/Dispensa/i);
      u1();

      // Populated state
      seedHousehold({
        houseId,
        users: [alice],
        spesa: [{ id: "s1", nome: "Mele", comprato: false }],
      });
      const { unmount: u2 } = renderWithProviders(<ViewSpesa />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/spesa",
      });

      await screen.findByText(/Mele/i);
      expect(document.body.innerHTML).not.toMatch(/Dispensa/i);
      u2();
    });
  });
});
