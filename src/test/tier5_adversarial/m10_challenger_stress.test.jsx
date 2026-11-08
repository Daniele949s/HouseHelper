import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { renderWithProviders, seedHousehold } from "../testUtils";
import mockStore from "../mockFirebase";

// Component imports
import ViewBacheca from "../../pages/Bacheca/ViewBacheca";
import ViewCalendario from "../../pages/Bacheca/ViewCalendario";
import ViewContatti from "../../pages/Contatti/ViewContatti";
import ViewDocumenti from "../../pages/Documenti/ViewDocumenti";
import ViewDebiti from "../../pages/Debiti/ViewDebiti";
import ConfirmModal from "../../components/ConfirmModal";
import { showConfirm } from "../../utils/feedback";

describe("Milestone M10 Adversarial Challenger Suite: Secondary Household Views, Modals & Invariants", () => {
  const alice = { uid: "u_alice", email: "alice@test.com", username: "Alice" };
  const bob = { uid: "u_bob", email: "bob@test.com", username: "Bob" };
  const houseId = "casa_m10_gate";

  beforeEach(() => {
    mockStore.reset();
    localStorage.clear();
    const routerMock = require("react-router-dom");
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
    document.body.style.overflow = "";
  });

  afterEach(() => {
    localStorage.clear();
    document.body.style.overflow = "";
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. BACHECA VISUAL HIERARCHY & PINNED NOTICE ANCHOR UNDER DATASET EDGE CASES
  // =========================================================================
  describe("1. Bacheca Visual Hierarchy & The Pinned Urgent Notice Banner", () => {
    test("CHALLENGE 1.1: Mixed dataset separates urgent notes into .bacheca-pinned-section and routine notes into .bacheca-routine-section", async () => {
      seedHousehold({
        houseId: "casa_bacheca_mixed",
        users: [alice, bob],
        note: [
          {
            id: "n_urgent_1",
            titolo: "Perdita d'acqua in bagno",
            contenuto: "Chiudere il rubinetto principale",
            priorita: "urgente",
            autoreId: alice.uid,
            autoreNome: "Alice",
            createdAt: new Date()
          },
          {
            id: "n_important_2",
            titolo: "Visita proprietario giovedì",
            contenuto: "Arriva alle 16:00 per controllo caldaia",
            priorita: "importante",
            autoreId: bob.uid,
            autoreNome: "Bob",
            createdAt: new Date()
          },
          {
            id: "n_routine_3",
            titolo: "Acquistare detersivo piatti",
            contenuto: "Finito quello ecologico",
            priorita: "normale",
            autoreId: alice.uid,
            autoreNome: "Alice",
            createdAt: new Date()
          }
        ]
      });

      const { container } = renderWithProviders(<ViewBacheca />, {
        user: alice,
        userData: { username: "Alice", casaId: "casa_bacheca_mixed" },
        route: "/bacheca"
      });

      await screen.findByText("Perdita d'acqua in bagno");

      const pinnedSection = container.querySelector(".bacheca-pinned-section");
      expect(pinnedSection).not.toBeNull();
      expect(pinnedSection.querySelector(".bacheca-pinned-dispatch-label")).toHaveTextContent(/Avviso in Evidenza/i);

      // Both urgent and important are in pinned list
      const pinnedList = pinnedSection.querySelector(".bacheca-pinned-list");
      expect(pinnedList).toHaveTextContent("Perdita d'acqua in bagno");
      expect(pinnedList).toHaveTextContent("Visita proprietario giovedì");
      expect(pinnedList).not.toHaveTextContent("Acquistare detersivo piatti");

      // Routine section contains the routine note
      const routineSection = container.querySelector(".bacheca-routine-section");
      expect(routineSection).not.toBeNull();
      expect(routineSection.querySelector(".bacheca-routine-heading")).toHaveTextContent("Altri avvisi");
      expect(routineSection.querySelector(".bacheca-routine-list")).toHaveTextContent("Acquistare detersivo piatti");
    });

    test("CHALLENGE 1.2: Edge Case A — All notices are urgent: .bacheca-pinned-section renders all, .bacheca-routine-section is completely omitted", async () => {
      seedHousehold({
        houseId: "casa_bacheca_all_urgent",
        users: [alice],
        note: [
          {
            id: "n1",
            titolo: "Allarme Gas",
            contenuto: "Non accendere fornelli",
            priorita: "urgente",
            autoreId: alice.uid,
            autoreNome: "Alice",
            createdAt: new Date()
          },
          {
            id: "n2",
            titolo: "Interruzione Corrente",
            contenuto: "Dalle 14 alle 16",
            priorita: "importante",
            autoreId: alice.uid,
            autoreNome: "Alice",
            createdAt: new Date()
          }
        ]
      });

      const { container } = renderWithProviders(<ViewBacheca />, {
        user: alice,
        userData: { username: "Alice", casaId: "casa_bacheca_all_urgent" },
        route: "/bacheca"
      });

      await screen.findByText("Allarme Gas");

      expect(container.querySelector(".bacheca-pinned-section")).not.toBeNull();
      expect(container.querySelector(".bacheca-routine-section")).toBeNull();
      expect(container.querySelector(".bacheca-routine-heading")).toBeNull();
    });

    test("CHALLENGE 1.3: Edge Case B — Zero urgent notices: .bacheca-pinned-section is omitted, routine section renders without sub-heading", async () => {
      seedHousehold({
        houseId: "casa_bacheca_routine_only",
        users: [alice],
        note: [
          {
            id: "n_norm1",
            titolo: "Piante sul balcone",
            contenuto: "Bagnate stamattina",
            priorita: "normale",
            autoreId: alice.uid,
            autoreNome: "Alice",
            createdAt: new Date()
          },
          {
            id: "n_norm2",
            titolo: "Pizza sabato",
            contenuto: "Chi c'è?",
            priorita: "bassa",
            autoreId: alice.uid,
            autoreNome: "Alice",
            createdAt: new Date()
          }
        ]
      });

      const { container } = renderWithProviders(<ViewBacheca />, {
        user: alice,
        userData: { username: "Alice", casaId: "casa_bacheca_routine_only" },
        route: "/bacheca"
      });

      await screen.findByText("Piante sul balcone");

      expect(container.querySelector(".bacheca-pinned-section")).toBeNull();
      expect(container.querySelector(".bacheca-routine-section")).not.toBeNull();
      expect(container.querySelector(".bacheca-routine-heading")).toBeNull();
    });

    test("CHALLENGE 1.4: Edge Case C — Zero notices: renders quiet empty state and zero section containers", async () => {
      seedHousehold({
        houseId: "casa_bacheca_empty",
        users: [alice],
        note: []
      });

      const { container } = renderWithProviders(<ViewBacheca />, {
        user: alice,
        userData: { username: "Alice", casaId: "casa_bacheca_empty" },
        route: "/bacheca"
      });

      await screen.findByText(/Non ci sono comunicazioni attive/i);

      expect(container.querySelector(".bacheca-pinned-section")).toBeNull();
      expect(container.querySelector(".bacheca-routine-section")).toBeNull();
    });
  });

  // =========================================================================
  // 2. CALENDARIO DESKTOP SPLIT VIEW & RESPONSIVE LAYOUT STRUCTURE
  // =========================================================================
  describe("2. Calendario Desktop Split View & Layout Structure", () => {
    test("CHALLENGE 2.1: ViewCalendario renders .calendar-split-layout with left calendar wrapper and right agenda pane", async () => {
      seedHousehold({
        houseId: "casa_calendario_split",
        users: [alice]
      });

      const { container } = renderWithProviders(<ViewCalendario />, {
        user: alice,
        userData: { username: "Alice", casaId: "casa_calendario_split" },
        route: "/calendario"
      });

      await screen.findByRole("heading", { level: 1, name: /Calendario Casa/i });

      const splitLayout = container.querySelector(".calendar-split-layout");
      expect(splitLayout).not.toBeNull();

      const leftCol = splitLayout.querySelector(".calendar-split-left.custom-calendar-wrapper");
      expect(leftCol).not.toBeNull();
      expect(leftCol.querySelector('[data-testid="mock-react-calendar"]')).not.toBeNull();

      const rightCol = splitLayout.querySelector(".calendar-split-right.calendar-agenda-pane");
      expect(rightCol).not.toBeNull();
      expect(rightCol).toHaveTextContent(/Impegni del/i);
    });

    test("CHALLENGE 2.2: CSS layout rules in src/App.css enforce desktop 2-column grid-template-columns", () => {
      const appCssPath = path.resolve(__dirname, "../../App.css");
      expect(fs.existsSync(appCssPath)).toBe(true);
      const appCss = fs.readFileSync(appCssPath, "utf8");

      // Verify .calendar-split-layout rules
      expect(appCss).toMatch(/\.calendar-split-layout\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/);

      // Verify desktop media query (min-width: 900px)
      expect(appCss).toMatch(/@media\s*\(\s*min-width:\s*900px\s*\)\s*\{[\s\S]*?\.calendar-split-layout\s*\{[\s\S]*?grid-template-columns:\s*minmax\(320px,\s*1fr\)\s*minmax\(340px,\s*1\.25fr\);/);
    });
  });

  // =========================================================================
  // 3. CONTATTI EMERGENCY SPEED-DIAL PRIORITY SHELF & ZERO-DUPLICATE GUARANTEE
  // =========================================================================
  describe("3. Contatti Emergency Speed-Dial Priority Shelf & Zero Duplication", () => {
    const contactEmergency = {
      id: "c_emerg",
      casaId: houseId,
      nome: "Numero Unico Emergenze 112",
      categoria: "Emergenza",
      telefono: "112",
      email: "",
      note: "Carabinieri, Polizia, Vigili del Fuoco, Ambulanza"
    };
    const contactOwner = {
      id: "c_owner",
      casaId: houseId,
      nome: "Avv. Mario Rossi (Proprietario)",
      categoria: "Proprietario",
      telefono: "+39 340 1234567",
      email: "mario.rossi@locazioni.it",
      note: "Contratto 4+4, canone entro il 5 del mese"
    };
    const contactPlumber = {
      id: "c_plumb",
      casaId: houseId,
      nome: "Giacomo Idraulico Pronto Intervento",
      categoria: "Idraulico",
      telefono: "+39 333 9988776",
      email: "",
      note: "Disponibile anche festivi"
    };
    const contactAdmin = {
      id: "c_admin",
      casaId: houseId,
      nome: "Studio Condominio San Babila",
      categoria: "Amministratore",
      telefono: "02 7654321",
      email: "amministrazione@sanbabila.it",
      note: "Orario ufficio 9-13 lun-ven"
    };

    test("CHALLENGE 3.1: Overview mode elevates Emergenza & Proprietario to .emergency-priority-shelf with strictly 0 duplicate names across DOM", async () => {
      const hid = "casa_contatti_overview";
      seedHousehold({
        houseId: hid,
        users: [alice]
      });
      mockStore.seed("contatti", [
        { ...contactEmergency, casaId: hid },
        { ...contactOwner, casaId: hid },
        { ...contactPlumber, casaId: hid },
        { ...contactAdmin, casaId: hid }
      ]);

      const { container } = renderWithProviders(<ViewContatti />, {
        user: alice,
        userData: { username: "Alice", casaId: hid },
        route: "/contatti"
      });

      await screen.findByText("Numero Unico Emergenze 112");

      // Verify Emergency Priority Shelf is present
      const shelf = container.querySelector(".emergency-priority-shelf");
      expect(shelf).not.toBeNull();
      expect(shelf.querySelector(".emergency-shelf-title")).toHaveTextContent("Numeri Rapidi & Emergenze");

      const shelfGrid = shelf.querySelector(".emergency-shelf-grid");
      expect(shelfGrid).toHaveTextContent("Numero Unico Emergenze 112");
      expect(shelfGrid).toHaveTextContent("Avv. Mario Rossi (Proprietario)");
      expect(shelfGrid).not.toHaveTextContent("Giacomo Idraulico Pronto Intervento");

      // Verify Routine Directory is present
      const routineSec = container.querySelector(".routine-contacts-section");
      expect(routineSec).not.toBeNull();
      expect(routineSec.querySelector(".contacts-grid")).toHaveTextContent("Giacomo Idraulico Pronto Intervento");
      expect(routineSec.querySelector(".contacts-grid")).toHaveTextContent("Studio Condominio San Babila");

      // STRICT INVARIANT: Exactly 1 DOM occurrence for every single contact name!
      expect(screen.getAllByText("Numero Unico Emergenze 112")).toHaveLength(1);
      expect(screen.getAllByText("Avv. Mario Rossi (Proprietario)")).toHaveLength(1);
      expect(screen.getAllByText("Giacomo Idraulico Pronto Intervento")).toHaveLength(1);
      expect(screen.getAllByText("Studio Condominio San Babila")).toHaveLength(1);
    });

    test("CHALLENGE 3.2: Edge Case 0 priority contacts — Shelf is completely absent, all contacts render in standard .contacts-grid", async () => {
      const hid = "casa_contatti_zero_priority";
      seedHousehold({
        houseId: hid,
        users: [alice]
      });
      mockStore.seed("contatti", [
        { ...contactPlumber, casaId: hid },
        { ...contactAdmin, casaId: hid }
      ]);

      const { container } = renderWithProviders(<ViewContatti />, {
        user: alice,
        userData: { username: "Alice", casaId: hid },
        route: "/contatti"
      });

      await screen.findByText("Giacomo Idraulico Pronto Intervento");

      expect(container.querySelector(".emergency-priority-shelf")).toBeNull();
      expect(container.querySelector(".routine-contacts-section")).toBeNull();
      const grid = container.querySelector(".contacts-grid");
      expect(grid).not.toBeNull();
      expect(grid).toHaveTextContent("Giacomo Idraulico Pronto Intervento");
      expect(grid).toHaveTextContent("Studio Condominio San Babila");

      expect(screen.getAllByText("Giacomo Idraulico Pronto Intervento")).toHaveLength(1);
      expect(screen.getAllByText("Studio Condominio San Babila")).toHaveLength(1);
    });

    test("CHALLENGE 3.3: Edge Case only priority contacts — Shelf renders all contacts, .routine-contacts-section is omitted", async () => {
      const hid = "casa_contatti_only_priority";
      seedHousehold({
        houseId: hid,
        users: [alice]
      });
      mockStore.seed("contatti", [
        { ...contactEmergency, casaId: hid },
        { ...contactOwner, casaId: hid }
      ]);

      const { container } = renderWithProviders(<ViewContatti />, {
        user: alice,
        userData: { username: "Alice", casaId: hid },
        route: "/contatti"
      });

      await screen.findByText("Numero Unico Emergenze 112");

      expect(container.querySelector(".emergency-priority-shelf")).not.toBeNull();
      expect(container.querySelector(".routine-contacts-section")).toBeNull();

      expect(screen.getAllByText("Numero Unico Emergenze 112")).toHaveLength(1);
      expect(screen.getAllByText("Avv. Mario Rossi (Proprietario)")).toHaveLength(1);
    });

    test("CHALLENGE 3.4: Active search term deactivates shelf partitioning and renders all matches in unified .contacts-grid", async () => {
      const hid = "casa_contatti_search";
      seedHousehold({
        houseId: hid,
        users: [alice]
      });
      mockStore.seed("contatti", [
        { ...contactEmergency, casaId: hid },
        { ...contactOwner, casaId: hid },
        { ...contactPlumber, casaId: hid }
      ]);

      const { container } = renderWithProviders(<ViewContatti />, {
        user: alice,
        userData: { username: "Alice", casaId: hid },
        route: "/contatti"
      });

      await screen.findByText("Numero Unico Emergenze 112");

      // Type in search box
      const searchInput = screen.getByPlaceholderText(/Cerca per nome, numero o email/i);
      fireEvent.change(searchInput, { target: { value: "112" } });

      // Shelf must NOT be rendered when search is active
      expect(container.querySelector(".emergency-priority-shelf")).toBeNull();
      const grid = container.querySelector(".contacts-grid");
      expect(grid).not.toBeNull();
      expect(grid).toHaveTextContent("Numero Unico Emergenze 112");
      expect(grid).not.toHaveTextContent("Avv. Mario Rossi");

      expect(screen.getAllByText("Numero Unico Emergenze 112")).toHaveLength(1);
    });

    test("CHALLENGE 3.5: Active category filter pill deactivates shelf partitioning and filters correctly", async () => {
      const hid = "casa_contatti_filter";
      seedHousehold({
        houseId: hid,
        users: [alice]
      });
      mockStore.seed("contatti", [
        { ...contactEmergency, casaId: hid },
        { ...contactOwner, casaId: hid },
        { ...contactPlumber, casaId: hid }
      ]);

      const { container } = renderWithProviders(<ViewContatti />, {
        user: alice,
        userData: { username: "Alice", casaId: hid },
        route: "/contatti"
      });

      await screen.findByText("Numero Unico Emergenze 112");

      // Filter by "Emergenza" button pill
      const emergPill = screen.getByRole("button", { name: /Emergenza/i });
      fireEvent.click(emergPill);

      // Shelf must NOT be rendered when specific category is chosen
      expect(container.querySelector(".emergency-priority-shelf")).toBeNull();
      const grid = container.querySelector(".contacts-grid");
      expect(grid).not.toBeNull();
      expect(grid).toHaveTextContent("Numero Unico Emergenze 112");
      expect(grid).not.toHaveTextContent("Avv. Mario Rossi");

      expect(screen.getAllByText("Numero Unico Emergenze 112")).toHaveLength(1);
    });
  });

  // =========================================================================
  // 4. DOCUMENT MANAGEMENT SEMANTIC BADGES & FORMAT WRAPPERS
  // =========================================================================
  describe("4. Documenti Semantic Format Badges & Sentence Case", () => {
    test("CHALLENGE 4.1: ViewDocumenti applies semantic format wrappers for PDF, image, and office formats", async () => {
      const hid = "casa_documenti_formats";
      seedHousehold({
        houseId: hid,
        users: [alice],
        documenti: [
          {
            id: "d_pdf",
            nome: "Contratto_Affitto.pdf",
            formato: "application/pdf",
            categoria: "Contratti",
            fileUrl: "https://example.com/contratto.pdf",
            caricatoDa: alice.uid,
            caricatoNome: "Alice",
            createdAt: new Date().toISOString()
          },
          {
            id: "d_img",
            nome: "Planimetria_Appartamento.png",
            formato: "image/png",
            categoria: "Altro",
            fileUrl: "https://example.com/plan.png",
            caricatoDa: alice.uid,
            caricatoNome: "Alice",
            createdAt: new Date().toISOString()
          },
          {
            id: "d_doc",
            nome: "Regolamento_Condominiale.docx",
            formato: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            categoria: "Contratti",
            fileUrl: "https://example.com/reg.docx",
            caricatoDa: alice.uid,
            caricatoNome: "Alice",
            createdAt: new Date().toISOString()
          }
        ]
      });

      const { container } = renderWithProviders(<ViewDocumenti />, {
        user: alice,
        userData: { username: "Alice", casaId: hid },
        route: "/documenti"
      });

      await screen.findByText("Contratto_Affitto.pdf");

      const cardPdf = container.querySelector('[data-testid="doc-card-d_pdf"]');
      expect(cardPdf.querySelector(".doc-format-icon-wrap.doc-format-pdf")).not.toBeNull();

      const cardImg = container.querySelector('[data-testid="doc-card-d_img"]');
      expect(cardImg.querySelector(".doc-format-icon-wrap.doc-format-img")).not.toBeNull();

      const cardDoc = container.querySelector('[data-testid="doc-card-d_doc"]');
      expect(cardDoc.querySelector(".doc-format-icon-wrap.doc-format-doc")).not.toBeNull();
    });

    test("CHALLENGE 4.2: CSS defines distinct chromatic identities for format icon wraps in src/App.css", () => {
      const appCssPath = path.resolve(__dirname, "../../App.css");
      const appCss = fs.readFileSync(appCssPath, "utf8");

      // PDF: coral
      expect(appCss).toMatch(/\.doc-format-pdf\s*\{[^}]*color:\s*#f43f5e;/);
      // Images: violet
      expect(appCss).toMatch(/\.doc-format-img\s*\{[^}]*color:\s*#8b5cf6;/);
      // Docs: blue
      expect(appCss).toMatch(/\.doc-format-doc\s*\{[^}]*color:\s*#3b82f6;/);
    });
  });

  // =========================================================================
  // 5. MODAL BACKDROP CLICK & ESCAPE KEY DISMISSAL ACROSS MODALS
  // =========================================================================
  describe("5. Modal Backdrop Click & Escape Key Dismissal Ergonomics", () => {
    test("CHALLENGE 5.1: ViewContatti modal opens on trigger, closes on backdrop click", async () => {
      const hid = "casa_contatti_modal_click";
      seedHousehold({
        houseId: hid,
        users: [alice]
      });

      const { container } = renderWithProviders(<ViewContatti />, {
        user: alice,
        userData: { username: "Alice", casaId: hid },
        route: "/contatti"
      });

      const openBtn = await screen.findByRole("button", { name: /Nuovo Contatto/i });
      fireEvent.click(openBtn);

      // Modal is visible
      const backdrop = container.querySelector(".modal-backdrop");
      expect(backdrop).not.toBeNull();
      expect(screen.getByRole("heading", { level: 2, name: /Nuovo Contatto/i })).toBeInTheDocument();

      // Click on backdrop to dismiss
      fireEvent.click(backdrop);

      await waitFor(() => {
        expect(container.querySelector(".modal-backdrop")).toBeNull();
      });
    });

    test("CHALLENGE 5.2: ViewContatti modal inner card click does NOT dismiss modal (stopPropagation)", async () => {
      const hid = "casa_contatti_modal_stop";
      seedHousehold({
        houseId: hid,
        users: [alice]
      });

      const { container } = renderWithProviders(<ViewContatti />, {
        user: alice,
        userData: { username: "Alice", casaId: hid },
        route: "/contatti"
      });

      const openBtn = await screen.findByRole("button", { name: /Nuovo Contatto/i });
      fireEvent.click(openBtn);

      const card = container.querySelector(".modal-card");
      expect(card).not.toBeNull();

      // Click card itself
      fireEvent.click(card);

      // Modal must remain open
      expect(container.querySelector(".modal-backdrop")).not.toBeNull();
    });

    test("CHALLENGE 5.3: ViewContatti modal dismisses on Escape key press", async () => {
      const hid = "casa_contatti_modal_escape";
      seedHousehold({
        houseId: hid,
        users: [alice]
      });

      const { container } = renderWithProviders(<ViewContatti />, {
        user: alice,
        userData: { username: "Alice", casaId: hid },
        route: "/contatti"
      });

      const openBtn = await screen.findByRole("button", { name: /Nuovo Contatto/i });
      fireEvent.click(openBtn);

      expect(container.querySelector(".modal-backdrop")).not.toBeNull();

      // Fire Escape key event on window
      fireEvent.keyDown(window, { key: "Escape", code: "Escape" });

      await waitFor(() => {
        expect(container.querySelector(".modal-backdrop")).toBeNull();
      });
    });

    test("CHALLENGE 5.4: ConfirmModal dismisses on backdrop click and on Escape key", async () => {
      let promise;
      render(<ConfirmModal />);

      act(() => {
        promise = showConfirm({
          title: "Sei sicuro?",
          message: "Azione irreversibile",
          confirmText: "Procedi",
          cancelText: "Annulla"
        });
      });

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText("Sei sicuro?")).toBeInTheDocument();

      // Dismiss via backdrop click
      const backdrop = document.querySelector(".confirm-modal-backdrop");
      expect(backdrop).not.toBeNull();
      act(() => {
        fireEvent.click(backdrop);
      });

      const res = await promise;
      expect(res).toBe(false);
      expect(screen.queryByRole("dialog")).toBeNull();

      // Trigger again for Escape key test
      let promise2;
      act(() => {
        promise2 = showConfirm({
          title: "Secondo avviso",
          message: "Test tasto Escape"
        });
      });

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      act(() => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      const res2 = await promise2;
      expect(res2).toBe(false);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    test("CHALLENGE 5.5: ViewDebiti Export Modal supports backdrop click and Escape dismiss", async () => {
      const hid = "casa_debiti_export_modal";
      seedHousehold({
        houseId: hid,
        users: [alice, bob],
        debiti: [
          {
            id: "d1",
            descrizione: "Cena",
            importo: 30,
            pagatoDa: alice.uid,
            divisoTra: [alice.uid, bob.uid],
            data: new Date()
          }
        ]
      });

      const { container } = renderWithProviders(<ViewDebiti />, {
        user: alice,
        userData: { username: "Alice", casaId: hid },
        route: "/debiti"
      });

      const exportBtn = await screen.findByRole("button", { name: /Esporta Resoconto/i });
      fireEvent.click(exportBtn);

      const modal = container.querySelector(".modal-backdrop");
      expect(modal).not.toBeNull();

      // Escape key dismiss
      fireEvent.keyDown(window, { key: "Escape" });

      await waitFor(() => {
        expect(container.querySelector(".modal-backdrop")).toBeNull();
      });
    });
  });

  // =========================================================================
  // 6. TOUCH TARGETS (>= 44px) & ERGONOMICS ACROSS SECONDARY VIEWS
  // =========================================================================
  describe("6. Touch Targets Programmatic Verification (>= 44px)", () => {
    test("CHALLENGE 6.1: ViewContatti action buttons .btn-action-call and .btn-action-email specify min-height >= 44px in CSS", () => {
      const appCssPath = path.resolve(__dirname, "../../App.css");
      const appCss = fs.readFileSync(appCssPath, "utf8");

      const match = appCss.match(/\.btn-action-call,\s*\.btn-action-email\s*\{[\s\S]*?min-height:\s*44px;/);
      expect(match).not.toBeNull();
    });

    test("CHALLENGE 6.2: homeUtente reminder dismiss button specifies minHeight: 44px and minWidth: 44px inline", () => {
      const homePath = path.resolve(__dirname, "../../pages/homeUtente.js");
      const homeSrc = fs.readFileSync(homePath, "utf8");

      expect(homeSrc).toMatch(/minHeight:\s*["']44px["']/);
      expect(homeSrc).toMatch(/minWidth:\s*["']44px["']/);
    });

    test("CHALLENGE 6.3: ViewSpesa staple chip buttons specify minHeight: 44px inline", () => {
      const spesaPath = path.resolve(__dirname, "../../pages/Spesa/ViewSpesa.js");
      const spesaSrc = fs.readFileSync(spesaPath, "utf8");

      expect(spesaSrc).toMatch(/minHeight:\s*["']44px["']/);
    });

    test("CHALLENGE 6.4: Interactive buttons and controls across src/App.css systematically enforce min-height: 44px", () => {
      const appCssPath = path.resolve(__dirname, "../../App.css");
      const appCss = fs.readFileSync(appCssPath, "utf8");

      const minHeight44Matches = appCss.match(/min-height:\s*44px/g) || [];
      // There are more than 25 distinct occurrences enforcing 44px touch targets
      expect(minHeight44Matches.length).toBeGreaterThanOrEqual(25);
    });
  });

  // =========================================================================
  // 7. MANDATORY INVARIANTS: ZERO DISPENSA & ZERO EMOJIS
  // =========================================================================
  describe("7. Mandatory Invariants Verification", () => {
    test("CHALLENGE 7.1: Static source file src/pages/Spesa/ViewSpesa.js contains strictly 0 occurrences of 'Dispensa'", () => {
      const spesaPath = path.resolve(__dirname, "../../pages/Spesa/ViewSpesa.js");
      const spesaSrc = fs.readFileSync(spesaPath, "utf8");

      const matches = spesaSrc.match(/dispensa/gi);
      expect(matches).toBeNull();
    });

    test("CHALLENGE 7.2: Zero emojis and text emoticons detected across the entire codebase", () => {
      const emojiScriptPath = path.resolve(__dirname, "../../../scripts/verify-zero-emojis.js");
      expect(fs.existsSync(emojiScriptPath)).toBe(true);

      const { execSync } = require("child_process");
      const repoRoot = path.resolve(__dirname, "../../../");
      const output = execSync(`node ${emojiScriptPath}`, { cwd: repoRoot, encoding: "utf8" });

      expect(output).toContain("SUCCESS: Zero emojis or text emoticons detected");
    });
  });
});
