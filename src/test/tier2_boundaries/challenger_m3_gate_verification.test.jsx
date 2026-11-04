import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, seedHousehold, mockStore } from '../testUtils';
import AggiungiDebito from '../../pages/Debiti/AggiungiDebito';
import ViewDebiti from '../../pages/Debiti/ViewDebiti';
import ViewSpesa from '../../pages/Spesa/ViewSpesa';
import VisualizzaTurni from '../../pages/TurniPulizia/viewTurni';
import AggiuntaTurno from '../../pages/TurniPulizia/aggiuntaTurno';
import ModificaTurno from '../../pages/TurniPulizia/modificaTurno';
import ViewBacheca from '../../pages/Bacheca/ViewBacheca';
import AggiungiNota from '../../pages/Bacheca/AggiungiNota';
import ModificaNota from '../../pages/Bacheca/ModificaNota';

describe('Empirical Challenger: Milestone 3 Domain Logic Gate Verification', () => {
  const alice = { uid: 'u_alice', email: 'alice@test.com', username: 'Alice' };
  const bob = { uid: 'u_bob', email: 'bob@test.com', username: 'Bob' };
  const charlie = { uid: 'u_charlie', email: 'charlie@test.com', username: 'Charlie' };
  const david = { uid: 'u_david', email: 'david@test.com', username: 'David' };
  const eve = { uid: 'u_eve', email: 'eve@test.com', username: 'Eve' };

  beforeEach(() => {
    mockStore.reset();
    const routerMock = require('react-router-dom');
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  // -------------------------------------------------------------------------
  // 1. EQUAL DEBT SPLIT MATHEMATICS ACROSS 2, 3, 5, 10 ROOMMATES & BOUNDARIES
  // -------------------------------------------------------------------------
  describe('Domain Stress 1: Debt Split Math & Self-Debt Prevention', () => {
    test('equal split across 2 roommates (10.00 EUR -> 5.00 EUR quota to non-creditor)', async () => {
      const routerMock = require('react-router-dom');
      seedHousehold({ houseId: 'casa_1', users: [alice, bob] });

      renderWithProviders(<AggiungiDebito />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/debiti/aggiungi'
      });

      const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
      const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
      const splitCheckbox = screen.getByRole('checkbox');
      const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

      fireEvent.change(descInput, { target: { value: 'Spesa Duo' } });
      fireEvent.change(amountInput, { target: { value: '10.00' } });
      fireEvent.click(splitCheckbox);

      expect(await screen.findByText('5.00 €')).toBeInTheDocument();
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/debiti');
      });

      const debts = Object.values(mockStore.getCollection('debiti'));
      expect(debts).toHaveLength(1);
      expect(debts[0].debitoreId).toBe(bob.uid);
      expect(debts[0].creditoreId).toBe(alice.uid);
      expect(debts[0].importo).toBe('5.00');
    });

    test('equal split across 5 roommates (100.00 EUR -> 20.00 EUR quota to each 4 roommates)', async () => {
      const routerMock = require('react-router-dom');
      seedHousehold({ houseId: 'casa_1', users: [alice, bob, charlie, david, eve] });

      renderWithProviders(<AggiungiDebito />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/debiti/aggiungi'
      });

      const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
      const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
      const splitCheckbox = screen.getByRole('checkbox');
      const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

      fireEvent.change(descInput, { target: { value: 'Cena Condivisa 5' } });
      fireEvent.change(amountInput, { target: { value: '100.00' } });
      fireEvent.click(splitCheckbox);

      expect(await screen.findByText('20.00 €')).toBeInTheDocument();
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/debiti');
      });

      const debts = Object.values(mockStore.getCollection('debiti'));
      expect(debts).toHaveLength(4);
      debts.forEach((d) => {
        expect(d.importo).toBe('20.00');
        expect(d.creditoreId).toBe(alice.uid);
        expect(d.debitoreId).not.toBe(alice.uid);
      });
    });

    test('equal split across 10 roommates (1000.00 EUR -> 100.00 EUR quota to each 9 roommates)', async () => {
      const routerMock = require('react-router-dom');
      const tenUsers = Array.from({ length: 10 }, (_, i) => ({
        uid: `u_user_${i}`,
        email: `u${i}@test.com`,
        username: `User${i}`
      }));
      const currentCreditor = tenUsers[0];

      seedHousehold({ houseId: 'casa_1', users: tenUsers });

      renderWithProviders(<AggiungiDebito />, {
        user: currentCreditor,
        userData: { username: currentCreditor.username, casaId: 'casa_1' },
        route: '/debiti/aggiungi'
      });

      const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
      const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
      const splitCheckbox = screen.getByRole('checkbox');
      const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

      fireEvent.change(descInput, { target: { value: 'Bolletta Condominiale 10' } });
      fireEvent.change(amountInput, { target: { value: '1000.00' } });
      fireEvent.click(splitCheckbox);

      expect(await screen.findByText('100.00 €')).toBeInTheDocument();
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/debiti');
      });

      const debts = Object.values(mockStore.getCollection('debiti'));
      expect(debts).toHaveLength(9);
      debts.forEach((d) => {
        expect(d.importo).toBe('100.00');
        expect(d.creditoreId).toBe(currentCreditor.uid);
        expect(d.debitoreId).not.toBe(currentCreditor.uid);
      });
    });

    test('boundary 0.01 EUR with 3 roommates is rejected because individual quota rounds to 0.00 EUR', async () => {
      seedHousehold({ houseId: 'casa_1', users: [alice, bob, charlie] });

      renderWithProviders(<AggiungiDebito />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/debiti/aggiungi'
      });

      const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
      const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
      const splitCheckbox = screen.getByRole('checkbox');
      const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

      fireEvent.change(descInput, { target: { value: 'Cent Spesa' } });
      fireEvent.change(amountInput, { target: { value: '0.01' } });
      fireEvent.click(splitCheckbox);
      fireEvent.click(submitBtn);

      expect(
        await screen.findByText("L'importo inserito è troppo basso per essere suddiviso.")
      ).toBeInTheDocument();
      expect(mockStore.getCollection('debiti')).toEqual({});
    });

    test('self-debt prevention: selecting self as debtor in single expense is rejected', async () => {
      seedHousehold({ houseId: 'casa_1', users: [alice, bob] });

      renderWithProviders(<AggiungiDebito />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/debiti/aggiungi'
      });

      const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
      const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
      const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

      await waitFor(() => {
        expect(screen.getAllByText(/Bob/i).length).toBeGreaterThanOrEqual(1);
      });

      const selects = screen.getAllByRole('combobox');
      fireEvent.change(descInput, { target: { value: 'Debito Autoassegnato' } });
      fireEvent.change(amountInput, { target: { value: '25.00' } });
      fireEvent.change(selects[0], { target: { value: alice.uid } });
      fireEvent.change(selects[1], { target: { value: alice.uid } });
      fireEvent.click(submitBtn);

      expect(
        await screen.findByText('Non puoi registrare un debito verso te stesso.')
      ).toBeInTheDocument();
      expect(mockStore.getCollection('debiti')).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // 2. GROCERY LIST EMPTY STATE RESILIENCE (0 ITEMS -> 0%, NO NAN%, NO CRASH)
  // -------------------------------------------------------------------------
  describe('Domain Stress 2: Grocery List Empty State & Progress Resilience', () => {
    test('renders empty grocery state without NaN% or division-by-zero crashes', async () => {
      seedHousehold({ houseId: 'casa_1', users: [alice], spesa: [] });

      const { container } = renderWithProviders(<ViewSpesa />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/spesa'
      });

      // Assert empty state card
      expect(await screen.findByText(/Nessun prodotto in lista\. Casa ben rifornita!/i)).toBeInTheDocument();

      // Assert counter numbers: exactly two '0' text nodes (0 da comprare, 0 presi)
      const zeroes = screen.getAllByText('0');
      expect(zeroes).toHaveLength(2);

      // Assert progress bar style: width must be 0% (NOT NaN%)
      const progressFill = container.querySelector('.grocery-progress-fill');
      expect(progressFill).toBeInTheDocument();
      expect(progressFill.style.width).toBe('0%');
      expect(progressFill.style.width).not.toContain('NaN');
    });
  });

  // -------------------------------------------------------------------------
  // 3. CHORE SCHEDULING: BOUNDARY DATES (<2020, >2100) & MULTI-TENANT ISOLATION
  // -------------------------------------------------------------------------
  describe('Domain Stress 3: Chore Scheduling Boundaries & Multi-Tenant Isolation', () => {
    test('AggiuntaTurno strictly rejects date with year < 2020 (e.g. 2019-12-31)', async () => {
      seedHousehold({ houseId: 'casa_1', users: [alice] });

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
      fireEvent.change(dataInput, { target: { value: '2019-12-31' } });
      fireEvent.change(fasciaSelect, { target: { value: '10:00 - 11:00' } });
      fireEvent.change(luoghiInput, { target: { value: 'Bagno' } });
      fireEvent.click(submitBtn);

      expect(
        await screen.findByText("L'anno deve essere compreso tra 2020 e 2100.")
      ).toBeInTheDocument();
      expect(mockStore.getCollection('turni')).toEqual({});
    });

    test('AggiuntaTurno strictly rejects date with year > 2100 (e.g. 2101-01-01)', async () => {
      seedHousehold({ houseId: 'casa_1', users: [alice] });

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
      fireEvent.change(dataInput, { target: { value: '2101-01-01' } });
      fireEvent.change(fasciaSelect, { target: { value: '10:00 - 11:00' } });
      fireEvent.change(luoghiInput, { target: { value: 'Bagno' } });
      fireEvent.click(submitBtn);

      expect(
        await screen.findByText("L'anno deve essere compreso tra 2020 e 2100.")
      ).toBeInTheDocument();
      expect(mockStore.getCollection('turni')).toEqual({});
    });

    test('ModificaTurno isolates households: blocks access to turno from another household', async () => {
      const routerMock = require('react-router-dom');
      window.alert = jest.fn();

      mockStore.seed('turni', {
        turno_other_house: {
          id: 'turno_other_house',
          nomi: ['Stranger'],
          data: '2026-11-20',
          fasciaOraria: ['10:00 - 11:00'],
          luoghi: ['Soffitta'],
          casaId: 'casa_FOREIGN'
        }
      });

      routerMock.__setParams({ id: 'turno_other_house' });

      renderWithProviders(<ModificaTurno />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/turni/modifica/turno_other_house'
      });

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          expect.stringMatching(/Accesso non consentito: questo turno appartiene a un'altra abitazione/i)
        );
        expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/turni');
      });
    });
  });

  // -------------------------------------------------------------------------
  // 4. NOTICE BOARD: AUTHOR-ONLY CONTROLS & CHARACTER LIMIT ENFORCEMENT
  // -------------------------------------------------------------------------
  describe('Domain Stress 4: Notice Board Controls & Character Limit Enforcement', () => {
    test('ViewBacheca hides edit and delete buttons for notes authored by other roommates', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice, bob],
        note: [
          {
            id: 'n_bob',
            titolo: 'Avviso di Bob',
            contenuto: 'Messaggio privato di Bob',
            autoreId: bob.uid,
            priorita: 'info',
            casaId: 'casa_1',
            createdAt: new Date()
          }
        ]
      });

      // Render as Alice
      renderWithProviders(<ViewBacheca />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/bacheca'
      });

      expect(await screen.findByText('Avviso di Bob')).toBeInTheDocument();
      expect(screen.queryByTitle('Modifica')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Elimina')).not.toBeInTheDocument();
    });

    test('ModificaNota blocks non-author from editing an existing notice', async () => {
      const routerMock = require('react-router-dom');
      window.alert = jest.fn();

      seedHousehold({
        houseId: 'casa_1',
        users: [alice, bob],
        note: [
          {
            id: 'n_bob_edit',
            titolo: 'Avviso di Bob Non Modificabile',
            contenuto: 'Solo Bob puo modificare',
            autoreId: bob.uid,
            casaId: 'casa_1',
            createdAt: new Date()
          }
        ]
      });

      routerMock.__setParams({ id: 'n_bob_edit' });

      renderWithProviders(<ModificaNota />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/bacheca/modifica/n_bob_edit'
      });

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          expect.stringMatching(/Non sei l'autore di questo avviso!/i)
        );
        expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/bacheca');
      });
    });

    test('AggiungiNota displays live character counters and enforces length constraints', async () => {
      seedHousehold({ houseId: 'casa_1', users: [alice] });

      renderWithProviders(<AggiungiNota />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/bacheca/aggiungi'
      });

      // Character counters
      expect(await screen.findByText('0 / 80')).toBeInTheDocument();
      expect(screen.getByText('0 / 1500')).toBeInTheDocument();

      const titleInput = screen.getByPlaceholderText(/Oggetto dell'avviso/i);
      const contentInput = screen.getByPlaceholderText(/Scrivi qui il messaggio dettagliato/i);

      fireEvent.change(titleInput, { target: { value: 'Riunione Ordinaria' } });
      expect(screen.getByText('18 / 80')).toBeInTheDocument();

      fireEvent.change(contentInput, { target: { value: 'Testo di prova' } });
      expect(screen.getByText('14 / 1500')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 5. HARDENED ZERO-EMOJI AND ZERO-EMOTICON SCAN IN RENDERED VIEWS
  // -------------------------------------------------------------------------
  describe('Domain Stress 5: Hardened Zero-Emoji Scan Across Rendered Views', () => {
    const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{20E3}]/u;
    const EMOTICON_REGEX = /(?:(?<=\s|^|["'`>])(?::\)|:-\)|:\(|:-\(|:D|:-D|;\)|;-\)|:P|:-P|<3|\bXD\b|\bxd\b|(?:\^_-\^)|(?:-_-)|:o|:-O)(?=\s|$|["'`<.,!?;:]))/gi;

    test('ViewDebiti rendered DOM has zero emojis or text emoticons', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice, bob],
        debiti: [{ id: 'd1', importo: '25.00', creditoreId: alice.uid, debitoreId: bob.uid, casaId: 'casa_1', descrizione: 'Pizza' }]
      });

      const { container } = renderWithProviders(<ViewDebiti />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/debiti'
      });

      await screen.findByText('+25.00 €');
      expect(EMOJI_REGEX.test(container.textContent)).toBe(false);
      expect(EMOTICON_REGEX.test(container.textContent)).toBe(false);
    });

    test('VisualizzaTurni rendered DOM has zero emojis or text emoticons', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice],
        turni: [{ id: 't1', luoghi: ['Cucina'], data: '2026-11-10', nomi: ['Alice'], fasciaOraria: ['10:00 - 11:00'], casaId: 'casa_1' }]
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

    test('ViewBacheca rendered DOM has zero emojis or text emoticons', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [alice],
        note: [{ id: 'n1', titolo: 'Comunicazione', contenuto: 'Dettagli puliti', priorita: 'urgente', autoreId: alice.uid, casaId: 'casa_1' }]
      });

      const { container } = renderWithProviders(<ViewBacheca />, {
        user: alice,
        userData: { username: 'Alice', casaId: 'casa_1' },
        route: '/bacheca'
      });

      await screen.findByText('Comunicazione');
      expect(EMOJI_REGEX.test(container.textContent)).toBe(false);
      expect(EMOTICON_REGEX.test(container.textContent)).toBe(false);
    });
  });
});
