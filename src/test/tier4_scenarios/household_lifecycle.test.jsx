import React from 'react';
import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { renderWithProviders, seedHousehold } from '../testUtils';
import mockStore from '../mockFirebase';
import ViewRegistrazione from '../../pages/Autenticazione/viewRegistrazione';
import SceltaCasa from '../../pages/SceltaCasa';
import HomeUtente from '../../pages/homeUtente';
import AggiuntaTurno from '../../pages/TurniPulizia/aggiuntaTurno';
import VisualizzaTurni from '../../pages/TurniPulizia/viewTurni';
import ModificaTurno from '../../pages/TurniPulizia/modificaTurno';
import ViewSpesa from '../../pages/Spesa/ViewSpesa';
import AggiungiDebito from '../../pages/Debiti/AggiungiDebito';
import ViewDebiti from '../../pages/Debiti/ViewDebiti';
import ViewDocumenti from '../../pages/Documenti/ViewDocumenti';
import { HouseProtectedRoute } from '../../components/RouteGuards';
import { createMockFile } from '../testUtils';

describe('Tier 4: Realistic Household Lifecycle & Multi-User Workloads', () => {
  const elena = { uid: 'user_elena', email: 'elena@garibaldi.it', username: 'Elena' };
  const marco = { uid: 'user_marco', email: 'marco@garibaldi.it', username: 'Marco' };
  const sofia = { uid: 'user_sofia', email: 'sofia@garibaldi.it', username: 'Sofia' };

  beforeEach(() => {
    mockStore.reset();
    const routerMock = require('react-router-dom');
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  test('T4.01 — Multi-Roommate Apartment Onboarding Lifecycle', async () => {
    const routerMock = require('react-router-dom');

    // Step 1: Elena registers a new account
    renderWithProviders(<ViewRegistrazione />, { route: '/registrazione' });
    const elenaUser = await screen.findByPlaceholderText(/Come ti chiamano i coinquilini\?/i);
    const elenaMail = screen.getByPlaceholderText(/mario@email\.com/i);
    const elenaPass = screen.getByPlaceholderText(/Scegli una password sicura/i);
    const registerBtn = screen.getByRole('button', { name: /Completa Registrazione/i });

    fireEvent.change(elenaUser, { target: { value: 'Elena' } });
    fireEvent.change(elenaMail, { target: { value: 'elena@garibaldi.it' } });
    fireEvent.change(elenaPass, { target: { value: 'garibaldi2026' } });
    fireEvent.click(registerBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/scelta-casa');
    });
    cleanup();

    // Step 2: Elena creates the household "Casa Garibaldi 12"
    renderWithProviders(<SceltaCasa />, {
      user: elena,
      userData: { username: 'Elena', email: 'elena@garibaldi.it', casaId: null },
      route: '/scelta-casa'
    });

    const houseInput = await screen.findByPlaceholderText(/Nome casa \(es\. Villa Arzilla/i);
    const createBtn = screen.getByRole('button', { name: /Crea Casa/i });
    fireEvent.change(houseInput, { target: { value: 'Casa Garibaldi 12' } });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/home');
    });

    // Capture the generated 6-character unique invite code
    const createdHouse = Object.values(mockStore.getCollection('case'))[0];
    const inviteCode = createdHouse.codiceUnivoco;
    const houseId = Object.keys(mockStore.getCollection('case'))[0];
    expect(inviteCode).toHaveLength(6);
    cleanup();

    // Step 3: Marco registers and joins using Elena's invite code
    renderWithProviders(<SceltaCasa />, {
      user: marco,
      userData: { username: 'Marco', email: 'marco@garibaldi.it', casaId: null },
      route: '/scelta-casa'
    });

    const marcoCodeInput = await screen.findByPlaceholderText(/Codice \(es\. X7K9P2\)/i);
    const marcoJoinBtn = screen.getByRole('button', { name: /Unisciti/i });
    fireEvent.change(marcoCodeInput, { target: { value: inviteCode } });
    fireEvent.click(marcoJoinBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/home');
    });
    cleanup();

    // Step 4: Sofia registers and joins using Elena's invite code
    renderWithProviders(<SceltaCasa />, {
      user: sofia,
      userData: { username: 'Sofia', email: 'sofia@garibaldi.it', casaId: null },
      route: '/scelta-casa'
    });

    const sofiaCodeInput = await screen.findByPlaceholderText(/Codice \(es\. X7K9P2\)/i);
    const sofiaJoinBtn = screen.getByRole('button', { name: /Unisciti/i });
    fireEvent.change(sofiaCodeInput, { target: { value: inviteCode } });
    fireEvent.click(sofiaJoinBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/home');
    });

    // Verification: all 3 users belong to the same house
    expect(mockStore.getDocData('utenti', elena.uid).casaId).toBe(houseId);
    expect(mockStore.getDocData('utenti', marco.uid).casaId).toBe(houseId);
    expect(mockStore.getDocData('utenti', sofia.uid).casaId).toBe(houseId);
    cleanup();

    // Step 5: Elena views HomeUtente and copies the invite code to clipboard
    renderWithProviders(<HomeUtente />, {
      user: elena,
      userData: { username: 'Elena', casaId: houseId },
      route: '/home'
    });

    const houseHeading = await screen.findByText(/Casa Garibaldi 12/i);
    expect(houseHeading).toBeInTheDocument();

    const codePill = screen.getByTitle(/Clicca per copiare il codice invito/i);
    fireEvent.click(codePill);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(inviteCode);
    expect(screen.getByText(/Copiato!/i)).toBeInTheDocument();
  });

  test('T4.02 — Weekly Household Cleaning Schedule & Shift Rotation Workload', async () => {
    const routerMock = require('react-router-dom');
    const { houseId } = seedHousehold({
      houseId: 'casa_garibaldi',
      houseName: 'Casa Garibaldi 12',
      users: [elena, marco, sofia]
    });

    // 1. Elena creates Monday shift for Marco
    renderWithProviders(<AggiuntaTurno />, {
      user: elena,
      userData: { username: 'Elena', casaId: houseId },
      route: '/turni/aggiungi'
    });

    const nomi1 = await screen.findByPlaceholderText(/es\. Mario, Luca/i);
    const data1 = document.querySelector('input[name="data"]');
    const fascia1 = document.querySelector('select[name="fasciaOraria"]');
    const luoghi1 = screen.getByPlaceholderText(/es\. Cucina, Bagno/i);
    const submit1 = screen.getByRole('button', { name: /Crea Turno/i });

    fireEvent.change(nomi1, { target: { value: 'Marco' } });
    fireEvent.change(data1, { target: { value: '2026-11-09' } });
    fireEvent.change(fascia1, { target: { value: '09:00 - 10:00' } });
    fireEvent.change(luoghi1, { target: { value: 'Bagno & Corridoio' } });
    fireEvent.click(submit1);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/turni');
    });
    cleanup();

    // 2. Elena creates Wednesday shift for Sofia
    const turnoSofia = await mockStore.addDoc('turni', {
      nomi: ['Sofia'],
      data: '2026-11-11',
      fasciaOraria: ['18:00 - 19:00'],
      luoghi: ['Cucina & Forno'],
      procedura: ['Sgrassare piano cottura'],
      casaId: houseId,
      utenteId: elena.uid
    });

    // 3. Sofia modifies Wednesday shift timeslot to 19:00 - 20:00
    routerMock.__setParams({ id: turnoSofia.id });
    renderWithProviders(<ModificaTurno />, {
      user: sofia,
      userData: { username: 'Sofia', casaId: houseId },
      route: `/turni/modifica/${turnoSofia.id}`
    });

    const fasciaSelect = await screen.findByRole('combobox');
    fireEvent.change(fasciaSelect, { target: { value: '19:00 - 20:00' } });
    const saveBtn = screen.getByRole('button', { name: /Salva Modifiche/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/turni');
    });

    expect(mockStore.getDocData('turni', turnoSofia.id).fasciaOraria).toEqual(['19:00 - 20:00']);
    cleanup();

    // 4. View all shifts in VisualizzaTurni
    renderWithProviders(<VisualizzaTurni />, {
      user: marco,
      userData: { username: 'Marco', casaId: houseId },
      route: '/turni'
    });

    const shiftCards = await screen.findAllByRole('heading', { level: 3 });
    expect(shiftCards.length).toBe(2);
    expect(screen.getByText(/Bagno & Corridoio/i)).toBeInTheDocument();
    expect(screen.getByText(/Cucina & Forno/i)).toBeInTheDocument();
  });

  test('T4.03 — Supermarket Grocery Run, Auto-Split Expense, and Debt Settlement Lifecycle', async () => {
    const routerMock = require('react-router-dom');
    window.confirm = jest.fn(() => true);

    const { houseId } = seedHousehold({
      houseId: 'casa_garibaldi',
      users: [elena, marco, sofia],
      spesa: [
        {
          id: 'spesa_detersivo',
          nome: 'Detersivo Lavastoviglie Tabs',
          comprato: false,
          casaId: 'casa_garibaldi'
        }
      ]
    });

    // Step 1: Sofia checks grocery item as bought
    renderWithProviders(<ViewSpesa />, {
      user: sofia,
      userData: { username: 'Sofia', casaId: houseId },
      route: '/spesa'
    });

    const groceryItem = await screen.findByText('Detersivo Lavastoviglie Tabs');
    fireEvent.click(groceryItem);

    await waitFor(() => {
      expect(mockStore.getDocData('spesa', 'spesa_detersivo').comprato).toBe(true);
    });
    cleanup();

    // Step 2: Sofia enters 45.00 € total grocery bill and splits 3 ways
    renderWithProviders(<AggiungiDebito />, {
      user: sofia,
      userData: { username: 'Sofia', casaId: houseId },
      route: '/debiti/aggiungi'
    });

    const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
    const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);

    await waitFor(() => {
      expect(screen.getByText(/3 persone/i)).toBeInTheDocument();
    });

    const splitCheckbox = screen.getByRole('checkbox');
    const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

    fireEvent.change(descInput, { target: { value: 'Spesa Conad Settimanale' } });
    fireEvent.change(amountInput, { target: { value: '45.00' } });
    fireEvent.click(splitCheckbox);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/debiti');
    });

    // Verify 45 / 3 = 15.00 € for Elena and 15.00 € for Marco
    const allDebts = Object.values(mockStore.getCollection('debiti'));
    expect(allDebts.length).toBe(2);
    expect(allDebts[0].importo).toBe('15.00');
    expect(allDebts[1].importo).toBe('15.00');
    cleanup();

    // Step 3: Marco views his HomeUtente dashboard and sees -15.00 €
    renderWithProviders(<HomeUtente />, {
      user: marco,
      userData: { username: 'Marco', casaId: houseId },
      route: '/home'
    });

    const marcoDebtBalance = await screen.findByText('-15.00 €');
    expect(marcoDebtBalance).toBeInTheDocument();
    cleanup();

    // Step 4: Marco settles his 15.00 € debt to Sofia in ViewDebiti
    const marcoDebtDocId = Object.entries(mockStore.getCollection('debiti')).find(
      ([, d]) => d.debitoreId === marco.uid
    )[0];

    renderWithProviders(<ViewDebiti />, {
      user: marco,
      userData: { username: 'Marco', casaId: houseId },
      route: '/debiti'
    });

    const settleBtn = await screen.findByRole('button', { name: /Segna come saldato/i });
    fireEvent.click(settleBtn);

    await waitFor(() => {
      expect(screen.getByText('0.00 €')).toBeInTheDocument();
      expect(mockStore.getDocData('debiti', marcoDebtDocId)).toBeUndefined();
    });
    cleanup();

    // Step 5: Sofia's remaining credit is now +15.00 € (only Elena's quota left)
    renderWithProviders(<HomeUtente />, {
      user: sofia,
      userData: { username: 'Sofia', casaId: houseId },
      route: '/home'
    });

    const sofiaNewBalance = await screen.findByText('+15.00 €');
    expect(sofiaNewBalance).toBeInTheDocument();
  });

  test('T4.04 — Household Departure and Route Guard Isolation Workflow', async () => {
    const routerMock = require('react-router-dom');
    window.confirm = jest.fn(() => true);

    const { houseId } = seedHousehold({
      houseId: 'casa_garibaldi',
      users: [elena, marco]
    });

    // Marco is on HomeUtente and chooses to leave the apartment
    renderWithProviders(<HomeUtente />, {
      user: marco,
      userData: { username: 'Marco', casaId: houseId },
      route: '/home'
    });

    const leaveBtn = await screen.findByRole('button', { name: /Lascia Casa/i });
    fireEvent.click(leaveBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/scelta-casa');
    });

    // Verify Marco's casaId in Firestore is now null
    expect(mockStore.getDocData('utenti', marco.uid).casaId).toBeNull();
    cleanup();

    // Now Marco attempts direct URL access to protected routes: HouseProtectedRoute blocks him
    renderWithProviders(<HouseProtectedRoute />, {
      user: marco,
      userData: { username: 'Marco', casaId: null },
      route: '/turni'
    });

    const mockNavigateElement = await screen.findByTestId('mock-navigate');
    expect(mockNavigateElement).toHaveAttribute('data-to', '/scelta-casa');
  });

  test('T4.05 — Multi-Roommate Shared Document Repository, Categorization, and File Lifecycle', async () => {
    window.confirm = jest.fn(() => true);

    const { houseId } = seedHousehold({
      houseId: 'casa_garibaldi',
      users: [elena, marco, sofia],
      documenti: [
        {
          id: 'doc_draft_temp',
          nome: 'Bozza Regolamento Condominiale',
          categoria: 'Altro',
          storagePath: 'case/casa_garibaldi/documenti/draft.pdf',
          caricatoDaNome: 'Elena',
          casaId: 'casa_garibaldi'
        }
      ]
    });

    // Step 1: Elena uploads official apartment lease contract
    renderWithProviders(<ViewDocumenti />, {
      user: elena,
      userData: { username: 'Elena', casaId: houseId },
      route: '/documenti'
    });

    expect(await screen.findByText('Bozza Regolamento Condominiale')).toBeInTheDocument();

    const openUploadBtn = screen.getByRole('button', { name: /Carica Documento/i });
    fireEvent.click(openUploadBtn);

    const fileInput = screen.getByTestId('doc-file-input');
    const leaseFile = createMockFile('Contratto_Locazione_2026.pdf', 1024 * 1500, 'application/pdf');
    fireEvent.change(fileInput, { target: { files: [leaseFile] } });

    const submitBtn = screen.getByTestId('doc-submit-upload');
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Contratto_Locazione_2026')).toBeInTheDocument();
    cleanup();

    // Step 2: Marco logs in, verifies contract, and uploads monthly electricity bill
    renderWithProviders(<ViewDocumenti />, {
      user: marco,
      userData: { username: 'Marco', casaId: houseId },
      route: '/documenti'
    });

    expect(await screen.findByText('Contratto_Locazione_2026')).toBeInTheDocument();

    const openUploadMarco = screen.getByRole('button', { name: /Carica Documento/i });
    fireEvent.click(openUploadMarco);

    const fileInputMarco = screen.getByTestId('doc-file-input');
    const billFile = createMockFile('Bolletta_Enel_Ottobre.pdf', 1024 * 400, 'application/pdf');
    fireEvent.change(fileInputMarco, { target: { files: [billFile] } });

    const categorySelect = screen.getByLabelText(/Categoria/i);
    fireEvent.change(categorySelect, { target: { value: 'Bollette' } });

    const submitMarco = screen.getByTestId('doc-submit-upload');
    fireEvent.click(submitMarco);

    expect(await screen.findByText('Bolletta_Enel_Ottobre')).toBeInTheDocument();
    cleanup();

    // Step 3: Sofia logs in, switches to table view, deletes draft document
    renderWithProviders(<ViewDocumenti />, {
      user: sofia,
      userData: { username: 'Sofia', casaId: houseId },
      route: '/documenti'
    });

    expect(await screen.findByText('Contratto_Locazione_2026')).toBeInTheDocument();
    expect(screen.getByText('Bolletta_Enel_Ottobre')).toBeInTheDocument();
    expect(screen.getByText('Bozza Regolamento Condominiale')).toBeInTheDocument();

    // Switch to table view
    const tableBtn = screen.getByTitle('Vista a tabella');
    fireEvent.click(tableBtn);

    expect(screen.getByTestId('doc-table-wrapper')).toBeInTheDocument();

    // Sofia deletes draft
    const draftRow = screen.getByTestId('doc-row-doc_draft_temp');
    const deleteDraftBtn = draftRow.querySelector('.btn-delete');
    fireEvent.click(deleteDraftBtn);

    expect(window.confirm).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByText('Bozza Regolamento Condominiale')).not.toBeInTheDocument();
    });

    // Both real documents remain active
    expect(screen.getByText('Contratto_Locazione_2026')).toBeInTheDocument();
    expect(screen.getByText('Bolletta_Enel_Ottobre')).toBeInTheDocument();
  });
});
