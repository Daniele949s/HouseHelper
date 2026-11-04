import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, seedHousehold } from '../testUtils';
import mockStore from '../mockFirebase';
import HomeUtente from '../../pages/homeUtente';
import AggiungiDebito from '../../pages/Debiti/AggiungiDebito';
import AggiuntaTurno from '../../pages/TurniPulizia/aggiuntaTurno';
import AggiungiNota from '../../pages/Bacheca/AggiungiNota';
import ViewDebiti from '../../pages/Debiti/ViewDebiti';
import SceltaCasa from '../../pages/SceltaCasa';
import ViewDocumenti from '../../pages/Documenti/ViewDocumenti';

describe('Tier 3: Cross-Feature State Interactions & Reactive Workflows', () => {
  const alice = { uid: 'u_alice', email: 'alice@test.com', username: 'Alice' };
  const bob = { uid: 'u_bob', email: 'bob@test.com', username: 'Bob' };
  const charlie = { uid: 'u_charlie', email: 'charlie@test.com', username: 'Charlie' };

  beforeEach(() => {
    mockStore.reset();
    const routerMock = require('react-router-dom');
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  test('T3.01 — Adding split expense in AggiungiDebito reflects in HomeUtente dashboard net balance', async () => {
    const routerMock = require('react-router-dom');
    seedHousehold({
      houseId: 'casa_1',
      houseName: 'Appartamento Duomo',
      inviteCode: 'DUOM01',
      users: [alice, bob]
    });

    // Step 1: Alice records an expense of 50.00 € split with Bob
    renderWithProviders(<AggiungiDebito />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/debiti/aggiungi'
    });

    const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
    const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);

    await waitFor(() => {
      expect(screen.getByText(/2 persone/i)).toBeInTheDocument();
    });

    const splitCheckbox = screen.getByRole('checkbox');
    const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

    fireEvent.change(descInput, { target: { value: 'Spesa Esselunga' } });
    fireEvent.change(amountInput, { target: { value: '50.00' } });
    fireEvent.click(splitCheckbox);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/debiti');
    });

    // Step 2: Render Alice's dashboard (HomeUtente)
    // Alice paid 50, Bob owes 25, so Alice's net balance is +25.00 €
    const { unmount } = renderWithProviders(<HomeUtente />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/home'
    });

    const aliceBalance = await screen.findByText('+25.00 €');
    expect(aliceBalance).toBeInTheDocument();
    expect(screen.getByText(/Gli altri coinquilini ti devono dei soldi/i)).toBeInTheDocument();
    unmount();

    // Step 3: Render Bob's dashboard (HomeUtente)
    // Bob owes 25, so Bob's net balance is -25.00 €
    renderWithProviders(<HomeUtente />, {
      user: bob,
      userData: { username: 'Bob', casaId: 'casa_1' },
      route: '/home'
    });

    const bobBalance = await screen.findByText('-25.00 €');
    expect(bobBalance).toBeInTheDocument();
    expect(screen.getByText(/Hai debiti pendenti verso la casa/i)).toBeInTheDocument();
  });

  test('T3.02 — Assigning future chore in AggiuntaTurno updates HomeUtente next shift card', async () => {
    const routerMock = require('react-router-dom');
    seedHousehold({
      houseId: 'casa_1',
      houseName: 'Appartamento Duomo',
      users: [alice]
    });

    // Create a future chore assigned to Alice
    const futureDate = '2026-11-20';
    renderWithProviders(<AggiuntaTurno />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/turni/aggiungi'
    });

    const nomiInput = await screen.findByPlaceholderText(/es\. Mario, Luca/i);
    const dataInput = document.querySelector('input[name="data"]');
    const fasciaSelect = document.querySelector('select[name="fasciaOraria"]');
    const luoghiInput = screen.getByPlaceholderText(/es\. Cucina, Bagno/i);
    const submitBtn = screen.getByRole('button', { name: /Crea Turno/i });

    fireEvent.change(nomiInput, { target: { value: 'Alice' } });
    fireEvent.change(dataInput, { target: { value: futureDate } });
    fireEvent.change(fasciaSelect, { target: { value: '09:00 - 10:00' } });
    fireEvent.change(luoghiInput, { target: { value: 'Cucina & Salotto' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/turni');
    });

    // Render HomeUtente: verify "Il tuo Prossimo Turno" displays the newly assigned chore
    renderWithProviders(<HomeUtente />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/home'
    });

    const choreHeading = await screen.findByText('Cucina & Salotto');
    expect(choreHeading).toBeInTheDocument();
    expect(screen.queryByText(/Nessun turno oggi\. Casa splendente!/i)).not.toBeInTheDocument();
  });

  test('T3.03 — New roommate joining via SceltaCasa updates split quota in AggiungiDebito', async () => {
    const routerMock = require('react-router-dom');
    // Initial household: Alice and Bob
    seedHousehold({
      houseId: 'casa_1',
      houseName: 'Appartamento Duomo',
      inviteCode: 'JOIN01',
      users: [alice, bob]
    });

    // Charlie joins casa_1 with invite code 'JOIN01'
    renderWithProviders(<SceltaCasa />, {
      user: charlie,
      userData: { username: 'Charlie', email: 'charlie@test.com', casaId: null },
      route: '/scelta-casa'
    });

    const codeInput = await screen.findByPlaceholderText(/Codice \(es\. X7K9P2\)/i);
    const joinBtn = screen.getByRole('button', { name: /Unisciti/i });

    fireEvent.change(codeInput, { target: { value: 'JOIN01' } });
    fireEvent.click(joinBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/home');
    });

    // Now Alice creates an expense of 90 € split among all members
    renderWithProviders(<AggiungiDebito />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/debiti/aggiungi'
    });

    const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
    const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);

    // Verify checkbox reflects 3 roommates now
    await waitFor(() => {
      expect(screen.getByText(/3 persone/i)).toBeInTheDocument();
    });

    const splitCheckbox = screen.getByRole('checkbox');
    const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

    fireEvent.change(descInput, { target: { value: 'Spesa Mensile Condivisa' } });
    fireEvent.change(amountInput, { target: { value: '90.00' } });
    fireEvent.click(splitCheckbox);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/debiti');
    });

    // 90.00 / 3 = 30.00 € each for Bob and Charlie
    const debts = Object.values(mockStore.getCollection('debiti'));
    expect(debts.length).toBe(2);
    expect(debts[0].importo).toBe('30.00');
    expect(debts[1].importo).toBe('30.00');
    const debtors = debts.map((d) => d.debitoreId);
    expect(debtors).toContain(bob.uid);
    expect(debtors).toContain(charlie.uid);
  });

  test('T3.04 — Publishing bulletin note in AggiungiNota immediately reflects on HomeUtente', async () => {
    const routerMock = require('react-router-dom');
    seedHousehold({
      houseId: 'casa_1',
      houseName: 'Appartamento Duomo',
      users: [alice]
    });

    renderWithProviders(<AggiungiNota />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/bacheca/aggiungi'
    });

    const titleInput = await screen.findByPlaceholderText(/Oggetto dell'avviso/i);
    const contentInput = screen.getByPlaceholderText(/Scrivi qui il messaggio dettagliato/i);
    const submitBtn = screen.getByRole('button', { name: /Pubblica Avviso/i });

    fireEvent.change(titleInput, { target: { value: 'Lavori Ascensore' } });
    fireEvent.change(contentInput, { target: { value: 'Ascensore fermo venerdì mattina dalle 9 alle 12' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/bacheca');
    });

    // Render HomeUtente and verify "Ultimo Avviso in Bacheca"
    renderWithProviders(<HomeUtente />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/home'
    });

    const noticeTitle = await screen.findByText('Lavori Ascensore');
    expect(noticeTitle).toBeInTheDocument();
    expect(screen.getAllByText(/Ascensore fermo/i).length).toBeGreaterThanOrEqual(1);
  });

  test('T3.05 — Debt settlement in ViewDebiti returns balance to parity on HomeUtente', async () => {
    window.confirm = jest.fn(() => true);
    seedHousehold({
      houseId: 'casa_1',
      houseName: 'Appartamento Duomo',
      users: [alice, bob],
      debiti: [
        {
          id: 'deb_settle_cross',
          descrizione: 'Spesa supermercato',
          importo: '25.00',
          creditoreId: alice.uid,
          debitoreId: bob.uid,
          createdAt: new Date()
        }
      ]
    });

    // Bob settles the debt in ViewDebiti
    renderWithProviders(<ViewDebiti />, {
      user: bob,
      userData: { username: 'Bob', casaId: 'casa_1' },
      route: '/debiti'
    });

    const debtItem = await screen.findByText('Spesa supermercato');
    expect(debtItem).toBeInTheDocument();

    const settleBtn = screen.getByRole('button', { name: /Segna come saldato/i });
    fireEvent.click(settleBtn);

    await waitFor(() => {
      expect(screen.queryByText('Spesa supermercato')).not.toBeInTheDocument();
    });

    // Now render Bob's HomeUtente dashboard: balance must be back to +0.00 € (parity)
    renderWithProviders(<HomeUtente />, {
      user: bob,
      userData: { username: 'Bob', casaId: 'casa_1' },
      route: '/home'
    });

    const parityBalance = await screen.findByText('+0.00 €');
    expect(parityBalance).toBeInTheDocument();
    expect(screen.getByText(/Siete tutti in parità!/i)).toBeInTheDocument();
  });

  test('T3.06 — Quick services navigation on HomeUtente includes Documenti navigating to /documenti', async () => {
    const routerMock = require('react-router-dom');
    seedHousehold({
      houseId: 'casa_1',
      houseName: 'Appartamento Duomo',
      users: [alice]
    });

    renderWithProviders(<HomeUtente />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/home'
    });

    const docBtn = await screen.findByRole('button', { name: /Gestione Documenti e Contratti/i });
    expect(docBtn).toBeInTheDocument();
    fireEvent.click(docBtn);

    expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/documenti');
  });

  test('T3.07 — Document uploaded in ViewDocumenti is immediately accessible to roommates in same house', async () => {
    seedHousehold({
      houseId: 'casa_1',
      houseName: 'Appartamento Duomo',
      users: [alice, bob]
    });

    // 1. Alice uploads a lease contract
    const { createMockFile } = require('../testUtils');
    const { unmount } = renderWithProviders(<ViewDocumenti />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/documenti'
    });

    await screen.findByText('Nessun documento trovato');

    const openBtn = screen.getByRole('button', { name: /Carica Documento/i });
    fireEvent.click(openBtn);

    const fileInput = screen.getByTestId('doc-file-input');
    const contractFile = createMockFile('Contratto_Duomo.pdf', 1024 * 300, 'application/pdf');
    fireEvent.change(fileInput, { target: { files: [contractFile] } });

    const submitBtn = screen.getByTestId('doc-submit-upload');
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Contratto_Duomo')).toBeInTheDocument();
    unmount();

    // 2. Bob logs in and navigates to ViewDocumenti
    renderWithProviders(<ViewDocumenti />, {
      user: bob,
      userData: { username: 'Bob', casaId: 'casa_1' },
      route: '/documenti'
    });

    // Bob can view Alice uploaded contract
    const contractForBob = await screen.findByText('Contratto_Duomo');
    expect(contractForBob).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
