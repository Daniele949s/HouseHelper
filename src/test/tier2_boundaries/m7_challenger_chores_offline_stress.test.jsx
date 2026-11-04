import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, seedHousehold } from '../testUtils';
import mockStore from '../mockFirebase';
import VisualizzaTurni from '../../pages/TurniPulizia/viewTurni';
import ViewContatti from '../../pages/Contatti/ViewContatti';
import AggiungiDebito from '../../pages/Debiti/AggiungiDebito';
import {
  isUserOnVacation,
  getAvailableRoommates,
  rotateChoreAssignee,
  normalizeDateStr
} from '../../utils/choreRotation';
import {
  saveOfflineData,
  getOfflineData,
  purgeTenantStorage,
  purgeAllOfflineStorage
} from '../../utils/offlineStorage';
import {
  sanitizeChecklist,
  sanitizeText,
  safeTelUrl,
  safeMailtoUrl,
  sanitizePhone
} from '../../utils/security';

// Extend Jest timeout for multi-component stress renders
jest.setTimeout(15000);

describe('Milestone 7 Challenger: Chore Rotation, Vacation Mode, Offline Storage & Multi-tenant Stress', () => {
  const userMarco = { uid: 'u_marco', email: 'marco@test.com', username: 'Marco' };
  const userGiulia = { uid: 'u_giulia', email: 'giulia@test.com', username: 'Giulia' };
  const userPaolo = { uid: 'u_paolo', email: 'paolo@test.com', username: 'Paolo' };

  beforeEach(() => {
    mockStore.reset();
    localStorage.clear();
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
    const routerMock = require('react-router-dom');
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // 1. CHORE ROTATION & VACATION EDGE CASES
  // =========================================================================
  describe('1. Chore Rotation & Vacation Edge Cases', () => {
    test('CHALLENGE 1.1: Boundary dates for vacation (day before, start, inside, end, day after)', () => {
      const vacationer = {
        inVacanza: true,
        vacanzaInizio: '2026-08-10',
        vacanzaFine: '2026-08-20'
      };

      // Day before start -> not on vacation
      expect(isUserOnVacation(vacationer, '2026-08-09')).toBe(false);

      // Exactly start date -> on vacation
      expect(isUserOnVacation(vacationer, '2026-08-10')).toBe(true);

      // Middle of range -> on vacation
      expect(isUserOnVacation(vacationer, '2026-08-15')).toBe(true);

      // Exactly end date -> on vacation
      expect(isUserOnVacation(vacationer, '2026-08-20')).toBe(true);

      // Day after end -> not on vacation
      expect(isUserOnVacation(vacationer, '2026-08-21')).toBe(false);

      // Works with Date object and ISO timestamps with hours
      expect(isUserOnVacation(vacationer, new Date('2026-08-10T12:00:00Z'))).toBe(true);
      expect(isUserOnVacation(vacationer, '2026-08-20T23:59:59.999Z')).toBe(true);
      expect(isUserOnVacation(vacationer, '2026-08-21T01:00:00.000Z')).toBe(false);
    });

    test('CHALLENGE 1.2: Inverted date ranges, malformed dates, and leap years', () => {
      // Inverted date range (end date < start date) must not throw and returns false
      const invertedUser = {
        inVacanza: true,
        vacanzaInizio: '2026-08-20',
        vacanzaFine: '2026-08-10'
      };
      expect(isUserOnVacation(invertedUser, '2026-08-15')).toBe(false);
      expect(isUserOnVacation(invertedUser, '2026-08-10')).toBe(false);
      expect(isUserOnVacation(invertedUser, '2026-08-20')).toBe(false);

      // Leap year boundary (2028-02-29)
      const leapYearUser = {
        inVacanza: true,
        vacanzaInizio: '2028-02-28',
        vacanzaFine: '2028-03-01'
      };
      expect(isUserOnVacation(leapYearUser, '2028-02-29')).toBe(true);

      const singleLeapDayUser = {
        inVacanza: true,
        vacanzaInizio: '2028-02-29',
        vacanzaFine: '2028-02-29'
      };
      expect(isUserOnVacation(singleLeapDayUser, '2028-02-28')).toBe(false);
      expect(isUserOnVacation(singleLeapDayUser, '2028-02-29')).toBe(true);
      expect(isUserOnVacation(singleLeapDayUser, '2028-03-01')).toBe(false);

      // Malformed inputs and partial bounds
      expect(isUserOnVacation(null)).toBe(false);
      expect(isUserOnVacation(undefined)).toBe(false);
      expect(isUserOnVacation({})).toBe(false);
      expect(isUserOnVacation({ inVacanza: false })).toBe(false);

      // Open-ended vacation (no start or end dates specified)
      const openEndedUser = { inVacanza: true };
      expect(isUserOnVacation(openEndedUser, '2026-11-04')).toBe(true);
      expect(isUserOnVacation(openEndedUser, '2030-01-01')).toBe(true);

      // Only start date specified (ongoing vacation)
      const ongoingUser = { inVacanza: true, vacanzaInizio: '2026-11-01' };
      expect(isUserOnVacation(ongoingUser, '2026-10-31')).toBe(false);
      expect(isUserOnVacation(ongoingUser, '2026-11-01')).toBe(true);
      expect(isUserOnVacation(ongoingUser, '2026-12-01')).toBe(true);

      // Only end date specified
      const returningUser = { inVacanza: true, vacanzaFine: '2026-11-15' };
      expect(isUserOnVacation(returningUser, '2026-11-15')).toBe(true);
      expect(isUserOnVacation(returningUser, '2026-11-16')).toBe(false);
    });

    test('CHALLENGE 1.3: Whole-house simultaneous vacation handling (no crash, no infinite loop)', () => {
      const allVacationers = [
        { uid: 'u1', username: 'Marco', inVacanza: true, vacanzaInizio: '2026-08-01', vacanzaFine: '2026-08-31' },
        { uid: 'u2', username: 'Giulia', inVacanza: true, vacanzaInizio: '2026-08-01', vacanzaFine: '2026-08-31' },
        { uid: 'u3', username: 'Paolo', inVacanza: true, vacanzaInizio: '2026-08-01', vacanzaFine: '2026-08-31' }
      ];

      const available = getAvailableRoommates(allVacationers, '2026-08-15');
      expect(available).toEqual([]);

      // rotateChoreAssignee must return null assignee and isAllOnVacation: true
      const rotationResult = rotateChoreAssignee(null, available);
      expect(rotationResult.assignee).toBeNull();
      expect(rotationResult.isAllOnVacation).toBe(true);

      // Even if previous assignee UID is supplied
      const rotationResultWithPrev = rotateChoreAssignee('u1', available);
      expect(rotationResultWithPrev.assignee).toBeNull();
      expect(rotationResultWithPrev.isAllOnVacation).toBe(true);
    });

    test('CHALLENGE 1.4: Single roommate household & member departures/additions during rotation', () => {
      // Single roommate household
      const soloHousehold = [{ uid: 'u_solo', username: 'SoloUser' }];
      const solo1 = rotateChoreAssignee(null, soloHousehold);
      expect(solo1.assignee).toEqual(soloHousehold[0]);
      expect(solo1.isAllOnVacation).toBe(false);

      // Successive rotation stays with the sole roommate
      const solo2 = rotateChoreAssignee('u_solo', soloHousehold);
      expect(solo2.assignee).toEqual(soloHousehold[0]);

      // Empty list handling
      expect(rotateChoreAssignee(null, [])).toEqual({ assignee: null, isAllOnVacation: true });
      expect(getAvailableRoommates([])).toEqual([]);
      expect(getAvailableRoommates(null)).toEqual([]);

      // Roommate leaves household (previous assignee not in active list)
      const remainingRoommates = [
        { uid: 'u_giulia', username: 'Giulia' },
        { uid: 'u_paolo', username: 'Paolo' }
      ];
      // Previous assignee was Marco who moved out
      const fallbackResult = rotateChoreAssignee('u_departed_marco', remainingRoommates);
      expect(fallbackResult.assignee).toBeDefined();
      expect(['u_giulia', 'u_paolo']).toContain(fallbackResult.assignee.uid);

      // Deterministic round-robin order
      const rot1 = rotateChoreAssignee('u_giulia', remainingRoommates);
      expect(rot1.assignee.uid).toBe('u_paolo');
      const rot2 = rotateChoreAssignee('u_paolo', remainingRoommates);
      expect(rot2.assignee.uid).toBe('u_giulia');
    });

    test('CHALLENGE 1.5: UI renders whole-house absence fallback banner and disables rotate button', async () => {
      // Seed house where all roommates are currently on vacation
      seedHousehold({
        houseId: 'casa_vacation',
        houseName: 'Casa Al Mare',
        users: [
          { uid: 'u_marco', username: 'Marco', inVacanza: true },
          { uid: 'u_giulia', username: 'Giulia', inVacanza: true }
        ],
        turni: [
          {
            id: 't_past',
            data: '2026-08-01',
            nomi: ['Marco'],
            luoghi: ['Cucina'],
            casaId: 'casa_vacation',
            checklist: []
          }
        ]
      });

      renderWithProviders(<VisualizzaTurni />, {
        user: userMarco,
        userData: { username: 'Marco', casaId: 'casa_vacation', inVacanza: true },
        route: '/turni'
      });

      // Banner should be visible
      const bannerHeader = await screen.findByText(/Casa Momentaneamente Vuota/i);
      expect(bannerHeader).toBeInTheDocument();
      expect(screen.getByText(/Tutti i coinquilini risultano in vacanza/i)).toBeInTheDocument();

      // Rotate button must be disabled
      const rotateBtn = screen.getByRole('button', { name: /Ruota Turni/i });
      expect(rotateBtn).toBeDisabled();
    });
  });

  // =========================================================================
  // 2. SUB-TASK CHECKLIST INTEGRITY & ADVERSARIAL INPUTS
  // =========================================================================
  describe('2. Sub-Task Checklist Integrity & Sanitization', () => {
    test('CHALLENGE 2.1: Strips XSS script tags and drops malicious image injection in checklist items', () => {
      const maliciousItems = [
        { id: 'chk_1', text: '<script>alert("XSS")</script>Pulire fornelli', completed: false },
        { id: 'chk_2', text: '<img src=x onerror=alert(1)>', completed: false },
        { id: 'chk_3', text: '<svg onload=document.location="http://evil.com">Pavimento', completed: false },
        { id: 'chk_4', text: 'javascript:alert(document.cookie) Lavello', completed: false },
        { id: 'chk_5', text: 'Clean\0with\x08null\x1Fbytes', completed: false }
      ];

      const cleaned = sanitizeChecklist(maliciousItems);

      // Item 1: script tags stripped, text kept
      expect(cleaned.some((i) => i.text.includes('<script>'))).toBe(false);
      expect(cleaned.some((i) => i.text.includes('Pulire fornelli'))).toBe(true);

      // Item 2: pure img tag with no other text should be dropped completely
      expect(cleaned.some((i) => i.id === 'chk_2')).toBe(false);

      // Item 3: svg tag stripped, leaving Pavimento
      expect(cleaned.some((i) => i.text.includes('<svg'))).toBe(false);
      expect(cleaned.some((i) => i.text.includes('Pavimento'))).toBe(true);

      // Item 4: javascript: scheme stripped
      expect(cleaned.some((i) => i.text.includes('javascript:'))).toBe(false);
      expect(cleaned.some((i) => i.text.includes('Lavello'))).toBe(true);

      // Item 5: control characters removed
      const item5 = cleaned.find((i) => i.id === 'chk_5');
      expect(item5.text).toBe('Cleanwithnullbytes');
    });

    test('CHALLENGE 2.2: Enforces maximum text length (100 chars) and maximum item count (20 items)', () => {
      // 500 characters of text
      const longText = 'A'.repeat(500);
      const singleLong = [{ id: 'chk_long', text: longText, completed: false }];
      const cleanedSingle = sanitizeChecklist(singleLong);
      expect(cleanedSingle[0].text.length).toBe(100);

      // 35 items
      const manyItems = Array.from({ length: 35 }, (_, idx) => ({
        id: `chk_${idx}`,
        text: `Compito numero ${idx + 1}`,
        completed: false
      }));

      const cleanedList = sanitizeChecklist(manyItems, 20, 100);
      expect(cleanedList.length).toBe(20);

      // Invalid structures
      expect(sanitizeChecklist(null)).toEqual([]);
      expect(sanitizeChecklist(undefined)).toEqual([]);
      expect(sanitizeChecklist('string')).toEqual([]);
      expect(sanitizeChecklist([{ id: 'bad' }])).toEqual([]); // no text
    });

    test('CHALLENGE 2.3: Toggling same checklist item multiple times updates state cleanly and idempotently', async () => {
      seedHousehold({
        houseId: 'casa_chk',
        houseName: 'Casa Test Checklist',
        users: [userMarco],
        turni: [
          {
            id: 't_interactive',
            data: '2026-11-20',
            nomi: ['Marco'],
            luoghi: ['Bagno'],
            casaId: 'casa_chk',
            completato: false,
            checklist: [
              { id: 'item_1', text: 'Lavare lavandino', completed: false, completedBy: null, completedAt: null },
              { id: 'item_2', text: 'Asciugare specchio', completed: false, completedBy: null, completedAt: null }
            ]
          }
        ]
      });

      renderWithProviders(<VisualizzaTurni />, {
        user: userMarco,
        userData: { username: 'Marco', casaId: 'casa_chk' },
        route: '/turni'
      });

      const task1Text = await screen.findByText('Lavare lavandino');
      expect(task1Text).toBeInTheDocument();

      // Checkboxes are rendered for checklist items
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThanOrEqual(2);

      // Toggle 1: item 1 becomes completed
      fireEvent.click(checkboxes[0]);
      await waitFor(() => {
        const docInStore = mockStore.getDocData('turni', 't_interactive');
        expect(docInStore.checklist[0].completed).toBe(true);
        expect(docInStore.checklist[0].completedBy).toBe('Marco');
      });

      // Toggle 2: click again -> item 1 reverts to uncompleted
      fireEvent.click(checkboxes[0]);
      await waitFor(() => {
        const docInStore = mockStore.getDocData('turni', 't_interactive');
        expect(docInStore.checklist[0].completed).toBe(false);
        expect(docInStore.checklist[0].completedBy).toBeNull();
      });

      // Toggle 3: toggle both items to complete -> parent chore becomes completed
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      await waitFor(() => {
        const docInStore = mockStore.getDocData('turni', 't_interactive');
        expect(docInStore.checklist[0].completed).toBe(true);
        expect(docInStore.checklist[1].completed).toBe(true);
        expect(docInStore.completato).toBe(true);
      });
    });
  });

  // =========================================================================
  // 3. OFFLINE STORAGE MULTI-TENANT ISOLATION & LOGOUT PURGE
  // =========================================================================
  describe('3. Offline Storage Multi-Tenant Isolation & Logout Purge', () => {
    test('CHALLENGE 3.1: Strict multi-tenant isolation (User A casa_1 data is inaccessible to User B casa_2)', () => {
      const house1Data = [{ id: 'c1', nome: 'Idraulico Casa 1', tel: '111111' }];
      const house2Data = [{ id: 'c2', nome: 'Elettricista Casa 2', tel: '222222' }];

      // Save offline data for casa_1
      const save1 = saveOfflineData('casa_1', 'contatti', house1Data);
      expect(save1).toBe(true);

      // Save offline data for casa_2
      const save2 = saveOfflineData('casa_2', 'contatti', house2Data);
      expect(save2).toBe(true);

      // User from casa_1 queries casa_1 -> gets house 1 data
      expect(getOfflineData('casa_1', 'contatti')).toEqual(house1Data);

      // User from casa_2 queries casa_2 -> gets house 2 data
      expect(getOfflineData('casa_2', 'contatti')).toEqual(house2Data);

      // User querying with different casaId never leaks casa_1 data
      expect(getOfflineData('casa_3', 'contatti')).toBeNull();
      expect(getOfflineData('', 'contatti')).toBeNull();
      expect(getOfflineData(null, 'contatti')).toBeNull();

      // Verify localStorage storage prefix convention
      expect(localStorage.getItem('hh_offline_casa_1_contatti')).toBeDefined();
      expect(localStorage.getItem('hh_offline_casa_2_contatti')).toBeDefined();

      // Tenant eviction only removes the specified house
      purgeTenantStorage('casa_1');
      expect(getOfflineData('casa_1', 'contatti')).toBeNull();
      expect(getOfflineData('casa_2', 'contatti')).toEqual(house2Data);
    });

    test('CHALLENGE 3.2: Complete logout purge wipes all keys prefixed with hh_offline_ while preserving non-offline keys', () => {
      // Store multiple keys across multiple households
      saveOfflineData('casa_alpha', 'turni', [{ id: 't1' }]);
      saveOfflineData('casa_alpha', 'note', [{ id: 'n1' }]);
      saveOfflineData('casa_beta', 'spesa', [{ id: 's1' }]);
      saveOfflineData('casa_gamma', 'contatti', [{ id: 'c1' }]);

      // Store unrelated keys that should survive logout
      localStorage.setItem('hh_theme', 'dark');
      localStorage.setItem('i18nextLng', 'it');
      localStorage.setItem('user_preference_cookie', 'accepted');

      // Total keys prior to purge
      expect(localStorage.length).toBe(7);

      // Execute global purge (simulating logout)
      purgeAllOfflineStorage();

      // All hh_offline_ keys must be wiped
      expect(getOfflineData('casa_alpha', 'turni')).toBeNull();
      expect(getOfflineData('casa_alpha', 'note')).toBeNull();
      expect(getOfflineData('casa_beta', 'spesa')).toBeNull();
      expect(getOfflineData('casa_gamma', 'contatti')).toBeNull();

      // Verify no key in localStorage starts with hh_offline_
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        expect(k.startsWith('hh_offline_')).toBe(false);
      }

      // Unrelated keys must be preserved
      expect(localStorage.getItem('hh_theme')).toBe('dark');
      expect(localStorage.getItem('i18nextLng')).toBe('it');
      expect(localStorage.getItem('user_preference_cookie')).toBe('accepted');
      expect(localStorage.length).toBe(3);
    });

    test('CHALLENGE 3.3: Storage resilience against QuotaExceeded or JSON corruption', () => {
      // Corrupt payload in localStorage
      localStorage.setItem('hh_offline_casa_test_corrupt', '{malformed json[');
      expect(getOfflineData('casa_test', 'corrupt')).toBeNull();

      // Mock Storage.prototype.setItem throwing QuotaExceededError
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const res = saveOfflineData('casa_test', 'huge_key', { data: 'test' });
      expect(res).toBe(false);

      setItemSpy.mockRestore();
    });
  });

  // =========================================================================
  // 4. DOUBLE-SUBMIT PREVENTION & ZERO-EMOJI CONSTRAINTS
  // =========================================================================
  describe('4. Double-Submit Prevention & Constraints Verification', () => {
    test('CHALLENGE 4.1: Rapid consecutive clicks on ViewContatti form submit does NOT produce duplicate contacts', async () => {
      seedHousehold({
        houseId: 'casa_1',
        users: [userMarco]
      });

      renderWithProviders(<ViewContatti />, {
        user: userMarco,
        userData: { username: 'Marco', casaId: 'casa_1' },
        route: '/contatti'
      });

      const openBtn = await screen.findByRole('button', { name: /Nuovo Contatto/i });
      fireEvent.click(openBtn);

      const nomeInput = screen.getByLabelText(/Nome o Intestazione/i);
      const telInput = screen.getByLabelText(/Numero di Telefono/i);
      const saveBtn = screen.getByRole('button', { name: /Salva Contatto/i });

      fireEvent.change(nomeInput, { target: { value: 'Idraulico Emergenza Rapid' } });
      fireEvent.change(telInput, { target: { value: '+39 02 12345678' } });

      // Simulate 3 rapid consecutive clicks before async Firestore operation completes
      fireEvent.click(saveBtn);
      fireEvent.click(saveBtn);
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText('Idraulico Emergenza Rapid')).toBeInTheDocument();
      });

      // Verify exactly 1 contact document was created in the database
      const contactsInStore = Object.values(mockStore.getCollection('contatti'));
      expect(contactsInStore.length).toBe(1);
      expect(contactsInStore[0].nome).toBe('Idraulico Emergenza Rapid');
    });

    test('CHALLENGE 4.2: Rapid consecutive clicks on AggiungiDebito form submit does NOT produce duplicate debts', async () => {
      const routerMock = require('react-router-dom');
      seedHousehold({
        houseId: 'casa_1',
        users: [userMarco, userGiulia]
      });

      renderWithProviders(<AggiungiDebito />, {
        user: userMarco,
        userData: { username: 'Marco', casaId: 'casa_1' },
        route: '/debiti/aggiungi'
      });

      const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
      const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);

      await waitFor(() => {
        expect(screen.getAllByText(/Giulia/i).length).toBeGreaterThanOrEqual(1);
      });

      const selects = screen.getAllByRole('combobox');
      const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

      fireEvent.change(descInput, { target: { value: 'Riparazione Caldaia' } });
      fireEvent.change(amountInput, { target: { value: '80.00' } });
      fireEvent.change(selects[0], { target: { value: userMarco.uid } });
      fireEvent.change(selects[1], { target: { value: userGiulia.uid } });

      // Rapid consecutive clicks
      fireEvent.click(submitBtn);
      fireEvent.click(submitBtn);
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/debiti');
      });

      // Exactly 1 debt document in store
      const debitiInStore = Object.values(mockStore.getCollection('debiti'));
      expect(debitiInStore.length).toBe(1);
      expect(debitiInStore[0].descrizione).toBe('Riparazione Caldaia');
      expect(debitiInStore[0].importo).toBe('80.00');
    });

    test('CHALLENGE 4.3: Zero-Emoji scan verification across entire codebase confirms zero violations', () => {
      const fs = require('fs');
      const path = require('path');
      const projectRoot = path.resolve(__dirname, '../../..');

      // Read scripts/verify-zero-emojis.js regex definitions
      const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{20E3}]/u;
      const EMOTICON_REGEX = /(?:(?<=\s|^|["'`>])(?::\)|:-\)|:\(|:-\(|:D|:-D|;\)|;-\)|:P|:-P|<3|\bXD\b|\bxd\b|(?:\^_-\^)|(?:-_-)|:o|:-O)(?=\s|$|["'`<.,!?;:]))/gi;

      const targetDirs = ['src', 'public'];
      const excludedExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.woff', '.woff2', '.ttf', '.eot', '.svg', '.map']);

      function collectFiles(dir) {
        let results = [];
        if (!fs.existsSync(dir)) return results;
        const list = fs.readdirSync(dir);
        for (const item of list) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            results = results.concat(collectFiles(fullPath));
          } else {
            const ext = path.extname(item).toLowerCase();
            if (!excludedExts.has(ext)) {
              results.push(fullPath);
            }
          }
        }
        return results;
      }

      const allFiles = targetDirs.flatMap((d) => collectFiles(path.join(projectRoot, d)));
      expect(allFiles.length).toBeGreaterThanOrEqual(90);

      const violations = [];
      for (const filePath of allFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, lineIdx) => {
          // Check emojis
          const chars = [...line];
          chars.forEach((c) => {
            if (EMOJI_REGEX.test(c)) {
              violations.push({ file: path.relative(projectRoot, filePath), line: lineIdx + 1, char: c });
            }
          });

          // Check emoticons
          EMOTICON_REGEX.lastIndex = 0;
          let match;
          while ((match = EMOTICON_REGEX.exec(line)) !== null) {
            violations.push({ file: path.relative(projectRoot, filePath), line: lineIdx + 1, match: match[0] });
          }
        });
      }

      expect(violations).toEqual([]);
    });
  });
});
