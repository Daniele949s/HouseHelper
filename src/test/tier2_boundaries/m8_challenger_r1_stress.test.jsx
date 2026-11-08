import React from 'react';
import { screen, fireEvent, waitFor, cleanup, render, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import mockStore from '../mockFirebase';
import HomeUtente from '../../pages/homeUtente';
import * as AuthContextModule from '../../contexts/AuthContext';
import {
  saveOfflineData,
  getOfflineData,
  purgeTenantStorage,
  purgeAllOfflineStorage
} from '../../utils/offlineStorage';

// Mock useAuth to isolate and deterministically control Auth state & timing
jest.mock('../../contexts/AuthContext', () => {
  const actual = jest.requireActual('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: jest.fn()
  };
});

describe('Milestone 8 Challenger: R1 Sync & Performance Stress Suite', () => {
  const userAlpha = { uid: 'user_alpha', email: 'alpha@test.it', username: 'AlphaUser' };
  const userBeta = { uid: 'user_beta', email: 'beta@test.it', username: 'BetaUser' };

  let mockSetUserData;

  beforeEach(() => {
    localStorage.clear();
    mockStore.reset();
    const routerMock = require('react-router-dom');
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
    jest.restoreAllMocks();

    mockSetUserData = jest.fn();
    AuthContextModule.useAuth.mockReturnValue({
      currentUser: userAlpha,
      userData: { username: 'AlphaUser', email: 'alpha@test.it', casaId: 'casa_alpha' },
      setUserData: mockSetUserData
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    mockStore.reset();
    jest.restoreAllMocks();
  });

  function renderHome(initialEntries = ['/home']) {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <HomeUtente />
      </MemoryRouter>
    );
  }

  // =========================================================================
  // 1. SYNCHRONOUS CACHE HYDRATION (ZERO BLOCKING DELAY)
  // =========================================================================
  describe('1. Synchronous Cache Hydration', () => {
    test('renders cached dashboard content immediately on first tick without blocking screen', async () => {
      const houseId = 'casa_hydrated';
      AuthContextModule.useAuth.mockReturnValue({
        currentUser: userAlpha,
        userData: { username: 'AlphaUser', email: 'alpha@test.it', casaId: houseId },
        setUserData: mockSetUserData
      });

      const cachedData = {
        casa: { id: houseId, nome: 'Residenza Villa Serena', codiceUnivoco: 'SERENA' },
        prossimoTurno: {
          id: 'turno_hydrated_1',
          mansione: 'Pulizia Salotto e Vetrate',
          data: '2026-11-20',
          nomi: ['AlphaUser']
        },
        saldo: 84.50,
        ultimoAvviso: { id: 'nota_1', titolo: 'Regole della casa' },
        turniList: [{ id: 'turno_hydrated_1', mansione: 'Pulizia Salotto e Vetrate', data: '2026-11-20', nomi: ['AlphaUser'] }],
        debitiList: [{ id: 'deb_1', creditoreId: userAlpha.uid, debitoreId: 'other', importo: 84.50, descrizione: 'Spesa Generale' }],
        spesaList: [{ id: 'spesa_1', nome: 'Detersivo Pavimenti', comprato: false }],
        utentiMap: { [userAlpha.uid]: 'AlphaUser', other_uid: 'OtherUser' }
      };

      // Seed offline cache for houseId
      saveOfflineData(houseId, 'dashboard_cache', cachedData);

      // Seed mock store with matching data
      mockStore.seed('case', {
        [houseId]: { nome: 'Residenza Villa Serena', codiceUnivoco: 'SERENA' }
      });
      mockStore.seed('utenti', {
        [userAlpha.uid]: { username: 'AlphaUser', email: 'alpha@test.it', casaId: houseId }
      });

      renderHome();

      // 1. Synchronous assertion: Cached elements MUST be in DOM on the very first tick (0ms delay)
      expect(screen.getByText('Residenza Villa Serena')).toBeInTheDocument();
      expect(screen.getByText('SERENA')).toBeInTheDocument();
      expect(screen.getByText('Pulizia Salotto e Vetrate')).toBeInTheDocument();
      expect(screen.getByText('+84.50 €')).toBeInTheDocument();

      // 2. Strict anti-waterfall check: Old blocking sync screen MUST NOT be in DOM
      expect(screen.queryByText(/Sincronizzazione della casa\.\.\./i)).toBeNull();

      // 3. Skeleton must NOT be displayed when cache is available
      expect(screen.queryByText(/Caricamento dati della casa\.\.\./i)).toBeNull();

      // 4. Quick navigation services are interactive immediately
      const servicesNav = screen.getByLabelText(/Servizi Rapidi/i);
      const turniBtn = within(servicesNav).getByRole('button', { name: /^Turni$/i });
      expect(turniBtn).toBeInTheDocument();

      // 5. Background sync indicator appears and disappears after query resolution
      await waitFor(() => {
        expect(screen.queryByText(/Sincronizzazione\.\.\./i)).toBeNull();
      });
    });

    test('updates offline storage cache when fresh data arrives from Firestore', async () => {
      const houseId = 'casa_refresh';
      AuthContextModule.useAuth.mockReturnValue({
        currentUser: userAlpha,
        userData: { username: 'AlphaUser', email: 'alpha@test.it', casaId: houseId },
        setUserData: mockSetUserData
      });

      const initialCache = {
        casa: { id: houseId, nome: 'Nome Vecchio', codiceUnivoco: 'VECCHI' },
        prossimoTurno: null,
        saldo: 10.0,
        ultimoAvviso: null,
        turniList: [],
        debitiList: [],
        spesaList: [],
        utentiMap: { [userAlpha.uid]: 'AlphaUser' }
      };
      saveOfflineData(houseId, 'dashboard_cache', initialCache);

      // Firestore has updated house name and a new shift
      mockStore.seed('case', {
        [houseId]: { nome: 'Nome Aggiornato Live', codiceUnivoco: 'NUOV01' }
      });
      mockStore.seed('turni', {
        t_live: {
          casaId: houseId,
          mansione: 'Sanificazione Cucina Live',
          data: '2026-11-25',
          nomi: ['AlphaUser']
        }
      });

      renderHome();

      // Initially renders old cached name synchronously
      expect(screen.getByText('Nome Vecchio')).toBeInTheDocument();

      // Once background Promise.all finishes, updates to fresh data
      await waitFor(() => {
        expect(screen.getByText('Nome Aggiornato Live')).toBeInTheDocument();
        expect(screen.getByText('Sanificazione Cucina Live')).toBeInTheDocument();
      });

      // Verify that offlineStorage now contains updated data
      const updatedCache = getOfflineData(houseId, 'dashboard_cache');
      expect(updatedCache).not.toBeNull();
      expect(updatedCache.casa.nome).toBe('Nome Aggiornato Live');
      expect(updatedCache.prossimoTurno.mansione).toBe('Sanificazione Cucina Live');

      await waitFor(() => {
        expect(screen.queryByText(/Sincronizzazione\.\.\./i)).toBeNull();
      });
    });
  });

  // =========================================================================
  // 2. COLD START BEHAVIOR (EMPTY CACHE)
  // =========================================================================
  describe('2. Cold Start Behavior (Empty Cache)', () => {
    test('cold start presents non-blocking shell and skeleton without blocking entire app', async () => {
      const houseId = 'casa_cold';
      AuthContextModule.useAuth.mockReturnValue({
        currentUser: userAlpha,
        userData: { username: 'AlphaUser', email: 'alpha@test.it', casaId: houseId },
        setUserData: mockSetUserData
      });

      mockStore.seed('case', {
        [houseId]: { nome: 'Casa Avvio a Freddo', codiceUnivoco: 'FREDD0' }
      });

      // Ensure cache is completely empty
      expect(getOfflineData(houseId, 'dashboard_cache')).toBeNull();

      renderHome();

      // Greeting banner and dashboard structure render immediately
      expect(screen.getByText(/Bentornato,/i)).toBeInTheDocument();
      expect(screen.getByText('AlphaUser')).toBeInTheDocument();

      // Quick services navigation grid is present immediately
      const servicesNav = screen.getByLabelText(/Servizi Rapidi/i);
      expect(within(servicesNav).getByRole('button', { name: /^Turni$/i })).toBeInTheDocument();
      expect(within(servicesNav).getByRole('button', { name: /^Spese$/i })).toBeInTheDocument();
      expect(within(servicesNav).getByRole('button', { name: /^Spesa$/i })).toBeInTheDocument();

      // Inline skeleton is rendered during initial cold load
      expect(screen.getByText(/Caricamento dati della casa\.\.\./i)).toBeInTheDocument();

      // Old full-page blocking sync card must NEVER appear
      expect(screen.queryByText(/Sincronizzazione della casa\.\.\./i)).toBeNull();

      // When queries complete, household status replaces skeleton
      await screen.findByText('Casa Avvio a Freddo');
      expect(screen.getByText('FREDD0')).toBeInTheDocument();
      expect(screen.queryByText(/Caricamento dati della casa\.\.\./i)).toBeNull();

      await waitFor(() => {
        expect(screen.queryByText(/Sincronizzazione\.\.\./i)).toBeNull();
      });
    });

    test('quick navigation buttons are clickable and functional during cold start loading', async () => {
      const routerMock = require('react-router-dom');
      const houseId = 'casa_nav_cold';
      AuthContextModule.useAuth.mockReturnValue({
        currentUser: userAlpha,
        userData: { username: 'AlphaUser', email: 'alpha@test.it', casaId: houseId },
        setUserData: mockSetUserData
      });

      // Keep queries pending artificially
      let resolveHouse;
      const delayedPromise = new Promise((res) => { resolveHouse = res; });
      jest.spyOn(mockStore, 'getDoc').mockImplementation((coll, id) => {
        if (coll === 'case') return delayedPromise;
        return Promise.resolve({ id, exists: () => false, data: () => null });
      });

      renderHome();

      // Quick service button is clickable while queries are pending
      const servicesNav = screen.getByLabelText(/Servizi Rapidi/i);
      const spesaBtn = within(servicesNav).getByRole('button', { name: /^Spesa$/i });
      fireEvent.click(spesaBtn);

      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/spesa');

      // Resolve pending query cleanly
      await act(async () => {
        resolveHouse({
          id: houseId,
          exists: () => true,
          data: () => ({ nome: 'Casa Nav Pending', codiceUnivoco: 'NAVPEN' })
        });
      });

      await waitFor(() => {
        expect(screen.queryByText(/Sincronizzazione\.\.\./i)).toBeNull();
      });
    });
  });

  // =========================================================================
  // 3. NETWORK FAILURE & PARTIAL FAILURE RESILIENCE
  // =========================================================================
  describe('3. Network & Partial Failure Resilience', () => {
    test('handles full network failure gracefully during cold start without uncaught exception', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const houseId = 'casa_net_fail';
      AuthContextModule.useAuth.mockReturnValue({
        currentUser: userAlpha,
        userData: { username: 'AlphaUser', email: 'alpha@test.it', casaId: houseId },
        setUserData: mockSetUserData
      });

      // Mock getDocs to reject with network failure
      jest.spyOn(mockStore, 'getDocs').mockRejectedValue(new Error('503 Service Unavailable: Network Failure'));

      renderHome();

      // Verify that after failure, loading states reset and app does not freeze
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Errore caricamento dashboard:',
          expect.any(Error)
        );
      });

      // Sync indicator must clear (not stay spinning forever)
      expect(screen.queryByText(/Sincronizzazione\.\.\./i)).toBeNull();

      // UI navigation remains active
      const servicesNav = screen.getByLabelText(/Servizi Rapidi/i);
      expect(within(servicesNav).getByRole('button', { name: /^Turni$/i })).toBeInTheDocument();
      consoleErrorSpy.mockRestore();
    });

    test('preserves cached data when background network refresh fails on warm start', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const houseId = 'casa_warm_fail';
      AuthContextModule.useAuth.mockReturnValue({
        currentUser: userAlpha,
        userData: { username: 'AlphaUser', email: 'alpha@test.it', casaId: houseId },
        setUserData: mockSetUserData
      });

      const cachedData = {
        casa: { id: houseId, nome: 'Casa Offline Resiliente', codiceUnivoco: 'RESIL1' },
        prossimoTurno: { id: 't1', mansione: 'Arieggiare Camere', data: '2026-11-28', nomi: ['AlphaUser'] },
        saldo: 35.0,
        ultimoAvviso: null,
        turniList: [],
        debitiList: [],
        spesaList: [],
        utentiMap: { [userAlpha.uid]: 'AlphaUser' }
      };
      saveOfflineData(houseId, 'dashboard_cache', cachedData);

      // Network query fails
      jest.spyOn(mockStore, 'getDoc').mockRejectedValue(new Error('Network request timed out'));

      renderHome();

      // Cached content must remain visible
      expect(screen.getByText('Casa Offline Resiliente')).toBeInTheDocument();
      expect(screen.getByText('RESIL1')).toBeInTheDocument();
      expect(screen.getByText('Arieggiare Camere')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText(/Sincronizzazione\.\.\./i)).toBeNull();
      });

      // Content still present after failure
      expect(screen.getByText('Casa Offline Resiliente')).toBeInTheDocument();
      consoleErrorSpy.mockRestore();
    });

    test('handles partial query rejection in Promise.all cleanly', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const houseId = 'casa_partial_fail';
      AuthContextModule.useAuth.mockReturnValue({
        currentUser: userAlpha,
        userData: { username: 'AlphaUser', email: 'alpha@test.it', casaId: houseId },
        setUserData: mockSetUserData
      });

      // Mock getDocs to fail only for debiti collection
      const originalGetDocs = mockStore.getDocs.bind(mockStore);
      jest.spyOn(mockStore, 'getDocs').mockImplementation((collName, constraints) => {
        if (collName === 'debiti') {
          return Promise.reject(new Error('Firestore quota exceeded for debiti'));
        }
        return originalGetDocs(collName, constraints);
      });

      renderHome();

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      // State is not corrupted, sync pill finishes
      expect(screen.queryByText(/Sincronizzazione\.\.\./i)).toBeNull();
      consoleErrorSpy.mockRestore();
    });
  });

  // =========================================================================
  // 4. MULTI-TENANT CACHE SEPARATION & LEAKAGE PREVENTION
  // =========================================================================
  describe('4. Multi-Tenant Cache Separation', () => {
    test('dashboard data from Casa A is strictly inaccessible and never leaked to Casa B', async () => {
      const casaA = 'casa_alpha_unique';
      const casaB = 'casa_beta_unique';

      // Seed Cache A
      saveOfflineData(casaA, 'dashboard_cache', {
        casa: { id: casaA, nome: 'Villa Esclusiva Alpha', codiceUnivoco: 'ALPH01' },
        prossimoTurno: { id: 'tA', mansione: 'Compito Segreto Alpha', data: '2026-11-29', nomi: ['AlphaUser'] },
        saldo: 150.00,
        ultimoAvviso: { id: 'nA', titolo: 'Avviso Riservato Alpha' },
        turniList: [],
        debitiList: [],
        spesaList: [],
        utentiMap: { [userAlpha.uid]: 'AlphaUser' }
      });

      // Seed Cache B
      saveOfflineData(casaB, 'dashboard_cache', {
        casa: { id: casaB, nome: 'Appartamento Beta Unico', codiceUnivoco: 'BETA02' },
        prossimoTurno: { id: 'tB', mansione: 'Compito Segreto Beta', data: '2026-11-30', nomi: ['BetaUser'] },
        saldo: -45.00,
        ultimoAvviso: { id: 'nB', titolo: 'Avviso Riservato Beta' },
        turniList: [],
        debitiList: [],
        spesaList: [],
        utentiMap: { [userBeta.uid]: 'BetaUser' }
      });

      // 1. Render User Alpha
      AuthContextModule.useAuth.mockReturnValue({
        currentUser: userAlpha,
        userData: { username: 'AlphaUser', email: 'alpha@test.it', casaId: casaA },
        setUserData: mockSetUserData
      });

      const { unmount } = renderHome();

      expect(screen.getByText('Villa Esclusiva Alpha')).toBeInTheDocument();
      expect(screen.getByText('ALPH01')).toBeInTheDocument();
      expect(screen.getByText('Compito Segreto Alpha')).toBeInTheDocument();

      // Zero presence of Beta data
      expect(screen.queryByText('Appartamento Beta Unico')).toBeNull();
      expect(screen.queryByText('BETA02')).toBeNull();
      expect(screen.queryByText('Compito Segreto Beta')).toBeNull();

      await waitFor(() => {
        expect(screen.queryByText(/Sincronizzazione\.\.\./i)).toBeNull();
      });

      unmount();

      // 2. Render User Beta
      AuthContextModule.useAuth.mockReturnValue({
        currentUser: userBeta,
        userData: { username: 'BetaUser', email: 'beta@test.it', casaId: casaB },
        setUserData: mockSetUserData
      });

      renderHome();

      expect(screen.getByText('Appartamento Beta Unico')).toBeInTheDocument();
      expect(screen.getByText('BETA02')).toBeInTheDocument();
      expect(screen.getByText('Compito Segreto Beta')).toBeInTheDocument();

      // Zero presence of Alpha data
      expect(screen.queryByText('Villa Esclusiva Alpha')).toBeNull();
      expect(screen.queryByText('ALPH01')).toBeNull();
      expect(screen.queryByText('Compito Segreto Alpha')).toBeNull();

      await waitFor(() => {
        expect(screen.queryByText(/Sincronizzazione\.\.\./i)).toBeNull();
      });
    });

    test('purgeTenantStorage evicts only the targeted household dashboard cache', () => {
      const casaA = 'tenant_evict_A';
      const casaB = 'tenant_evict_B';

      saveOfflineData(casaA, 'dashboard_cache', { casa: { id: casaA, nome: 'Casa A' } });
      saveOfflineData(casaB, 'dashboard_cache', { casa: { id: casaB, nome: 'Casa B' } });

      purgeTenantStorage(casaA);

      expect(getOfflineData(casaA, 'dashboard_cache')).toBeNull();
      expect(getOfflineData(casaB, 'dashboard_cache')).not.toBeNull();
      expect(getOfflineData(casaB, 'dashboard_cache').casa.nome).toBe('Casa B');
    });

    test('purgeAllOfflineStorage flushes all households dashboard cache', () => {
      const casaA = 'tenant_all_A';
      const casaB = 'tenant_all_B';

      saveOfflineData(casaA, 'dashboard_cache', { casa: { id: casaA, nome: 'Casa A' } });
      saveOfflineData(casaB, 'dashboard_cache', { casa: { id: casaB, nome: 'Casa B' } });
      localStorage.setItem('other_app_setting', 'preserve_me');

      purgeAllOfflineStorage();

      expect(getOfflineData(casaA, 'dashboard_cache')).toBeNull();
      expect(getOfflineData(casaB, 'dashboard_cache')).toBeNull();
      expect(localStorage.getItem('other_app_setting')).toBe('preserve_me');
    });
  });

  // =========================================================================
  // 5. ADVERSARIAL EDGE CASES & DATA FUZZING
  // =========================================================================
  describe('5. Adversarial Edge Cases & Defensive Fuzzing', () => {
    test('handles corrupted raw JSON in localStorage without throwing unhandled syntax error', async () => {
      const houseId = 'casa_corrupted';
      AuthContextModule.useAuth.mockReturnValue({
        currentUser: userAlpha,
        userData: { username: 'AlphaUser', email: 'alpha@test.it', casaId: houseId },
        setUserData: mockSetUserData
      });

      localStorage.setItem(`hh_offline_${houseId}_dashboard_cache`, 'INVALID_MALFORMED_JSON{{{');

      // Must not crash during mount
      expect(() => {
        renderHome();
      }).not.toThrow();

      // UI renders greeting cleanly
      expect(screen.getByText(/Bentornato,/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText(/Sincronizzazione\.\.\./i)).toBeNull();
      });
    });

    test('handles partial or malformed cache object with null subfields defensively', async () => {
      const houseId = 'casa_partial_nulls';
      AuthContextModule.useAuth.mockReturnValue({
        currentUser: userAlpha,
        userData: { username: 'AlphaUser', email: 'alpha@test.it', casaId: houseId },
        setUserData: mockSetUserData
      });

      saveOfflineData(houseId, 'dashboard_cache', {
        casa: null,
        prossimoTurno: null,
        saldo: null,
        turniList: null,
        debitiList: null,
        spesaList: null,
        utentiMap: null
      });

      expect(() => {
        renderHome();
      }).not.toThrow();

      // Balance defaults safely to +0.00 €
      expect(screen.getByText('+0.00 €')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText(/Sincronizzazione\.\.\./i)).toBeNull();
      });
    });

    test('redirects immediately to /scelta-casa when user lacks casaId', async () => {
      const routerMock = require('react-router-dom');
      AuthContextModule.useAuth.mockReturnValue({
        currentUser: userAlpha,
        userData: { username: 'AlphaUser', email: 'alpha@test.it', casaId: null },
        setUserData: mockSetUserData
      });

      renderHome();

      await waitFor(() => {
        expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/scelta-casa');
      });
    });

    test('ensures zero emojis or emoticons in rendered DOM output of HomeUtente', async () => {
      const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{20E3}]/u;
      const houseId = 'casa_emoji_check';
      AuthContextModule.useAuth.mockReturnValue({
        currentUser: userAlpha,
        userData: { username: 'AlphaUser', email: 'alpha@test.it', casaId: houseId },
        setUserData: mockSetUserData
      });

      mockStore.seed('case', {
        [houseId]: { nome: 'Casa Senza Emoji', codiceUnivoco: 'NOEM0J' }
      });

      const { container } = renderHome();

      await screen.findByText('Casa Senza Emoji');

      const fullHtml = container.innerHTML;
      expect(EMOJI_REGEX.test(fullHtml)).toBe(false);

      await waitFor(() => {
        expect(screen.queryByText(/Sincronizzazione\.\.\./i)).toBeNull();
      });
    });
  });
});
