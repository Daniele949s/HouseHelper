import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, seedHousehold, createMockFile } from '../testUtils';
import mockStore from '../mockFirebase';
import ViewDocumenti from '../../pages/Documenti/ViewDocumenti';

describe('Tier 1: Document Management (Documenti) Feature Coverage', () => {
  const marco = { uid: 'user_marco', email: 'marco@test.com' };
  const marcoData = { username: 'Marco', email: 'marco@test.com', casaId: 'casa_garibaldi' };

  beforeEach(() => {
    mockStore.reset();
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
  });

  test('T1.27 — ViewDocumenti renders empty state when no documents exist', async () => {
    seedHousehold({ houseId: 'casa_garibaldi', users: [marco] });

    renderWithProviders(<ViewDocumenti />, {
      user: marco,
      userData: marcoData,
      route: '/documenti'
    });

    const emptyTitle = await screen.findByText('Nessun documento trovato');
    expect(emptyTitle).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Carica Documento/i })).toBeInTheDocument();
  });

  test('T1.28 — ViewDocumenti renders documents list with names, category badges, and metadata', async () => {
    seedHousehold({
      houseId: 'casa_garibaldi',
      users: [marco],
      documenti: [
        {
          id: 'doc_contratto',
          nome: 'Contratto Affitto 2026',
          categoria: 'Contratti',
          note: 'Registrato Agenzia Entrate',
          url: 'https://storage.mock/contratto.pdf',
          fileUrl: 'https://storage.mock/contratto.pdf',
          storagePath: 'case/casa_garibaldi/documenti/1_contratto.pdf',
          dimensione: 2048576,
          dimensioneFormatted: '2.00 MB',
          formato: 'application/pdf',
          caricatoDa: marco.uid,
          caricatoDaNome: 'Marco',
          dataCaricamento: '2026-11-01T10:00:00Z',
          casaId: 'casa_garibaldi'
        },
        {
          id: 'doc_bolletta',
          nome: 'Bolletta Luce Ottobre',
          categoria: 'Bollette',
          note: 'Pagata con bonifico',
          url: 'https://storage.mock/bolletta.pdf',
          fileUrl: 'https://storage.mock/bolletta.pdf',
          storagePath: 'case/casa_garibaldi/documenti/2_bolletta.pdf',
          dimensione: 512000,
          dimensioneFormatted: '500.00 KB',
          formato: 'application/pdf',
          caricatoDa: marco.uid,
          caricatoDaNome: 'Marco',
          dataCaricamento: '2026-11-02T12:00:00Z',
          casaId: 'casa_garibaldi'
        }
      ]
    });

    renderWithProviders(<ViewDocumenti />, {
      user: marco,
      userData: marcoData,
      route: '/documenti'
    });

    expect(await screen.findByText('Contratto Affitto 2026')).toBeInTheDocument();
    expect(screen.getByText('Bolletta Luce Ottobre')).toBeInTheDocument();
    expect(screen.getByText('Registrato Agenzia Entrate')).toBeInTheDocument();
    expect(screen.getByText('Pagata con bonifico')).toBeInTheDocument();
  });

  test('T1.29 — Uploading a new document saves to store and updates document list', async () => {
    seedHousehold({ houseId: 'casa_garibaldi', users: [marco] });

    renderWithProviders(<ViewDocumenti />, {
      user: marco,
      userData: marcoData,
      route: '/documenti'
    });

    await screen.findByText('Nessun documento trovato');

    // Open upload form
    const openUploadBtn = screen.getByRole('button', { name: /Carica Documento/i });
    fireEvent.click(openUploadBtn);

    expect(await screen.findByTestId('doc-upload-card')).toBeInTheDocument();

    // Select file
    const fileInput = screen.getByTestId('doc-file-input');
    const mockFile = createMockFile('Garanzia_Lavatrice.pdf', 1024 * 500, 'application/pdf');

    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Verify name was auto-populated
    const nameInput = screen.getByLabelText(/Nome Documento/i);
    expect(nameInput.value).toBe('Garanzia_Lavatrice');

    // Choose category
    const categorySelect = screen.getByLabelText(/Categoria/i);
    fireEvent.change(categorySelect, { target: { value: 'Garanzie' } });

    // Submit form
    const submitBtn = screen.getByTestId('doc-submit-upload');
    fireEvent.click(submitBtn);

    // Document appears in the list
    expect(await screen.findByText('Garanzia_Lavatrice')).toBeInTheDocument();

    // Verify in mock store
    const docsInStore = Object.values(mockStore.collections.documenti);
    expect(docsInStore.some((d) => d.nome === 'Garanzia_Lavatrice')).toBe(true);
  });

  test('T1.30 — Category filter pills filter documents by category', async () => {
    seedHousehold({
      houseId: 'casa_garibaldi',
      users: [marco],
      documenti: [
        {
          id: 'doc_1',
          nome: 'Contratto Affitto 2026',
          categoria: 'Contratti',
          caricatoDaNome: 'Marco',
          casaId: 'casa_garibaldi'
        },
        {
          id: 'doc_2',
          nome: 'Bolletta Gas Novembre',
          categoria: 'Bollette',
          caricatoDaNome: 'Marco',
          casaId: 'casa_garibaldi'
        },
        {
          id: 'doc_3',
          nome: 'Scontrino Spesa Condivisa',
          categoria: 'Ricevute',
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

    expect(await screen.findByText('Contratto Affitto 2026')).toBeInTheDocument();
    expect(screen.getByText('Bolletta Gas Novembre')).toBeInTheDocument();
    expect(screen.getByText('Scontrino Spesa Condivisa')).toBeInTheDocument();

    // Filter by Bollette
    const bollettePill = screen.getByRole('tab', { name: /Bollette/i });
    fireEvent.click(bollettePill);

    expect(screen.getByText('Bolletta Gas Novembre')).toBeInTheDocument();
    expect(screen.queryByText('Contratto Affitto 2026')).not.toBeInTheDocument();
    expect(screen.queryByText('Scontrino Spesa Condivisa')).not.toBeInTheDocument();

    // Reset to Tutti
    const tuttiPill = screen.getByRole('tab', { name: /Tutti/i });
    fireEvent.click(tuttiPill);

    expect(screen.getByText('Contratto Affitto 2026')).toBeInTheDocument();
    expect(screen.getByText('Bolletta Gas Novembre')).toBeInTheDocument();
    expect(screen.getByText('Scontrino Spesa Condivisa')).toBeInTheDocument();
  });

  test('T1.31 — Document deletion prompts confirmation and removes from store and UI', async () => {
    seedHousehold({
      houseId: 'casa_garibaldi',
      users: [marco],
      documenti: [
        {
          id: 'doc_del',
          nome: 'Documento Obsoleto',
          categoria: 'Altro',
          storagePath: 'case/casa_garibaldi/documenti/old.pdf',
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

    expect(await screen.findByText('Documento Obsoleto')).toBeInTheDocument();

    const deleteBtn = screen.getByTitle('Elimina');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByText('Documento Obsoleto')).not.toBeInTheDocument();
    });

    expect(mockStore.collections.documenti['doc_del']).toBeUndefined();
  });

  test('T1.32 — Search input filters documents by matching query text', async () => {
    seedHousehold({
      houseId: 'casa_garibaldi',
      users: [marco],
      documenti: [
        {
          id: 'doc_1',
          nome: 'Assicurazione Casa Garibaldi',
          note: 'Polizza annuale',
          categoria: 'Garanzie',
          caricatoDaNome: 'Marco',
          casaId: 'casa_garibaldi'
        },
        {
          id: 'doc_2',
          nome: 'Fattura Internet Fibra',
          note: 'Fastweb mensile',
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

    expect(await screen.findByText('Assicurazione Casa Garibaldi')).toBeInTheDocument();
    expect(screen.getByText('Fattura Internet Fibra')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Cerca per nome, note o autore/i);
    fireEvent.change(searchInput, { target: { value: 'Fibra' } });

    expect(screen.getByText('Fattura Internet Fibra')).toBeInTheDocument();
    expect(screen.queryByText('Assicurazione Casa Garibaldi')).not.toBeInTheDocument();

    // Clear search
    const clearBtn = screen.getByLabelText(/Cancella ricerca/i);
    fireEvent.click(clearBtn);

    expect(screen.getByText('Assicurazione Casa Garibaldi')).toBeInTheDocument();
    expect(screen.getByText('Fattura Internet Fibra')).toBeInTheDocument();
  });

  test('T1.33 — View mode toggling switches between grid and table representations', async () => {
    seedHousehold({
      houseId: 'casa_garibaldi',
      users: [marco],
      documenti: [
        {
          id: 'doc_1',
          nome: 'Contratto Affitto 2026',
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

    expect(await screen.findByTestId('doc-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('doc-table-wrapper')).not.toBeInTheDocument();

    // Switch to table view
    const tableBtn = screen.getByTitle('Vista a tabella');
    fireEvent.click(tableBtn);

    expect(screen.getByTestId('doc-table-wrapper')).toBeInTheDocument();
    expect(screen.queryByTestId('doc-grid')).not.toBeInTheDocument();
    expect(screen.getByTestId('doc-row-doc_1')).toBeInTheDocument();

    // Switch back to grid view
    const gridBtn = screen.getByTitle('Vista a griglia');
    fireEvent.click(gridBtn);

    expect(screen.getByTestId('doc-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('doc-table-wrapper')).not.toBeInTheDocument();
  });
});
