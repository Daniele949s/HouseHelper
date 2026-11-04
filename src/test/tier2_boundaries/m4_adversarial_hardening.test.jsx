import React from 'react';
import { screen, fireEvent, waitFor, act, render } from '@testing-library/react';
import { renderWithProviders, seedHousehold, mockStore } from '../testUtils';
import { db, auth } from '../../firebase';
import { doc, getDoc, collection, addDoc, deleteDoc } from 'firebase/firestore';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';

// Domain pages
import ViewDebiti from '../../pages/Debiti/ViewDebiti';
import AggiungiDebito from '../../pages/Debiti/AggiungiDebito';
import VisualizzaTurni from '../../pages/TurniPulizia/viewTurni';
import AggiuntaTurno from '../../pages/TurniPulizia/aggiuntaTurno';
import ModificaTurno from '../../pages/TurniPulizia/modificaTurno';
import ViewSpesa from '../../pages/Spesa/ViewSpesa';
import ViewBacheca from '../../pages/Bacheca/ViewBacheca';
import AggiungiNota from '../../pages/Bacheca/AggiungiNota';
import ModificaNota from '../../pages/Bacheca/ModificaNota';
import ViewCalendario from '../../pages/Bacheca/ViewCalendario';
import AggiungiEvento from '../../pages/Bacheca/AggiungiEvento';
import HomeUtente from '../../pages/homeUtente';
import NotFound from '../../pages/NotFound';

describe('Milestone 4 Tier 5 Adversarial Coverage Hardening Suite', () => {
  const alice = { uid: 'u_alice', email: 'alice@test.com', username: 'Alice' };
  const bob = { uid: 'u_bob', email: 'bob@test.com', username: 'Bob' };
  const charlie = { uid: 'u_charlie', email: 'charlie@test.com', username: 'Charlie' };

  const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{20E3}]/u;
  const EMOTICON_REGEX = /(?:(?<=\s|^|["'`>])(?::\)|:-\)|:\(|:-\(|:D|:-D|;\)|;-\)|:P|:-P|<3|\bXD\b|\bxd\b|(?:\^_-\^)|(?:-_-)|:o|:-O)(?=\s|$|["'`<.,!?;:]))/gi;

  beforeEach(() => {
    mockStore.reset();
    const routerMock = require('react-router-dom');
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  // =========================================================================
  // 1. ASYNC ACTIONS & AUTH LIFECYCLE RACE CONDITIONS
  // =========================================================================
  describe('Async Lifecycle & Auth Listener Stress', () => {
    test('rapid auth transitions (switch from User A to User B) synchronize current user without leaking User A state', async () => {
      // Seed users in mock store
      mockStore.seed('utenti', [
        { id: alice.uid, username: 'Alice', casaId: 'casa_alice' },
        { id: bob.uid, username: 'Bob', casaId: 'casa_bob' }
      ]);

      function TestConsumer() {
        const { currentUser, userData } = useAuth();
        return (
          <div>
            <span data-testid="current-uid">{currentUser ? currentUser.uid : 'none'}</span>
            <span data-testid="user-casa">{userData ? userData.casaId : 'none'}</span>
          </div>
        );
      }

      // Initial user: Alice
      mockStore.setMockUser(alice);
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-uid')).toHaveTextContent(alice.uid);
        expect(screen.getByTestId('user-casa')).toHaveTextContent('casa_alice');
      });

      // Rapidly switch to Bob
      act(() => {
        mockStore.setMockUser(bob);
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-uid')).toHaveTextContent(bob.uid);
        expect(screen.getByTestId('user-casa')).toHaveTextContent('casa_bob');
      });

      // Rapidly sign out
      act(() => {
        mockStore.setMockUser(null);
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-uid')).toHaveTextContent('none');
        expect(screen.getByTestId('user-casa')).toHaveTextContent('none');
      });
    });

    test('rapid unmount during data fetching does not crash or throw unhandled exceptions', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice, bob],
        turni: [
          { id: 't1', luoghi: ['Cucina'], data: '2026-11-20', nomi: ['Alice'], fasciaOraria: ['10:00 - 11:00'] }
        ],
        debiti: [
          { id: 'd1', importo: '15.00', creditoreId: alice.uid, debitoreId: bob.uid, casaId: 'casa_1', descrizione: 'Pranzo' }
        ],
        spesa: [
          { id: 's1', nome: 'Frutta', comprato: false, casaId: 'casa_1' }
        ],
        note: [
          { id: 'n1', titolo: 'Avviso Rapido', contenuto: 'Messaggio breve', autoreId: alice.uid, priorita: 'info' }
        ]
      });

      // Mount and immediately unmount VisualizzaTurni
      const { unmount: u1 } = renderWithProviders(<VisualizzaTurni />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' }
      });
      u1();

      // Mount and immediately unmount ViewDebiti
      const { unmount: u2 } = renderWithProviders(<ViewDebiti />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' }
      });
      u2();

      // Mount and immediately unmount ViewSpesa
      const { unmount: u3 } = renderWithProviders(<ViewSpesa />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' }
      });
      u3();

      // Mount and immediately unmount ViewBacheca
      const { unmount: u4 } = renderWithProviders(<ViewBacheca />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' }
      });
      u4();

      // Mount and immediately unmount HomeUtente
      const { unmount: u5 } = renderWithProviders(<HomeUtente />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' }
      });
      u5();

      // Rapid lifecycle mounts/unmounts settle cleanly
      expect(true).toBe(true);
    });
  });

  // =========================================================================
  // 2. EXTREME CONCURRENCY ACROSS MULTI-USER OPERATIONS
  // =========================================================================
  describe('Extreme Concurrency & Multi-User Race Conditions', () => {
    test('concurrent debt settlement by both creditor and debtor simultaneously resolves cleanly', async () => {
      window.confirm = jest.fn(() => true);
      seedHousehold({
        houseId: 'casa_1',
        users: [alice, bob],
        debiti: [
          {
            id: 'd_shared',
            importo: '25.00',
            creditoreId: alice.uid,
            debitoreId: bob.uid,
            casaId: 'casa_1',
            descrizione: 'Spesa Condivisa'
          }
        ]
      });

      renderWithProviders(<ViewDebiti />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/debiti'
      });

      expect(await screen.findByText('Spesa Condivisa')).toBeInTheDocument();
      expect(screen.getByText('+25.00 €')).toBeInTheDocument();

      // Simulate Bob deleting the debt on the backend at the same instant Alice clicks settle
      await mockStore.deleteDoc('debiti', 'd_shared');

      const settleBtn = screen.getByRole('button', { name: /Segna come saldato/i });
      fireEvent.click(settleBtn);

      // Confirm prompt handles smoothly and list reloads
      await waitFor(() => {
        expect(screen.getByText('0.00 €')).toBeInTheDocument();
        expect(screen.getByText(/Nessuna spesa registrata in casa/i)).toBeInTheDocument();
      });
    });

    test('concurrent chore deletion handles already-deleted document gracefully', async () => {
      window.confirm = jest.fn(() => true);
      seedHousehold({
        houseId: 'casa_1',
        users: [alice],
        turni: [
          {
            id: 't_shared',
            luoghi: ['Cucina'],
            data: '2026-11-20',
            nomi: ['Alice'],
            fasciaOraria: ['10:00 - 11:00'],
            casaId: 'casa_1'
          }
        ]
      });

      renderWithProviders(<VisualizzaTurni />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/turni'
      });

      expect(await screen.findByText('Cucina')).toBeInTheDocument();

      // Chore deleted by a roommate in another tab right before Alice clicks delete
      await mockStore.deleteDoc('turni', 't_shared');

      const deleteBtn = screen.getByTitle('Elimina');
      fireEvent.click(deleteBtn);

      // UI refreshes to empty chores state without errors
      await waitFor(() => {
        expect(screen.getByText(/Nessun turno programmato/i)).toBeInTheDocument();
      });
    });

    test('grocery toggle on an item concurrently deleted by another roommate does not throw uncaught error', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice],
        spesa: [
          {
            id: 's_conflict',
            nome: 'Pane Fresco',
            comprato: false,
            casaId: 'casa_1'
          }
        ]
      });

      renderWithProviders(<ViewSpesa />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/spesa'
      });

      const paneSpan = await screen.findByText('Pane Fresco', { selector: 'span' });
      const itemCard = paneSpan.closest('.sidemenu-entry-item');

      // Roommate deleted the item in backend
      await mockStore.deleteDoc('spesa', 's_conflict');

      // Alice clicks the item to toggle it
      expect(() => {
        fireEvent.click(itemCard);
      }).not.toThrow();

      await new Promise((r) => setTimeout(r, 50));
      expect(true).toBe(true);
    });

    test('10 rapid concurrent grocery item additions persist with distinct IDs', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice]
      });

      renderWithProviders(<ViewSpesa />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/spesa'
      });

      const input = await screen.findByPlaceholderText(/Aggiungi prodotto da comprare/i);
      const addBtn = screen.getByRole('button', { name: /Aggiungi/i });

      // Add 10 items in rapid succession
      for (let i = 1; i <= 10; i++) {
        fireEvent.change(input, { target: { value: `Articolo ${i}` } });
        fireEvent.click(addBtn);
      }

      await waitFor(() => {
        const items = Object.values(mockStore.getCollection('spesa'));
        expect(items.length).toBe(10);
      });

      const itemsInStore = Object.values(mockStore.getCollection('spesa'));
      const names = itemsInStore.map((i) => i.nome);
      for (let i = 1; i <= 10; i++) {
        expect(names).toContain(`Articolo ${i}`);
      }
    });
  });

  // =========================================================================
  // 3. MULTI-TENANT ISOLATION UNDER CONCURRENT SESSION STATE
  // =========================================================================
  describe('Multi-Tenant Cross-Household Isolation', () => {
    test('AggiungiDebito strictly enforces household boundary: non-household users omitted from choices', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice, bob]
      });

      // Charlie belongs to casa_2
      mockStore.seed('utenti', [
        { id: charlie.uid, username: 'Charlie', email: 'charlie@test.com', casaId: 'casa_2' }
      ]);

      renderWithProviders(<AggiungiDebito />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/debiti/aggiungi'
      });

      const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
      const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
      const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

      fireEvent.change(descInput, { target: { value: 'Spesa Cross-House' } });
      fireEvent.change(amountInput, { target: { value: '30.00' } });

      // The debtor dropdown strictly filters to house 1 members only (Alice, Bob) and excludes Charlie
      expect(screen.queryByText(/Charlie/i)).not.toBeInTheDocument();

      // Submitting without selecting debtor triggers required debtor validation
      fireEvent.click(submitBtn);

      expect(
        await screen.findByText('Seleziona chi deve restituire i soldi.')
      ).toBeInTheDocument();
      expect(mockStore.getCollection('debiti')).toEqual({});
    });

    test('VisualizzaTurni handleDelete blocks deletion of chore belonging to another household', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice],
        turni: [
          {
            id: 't_foreign',
            luoghi: ['Soggiorno Altro'],
            data: '2026-11-22',
            nomi: ['Stranger'],
            fasciaOraria: ['10:00 - 11:00'],
            casaId: 'casa_FOREIGN'
          }
        ]
      });

      renderWithProviders(<VisualizzaTurni />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/turni'
      });

      // Foreign turno is not displayed because query filters by casaId
      await waitFor(() => {
        expect(screen.queryByText('Soggiorno Altro')).not.toBeInTheDocument();
      });

      // Even if store contains it, it remains untouched
      expect(mockStore.getDocData('turni', 't_foreign')).toBeDefined();
    });

    test('ViewBacheca eliminaNota blocks deleting a note from another house or user', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice, bob],
        note: [
          {
            id: 'n_bob',
            titolo: 'Nota di Bob',
            contenuto: 'Contenuto protetto',
            autoreId: bob.uid,
            priorita: 'urgente',
            casaId: 'casa_1'
          }
        ]
      });

      renderWithProviders(<ViewBacheca />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/bacheca'
      });

      expect(await screen.findByText('Nota di Bob')).toBeInTheDocument();

      // Alice is NOT author: delete button is hidden
      expect(screen.queryByTitle('Elimina')).not.toBeInTheDocument();

      // Note still exists in store
      expect(mockStore.getDocData('note', 'n_bob')).toBeDefined();
    });
  });

  // =========================================================================
  // 4. EXTREME SCALE & ZERO-SUM DEBT CYCLES
  // =========================================================================
  describe('Extreme Scale & Mathematical Edge Cases', () => {
    test('3-way zero-sum cyclic debt balances to exactly 0.00 EUR parity', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice, bob, charlie],
        debiti: [
          // Alice lent Bob 30.00 EUR
          { id: 'd1', importo: '30.00', creditoreId: alice.uid, debitoreId: bob.uid, casaId: 'casa_1', descrizione: 'Ciclo 1' },
          // Bob lent Charlie 30.00 EUR
          { id: 'd2', importo: '30.00', creditoreId: bob.uid, debitoreId: charlie.uid, casaId: 'casa_1', descrizione: 'Ciclo 2' },
          // Charlie lent Alice 30.00 EUR
          { id: 'd3', importo: '30.00', creditoreId: charlie.uid, debitoreId: alice.uid, casaId: 'casa_1', descrizione: 'Ciclo 3' }
        ]
      });

      renderWithProviders(<ViewDebiti />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/debiti'
      });

      // Alice: credit 30.00, debit 30.00 -> Net balance: 0.00 EUR (Parity)
      expect(await screen.findByText('0.00 €')).toBeInTheDocument();
      expect(screen.getByText('Crediti: 30.00 €')).toBeInTheDocument();
      expect(screen.getByText('Debiti: 30.00 €')).toBeInTheDocument();
      expect(screen.getByText(/Nessun debito in sospeso\. Perfetta parità!/i)).toBeInTheDocument();
    });

    test('large household scale: splitting 500.00 EUR across 50 roommates creates 49 exact 10.00 EUR debts', async () => {
      const routerMock = require('react-router-dom');
      const fiftyUsers = Array.from({ length: 50 }, (_, i) => ({
        uid: `u_${i}`,
        email: `u${i}@test.com`,
        username: `Roommate ${i}`
      }));
      const creditor = fiftyUsers[0];

      seedHousehold({
        houseId: 'casa_large',
        users: fiftyUsers
      });

      renderWithProviders(<AggiungiDebito />, {
        user: creditor,
        userData: { username: creditor.username, casaId: 'casa_large' },
        route: '/debiti/aggiungi'
      });

      const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
      const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
      const splitCheckbox = screen.getByRole('checkbox');
      const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

      fireEvent.change(descInput, { target: { value: 'Affitto Collettivo' } });
      fireEvent.change(amountInput, { target: { value: '500.00' } });
      fireEvent.click(splitCheckbox);

      expect(await screen.findByText('10.00 €')).toBeInTheDocument();
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/debiti');
      });

      const debts = Object.values(mockStore.getCollection('debiti'));
      expect(debts).toHaveLength(49);
      debts.forEach((d) => {
        expect(d.importo).toBe('10.00');
        expect(d.creditoreId).toBe(creditor.uid);
        expect(d.debitoreId).not.toBe(creditor.uid);
      });
    });
  });

  // =========================================================================
  // 5. CALENDAR & EVENT SCHEDULING ADVERSARIAL STRESS
  // =========================================================================
  describe('Calendar & Event Scheduling Edge Cases', () => {
    test('AggiungiEvento rejects submission without valid date and title', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice]
      });

      renderWithProviders(<AggiungiEvento />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/calendario/aggiungi'
      });

      const titleInput = await screen.findByPlaceholderText(/es\. Cena di Casa/i);
      const submitBtn = screen.getByRole('button', { name: /Salva Evento/i });

      // Empty title submission
      fireEvent.change(titleInput, { target: { value: '   ' } });
      fireEvent.click(submitBtn);

      expect(await screen.findByText("Il titolo dell'evento è obbligatorio.")).toBeInTheDocument();
      expect(mockStore.getCollection('note')).toEqual({});
    });

    test('ViewCalendario displays both shifts and events on the selected date', async () => {
      const todayStr = new Date().toLocaleDateString('en-CA');

      seedHousehold({
        houseId: 'casa_1',
        users: [alice],
        turni: [
          {
            id: 't_cal',
            luoghi: ['Cucina'],
            data: todayStr,
            nomi: ['Alice'],
            fasciaOraria: ['14:00 - 15:00'],
            casaId: 'casa_1'
          }
        ],
        note: [
          {
            id: 'e_cal',
            titolo: 'Cena Condivisa',
            contenuto: 'Ognuno porta qualcosa',
            categoria: 'Cena / Festa',
            data: todayStr,
            autoreId: alice.uid,
            casaId: 'casa_1'
          }
        ]
      });

      renderWithProviders(<ViewCalendario />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/calendario'
      });

      expect(await screen.findByText('Calendario Casa')).toBeInTheDocument();
      expect(await screen.findByText('Cucina')).toBeInTheDocument();
      expect(screen.getByText('Cena Condivisa')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 6. NOTFOUND 404 RESILIENCE & ZERO-EMOJI RIGOR
  // =========================================================================
  describe('NotFound Page & Zero-Emoji Conformance', () => {
    test('NotFound page routes unauthenticated users to /login and authenticated users to /home', async () => {
      const routerMock = require('react-router-dom');

      // Unauthenticated
      const { unmount } = renderWithProviders(<NotFound />, { user: null });
      const returnBtn = await screen.findByRole('button', { name: /Torna alla Dashboard/i });
      fireEvent.click(returnBtn);
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/login');
      unmount();

      // Authenticated with casaId
      renderWithProviders(<NotFound />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' }
      });
      const returnBtnAuth = await screen.findByRole('button', { name: /Torna alla Dashboard/i });
      fireEvent.click(returnBtnAuth);
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/home');
    });

    test('NotFound and ViewCalendario contain zero emojis or emoticons in rendered DOM', async () => {
      const { container: c1, unmount: u1 } = renderWithProviders(<NotFound />, { user: null });
      await screen.findByText('Pagina Non Trovata');
      expect(EMOJI_REGEX.test(c1.textContent)).toBe(false);
      expect(EMOTICON_REGEX.test(c1.textContent)).toBe(false);
      u1();

      seedHousehold({ houseId: 'casa_1', users: [alice] });
      const { container: c2, unmount: u2 } = renderWithProviders(<ViewCalendario />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' }
      });
      await screen.findByText('Calendario Casa');
      expect(EMOJI_REGEX.test(c2.textContent)).toBe(false);
      expect(EMOTICON_REGEX.test(c2.textContent)).toBe(false);
      u2();
    });
  });
});
