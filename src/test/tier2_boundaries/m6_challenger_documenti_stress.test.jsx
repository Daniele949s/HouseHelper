import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, seedHousehold, createMockFile } from '../testUtils';
import mockStore from '../mockFirebase';
import ViewDocumenti from '../../pages/Documenti/ViewDocumenti';
import {
  caricaDocumento,
  eliminaDocumento,
  sanitizeFileName,
  formatFileSize
} from '../../services/documentiService';
import { sanitizeText } from '../../utils/security';

describe('Milestone 6 Challenger: Document UI Workflows, Security & Concurrency Stress', () => {
  const marco = { uid: 'user_marco', email: 'marco@test.com' };
  const marcoData = { username: 'Marco', email: 'marco@test.com', casaId: 'casa_garibaldi' };
  const elena = { uid: 'user_elena', email: 'elena@test.com' };
  const elenaData = { username: 'Elena', email: 'elena@test.com', casaId: 'casa_garibaldi' };
  const stranger = { uid: 'user_stranger', email: 'stranger@test.com' };
  const strangerData = { username: 'Stranger', email: 'stranger@test.com', casaId: 'casa_verdi' };

  beforeEach(() => {
    mockStore.reset();
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
  });

  // =========================================================================
  // 1. LIVE SEARCH WITH REGEX & SPECIAL CHARACTERS
  // =========================================================================
  test('CHALLENGE 1.1: Live search with regex special characters (.*, [, \\, (, ?, +) does NOT crash and matches literal text', async () => {
    seedHousehold({
      houseId: 'casa_garibaldi',
      users: [marco],
      documenti: [
        {
          id: 'doc_regex',
          nome: 'Report.*[2026] (Final)? +Special',
          note: 'Contains \\d+ and regex symbols',
          categoria: 'Altro',
          caricatoDaNome: 'Marco',
          casaId: 'casa_garibaldi'
        },
        {
          id: 'doc_normal',
          nome: 'Contratto Affitto Ordinario',
          note: 'Semplice testo',
          categoria: 'Contratti',
          caricatoDaNome: 'Marco',
          casaId: 'casa_garibaldi'
        }
      ]
    });

    renderWithProviders(<ViewDocumenti />, {
      user: marco,
      userData: marcoData,
      route: '/documenti'
    });

    expect(await screen.findByText('Report.*[2026] (Final)? +Special')).toBeInTheDocument();
    expect(screen.getByText('Contratto Affitto Ordinario')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Cerca per nome, note o autore/i);

    // Adversarial queries that would break new RegExp(...)
    const breakingQueries = ['.*', '.*[', '(', '?', '+', '\\d+'];
    for (const q of breakingQueries) {
      fireEvent.change(searchInput, { target: { value: q } });
      // Must not throw, and should match the regex doc while excluding normal doc
      expect(screen.getByText('Report.*[2026] (Final)? +Special')).toBeInTheDocument();
      expect(screen.queryByText('Contratto Affitto Ordinario')).not.toBeInTheDocument();
    }
  });

  test('CHALLENGE 1.2: Live search matches across nome, note, and caricatoDaNome with case insensitivity', async () => {
    seedHousehold({
      houseId: 'casa_garibaldi',
      users: [marco],
      documenti: [
        {
          id: 'doc_1',
          nome: 'Polizza Casa',
          note: 'Codice Iban per bonifico IT60X',
          categoria: 'Garanzie',
          caricatoDaNome: 'Elena Rossi',
          casaId: 'casa_garibaldi'
        },
        {
          id: 'doc_2',
          nome: 'Fattura Luce',
          note: 'Enel Energia mensile',
          categoria: 'Bollette',
          caricatoDaNome: 'Marco Bianchi',
          casaId: 'casa_garibaldi'
        }
      ]
    });

    renderWithProviders(<ViewDocumenti />, {
      user: marco,
      userData: marcoData,
      route: '/documenti'
    });

    const searchInput = await screen.findByPlaceholderText(/Cerca per nome, note o autore/i);

    // Match on author name
    fireEvent.change(searchInput, { target: { value: 'elena' } });
    expect(screen.getByText('Polizza Casa')).toBeInTheDocument();
    expect(screen.queryByText('Fattura Luce')).not.toBeInTheDocument();

    // Match on note content
    fireEvent.change(searchInput, { target: { value: 'it60x' } });
    expect(screen.getByText('Polizza Casa')).toBeInTheDocument();
    expect(screen.queryByText('Fattura Luce')).not.toBeInTheDocument();

    // Non-matching query
    fireEvent.change(searchInput, { target: { value: 'notfound' } });
    expect(screen.queryByText('Polizza Casa')).not.toBeInTheDocument();
    expect(screen.queryByText('Fattura Luce')).not.toBeInTheDocument();
    expect(screen.getByText(/Nessun documento corrisponde ai filtri selezionati/i)).toBeInTheDocument();
  });

  // =========================================================================
  // 2. CATEGORY FILTERING & SORTING ORDERS
  // =========================================================================
  test('CHALLENGE 2.1: Category filter correctly reconciles singular and plural contract categories', async () => {
    seedHousehold({
      houseId: 'casa_garibaldi',
      users: [marco],
      documenti: [
        {
          id: 'doc_plural',
          nome: 'Contratto Plurale',
          categoria: 'Contratti',
          caricatoDaNome: 'Marco',
          casaId: 'casa_garibaldi'
        },
        {
          id: 'doc_singular',
          nome: 'Contratto Singolare',
          categoria: 'Contratto',
          caricatoDaNome: 'Marco',
          casaId: 'casa_garibaldi'
        },
        {
          id: 'doc_bolletta',
          nome: 'Bolletta Acqua',
          categoria: 'Bollette',
          caricatoDaNome: 'Marco',
          casaId: 'casa_garibaldi'
        }
      ]
    });

    renderWithProviders(<ViewDocumenti />, {
      user: marco,
      userData: marcoData,
      route: '/documenti'
    });

    expect(await screen.findByText('Contratto Plurale')).toBeInTheDocument();
    expect(screen.getByText('Contratto Singolare')).toBeInTheDocument();
    expect(screen.getByText('Bolletta Acqua')).toBeInTheDocument();

    // Click "Contratti" pill
    const contrattiPill = screen.getByRole('tab', { name: /Contratti/i });
    fireEvent.click(contrattiPill);

    // Both singular and plural contract forms should be retained
    expect(screen.getByText('Contratto Plurale')).toBeInTheDocument();
    expect(screen.getByText('Contratto Singolare')).toBeInTheDocument();
    expect(screen.queryByText('Bolletta Acqua')).not.toBeInTheDocument();
  });

  test('CHALLENGE 2.2: Sorting order verification for date-desc, date-asc, name-asc, and size-desc', async () => {
    seedHousehold({
      houseId: 'casa_garibaldi',
      users: [marco],
      documenti: [
        {
          id: 'doc_mid',
          nome: 'Beta Documento',
          dataCaricamento: '2026-11-02T10:00:00Z',
          dimensione: 5000,
          dimensioneFormatted: '5.00 KB',
          categoria: 'Altro',
          caricatoDaNome: 'Marco',
          casaId: 'casa_garibaldi'
        },
        {
          id: 'doc_oldest',
          nome: 'Alpha Documento',
          dataCaricamento: '2026-11-01T10:00:00Z',
          dimensione: 1000,
          dimensioneFormatted: '1.00 KB',
          categoria: 'Altro',
          caricatoDaNome: 'Marco',
          casaId: 'casa_garibaldi'
        },
        {
          id: 'doc_newest',
          nome: 'Gamma Documento',
          dataCaricamento: '2026-11-03T10:00:00Z',
          dimensione: 100000,
          dimensioneFormatted: '100.00 KB',
          categoria: 'Altro',
          caricatoDaNome: 'Marco',
          casaId: 'casa_garibaldi'
        }
      ]
    });

    renderWithProviders(<ViewDocumenti />, {
      user: marco,
      userData: marcoData,
      route: '/documenti'
    });

    expect(await screen.findByText('Alpha Documento')).toBeInTheDocument();

    const sortSelect = screen.getByLabelText(/Ordina documenti/i);

    // Default: date-desc -> [Gamma, Beta, Alpha]
    let cards = screen.getAllByRole('heading', { level: 3 });
    expect(cards[0]).toHaveTextContent('Gamma Documento');
    expect(cards[1]).toHaveTextContent('Beta Documento');
    expect(cards[2]).toHaveTextContent('Alpha Documento');

    // Sort: date-asc -> [Alpha, Beta, Gamma]
    fireEvent.change(sortSelect, { target: { value: 'date-asc' } });
    cards = screen.getAllByRole('heading', { level: 3 });
    expect(cards[0]).toHaveTextContent('Alpha Documento');
    expect(cards[1]).toHaveTextContent('Beta Documento');
    expect(cards[2]).toHaveTextContent('Gamma Documento');

    // Sort: name-asc -> [Alpha, Beta, Gamma]
    fireEvent.change(sortSelect, { target: { value: 'name-asc' } });
    cards = screen.getAllByRole('heading', { level: 3 });
    expect(cards[0]).toHaveTextContent('Alpha Documento');
    expect(cards[1]).toHaveTextContent('Beta Documento');
    expect(cards[2]).toHaveTextContent('Gamma Documento');

    // Sort: size-desc -> [Gamma (100KB), Beta (5KB), Alpha (1KB)]
    fireEvent.change(sortSelect, { target: { value: 'size-desc' } });
    cards = screen.getAllByRole('heading', { level: 3 });
    expect(cards[0]).toHaveTextContent('Gamma Documento');
    expect(cards[1]).toHaveTextContent('Beta Documento');
    expect(cards[2]).toHaveTextContent('Alpha Documento');
  });

  // =========================================================================
  // 3. SANITIZATION: PATH TRAVERSAL, NULL BYTES, SCRIPT INJECTION
  // =========================================================================
  test('CHALLENGE 3.1: Sanitization against ../../../etc/passwd, null bytes, and script injection', () => {
    // 1. Path traversal in filename
    const traversal1 = '../../../etc/passwd';
    expect(sanitizeFileName(traversal1)).toBe('.._.._.._etc_passwd');

    const traversal2 = '..\\..\\..\\windows\\system32\\cmd.exe';
    expect(sanitizeFileName(traversal2)).toBe('.._.._.._windows_system32_cmd.exe');

    // 2. Null byte elimination
    const nullByte = 'safe\0file.pdf';
    expect(sanitizeFileName(nullByte)).toBe('safefile.pdf');
    expect(sanitizeText(nullByte)).toBe('safefile.pdf');

    // 3. Script tag injection in document name and note
    const xssScript = '<script>alert(1)</script>Contratto';
    expect(sanitizeText(xssScript, 120)).toBe('alert(1)Contratto');
    expect(sanitizeFileName(xssScript)).not.toContain('<');
    expect(sanitizeFileName(xssScript)).not.toContain('>');

    // 4. Img onerror injection
    const xssImg = '<img src=x onerror=alert(1)>Ricevuta';
    expect(sanitizeText(xssImg, 120)).toBe('Ricevuta');

    // 5. JavaScript URI scheme injection
    const xssUri = 'javascript:alert(1)';
    expect(sanitizeText(xssUri, 120)).toBe('alert(1)');
  });

  // =========================================================================
  // 4. ROLLBACK INTEGRITY ON FIRESTORE FAILURE
  // =========================================================================
  test('CHALLENGE 4.1: Rollback integrity: deletes uploaded storage object if metadata creation fails in Firestore', async () => {
    const validFile = createMockFile('contract_rollback.pdf', 4096, 'application/pdf');

    // Spy on Firestore addDoc to simulate partition failure
    const firestore = require('firebase/firestore');
    const spyAddDoc = jest.spyOn(firestore, 'addDoc').mockRejectedValueOnce(
      new Error('Firestore quota exceeded / network outage')
    );

    await expect(
      caricaDocumento({
        file: validFile,
        nome: 'Contratto Fallito',
        categoria: 'Contratti',
        casaId: 'casa_garibaldi',
        currentUser: marco,
        userData: marcoData
      })
    ).rejects.toThrow('Firestore quota exceeded / network outage');

    spyAddDoc.mockRestore();

    // Verify Storage was cleanly rolled back and no orphaned file exists
    const storagePaths = Object.keys(mockStore.storageFiles);
    const leakedFile = storagePaths.find((path) => path.includes('contract_rollback.pdf'));
    expect(leakedFile).toBeUndefined();
  });

  // =========================================================================
  // 5. DELETION CONFIRMATION VS CANCELLATION
  // =========================================================================
  test('CHALLENGE 5.1: Deletion confirmation removes both Storage and Firestore records', async () => {
    seedHousehold({
      houseId: 'casa_garibaldi',
      users: [marco],
      documenti: [
        {
          id: 'doc_to_delete',
          nome: 'Documento da Eliminare',
          categoria: 'Bollette',
          storagePath: 'case/casa_garibaldi/documenti/delete_me.pdf',
          caricatoDaNome: 'Marco',
          casaId: 'casa_garibaldi'
        }
      ]
    });

    // Populate mock storage with matching file
    mockStore.storageFiles['case/casa_garibaldi/documenti/delete_me.pdf'] = {
      name: 'delete_me.pdf',
      data: new Uint8Array([1, 2, 3])
    };

    // User confirms deletion
    window.confirm = jest.fn(() => true);

    renderWithProviders(<ViewDocumenti />, {
      user: marco,
      userData: marcoData,
      route: '/documenti'
    });

    expect(await screen.findByText('Documento da Eliminare')).toBeInTheDocument();

    const deleteBtn = screen.getByTitle('Elimina');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByText('Documento da Eliminare')).not.toBeInTheDocument();
    });

    // Verify removed from Firestore
    expect(mockStore.collections.documenti['doc_to_delete']).toBeUndefined();

    // Verify removed from Storage
    expect(mockStore.storageFiles['case/casa_garibaldi/documenti/delete_me.pdf']).toBeUndefined();
  });

  test('CHALLENGE 5.2: Deletion cancellation retains both Storage and Firestore records without modification', async () => {
    seedHousehold({
      houseId: 'casa_garibaldi',
      users: [marco],
      documenti: [
        {
          id: 'doc_cancelled',
          nome: 'Documento Sicuro',
          categoria: 'Garanzie',
          storagePath: 'case/casa_garibaldi/documenti/safe.pdf',
          caricatoDaNome: 'Marco',
          casaId: 'casa_garibaldi'
        }
      ]
    });

    mockStore.storageFiles['case/casa_garibaldi/documenti/safe.pdf'] = {
      name: 'safe.pdf',
      data: new Uint8Array([1, 2, 3])
    };

    // User cancels deletion
    window.confirm = jest.fn(() => false);

    renderWithProviders(<ViewDocumenti />, {
      user: marco,
      userData: marcoData,
      route: '/documenti'
    });

    expect(await screen.findByText('Documento Sicuro')).toBeInTheDocument();

    const deleteBtn = screen.getByTitle('Elimina');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();

    // UI still has the document
    expect(screen.getByText('Documento Sicuro')).toBeInTheDocument();

    // Firestore record intact
    expect(mockStore.collections.documenti['doc_cancelled']).toBeDefined();

    // Storage file intact
    expect(mockStore.storageFiles['case/casa_garibaldi/documenti/safe.pdf']).toBeDefined();
  });

  test('CHALLENGE 5.3: Resilient deletion: missing storagePath still cleans up Firestore document', async () => {
    seedHousehold({
      houseId: 'casa_garibaldi',
      users: [marco],
      documenti: [
        {
          id: 'doc_orphan',
          nome: 'Documento Senza StoragePath',
          categoria: 'Altro',
          storagePath: null,
          caricatoDaNome: 'Marco',
          casaId: 'casa_garibaldi'
        }
      ]
    });

    window.confirm = jest.fn(() => true);

    renderWithProviders(<ViewDocumenti />, {
      user: marco,
      userData: marcoData,
      route: '/documenti'
    });

    expect(await screen.findByText('Documento Senza StoragePath')).toBeInTheDocument();

    const deleteBtn = screen.getByTitle('Elimina');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByText('Documento Senza StoragePath')).not.toBeInTheDocument();
    });

    expect(mockStore.collections.documenti['doc_orphan']).toBeUndefined();
  });

  // =========================================================================
  // 6. MULTI-ROOMMATE SHARING & ISOLATION WORKFLOW
  // =========================================================================
  test('CHALLENGE 6.1: Multi-roommate sharing: Marco and Elena see shared house documents; Stranger in Casa Verdi cannot', async () => {
    seedHousehold({
      houseId: 'casa_garibaldi',
      users: [marco, elena],
      documenti: [
        {
          id: 'doc_garibaldi_shared',
          nome: 'Contratto Casa Garibaldi',
          categoria: 'Contratti',
          caricatoDa: marco.uid,
          caricatoDaNome: 'Marco',
          casaId: 'casa_garibaldi'
        }
      ]
    });

    seedHousehold({
      houseId: 'casa_verdi',
      users: [stranger],
      documenti: [
        {
          id: 'doc_verdi_secret',
          nome: 'Segreto Casa Verdi',
          categoria: 'Contratti',
          caricatoDa: stranger.uid,
          caricatoDaNome: 'Stranger',
          casaId: 'casa_verdi'
        }
      ]
    });

    // 1. Elena (roommate in casa_garibaldi) views documents
    const { unmount } = renderWithProviders(<ViewDocumenti />, {
      user: elena,
      userData: elenaData,
      route: '/documenti'
    });

    expect(await screen.findByText('Contratto Casa Garibaldi')).toBeInTheDocument();
    expect(screen.queryByText('Segreto Casa Verdi')).not.toBeInTheDocument();

    unmount();

    // 2. Stranger (outsider in casa_verdi) views documents
    renderWithProviders(<ViewDocumenti />, {
      user: stranger,
      userData: strangerData,
      route: '/documenti'
    });

    expect(await screen.findByText('Segreto Casa Verdi')).toBeInTheDocument();
    expect(screen.queryByText('Contratto Casa Garibaldi')).not.toBeInTheDocument();
  });
});
