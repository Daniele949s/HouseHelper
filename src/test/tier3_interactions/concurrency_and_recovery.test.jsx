import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders, seedHousehold } from "../testUtils";
import mockStore from "../mockFirebase";
import AggiungiDebito from "../../pages/Debiti/AggiungiDebito";
import ViewSpesa from "../../pages/Spesa/ViewSpesa";
import {
  saveDashboardSnapshot,
  getDashboardSnapshot,
  markTenantFresh,
  isTenantFresh,
  purgeTenantStorage,
  purgeAllOfflineStorage,
} from "../../utils/offlineStorage";

describe("Tier 3: Concurrency, Optimistic Rollback, Freshness & Cache Purge", () => {
  const adminUser = { uid: "u_admin", email: "admin@test.com", emailVerified: true };
  const memberUser = { uid: "u_member", email: "member@test.com", emailVerified: true };

  beforeEach(() => {
    mockStore.reset();
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
    seedHousehold({
      houseId: "casa_conc_1",
      houseName: "Casa Concorrenza",
      inviteCode: "CONC01",
      creatorId: adminUser.uid,
      users: [
        { uid: adminUser.uid, username: "Elena", ruoloCasa: "admin", statoMembro: "active" },
        { uid: memberUser.uid, username: "Marco", ruoloCasa: "member", statoMembro: "active" },
      ],
      spesa: [
        { id: "spesa_1", nome: "Pasta", comprato: false, autoreId: adminUser.uid, createdAt: new Date() },
      ],
    });
  });

  test("double-tap on AggiungiDebito submit button creates exactly ONE debt (zero duplication)", async () => {
    const { container } = renderWithProviders(<AggiungiDebito />, {
      user: adminUser,
      userData: { username: "Elena", casaId: "casa_conc_1", ruoloCasa: "admin", statoMembro: "active" },
      route: "/debiti/aggiungi",
    });

    const descInput = await screen.findByPlaceholderText(/Bolletta|Pizza|Spesa/i);
    const amountInput = container.querySelector('input[type="number"]');
    fireEvent.change(descInput, { target: { value: "Bolletta fibra" } });
    fireEvent.change(amountInput, { target: { value: "24.00" } });

    const debtorSelect = screen.getByLabelText(/Chi deve restituire|Debitore/i);
    fireEvent.change(debtorSelect, { target: { value: memberUser.uid } });

    const submitBtn = screen.getByRole("button", { name: /Salva Spesa|Registra/i });
    // Fire two clicks synchronously in the same tick (simulating mobile double-tap)
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(Object.keys(mockStore.getCollection("debiti")).length).toBe(1);
    });
    const created = Object.values(mockStore.getCollection("debiti"));
    expect(created).toHaveLength(1);
    expect(created[0].descrizione).toBe("Bolletta fibra");
  });

  test("ViewSpesa optimistic add rolls back cleanly on network error and succeeds on retry", async () => {
    const originalAddDoc = mockStore.addDoc.bind(mockStore);
    const addDocSpy = jest
      .spyOn(mockStore, "addDoc")
      .mockRejectedValueOnce(new Error("network-offline"))
      .mockImplementation((...args) => originalAddDoc(...args));

    renderWithProviders(<ViewSpesa />, {
      user: adminUser,
      userData: { username: "Elena", casaId: "casa_conc_1", ruoloCasa: "admin", statoMembro: "active" },
      route: "/spesa",
    });

    const input = await screen.findByPlaceholderText(/Aggiungi un prodotto|es\./i);
    fireEvent.change(input, { target: { value: "Olio EVO" } });
    const form = input.closest("form");
    fireEvent.submit(form);

    // After failed write: optimistic item rolled back & input restored for immediate retry
    await waitFor(() => {
      expect(input.value).toBe("Olio EVO");
    });
    expect(screen.queryByText("Olio EVO")).not.toBeInTheDocument();

    // Retry succeeds cleanly
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText("Olio EVO")).toBeInTheDocument();
    });
    expect(addDocSpy).toHaveBeenCalledTimes(2);
    expect(Object.values(mockStore.getCollection("spesa")).filter((i) => i.nome === "Olio EVO")).toHaveLength(1);
  });

  test("ViewSpesa double-tap on grocery toggle sends a single updateDoc and rolls back on failure", async () => {
    let rejectUpdate;
    const updatePromise = new Promise((_, reject) => {
      rejectUpdate = reject;
    });
    const updateSpy = jest.spyOn(mockStore, "updateDoc").mockReturnValueOnce(updatePromise);

    renderWithProviders(<ViewSpesa />, {
      user: adminUser,
      userData: { username: "Elena", casaId: "casa_conc_1", ruoloCasa: "admin", statoMembro: "active" },
      route: "/spesa",
    });

    const checkbox = await screen.findByRole("checkbox", { name: "Pasta" });

    fireEvent.click(checkbox);
    fireEvent.click(checkbox);

    expect(updateSpy).toHaveBeenCalledTimes(1);

    rejectUpdate(new Error("offline"));
    await waitFor(() => {
      expect(mockStore.getDocData("spesa", "spesa_1").comprato).toBe(false);
    });
  });

  test("cache & freshness are strictly scoped per tenant and purged on house switch or logout", () => {
    saveDashboardSnapshot("casa_A", { debitiList: [{ id: "d1", importo: 10 }] });
    saveDashboardSnapshot("casa_B", { debitiList: [{ id: "d2", importo: 99 }] });
    markTenantFresh("casa_A", "debiti");
    markTenantFresh("casa_B", "debiti");

    expect(isTenantFresh("casa_A", "debiti", 20000)).toBe(true);
    expect(getDashboardSnapshot("casa_A").debitiList).toHaveLength(1);

    // Switching away from casa_A purges only casa_A
    purgeTenantStorage("casa_A");
    expect(getDashboardSnapshot("casa_A")).toBeNull();
    expect(isTenantFresh("casa_A", "debiti", 20000)).toBe(false);
    expect(getDashboardSnapshot("casa_B").debitiList).toHaveLength(1);

    // Logout purges everything
    purgeAllOfflineStorage();
    expect(getDashboardSnapshot("casa_B")).toBeNull();
    expect(isTenantFresh("casa_B", "debiti", 20000)).toBe(false);
  });
});
