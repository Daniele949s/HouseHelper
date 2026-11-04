import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders, seedHousehold, mockStore } from '../testUtils';
import ViewSpesa from '../../pages/Spesa/ViewSpesa';
import ViewDebiti from '../../pages/Debiti/ViewDebiti';
import AggiungiDebito from '../../pages/Debiti/AggiungiDebito';
import VisualizzaTurni from '../../pages/TurniPulizia/viewTurni';
import AggiuntaTurno from '../../pages/TurniPulizia/aggiuntaTurno';
import ViewBacheca from '../../pages/Bacheca/ViewBacheca';
import AggiungiNota from '../../pages/Bacheca/AggiungiNota';
import HomeUtente from '../../pages/homeUtente';

describe('Milestone 3 Adversarial Challenge Suite', () => {
  const alice = { uid: 'u_alice', email: 'alice@test.com', username: 'Alice' };
  const bob = { uid: 'u_bob', email: 'bob@test.com', username: 'Bob' };
  const charlie = { uid: 'u_charlie', email: 'charlie@test.com', username: 'Charlie' };

  beforeEach(() => {
    mockStore.reset();
    const routerMock = require('react-router-dom');
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  // =========================================================================
  // 1. ADVERSARIAL TEST: RAPID GROCERY STATUS TOGGLING & RACE CONDITIONS
  // =========================================================================
  describe('Grocery List: Rapid Status Toggling & Boundary Conditions', () => {
    test('handles rapid burst status toggles without unhandled crashes or state corruption', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice],
        spesa: [
          {
            id: 'item_milk',
            nome: 'Latte Intero',
            comprato: false,
            casaId: 'casa_1',
            createdAt: new Date()
          }
        ]
      });

      renderWithProviders(<ViewSpesa />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/spesa'
      });

      const milkSpan = await screen.findByText('Latte Intero', { selector: 'span' });
      expect(milkSpan).toBeInTheDocument();

      const itemCard = milkSpan.closest('.sidemenu-entry-item');
      expect(itemCard).not.toHaveClass('item-completed');

      // Rapidly trigger 5 click events in tight succession (burst clicking)
      for (let i = 0; i < 5; i++) {
        fireEvent.click(itemCard);
      }

      // System should remain stable: document updated to comprato: true and UI shows completed
      await waitFor(() => {
        const docInStore = mockStore.getDocData('spesa', 'item_milk');
        expect(docInStore.comprato).toBe(true);
      });

      // Sequential toggle back to false
      await waitFor(() => {
        expect(itemCard).toHaveClass('item-completed');
      });

      fireEvent.click(itemCard);

      await waitFor(() => {
        const docInStore = mockStore.getDocData('spesa', 'item_milk');
        expect(docInStore.comprato).toBe(false);
      });
    });

    test('re-sorts completed items below uncompleted items dynamically on toggle', async () => {
      const t1 = new Date(2026, 10, 1, 10, 0, 0);
      const t2 = new Date(2026, 10, 1, 11, 0, 0);

      seedHousehold({
        houseId: 'casa_1',
        users: [alice],
        spesa: [
          { id: 'i1', nome: 'Biscotti', comprato: false, casaId: 'casa_1', createdAt: t1 },
          { id: 'i2', nome: 'Marmellata', comprato: false, casaId: 'casa_1', createdAt: t2 }
        ]
      });

      renderWithProviders(<ViewSpesa />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/spesa'
      });

      await screen.findByText('Biscotti', { selector: 'span' });
      const entriesBefore = document.querySelectorAll('.sidemenu-entry-item');
      expect(entriesBefore).toHaveLength(2);

      // Toggle first item (Biscotti) to completed
      fireEvent.click(entriesBefore[1]); // Click Biscotti

      await waitFor(() => {
        const updatedDoc = mockStore.getDocData('spesa', 'i1');
        expect(updatedDoc.comprato).toBe(true);
      });

      // The uncompleted item (Marmellata) should now be first, and completed Biscotti should be second
      await waitFor(() => {
        const entriesAfter = document.querySelectorAll('.sidemenu-entry-item');
        expect(entriesAfter[0]).toHaveTextContent('Marmellata');
        expect(entriesAfter[1]).toHaveTextContent('Biscotti');
        expect(entriesAfter[1]).toHaveClass('item-completed');
      });
    });

    test('multi-tenant boundary: ignores items belonging to different household', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice],
        spesa: [
          {
            id: 'foreign_item',
            nome: 'Vino Pregiato',
            comprato: false,
            casaId: 'casa_OTHER',
            createdAt: new Date()
          }
        ]
      });

      renderWithProviders(<ViewSpesa />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/spesa'
      });

      // Item from casa_OTHER should NOT be rendered in casa_1
      const emptyState = await screen.findByText(/Nessun prodotto in lista\. Casa ben rifornita!/i);
      expect(emptyState).toBeInTheDocument();
      expect(screen.queryByText('Vino Pregiato')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. ADVERSARIAL TEST: SPLIT CALCULATIONS WITH FRACTIONAL & LARGE VALUES
  // =========================================================================
  describe('Debts & Split: Fractional Values, Limits & Mathematical Precision', () => {
    test('split arithmetic with non-divisible fractional amount (10.00 / 3 = 3.33 each)', async () => {
      const routerMock = require('react-router-dom');
      seedHousehold({
        houseId: 'casa_1',
        users: [alice, bob, charlie]
      });

      renderWithProviders(<AggiungiDebito />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/debiti/aggiungi'
      });

      const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
      const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
      const splitCheckbox = screen.getByRole('checkbox', { name: /Dividi automaticamente/i });
      const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

      fireEvent.change(descInput, { target: { value: 'Pizza Condivisa' } });
      fireEvent.change(amountInput, { target: { value: '10.00' } });
      fireEvent.click(splitCheckbox);

      // Verify live quota preview
      expect(await screen.findByText(/Quota individuale:/i)).toBeInTheDocument();
      expect(screen.getByText('3.33 €')).toBeInTheDocument();

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/debiti');
      });

      // Check debts created in mockStore
      const debts = Object.values(mockStore.getCollection('debiti'));
      expect(debts).toHaveLength(2); // Bob and Charlie (not Alice herself)
      debts.forEach((d) => {
        expect(d.importo).toBe('3.33');
        expect(d.creditoreId).toBe(alice.uid);
        expect(['u_bob', 'u_charlie']).toContain(d.debitoreId);
        expect(d.descrizione).toBe('Pizza Condivisa (Quota)');
      });
    });

    test('split arithmetic boundary: rejects too small amount (0.01 / 3 = 0.0033 -> 0.00 quota)', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice, bob, charlie]
      });

      renderWithProviders(<AggiungiDebito />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/debiti/aggiungi'
      });

      const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
      const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
      const splitCheckbox = screen.getByRole('checkbox', { name: /Dividi automaticamente/i });
      const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

      fireEvent.change(descInput, { target: { value: 'Caramella' } });
      fireEvent.change(amountInput, { target: { value: '0.01' } });
      fireEvent.click(splitCheckbox);

      fireEvent.click(submitBtn);

      // Must display rejection error
      expect(
        await screen.findByText("L'importo inserito è troppo basso per essere suddiviso.")
      ).toBeInTheDocument();

      // Zero debts created
      expect(Object.keys(mockStore.getCollection('debiti'))).toHaveLength(0);
    });

    test('large value boundary: permits max allowed 50,000.00 € split among 5 people (10,000.00 each)', async () => {
      const routerMock = require('react-router-dom');
      const d1 = { uid: 'u_d1', email: 'd1@test.com', username: 'David' };
      const e1 = { uid: 'u_e1', email: 'e1@test.com', username: 'Emma' };

      seedHousehold({
        houseId: 'casa_1',
        users: [alice, bob, charlie, d1, e1]
      });

      renderWithProviders(<AggiungiDebito />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/debiti/aggiungi'
      });

      const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
      const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
      const splitCheckbox = screen.getByRole('checkbox', { name: /Dividi automaticamente/i });
      const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

      fireEvent.change(descInput, { target: { value: 'Caparra Annuale' } });
      fireEvent.change(amountInput, { target: { value: '50000.00' } });
      fireEvent.click(splitCheckbox);

      expect(await screen.findByText('10000.00 €')).toBeInTheDocument();

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/debiti');
      });

      const debts = Object.values(mockStore.getCollection('debiti'));
      expect(debts).toHaveLength(4);
      debts.forEach((d) => {
        expect(d.importo).toBe('10000.00');
        expect(d.creditoreId).toBe(alice.uid);
      });
    });

    test('large value over-boundary: strictly rejects amount exceeding 50,000 €', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice, bob]
      });

      renderWithProviders(<AggiungiDebito />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/debiti/aggiungi'
      });

      const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
      const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
      const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

      fireEvent.change(descInput, { target: { value: 'Acquisto Fuori Scala' } });
      fireEvent.change(amountInput, { target: { value: '50000.01' } });
      fireEvent.click(submitBtn);

      expect(await screen.findByText(/L'importo inserito è troppo elevato/i)).toBeInTheDocument();
      expect(Object.keys(mockStore.getCollection('debiti'))).toHaveLength(0);
    });

    test('ViewDebiti correctly computes net balance and breakdown with mixed decimal precision', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice, bob, charlie],
        debiti: [
          // Bob owes Alice 33.33 €
          {
            id: 'd1',
            descrizione: 'Spesa 1',
            importo: '33.33',
            creditoreId: alice.uid,
            debitoreId: bob.uid,
            casaId: 'casa_1',
            createdAt: new Date()
          },
          // Charlie owes Alice 16.67 €
          {
            id: 'd2',
            descrizione: 'Spesa 2',
            importo: '16.67',
            creditoreId: alice.uid,
            debitoreId: charlie.uid,
            casaId: 'casa_1',
            createdAt: new Date()
          },
          // Alice owes Bob 10.00 €
          {
            id: 'd3',
            descrizione: 'Spesa 3',
            importo: '10.00',
            creditoreId: bob.uid,
            debitoreId: alice.uid,
            casaId: 'casa_1',
            createdAt: new Date()
          }
        ]
      });

      renderWithProviders(<ViewDebiti />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/debiti'
      });

      // Total credits: 33.33 + 16.67 = 50.00 €
      // Total debits: 10.00 €
      // Net balance: +40.00 €
      expect(await screen.findByText('+40.00 €')).toBeInTheDocument();
      expect(screen.getByText('Crediti: 50.00 €')).toBeInTheDocument();
      expect(screen.getByText('Debiti: 10.00 €')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. ADVERSARIAL TEST: CHORE DATE ORDERING & PAST/FUTURE SELECTION
  // =========================================================================
  describe('Cleaning Shifts: Chronological Date Ordering & Dashboard Accuracy', () => {
    test('VisualizzaTurni strictly sorts chores in ascending date order regardless of input order', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice],
        turni: [
          { id: 't_future_far', luoghi: ['Balcone'], data: '2026-12-25', nomi: ['Alice'], fasciaOraria: ['10:00 - 11:00'] },
          { id: 't_past', luoghi: ['Cantina'], data: '2026-10-15', nomi: ['Alice'], fasciaOraria: ['09:00 - 10:00'] },
          { id: 't_mid', luoghi: ['Cucina'], data: '2026-11-20', nomi: ['Alice'], fasciaOraria: ['14:00 - 15:00'] },
          { id: 't_near', luoghi: ['Bagno'], data: '2026-11-05', nomi: ['Alice'], fasciaOraria: ['11:00 - 12:00'] }
        ]
      });

      renderWithProviders(<VisualizzaTurni />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/turni'
      });

      await screen.findByText('Turni Pulizia');

      // Query all rendered location headers
      const locationHeadings = screen.getAllByRole('heading', { level: 3 });
      const locationsInOrder = locationHeadings.map((h) => h.textContent.trim());

      // Expected chronological order: 2026-10-15 (Cantina) -> 2026-11-05 (Bagno) -> 2026-11-20 (Cucina) -> 2026-12-25 (Balcone)
      expect(locationsInOrder).toEqual(['Cantina', 'Bagno', 'Cucina', 'Balcone']);
    });

    test('homeUtente picks the earliest upcoming chore today or in future, ignoring past chores', async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const futureDateStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      seedHousehold({
        houseId: 'casa_1',
        users: [alice],
        turni: [
          // Past chore: yesterday
          {
            id: 't_yesterday',
            utenteId: alice.uid,
            mansione: 'Pulizia Cantina Vecchia',
            data: '2020-01-01',
            casaId: 'casa_1'
          },
          // Next chore: future
          {
            id: 't_future',
            utenteId: alice.uid,
            mansione: 'Pulizia Finestre Future',
            data: futureDateStr,
            casaId: 'casa_1'
          },
          // Today chore: should be chosen over future chore
          {
            id: 't_today',
            utenteId: alice.uid,
            mansione: 'Pulizia Cucina Oggi',
            data: todayStr,
            casaId: 'casa_1'
          }
        ]
      });

      renderWithProviders(<HomeUtente />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/home'
      });

      // Today's chore must be displayed as upcoming chore
      expect(await screen.findByText('Pulizia Cucina Oggi')).toBeInTheDocument();
      expect(screen.queryByText('Pulizia Cantina Vecchia')).not.toBeInTheDocument();
    });

    test('homeUtente shows clean empty state when only past chores exist', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice],
        turni: [
          {
            id: 't_past_only',
            utenteId: alice.uid,
            mansione: 'Turno Passato Finito',
            data: '2020-05-10',
            casaId: 'casa_1'
          }
        ]
      });

      renderWithProviders(<HomeUtente />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/home'
      });

      expect(await screen.findByText(/Nessun turno oggi\. Casa splendente!/i)).toBeInTheDocument();
      expect(screen.queryByText('Turno Passato Finito')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. ADVERSARIAL TEST: PRIORITY HANDLING & NOTICES RENDERING
  // =========================================================================
  describe('Bulletin Board: Priority Tags, Chronological Ordering & Fallback', () => {
    test('renders all 4 priority tags correctly and defaults unknown priority to info', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice, bob],
        note: [
          {
            id: 'n_urg',
            titolo: 'Perdita Acqua',
            contenuto: 'Chiudere il rubinetto centrale',
            priorita: 'urgente',
            autoreId: alice.uid,
            createdAt: new Date(2026, 10, 2, 10, 0, 0)
          },
          {
            id: 'n_imp',
            titolo: 'Pagamento Affitto',
            contenuto: 'Bonifico entro venerdì',
            priorita: 'importante',
            autoreId: bob.uid,
            createdAt: new Date(2026, 10, 2, 9, 0, 0)
          },
          {
            id: 'n_rem',
            titolo: 'Differenziata Plastica',
            contenuto: 'Esporre stasera',
            priorita: 'promemoria',
            autoreId: alice.uid,
            createdAt: new Date(2026, 10, 2, 8, 0, 0)
          },
          {
            id: 'n_inf',
            titolo: 'Wi-Fi Password',
            contenuto: 'Nuovo router installato',
            priorita: 'info',
            autoreId: bob.uid,
            createdAt: new Date(2026, 10, 2, 7, 0, 0)
          },
          {
            id: 'n_unknown',
            titolo: 'Nota Senza Priorita',
            contenuto: 'Priorita non definita',
            priorita: 'sconosciuta_aliena',
            autoreId: alice.uid,
            createdAt: new Date(2026, 10, 2, 6, 0, 0)
          }
        ]
      });

      renderWithProviders(<ViewBacheca />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/bacheca'
      });

      expect(await screen.findByText('Perdita Acqua')).toBeInTheDocument();

      // Check priority badge tags
      const urgenteTag = screen.getByText('Urgente');
      expect(urgenteTag).toHaveClass('priority-urgente');

      const importanteTag = screen.getByText('Importante');
      expect(importanteTag).toHaveClass('priority-importante');

      const promemoriaTag = screen.getByText('Promemoria');
      expect(promemoriaTag).toHaveClass('priority-promemoria');

      const infoTags = screen.getAllByText('Info');
      // 2 info tags: one explicit "info", one defaulted from "sconosciuta_aliena"
      expect(infoTags.length).toBeGreaterThanOrEqual(2);
      infoTags.forEach((t) => expect(t).toHaveClass('priority-info'));

      // Check sorting by createdAt descending (newest first)
      const titles = screen.getAllByRole('heading', { level: 3 });
      const titlesInOrder = titles.map((t) => t.textContent.trim());
      expect(titlesInOrder).toEqual([
        'Perdita Acqua',
        'Pagamento Affitto',
        'Differenziata Plastica',
        'Wi-Fi Password',
        'Nota Senza Priorita'
      ]);
    });

    test('AggiungiNota allows switching priority pills and persists selected priority', async () => {
      const routerMock = require('react-router-dom');
      seedHousehold({
        houseId: 'casa_1',
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

      // Click "Urgente" pill
      const urgentePill = screen.getByRole('button', { name: /Urgente/i });
      fireEvent.click(urgentePill);
      expect(urgentePill).toHaveClass('active');

      fireEvent.change(titleInput, { target: { value: 'Interruzione Elettrica' } });
      fireEvent.change(contentInput, { target: { value: 'Domani mattina dalle 8 alle 12' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/bacheca');
      });

      const notes = Object.values(mockStore.getCollection('note'));
      expect(notes).toHaveLength(1);
      expect(notes[0].titolo).toBe('Interruzione Elettrica');
      expect(notes[0].priorita).toBe('urgente');
    });
  });

  // =========================================================================
  // 5. ADVERSARIAL TEST: RUNTIME ZERO-EMOJI AND ZERO-EMOTICON SCAN IN RENDERED DOM
  // =========================================================================
  describe('Strict Zero-Emoji & Zero-Emoticon DOM Assertions Across Views', () => {
    const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
    const EMOTICON_REGEX = /(?:(?<=\s|^|["'`>])(?::\)|:-\)|:\(|:-\(|:D|:-D|;\)|;-\)|:P|:-P|<3|\bXD\b|\bxd\b|(?:\^_-\^)|(?:-_-)|:o|:-O)(?=\s|$|["'`<.,!?;:]))/gi;

    test('ViewSpesa rendered DOM contains 0 emojis and 0 text emoticons', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice],
        spesa: [{ id: 's1', nome: 'Biscotti', comprato: false, casaId: 'casa_1' }]
      });

      const { container } = renderWithProviders(<ViewSpesa />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/spesa'
      });

      await screen.findByText('Biscotti', { selector: 'span' });
      expect(EMOJI_REGEX.test(container.textContent)).toBe(false);
      expect(EMOTICON_REGEX.test(container.textContent)).toBe(false);
    });

    test('ViewDebiti rendered DOM contains 0 emojis and 0 text emoticons', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice, bob],
        debiti: [{ id: 'd1', importo: '15.00', creditoreId: alice.uid, debitoreId: bob.uid, casaId: 'casa_1', descrizione: 'Detersivi' }]
      });

      const { container } = renderWithProviders(<ViewDebiti />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/debiti'
      });

      await screen.findByText('+15.00 €');
      expect(EMOJI_REGEX.test(container.textContent)).toBe(false);
      expect(EMOTICON_REGEX.test(container.textContent)).toBe(false);
    });

    test('VisualizzaTurni rendered DOM contains 0 emojis and 0 text emoticons', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice],
        turni: [{ id: 't1', luoghi: ['Cucina'], data: '2026-11-10', nomi: ['Alice'], fasciaOraria: ['10:00 - 11:00'] }]
      });

      const { container } = renderWithProviders(<VisualizzaTurni />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/turni'
      });

      await screen.findByText('Turni Pulizia');
      expect(EMOJI_REGEX.test(container.textContent)).toBe(false);
      expect(EMOTICON_REGEX.test(container.textContent)).toBe(false);
    });

    test('ViewBacheca rendered DOM contains 0 emojis and 0 text emoticons', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice],
        note: [{ id: 'n1', titolo: 'Avviso di Prova', contenuto: 'Dettagli senza faccine', priorita: 'urgente', autoreId: alice.uid }]
      });

      const { container } = renderWithProviders(<ViewBacheca />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/bacheca'
      });

      await screen.findByText('Avviso di Prova');
      expect(EMOJI_REGEX.test(container.textContent)).toBe(false);
      expect(EMOTICON_REGEX.test(container.textContent)).toBe(false);
    });
  });
});
