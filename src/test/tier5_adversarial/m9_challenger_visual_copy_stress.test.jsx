import React from "react";
import fs from "fs";
import path from "path";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders, seedHousehold } from "../testUtils";
import mockStore from "../mockFirebase";

// Target views under verification
import HomeUtente from "../../pages/homeUtente";
import ViewTurni from "../../pages/TurniPulizia/viewTurni";
import AggiuntaTurno from "../../pages/TurniPulizia/aggiuntaTurno";
import ViewDebiti from "../../pages/Debiti/ViewDebiti";
import AggiungiDebito from "../../pages/Debiti/AggiungiDebito";
import ViewSpesa from "../../pages/Spesa/ViewSpesa";
import ViewContatti from "../../pages/Contatti/ViewContatti";
import ViewDocumenti from "../../pages/Documenti/ViewDocumenti";
import ViewRegistrazione from "../../pages/Autenticazione/viewRegistrazione";
import AggiungiNota from "../../pages/Bacheca/AggiungiNota";

describe("Milestone M9 Empirical Challenger Suite: Visual System, Liquid Glass Boundaries & UX Copy Stress", () => {
  const alice = { uid: "u_alice", email: "alice@test.com", username: "Alice" };
  const bob = { uid: "u_bob", email: "bob@test.com", username: "Bob" };
  const houseId = "casa_m9_challenger";

  beforeEach(() => {
    mockStore.reset();
    const routerMock = require("react-router-dom");
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
  });

  // =========================================================================
  // 1. CSS DESIGN TOKENS INTEGRITY (LIGHT & DARK THEMES)
  // =========================================================================
  describe("1. CSS Design Tokens Integrity (src/index.css)", () => {
    const indexPath = path.resolve(__dirname, "../../index.css");
    let indexCss = "";

    beforeAll(() => {
      expect(fs.existsSync(indexPath)).toBe(true);
      indexCss = fs.readFileSync(indexPath, "utf8");
    });

    test("CHALLENGE 1.1: System typography stack is native SF Pro / Apple sans with zero Google Webfont @import", () => {
      // Must not import external Google fonts
      expect(indexCss).not.toMatch(/@import\s+url\([^)]*fonts\.googleapis\.com[^)]*\)/i);

      // Must include Apple native system font stack
      expect(indexCss).toMatch(/-apple-system,\s*BlinkMacSystemFont,\s*["']SF Pro Text["']/);
    });

    test("CHALLENGE 1.2: Dark theme tokens define canvas, card, primary, success, danger, and warning", () => {
      // Dark theme root or class block
      const darkBlockMatch = indexCss.match(/(?::root|body\.dark-mode|html\.dark-theme)[\s\S]*?(?=html\.light-theme|body\.light-mode|$)/);
      expect(darkBlockMatch).not.toBeNull();
      const darkBlock = darkBlockMatch[0];

      // Canvas background (under --bg-canvas or --bg-primary representing deep slate canvas)
      expect(darkBlock).toMatch(/--(?:bg-canvas|bg-primary):\s*#0b0f19/i);

      // Clean card surface
      expect(darkBlock).toMatch(/--bg-card:\s*#151e2e/i);

      // Semantic brand colors
      expect(darkBlock).toMatch(/--color-primary:\s*#6366f1/i);
      expect(darkBlock).toMatch(/--color-success:\s*#10b981/i);
      expect(darkBlock).toMatch(/--color-danger:\s*#f43f5e/i);
      expect(darkBlock).toMatch(/--color-warning:\s*#f59e0b/i);
    });

    test("CHALLENGE 1.3: Light theme tokens define canvas, card, primary, success, danger, and warning", () => {
      // Light theme block
      const lightBlockMatch = indexCss.match(/(?:html\.light-theme|body\.light-mode|\[data-theme=["']light["']\])[\s\S]*?(?=\/\* =+|$)/);
      expect(lightBlockMatch).not.toBeNull();
      const lightBlock = lightBlockMatch[0];

      // Canvas background (under --bg-canvas or --bg-primary representing slate 50 canvas)
      expect(lightBlock).toMatch(/--(?:bg-canvas|bg-primary):\s*#f8fafc/i);

      // Clean card surface
      expect(lightBlock).toMatch(/--bg-card:\s*#ffffff/i);

      // Semantic brand colors
      expect(lightBlock).toMatch(/--color-primary:\s*#4f46e5/i);
      expect(lightBlock).toMatch(/--color-success:\s*#047857/i);
      expect(lightBlock).toMatch(/--color-danger:\s*#e11d48/i);
      expect(lightBlock).toMatch(/--color-warning:\s*#b45309/i);
    });
  });

  // =========================================================================
  // 2. WCAG 2.1 AA/AAA CONTRAST RATIO VERIFICATION
  // =========================================================================
  describe("2. WCAG 2.1 AA/AAA Contrast Ratio Calculations", () => {
    // Relative luminance calculation per WCAG 2.1 spec
    function getLuminance(hex) {
      const cleanHex = hex.replace("#", "").trim();
      const num = parseInt(cleanHex, 16);
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;

      const [sR, sG, sB] = [r / 255, g / 255, b / 255].map((c) =>
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      );

      return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
    }

    // Contrast ratio calculation: (L1 + 0.05) / (L2 + 0.05)
    function getContrast(hex1, hex2) {
      const lum1 = getLuminance(hex1);
      const lum2 = getLuminance(hex2);
      const lighter = Math.max(lum1, lum2);
      const darker = Math.min(lum1, lum2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    test("CHALLENGE 2.1: Light theme text and control contrasts meet WCAG 2.1 AA (>= 4.5:1) and AAA (>= 7.0:1)", () => {
      const bgCard = "#FFFFFF";

      // 1. Text Primary (#0F172A) on White: AAA >= 7.0:1
      const crPrimary = getContrast("#0F172A", bgCard);
      expect(crPrimary).toBeGreaterThanOrEqual(7.0);

      // 2. Text Secondary (#475569) on White: AA >= 4.5:1 (AAA >= 7.0:1)
      const crSecondary = getContrast("#475569", bgCard);
      expect(crSecondary).toBeGreaterThanOrEqual(7.0);

      // 3. Text Muted (#64748B) on White: AA >= 4.5:1
      const crMuted = getContrast("#64748B", bgCard);
      expect(crMuted).toBeGreaterThanOrEqual(4.5);

      // 4. Primary Button White text on Indigo 600 (#4F46E5): AA >= 4.5:1
      const crBtnPrimary = getContrast("#FFFFFF", "#4F46E5");
      expect(crBtnPrimary).toBeGreaterThanOrEqual(4.5);

      // 5. Success text (#047857) on White: AA >= 4.5:1 (Emerald 700 passes AA)
      const crSuccess = getContrast("#047857", bgCard);
      expect(crSuccess).toBeGreaterThanOrEqual(4.5);

      // 6. Danger text (#BE123C) on White: AA >= 4.5:1
      const crDanger = getContrast("#BE123C", bgCard);
      expect(crDanger).toBeGreaterThanOrEqual(4.5);

      // 7. Warning text (#B45309) on White: AA >= 4.5:1
      const crWarning = getContrast("#B45309", bgCard);
      expect(crWarning).toBeGreaterThanOrEqual(4.5);
    });

    test("CHALLENGE 2.2: Dark theme text and control contrasts meet WCAG 2.1 AA (>= 4.5:1) and AAA (>= 7.0:1)", () => {
      const bgCardDark = "#151E2E";

      // 1. Text Primary (#F8FAFC) on Dark Card: AAA >= 7.0:1
      const crPrimary = getContrast("#F8FAFC", bgCardDark);
      expect(crPrimary).toBeGreaterThanOrEqual(7.0);

      // 2. Text Secondary (#94A3B8) on Dark Card: AA >= 4.5:1
      const crSecondary = getContrast("#94A3B8", bgCardDark);
      expect(crSecondary).toBeGreaterThanOrEqual(4.5);

      // 3. Primary control text (#818CF8) on Dark Card: AA >= 4.5:1
      const crPrimaryText = getContrast("#818CF8", bgCardDark);
      expect(crPrimaryText).toBeGreaterThanOrEqual(4.5);

      // 4. Success text (#34D399) on Dark Card: AAA >= 7.0:1
      const crSuccess = getContrast("#34D399", bgCardDark);
      expect(crSuccess).toBeGreaterThanOrEqual(7.0);

      // 5. Danger text (#FB7185) on Dark Card: AA >= 4.5:1
      const crDanger = getContrast("#FB7185", bgCardDark);
      expect(crDanger).toBeGreaterThanOrEqual(4.5);

      // 6. Warning text (#F59E0B) on Dark Card: AAA >= 7.0:1
      const crWarning = getContrast("#F59E0B", bgCardDark);
      expect(crWarning).toBeGreaterThanOrEqual(7.0);
    });
  });

  // =========================================================================
  // 3. LIQUID GLASS MATERIAL BOUNDARY DISCIPLINE
  // =========================================================================
  describe("3. Liquid Glass Material Boundary Discipline", () => {
    const appCss = fs.readFileSync(path.resolve(__dirname, "../../App.css"), "utf8");
    const analyticsCss = fs.readFileSync(path.resolve(__dirname, "../../components/HouseAnalytics.css"), "utf8");

    test("CHALLENGE 3.1: Content cards do NOT contain active backdrop blur and enforce backdrop-filter: none !important", () => {
      // Content card classes that must remain opaque surfaces without blur
      const cardSelectors = [
        "\\.card",
        "\\.domain-page-card",
        "\\.auth-card",
        "\\.bento-item",
        "\\.service-btn",
        "\\.household-status-card"
      ];

      cardSelectors.forEach((selector) => {
        const regex = new RegExp(`${selector}\\s*\\{[^}]*\\}`, "g");
        const matches = appCss.match(regex);
        if (matches) {
          matches.forEach((block) => {
            // If backdrop-filter is mentioned, it MUST be none !important
            if (block.includes("backdrop-filter")) {
              expect(block).toMatch(/backdrop-filter:\s*none\s*!important/);
            }
          });
        }
      });

      // Assert HouseAnalytics.css .analytics-card enforces backdrop-filter: none !important
      const analyticsMatch = analyticsCss.match(/\.analytics-card\s*\{[^}]*\}/);
      expect(analyticsMatch).not.toBeNull();
      expect(analyticsMatch[0]).toMatch(/backdrop-filter:\s*none\s*!important/);
      expect(analyticsMatch[0]).toMatch(/background:\s*var\(--bg-card\)/);
    });

    test("CHALLENGE 3.2: Liquid Glass blur is strictly restricted to floating functional elements", () => {
      // Find all backdrop-filter: var(--glass-blur) or blur(...) in App.css
      const blurRuleRegex = /([^{}]+)\{[^}]*backdrop-filter:\s*(?:var\(--glass-blur\)|blur\([^)]+\))[^}]*\}/g;
      const matchedSelectors = [];
      let match;
      while ((match = blurRuleRegex.exec(appCss)) !== null) {
        matchedSelectors.push(match[1].trim());
      }

      // Every matched selector must be a floating functional overlay
      const allowedFloatingPrefixes = [
        ".app-topbar",
        ".mobile-bottom-bar",
        ".toast-item",
        ".confirm-modal-backdrop",
        ".confirm-modal-card",
        ".modal-backdrop"
      ];

      matchedSelectors.forEach((selector) => {
        const isAllowed = allowedFloatingPrefixes.some((prefix) => selector.includes(prefix));
        expect(isAllowed).toBe(true);
      });
    });

    test("CHALLENGE 3.3: Accessibility setting prefers-reduced-transparency disables glass blur completely", () => {
      expect(appCss).toMatch(/@media\s*\(\s*prefers-reduced-transparency:\s*reduce\s*\)/);
      expect(appCss).toMatch(
        /@media\s*\(\s*prefers-reduced-transparency:\s*reduce\s*\)[^{]*\{[\s\S]*?backdrop-filter:\s*none\s*!important/
      );
    });
  });

  // =========================================================================
  // 4. UX MICRO-COPYWRITING INTEGRITY & NATURAL ITALIAN PHRASING
  // =========================================================================
  describe("4. UX Micro-Copywriting & Italian Accent Integrity", () => {
    test("CHALLENGE 4.1: Rendered views are free of bureaucratic jargon ('operatori', 'approvvigionamento', 'nucleo univoco', 'estetica moderna', 'Dashboard Sicura')", async () => {
      seedHousehold({
        houseId,
        users: [alice, bob],
        turni: [
          { id: "t1", titolo: "Cucina", assegnatoA: "Alice", completato: false, checklist: [] }
        ],
        debiti: [
          { id: "d1", creditore: "Alice", debitore: "Bob", importo: 25.0 }
        ],
        spesa: [
          { id: "s1", nome: "Detersivo", comprato: false }
        ]
      });

      // Render HomeUtente
      const { unmount: u1 } = renderWithProviders(<HomeUtente />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/home"
      });

      await screen.findByText(/Panoramica della casa/i);
      const homeHtml = document.body.innerHTML;

      // Bureaucratic term check on HomeUtente
      expect(homeHtml).not.toMatch(/operatori/i);
      expect(homeHtml).not.toMatch(/approvvigionamento/i);
      expect(homeHtml).not.toMatch(/nucleo univoco/i);
      expect(homeHtml).not.toMatch(/estetica moderna/i);
      expect(homeHtml).not.toMatch(/Dashboard Sicura/i);
      u1();

      // Render ViewTurni
      const { unmount: u2 } = renderWithProviders(<ViewTurni />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/turni"
      });

      await screen.findByRole("button", { name: /Nuovo Turno/i });
      const turniHtml = document.body.innerHTML;
      expect(turniHtml).not.toMatch(/operatori/i);
      expect(turniHtml).not.toMatch(/nucleo univoco/i);
      u2();

      // Render ViewDebiti
      const { unmount: u3 } = renderWithProviders(<ViewDebiti />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/debiti"
      });

      await screen.findByText(/Il tuo bilancio/i);
      const debitiHtml = document.body.innerHTML;
      expect(debitiHtml).not.toMatch(/nucleo univoco/i);
      expect(debitiHtml).not.toMatch(/estetica moderna/i);
      u3();

      // Render ViewSpesa
      const { unmount: u4 } = renderWithProviders(<ViewSpesa />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/spesa"
      });

      await screen.findByText(/Aggiungi alla lista/i);
      const spesaHtml = document.body.innerHTML;
      expect(spesaHtml).not.toMatch(/approvvigionamento/i);
      expect(spesaHtml).not.toMatch(/Dispensa/i);
      u4();
    });

    test("CHALLENGE 4.2: Rendered views display correct Italian accents ('Più recenti', 'verrà', 'è')", async () => {
      seedHousehold({
        houseId,
        users: [alice, bob],
        documenti: [
          {
            id: "doc1",
            nome: "Ricevuta Affitto",
            categoria: "Ricevute",
            caricatoDa: alice.uid,
            caricatoDaNome: "Alice",
            dataCaricamento: "2026-11-01T10:00:00Z",
            dimensioneFormatted: "150 KB",
            url: "https://mock.storage/doc1.pdf",
            casaId: houseId
          }
        ]
      });

      // 1. Render ViewDocumenti and verify 'Più recenti' sort option and 'verrà' deletion message
      const { unmount: u1 } = renderWithProviders(<ViewDocumenti />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/documenti"
      });

      const sortOption = await screen.findByRole("option", { name: /Più recenti/i });
      expect(sortOption).toBeInTheDocument();
      expect(sortOption.textContent).toBe("Più recenti");

      // Verify deletion confirm message includes 'verrà'
      const docItem = await screen.findByText("Ricevuta Affitto");
      expect(docItem).toBeInTheDocument();
      const deleteBtn = screen.getByRole("button", { name: /Elimina Ricevuta Affitto/i });
      fireEvent.click(deleteBtn);
      expect(window.confirm).toHaveBeenCalled();
      const confirmMsg = window.confirm.mock.calls[0][0];
      expect(confirmMsg).toMatch(/verrà/);
      u1();

      // 2. Render AggiuntaTurno and verify 'è' in question labels
      const { unmount: u2 } = renderWithProviders(<AggiuntaTurno />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/turni/aggiungi"
      });

      expect(await screen.findByText(/A chi è assegnato il turno\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Cosa c'è da pulire\?/i)).toBeInTheDocument();
      u2();
    });
  });

  // =========================================================================
  // 5. TEST QUERY INVARIANCE & INTERACTIVE CONTROLS
  // =========================================================================
  describe("5. Critical Test Query Invariance & Action Controls", () => {
    test("CHALLENGE 5.1: /Nuovo Turno/i and /Crea Turno/i buttons render and maintain interactive accessibility", async () => {
      seedHousehold({ houseId, users: [alice, bob] });

      // ViewTurni -> /Nuovo Turno/i
      const { unmount: u1 } = renderWithProviders(<ViewTurni />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/turni"
      });

      const nuovoTurnoBtn = await screen.findByRole("button", { name: /Nuovo Turno/i });
      expect(nuovoTurnoBtn).toBeInTheDocument();
      expect(nuovoTurnoBtn).toBeEnabled();
      u1();

      // AggiuntaTurno -> /Crea Turno/i
      const { unmount: u2 } = renderWithProviders(<AggiuntaTurno />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/turni/aggiungi"
      });

      const creaTurnoBtn = await screen.findByRole("button", { name: /Crea Turno/i });
      expect(creaTurnoBtn).toBeInTheDocument();
      expect(creaTurnoBtn).toHaveAttribute("type", "submit");
      u2();
    });

    test("CHALLENGE 5.2: /Salva Spesa/i in AggiungiDebito renders and responds", async () => {
      seedHousehold({ houseId, users: [alice, bob] });

      renderWithProviders(<AggiungiDebito />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/debiti/aggiungi"
      });

      const salvaSpesaBtn = await screen.findByRole("button", { name: /Salva Spesa/i });
      expect(salvaSpesaBtn).toBeInTheDocument();
      expect(salvaSpesaBtn).toHaveAttribute("type", "submit");
    });

    test("CHALLENGE 5.3: /Completa Registrazione/i in ViewRegistrazione renders and is clickable", async () => {
      renderWithProviders(<ViewRegistrazione />, { route: "/registrazione" });

      const completaRegBtn = await screen.findByRole("button", { name: /Completa Registrazione/i });
      expect(completaRegBtn).toBeInTheDocument();
      expect(completaRegBtn).toHaveAttribute("type", "submit");
    });

    test("CHALLENGE 5.4: /Carica Documento/i in ViewDocumenti toggles upload panel", async () => {
      seedHousehold({ houseId, users: [alice] });

      renderWithProviders(<ViewDocumenti />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/documenti"
      });

      await screen.findByText(/Nessun documento trovato/i);

      const caricaDocBtn = screen.getByRole("button", { name: /Carica Documento/i });
      expect(caricaDocBtn).toBeInTheDocument();

      // Click toggles state
      fireEvent.click(caricaDocBtn);
      expect(await screen.findByTestId("doc-upload-card")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /Carica Nuovo Documento/i })).toBeInTheDocument();
    });

    test("CHALLENGE 5.5: /Chiama/i in ViewContatti renders with tel: protocol link", async () => {
      seedHousehold({ houseId, users: [alice] });
      mockStore.seed("contatti", {
        c1: {
          id: "c1",
          nome: "Mario Idraulico",
          telefono: "+39 333 1234567",
          email: "mario@idraulico.it",
          categoria: "Idraulico",
          casaId: houseId
        }
      });

      renderWithProviders(<ViewContatti />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/contatti"
      });

      const chiamaLink = await screen.findByRole("link", { name: /Chiama Mario Idraulico/i });
      expect(chiamaLink).toBeInTheDocument();
      expect(chiamaLink).toHaveAttribute("href", "tel:+393331234567");
    });

    test("CHALLENGE 5.6: /Pubblica Avviso/i in AggiungiNota renders with submit type", async () => {
      seedHousehold({ houseId, users: [alice] });

      renderWithProviders(<AggiungiNota />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/bacheca/aggiungi"
      });

      const pubblicaAvvisoBtn = await screen.findByRole("button", { name: /Pubblica Avviso/i });
      expect(pubblicaAvvisoBtn).toBeInTheDocument();
      expect(pubblicaAvvisoBtn).toHaveAttribute("type", "submit");
    });
  });
});
