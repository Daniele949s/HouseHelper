import React from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import ConfirmModal from "../components/ConfirmModal";
import ToastContainer from "../components/Toast";
import { useHousehold } from "../contexts/HouseholdContext";
import AggiuntaTurno from "../pages/TurniPulizia/aggiuntaTurno";
import HomeUtente from "../pages/homeUtente";
import { getAvailableRoommates } from "../utils/choreRotation";
import { mockStore, renderWithProviders, seedHousehold } from "./testUtils";

const creator = { uid: "creator", username: "Elena", ruoloCasa: "admin", statoMembro: "active" };
const activeMember = { uid: "member", username: "Marco", ruoloCasa: "member", statoMembro: "active" };
const pendingMember = { uid: "pending", username: "Sofia", ruoloCasa: "member", statoMembro: "pending" };
const houseId = "roles-house";

const accept = "Accetta";
const promote = "Promuovi ad Amministratore";
const remove = "Espelli";
const adminRole = "Amministratore della casa";
const pendingStatus = "In attesa di approvazione";

function AdminState() {
  const { isAdmin } = useHousehold();
  return <output data-testid="household-admin-state">{String(isAdmin)}</output>;
}

function memberRow(section, username) {
  return within(within(section).getByText(username).closest("li"));
}

async function openDashboard(user = creator) {
  renderWithProviders(
    <>
      <HomeUtente />
      <ConfirmModal />
      <ToastContainer />
      <AdminState />
    </>,
    { user, userData: { ...user, casaId: houseId }, route: "/home" }
  );

  const section = await screen.findByRole("region", { name: "Membri della Casa" });
  await within(section).findByText(pendingStatus);
  return section;
}

describe("Dashboard household members and roles", () => {
  beforeEach(() => {
    mockStore.reset();
    seedHousehold({
      houseId,
      creatorId: creator.uid,
      users: [creator, activeMember, pendingMember],
    });
  });

  test("the creator has the admin badge and can manage other members", async () => {
    const section = await openDashboard();
    const ownRow = memberRow(section, "Elena (Tu)");
    const activeRow = memberRow(section, "Marco");
    const pendingRow = memberRow(section, "Sofia");

    expect(screen.getByTestId("household-admin-state")).toHaveTextContent("true");
    expect(within(section).getAllByRole("listitem")).toHaveLength(3);
    expect(ownRow.getByText(adminRole)).toBeInTheDocument();
    expect(ownRow.queryByRole("button")).not.toBeInTheDocument();
    expect(activeRow.getByText("Membro")).toBeInTheDocument();
    expect(activeRow.getByRole("button", { name: promote })).toBeInTheDocument();
    expect(activeRow.getByRole("button", { name: remove })).toBeInTheDocument();
    expect(activeRow.queryByRole("button", { name: accept })).not.toBeInTheDocument();
    expect(pendingRow.getByRole("button", { name: accept })).toBeInTheDocument();
    expect(pendingRow.getByRole("button", { name: remove })).toBeInTheDocument();
    expect(pendingRow.queryByRole("button", { name: promote })).not.toBeInTheDocument();
  });

  test("a regular member sees the list and roles without management actions", async () => {
    const section = await openDashboard(activeMember);

    expect(screen.getByTestId("household-admin-state")).toHaveTextContent("false");
    expect(within(section).getAllByRole("listitem")).toHaveLength(3);
    expect(memberRow(section, "Elena").getByText(adminRole)).toBeInTheDocument();
    expect(memberRow(section, "Marco (Tu)").getByText("Membro")).toBeInTheDocument();
    expect(within(section).queryAllByRole("button")).toHaveLength(0);
  });

  test("accepting a pending member persists active status and updates their row", async () => {
    const section = await openDashboard();
    const row = memberRow(section, "Sofia");

    fireEvent.click(row.getByRole("button", { name: accept }));

    await row.findByRole("button", { name: promote });
    expect(mockStore.getDocData("utenti", pendingMember.uid)).toMatchObject({
      casaId: houseId,
      statoMembro: "active",
      ruoloCasa: "member",
    });
    expect(row.getByText("Membro")).toBeInTheDocument();
    expect(row.queryByText(pendingStatus)).not.toBeInTheDocument();
    expect(row.queryByRole("button", { name: accept })).not.toBeInTheDocument();
    expect(await screen.findByText("Sofia è ora un membro effettivo della casa!")).toBeInTheDocument();
  });

  test("pending members join chore rotation and assignee chips only after approval", async () => {
    renderWithProviders(
      <>
        <HomeUtente />
        <section aria-label="Chore form"><AggiuntaTurno /></section>
        <ConfirmModal />
        <ToastContainer />
      </>,
      { user: creator, userData: { ...creator, casaId: houseId }, route: "/home" }
    );

    const members = await screen.findByRole("region", { name: "Membri della Casa" });
    const choreForm = within(screen.getByRole("region", { name: "Chore form" }));
    const rotationUids = () => getAvailableRoommates(
      [creator, activeMember, mockStore.getDocData("utenti", pendingMember.uid)],
      "2026-11-15"
    ).map((member) => member.uid);

    await choreForm.findByRole("button", { name: activeMember.username });

    expect({
      rotation: rotationUids(),
      assigneeChip: Boolean(choreForm.queryByRole("button", { name: pendingMember.username })),
    }).toEqual({
      rotation: [creator.uid, activeMember.uid],
      assigneeChip: false,
    });

    const row = memberRow(members, pendingMember.username);
    fireEvent.click(row.getByRole("button", { name: accept }));
    await row.findByRole("button", { name: promote });

    expect(rotationUids()).toEqual([creator.uid, activeMember.uid, pendingMember.uid]);
    expect(choreForm.getByRole("button", { name: pendingMember.username })).toBeInTheDocument();
  });

  test("removing a member requires confirmation and clears their household membership", async () => {
    const section = await openDashboard();
    const removeButton = memberRow(section, "Marco").getByRole("button", { name: remove });

    fireEvent.click(removeButton);
    let dialog = within(await screen.findByRole("dialog", { name: remove }));
    expect(dialog.getByText("Vuoi rimuovere Marco dalla casa?")).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: remove })).toHaveClass("btn-danger");
    fireEvent.click(dialog.getByRole("button", { name: "Annulla" }));
    expect(mockStore.getDocData("utenti", activeMember.uid).casaId).toBe(houseId);
    expect(within(section).getByText("Marco")).toBeInTheDocument();

    fireEvent.click(removeButton);
    dialog = within(await screen.findByRole("dialog", { name: remove }));
    fireEvent.click(dialog.getByRole("button", { name: remove }));

    await waitFor(() => expect(within(section).queryByText("Marco")).not.toBeInTheDocument());
    expect(mockStore.getDocData("utenti", activeMember.uid)).toMatchObject({
      casaId: null,
      ruoloCasa: null,
      statoMembro: null,
    });
    expect(await screen.findByText("Marco è stato rimosso dalla casa.")).toBeInTheDocument();
  });

  test("confirming a promotion transfers both admin fields and removes the former admin's controls", async () => {
    const section = await openDashboard();

    fireEvent.click(memberRow(section, "Marco").getByRole("button", { name: promote }));
    const dialog = within(await screen.findByRole("dialog", { name: promote }));
    expect(dialog.getByText(/Marco\? Diventerai un Membro della casa/)).toBeInTheDocument();
    expect(mockStore.getDocData("case", houseId).creatoreId).toBe(creator.uid);
    fireEvent.click(dialog.getByRole("button", { name: promote }));

    await memberRow(section, "Marco").findByText(adminRole);
    expect(mockStore.getDocData("case", houseId)).toMatchObject({
      adminUid: activeMember.uid,
      creatoreId: activeMember.uid,
    });
    expect(mockStore.getDocData("utenti", activeMember.uid).ruoloCasa).toBe("admin");
    expect(mockStore.getDocData("utenti", creator.uid).ruoloCasa).toBe("member");
    expect(memberRow(section, "Elena (Tu)").getByText("Membro")).toBeInTheDocument();
    expect(screen.getByTestId("household-admin-state")).toHaveTextContent("false");
    expect(within(section).queryAllByRole("button")).toHaveLength(0);
    expect(await screen.findByText("Ruolo di Amministratore ceduto a Marco.")).toBeInTheDocument();
  });

  test("confirming house deletion removes the house, its data, and all memberships", async () => {
    const collections = ["turni", "debiti", "spesa", "note", "documenti", "contatti"];
    for (const collection of collections) {
      mockStore.seed(collection, { [`seeded-${collection}`]: { casaId: houseId } });
    }

    await openDashboard();
    fireEvent.click(screen.getByRole("button", { name: "Elimina Casa" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Elimina Casa" }));
    expect(mockStore.getDocData("case", houseId)).toBeDefined();
    fireEvent.click(dialog.getByRole("button", { name: "Elimina Casa" }));

    await screen.findByText("Casa e tutti i dati associati eliminati con successo.");
    expect(mockStore.getDocData("case", houseId)).toBeUndefined();
    for (const collection of collections) {
      expect(mockStore.getDocData(collection, `seeded-${collection}`)).toBeUndefined();
    }
    for (const { uid } of [creator, activeMember, pendingMember]) {
      expect(mockStore.getDocData("utenti", uid)).toMatchObject({
        casaId: null,
        ruoloCasa: null,
        statoMembro: null,
      });
    }
  });

  test("an admin leaving the house transfers ownership to the remaining active member", async () => {
    await openDashboard();
    fireEvent.click(screen.getByRole("button", { name: "Lascia Casa" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Lascia Casa" }));
    fireEvent.click(dialog.getByRole("button", { name: "Lascia Casa" }));

    await screen.findByText("Hai lasciato la casa.");
    expect(mockStore.getDocData("case", houseId)).toMatchObject({
      adminUid: activeMember.uid,
      creatoreId: activeMember.uid,
    });
    expect(mockStore.getDocData("utenti", activeMember.uid)).toMatchObject({
      casaId: houseId,
      ruoloCasa: "admin",
      statoMembro: "active",
    });
    expect(mockStore.getDocData("utenti", creator.uid)).toMatchObject({
      casaId: null,
      ruoloCasa: null,
      statoMembro: null,
    });
  });
});
