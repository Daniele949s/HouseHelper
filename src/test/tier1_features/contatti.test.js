import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders, seedHousehold } from "../testUtils";
import mockStore from "../mockFirebase";
import ViewContatti from "../../pages/Contatti/ViewContatti";
import { safeTelUrl, safeMailtoUrl, sanitizePhone } from "../../utils/security";

describe("Tier 1: Contacts Directory (Contatti) Feature Coverage", () => {
  const alice = { uid: "u_alice", email: "alice@test.com", username: "Alice" };
  const bob = { uid: "u_bob", email: "bob@test.com", username: "Bob" };

  beforeEach(() => {
    mockStore.reset();
    const routerMock = require("react-router-dom");
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  test("T1.C1 — ViewContatti renders empty state when no contacts exist", async () => {
    seedHousehold({
      houseId: "casa_1",
      users: [alice, bob]
    });

    renderWithProviders(<ViewContatti />, {
      user: alice,
      userData: { username: "Alice", casaId: "casa_1" },
      route: "/contatti"
    });

    const emptyTitle = await screen.findByText(/Nessun contatto trovato/i);
    expect(emptyTitle).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nuovo Contatto/i })).toBeInTheDocument();
  });

  test("T1.C2 — Adds a new contact with valid fields and renders it in the directory", async () => {
    seedHousehold({
      houseId: "casa_1",
      users: [alice, bob]
    });

    renderWithProviders(<ViewContatti />, {
      user: alice,
      userData: { username: "Alice", casaId: "casa_1" },
      route: "/contatti"
    });

    const openBtn = await screen.findByRole("button", { name: /Nuovo Contatto/i });
    fireEvent.click(openBtn);

    const nomeInput = screen.getByLabelText(/Nome o Intestazione/i);
    const catSelect = screen.getByLabelText(/Categoria/i);
    const telInput = screen.getByLabelText(/Numero di Telefono/i);
    const emailInput = screen.getByLabelText(/Indirizzo Email/i);
    const noteInput = screen.getByLabelText(/Note Aggiuntive/i);
    const saveBtn = screen.getByRole("button", { name: /Salva Contatto/i });

    fireEvent.change(nomeInput, { target: { value: "Idraulico Luigi" } });
    fireEvent.change(catSelect, { target: { value: "Idraulico" } });
    fireEvent.change(telInput, { target: { value: "+39 347 1234567" } });
    fireEvent.change(emailInput, { target: { value: "luigi.idraulico@test.it" } });
    fireEvent.change(noteInput, { target: { value: "Reperibile anche il sabato" } });

    fireEvent.click(saveBtn);

    const contactName = await screen.findByText("Idraulico Luigi");
    expect(contactName).toBeInTheDocument();
    expect(screen.getByText("+39 347 1234567")).toBeInTheDocument();
    expect(screen.getByText("luigi.idraulico@test.it")).toBeInTheDocument();
    expect(screen.getByText(/Reperibile anche il sabato/i)).toBeInTheDocument();

    // Verify stored in MockFirebase
    const contactsInStore = Object.values(mockStore.getCollection("contatti"));
    expect(contactsInStore.length).toBe(1);
    expect(contactsInStore[0].nome).toBe("Idraulico Luigi");
    expect(contactsInStore[0].categoria).toBe("Idraulico");
    expect(contactsInStore[0].casaId).toBe("casa_1");
  });

  test("T1.C3 — Prevents submission with invalid email or missing details", async () => {
    seedHousehold({
      houseId: "casa_1",
      users: [alice, bob]
    });

    renderWithProviders(<ViewContatti />, {
      user: alice,
      userData: { username: "Alice", casaId: "casa_1" },
      route: "/contatti"
    });

    const openBtn = await screen.findByRole("button", { name: /Nuovo Contatto/i });
    fireEvent.click(openBtn);

    const nomeInput = screen.getByLabelText(/Nome o Intestazione/i);
    const emailInput = screen.getByLabelText(/Indirizzo Email/i);
    const saveBtn = screen.getByRole("button", { name: /Salva Contatto/i });

    // Invalid email test
    fireEvent.change(nomeInput, { target: { value: "Test Name" } });
    fireEvent.change(emailInput, { target: { value: "invalid-email-string" } });
    fireEvent.click(saveBtn);

    const errorAlert = await screen.findByRole("alert");
    expect(errorAlert).toHaveTextContent(/L'indirizzo email inserito non è valido/i);

    // No document should be added
    expect(Object.keys(mockStore.getCollection("contatti"))).toHaveLength(0);
  });

  test("T1.C4 — Filters contacts by category pill and search bar", async () => {
    seedHousehold({
      houseId: "casa_1",
      users: [alice, bob]
    });

    mockStore.seed("contatti", {
      c_1: {
        id: "c_1",
        nome: "Dott. Rossi (Proprietario)",
        categoria: "Proprietario",
        telefono: "02 123456",
        email: "rossi@prop.it",
        casaId: "casa_1"
      },
      c_2: {
        id: "c_2",
        nome: "Pronto Soccorso",
        categoria: "Emergenza",
        telefono: "118",
        email: "",
        casaId: "casa_1"
      },
      c_3: {
        id: "c_3",
        nome: "Elettricista Marco",
        categoria: "Elettricista",
        telefono: "333 9998877",
        email: "marco.elettrico@test.it",
        casaId: "casa_1"
      }
    });

    renderWithProviders(<ViewContatti />, {
      user: alice,
      userData: { username: "Alice", casaId: "casa_1" },
      route: "/contatti"
    });

    expect(await screen.findByText("Dott. Rossi (Proprietario)")).toBeInTheDocument();
    expect(screen.getByText("Pronto Soccorso")).toBeInTheDocument();
    expect(screen.getByText("Elettricista Marco")).toBeInTheDocument();

    // Filter by Emergenza category
    const emergenzaBtn = screen.getByRole("button", { name: /Emergenza/i });
    fireEvent.click(emergenzaBtn);

    expect(screen.getByText("Pronto Soccorso")).toBeInTheDocument();
    expect(screen.queryByText("Dott. Rossi (Proprietario)")).not.toBeInTheDocument();
    expect(screen.queryByText("Elettricista Marco")).not.toBeInTheDocument();

    // Reset filter to Tutti
    const tuttiBtn = screen.getByRole("button", { name: /Tutti/i });
    fireEvent.click(tuttiBtn);

    // Filter by search term
    const searchInput = screen.getByPlaceholderText(/Cerca per nome, numero o email/i);
    fireEvent.change(searchInput, { target: { value: "Marco" } });

    expect(screen.getByText("Elettricista Marco")).toBeInTheDocument();
    expect(screen.queryByText("Pronto Soccorso")).not.toBeInTheDocument();
    expect(screen.queryByText("Dott. Rossi (Proprietario)")).not.toBeInTheDocument();
  });

  test("T1.C5 — Safe tel: and mailto: protocol generators defend against injection", () => {
    // Valid phone protocols
    expect(safeTelUrl("+39 340 1234567")).toBe("tel:+393401234567");
    expect(safeTelUrl("02-123456")).toBe("tel:02123456");
    expect(safeTelUrl("118")).toBe("tel:118");

    // Phone protocol attack vectors
    expect(safeTelUrl("javascript:alert(1)")).toBe("");
    expect(safeTelUrl("data:text/html,<script>alert(1)</script>")).toBe("");
    expect(safeTelUrl("")).toBe("");
    expect(safeTelUrl(null)).toBe("");

    // Phone sanitizer
    expect(sanitizePhone("+39 (02) 123-456.78")).toBe("+39 (02) 123-456.78");
    expect(sanitizePhone("<script>alert(1)</script>340123")).toBe("340123");

    // Valid email protocols
    expect(safeMailtoUrl("utente@test.com")).toBe("mailto:utente%40test.com");
    expect(safeMailtoUrl("  info@casa.it  ")).toBe("mailto:info%40casa.it");

    // Email attack vectors
    expect(safeMailtoUrl("javascript:alert(1)")).toBe("");
    expect(safeMailtoUrl("not-an-email")).toBe("");
    expect(safeMailtoUrl("")).toBe("");
    expect(safeMailtoUrl(null)).toBe("");
  });
});
