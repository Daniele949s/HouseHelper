import React from "react";
import fs from "fs";
import path from "path";
import { screen, waitFor, fireEvent, act } from "@testing-library/react";
import { renderWithProviders, seedHousehold, mockStore } from "../testUtils";
import ConfirmModal from "../../components/ConfirmModal";
import { showConfirm } from "../../utils/feedback";
import ViewContatti from "../../pages/Contatti/ViewContatti";
import ViewDebiti from "../../pages/Debiti/ViewDebiti";
import ViewDocumenti from "../../pages/Documenti/ViewDocumenti";
import ViewSpesa from "../../pages/Spesa/ViewSpesa";

describe("Milestone M10 Adversarial Challenger 2 Suite: Ergonomics, Liquid Glass, 50+ Escape Cycles & Invariants", () => {
  const alice = { uid: "u_alice", username: "Alice", email: "alice@test.com" };
  const bob = { uid: "u_bob", username: "Bob", email: "bob@test.com" };
  const houseId = "casa_m10_challenger2";

  beforeEach(() => {
    mockStore.reset();
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  });

  // =========================================================================
  // 1. LIQUID GLASS & CARD BACKGROUND DISCIPLINE
  // =========================================================================
  describe("1. Liquid Glass & Card Background Discipline", () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const appCss = fs.readFileSync(path.join(rootDir, "src/App.css"), "utf8");
    const indexCss = fs.readFileSync(path.join(rootDir, "src/index.css"), "utf8");
    const analyticsCss = fs.readFileSync(path.join(rootDir, "src/components/HouseAnalytics.css"), "utf8");

    test("CHALLENGE 1.1: Active blur is strictly confined to floating bars and modal backdrops", () => {
      const allowedFloatingLayers = [
        ".app-topbar",
        ".mobile-bottom-bar",
        ".toast-item",
        ".confirm-modal-backdrop",
        ".modal-backdrop"
      ];

      // Extract all CSS rules with active backdrop-filter (blur)
      const ruleRegex = /([^{}]+)\{[^}]*backdrop-filter:\s*(?:var\(--glass-blur\)|blur\([^)]+\))[^}]*\}/g;
      let match;
      const violatingSelectors = [];

      while ((match = ruleRegex.exec(appCss)) !== null) {
        const selector = match[1].trim();
        // Skip reduced transparency media queries where blur is removed
        if (selector.includes("prefers-reduced-transparency")) continue;

        const isAllowed = allowedFloatingLayers.some(allowed => selector.includes(allowed));
        if (!isAllowed) {
          violatingSelectors.push(selector);
        }
      }

      expect(violatingSelectors).toEqual([]);
    });

    test("CHALLENGE 1.2: Content cards explicitly enforce backdrop-filter: none !important", () => {
      const cardSelectors = [
        ".card",
        ".bento-item",
        ".service-btn",
        ".household-status-card"
      ];

      cardSelectors.forEach(sel => {
        const regex = new RegExp(`\\${sel}[^{]*\\{[^}]*backdrop-filter:\\s*none\\s*!important`, "m");
        expect(appCss).toMatch(regex);
      });

      // HouseAnalytics.css .analytics-card
      expect(analyticsCss).toMatch(/\.analytics-card[^{]*\{[^}]*backdrop-filter:\s*none\s*!important/);
    });

    test("CHALLENGE 1.3: Secondary view cards do NOT contain active backdrop blur", () => {
      const secondaryCardClasses = [
        ".scelta-card",
        ".domain-page-card",
        ".bacheca-card",
        ".contact-card",
        ".doc-card",
        ".doc-upload-card"
      ];

      secondaryCardClasses.forEach(cls => {
        const regex = new RegExp(`\\${cls}[^{]*\\{[^}]*backdrop-filter:\\s*(?:var\\(--glass-blur\\)|blur)`, "m");
        expect(appCss).not.toMatch(regex);
      });
    });

    test("CHALLENGE 1.4: prefers-reduced-transparency media query systematically removes backdrop-filter", () => {
      expect(appCss).toMatch(
        /@media\s*\(\s*prefers-reduced-transparency:\s*reduce\s*\)[^{]*\{[\s\S]*?backdrop-filter:\s*none\s*!important/
      );
    });
  });

  // =========================================================================
  // 2. KEYBOARD ERGONOMICS & EVENT TEARDOWN: 50+ ESCAPE CYCLES
  // =========================================================================
  describe("2. Keyboard Ergonomics & Event Teardown: 50+ Escape Key Cycles", () => {
    test("CHALLENGE 2.1: ConfirmModal executes 60 open/Escape dismiss cycles with zero listener leaks or stuck overflow", async () => {
      const addListenerSpy = jest.spyOn(window, "addEventListener");
      const removeListenerSpy = jest.spyOn(window, "removeEventListener");

      const { container } = renderWithProviders(<ConfirmModal />);

      for (let i = 0; i < 60; i++) {
        let confirmedResult = null;
        act(() => {
          showConfirm({
            title: `Stress Modal #${i + 1}`,
            message: "Testing keyboard escape teardown lifecycle",
            onConfirm: () => { confirmedResult = true; },
            onCancel: () => { confirmedResult = false; }
          });
        });

        // Verify modal backdrop mounted
        const backdrop = container.querySelector(".confirm-modal-backdrop");
        expect(backdrop).not.toBeNull();
        expect(document.body.style.overflow).toBe("hidden");

        // Fire Escape keydown
        act(() => {
          fireEvent.keyDown(window, { key: "Escape" });
        });

        // Verify modal dismissed and overflow cleared
        expect(container.querySelector(".confirm-modal-backdrop")).toBeNull();
        expect(document.body.style.overflow).toBe("");
        expect(confirmedResult).toBe(false);
      }

      // Check net listeners: all registered keydown listeners must have matching removals
      const keydownAdds = addListenerSpy.mock.calls.filter(([event]) => event === "keydown").length;
      const keydownRemoves = removeListenerSpy.mock.calls.filter(([event]) => event === "keydown").length;

      expect(keydownAdds).toBe(60);
      expect(keydownRemoves).toBe(60);
      expect(keydownAdds - keydownRemoves).toBe(0);

      addListenerSpy.mockRestore();
      removeListenerSpy.mockRestore();
    });

    test("CHALLENGE 2.2: ViewContatti modal executes 55 open/Escape dismiss cycles with clean listener teardown", async () => {
      const addListenerSpy = jest.spyOn(window, "addEventListener");
      const removeListenerSpy = jest.spyOn(window, "removeEventListener");

      seedHousehold({ houseId, users: [alice] });

      const { container } = renderWithProviders(<ViewContatti />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/contatti"
      });

      await screen.findByRole("heading", { level: 1, name: /Contatti Utili della Casa/i });

      const openBtn = screen.getByRole("button", { name: /Aggiungi nuovo contatto/i });

      for (let i = 0; i < 55; i++) {
        // Open modal
        act(() => {
          fireEvent.click(openBtn);
        });

        // Check modal open
        const modal = container.querySelector(".modal-backdrop");
        expect(modal).not.toBeNull();

        // Dismiss via Escape
        act(() => {
          fireEvent.keyDown(window, { key: "Escape" });
        });

        // Check modal closed
        expect(container.querySelector(".modal-backdrop")).toBeNull();
      }

      const keydownAdds = addListenerSpy.mock.calls.filter(([event]) => event === "keydown").length;
      const keydownRemoves = removeListenerSpy.mock.calls.filter(([event]) => event === "keydown").length;

      expect(keydownAdds).toBe(55);
      expect(keydownRemoves).toBe(55);
      expect(keydownAdds - keydownRemoves).toBe(0);

      addListenerSpy.mockRestore();
      removeListenerSpy.mockRestore();
    });

    test("CHALLENGE 2.3: ViewDebiti Export Modal executes 50 open/Escape dismiss cycles with clean listener teardown", async () => {
      const addListenerSpy = jest.spyOn(window, "addEventListener");
      const removeListenerSpy = jest.spyOn(window, "removeEventListener");

      seedHousehold({
        houseId,
        users: [alice, bob],
        debiti: [{ id: "deb_stress", importo: 20, pagatoDa: alice.uid, divisoTra: [alice.uid, bob.uid], data: new Date() }]
      });

      const { container } = renderWithProviders(<ViewDebiti />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/debiti"
      });

      const exportBtn = await screen.findByRole("button", { name: /Esporta Resoconto/i });

      for (let i = 0; i < 50; i++) {
        act(() => {
          fireEvent.click(exportBtn);
        });

        expect(container.querySelector(".modal-backdrop")).not.toBeNull();

        act(() => {
          fireEvent.keyDown(window, { key: "Escape" });
        });

        expect(container.querySelector(".modal-backdrop")).toBeNull();
      }

      const keydownAdds = addListenerSpy.mock.calls.filter(([event]) => event === "keydown").length;
      const keydownRemoves = removeListenerSpy.mock.calls.filter(([event]) => event === "keydown").length;

      expect(keydownAdds).toBe(50);
      expect(keydownRemoves).toBe(50);
      expect(keydownAdds - keydownRemoves).toBe(0);

      addListenerSpy.mockRestore();
      removeListenerSpy.mockRestore();
    });
  });

  // =========================================================================
  // 3. WCAG AA CONTRAST & TYPOGRAPHY STANDARDS
  // =========================================================================
  describe("3. WCAG AA Contrast & Typography Standards", () => {
    function lum(r, g, b) {
      const [R, G, B] = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * R + 0.7152 * G + 0.0722 * B;
    }

    function hexToRgb(hex) {
      hex = hex.replace("#", "");
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
      ];
    }

    function contrast(fg, bg) {
      const l1 = lum(...hexToRgb(fg));
      const l2 = lum(...hexToRgb(bg));
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }

    test("CHALLENGE 3.1: Dark theme tokens satisfy WCAG AA (>= 4.5:1) against dark card surface", () => {
      const darkCard = "151e2e";
      expect(contrast("f8fafc", darkCard)).toBeGreaterThanOrEqual(4.5); // Primary text
      expect(contrast("94a3b8", darkCard)).toBeGreaterThanOrEqual(4.5); // Secondary & caption text
      expect(contrast("818cf8", darkCard)).toBeGreaterThanOrEqual(4.5); // Primary brand text
      expect(contrast("34d399", darkCard)).toBeGreaterThanOrEqual(4.5); // Success text
      expect(contrast("fb7185", darkCard)).toBeGreaterThanOrEqual(4.5); // Danger text
      expect(contrast("f59e0b", darkCard)).toBeGreaterThanOrEqual(4.5); // Warning text
    });

    test("CHALLENGE 3.2: Light theme tokens satisfy WCAG AA (>= 4.5:1) against white card surface", () => {
      const lightCard = "ffffff";
      expect(contrast("0f172a", lightCard)).toBeGreaterThanOrEqual(4.5); // Primary text
      expect(contrast("475569", lightCard)).toBeGreaterThanOrEqual(4.5); // Secondary text
      expect(contrast("64748b", lightCard)).toBeGreaterThanOrEqual(4.5); // Muted text
      expect(contrast("4338ca", lightCard)).toBeGreaterThanOrEqual(4.5); // Primary brand text
      expect(contrast("047857", lightCard)).toBeGreaterThanOrEqual(4.5); // Success text
      expect(contrast("be123c", lightCard)).toBeGreaterThanOrEqual(4.5); // Danger text
      expect(contrast("b45309", lightCard)).toBeGreaterThanOrEqual(4.5); // Warning text
    });

    test("CHALLENGE 3.3: Document format badges in ViewDocumenti render distinct semantic icon containers", async () => {
      seedHousehold({
        houseId,
        users: [alice],
        documenti: [
          { id: "d_pdf", nome: "Contratto.pdf", formato: "pdf", url: "https://mock.url/test.pdf", note: "Nota PDF" },
          { id: "d_img", nome: "Foto.png", formato: "img", url: "https://mock.url/test.png", note: "Nota Foto" },
          { id: "d_doc", nome: "Regolamento.docx", formato: "doc", url: "https://mock.url/test.docx", note: "Nota Doc" }
        ]
      });

      const { container } = renderWithProviders(<ViewDocumenti />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/documenti"
      });

      await screen.findByText("Contratto.pdf");

      expect(container.querySelector(".doc-format-pdf")).not.toBeNull();
      expect(container.querySelector(".doc-format-img")).not.toBeNull();
      expect(container.querySelector(".doc-format-doc")).not.toBeNull();
    });
  });

  // =========================================================================
  // 4. INVARIANTS: ZERO "DISPENSA" IN VIEWSPESA.JS
  // =========================================================================
  describe("4. Strict Invariant: Zero Occurrences of 'Dispensa' in ViewSpesa.js", () => {
    test("CHALLENGE 4.1: Static source code contains strictly 0 occurrences of 'Dispensa' (case-insensitive)", () => {
      const viewSpesaRaw = fs.readFileSync(path.resolve(__dirname, "../../pages/Spesa/ViewSpesa.js"), "utf8");
      const matches = viewSpesaRaw.match(/dispensa/gi) || [];
      expect(matches).toHaveLength(0);
    });

    test("CHALLENGE 4.2: Rendered ViewSpesa DOM in all states contains strictly 0 occurrences of 'Dispensa'", async () => {
      seedHousehold({
        houseId,
        users: [alice],
        spesa: [
          { id: "sp_1", nome: "Latte", comprato: false, categoria: "Alimentari", quantita: 1 },
          { id: "sp_2", nome: "Detersivo", comprato: true, categoria: "Pulizia", quantita: 1 }
        ]
      });

      const { container } = renderWithProviders(<ViewSpesa />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/spesa"
      });

      await screen.findByRole("heading", { level: 1, name: /Lista della Spesa/i });

      const text = container.textContent.toLowerCase();
      expect(text.includes("dispensa")).toBe(false);
    });
  });

  // =========================================================================
  // 5. TOUCH TARGETS (>= 44px) ACROSS SECONDARY VIEWS
  // =========================================================================
  describe("5. Apple HIG Touch Target Minimums (>= 44px)", () => {
    test("CHALLENGE 5.1: ViewContatti action buttons adhere to >= 44px min-height in CSS", () => {
      const appCss = fs.readFileSync(path.resolve(__dirname, "../../App.css"), "utf8");
      expect(appCss).toMatch(/\.btn-action-call,\s*\n?\.btn-action-email\s*\{[^}]*min-height:\s*44px/);
    });

    test("CHALLENGE 5.2: ViewDocumenti search clear button and sort select enforce min-height >= 44px", () => {
      const appCss = fs.readFileSync(path.resolve(__dirname, "../../App.css"), "utf8");
      expect(appCss).toMatch(/\.doc-search-clear\s*\{[^}]*min-height:\s*44px/);
      expect(appCss).toMatch(/\.doc-sort-select\s*\{[^}]*min-height:\s*44px/);
    });
  });
});
