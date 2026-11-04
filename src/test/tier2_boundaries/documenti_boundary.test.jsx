import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, seedHousehold, createMockFile } from '../testUtils';
import mockStore from '../mockFirebase';
import ViewDocumenti from '../../pages/Documenti/ViewDocumenti';
import {
  validateDocumentFile,
  caricaDocumento,
  sanitizeFileName,
  formatFileSize,
  MAX_FILE_SIZE_BYTES
} from '../../services/documentiService';
import { sanitizeText } from '../../utils/security';

describe('Tier 2: Document Management Boundary & Security Tests', () => {
  const marco = { uid: 'user_marco', email: 'marco@test.com' };
  const marcoData = { username: 'Marco', email: 'marco@test.com', casaId: 'casa_garibaldi' };
  const outsider = { uid: 'user_outsider', email: 'outsider@test.com' };
  const outsiderData = { username: 'Outsider', email: 'outsider@test.com', casaId: 'casa_verdi' };

  beforeEach(() => {
    mockStore.reset();
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
  });

  test('T2.24 — Rejects files exceeding the 15 MB maximum size limit', () => {
    // 16 MB file
    const oversizedFile = createMockFile('huge_file.pdf', 16 * 1024 * 1024, 'application/pdf');
    const result = validateDocumentFile(oversizedFile);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('15 MB');

    // Exactly 15 MB is valid
    const maxValidFile = createMockFile('exact_15mb.pdf', MAX_FILE_SIZE_BYTES, 'application/pdf');
    expect(validateDocumentFile(maxValidFile).isValid).toBe(true);

    // 1 byte over 15 MB is invalid
    const oneByteOver = createMockFile('one_over.pdf', MAX_FILE_SIZE_BYTES + 1, 'application/pdf');
    expect(validateDocumentFile(oneByteOver).isValid).toBe(false);
  });

  test('T2.25 — Rejects unsupported file extensions and illegal MIME types', () => {
    const exeFile = createMockFile('malware.exe', 1024, 'application/x-msdownload');
    const scriptFile = createMockFile('exploit.sh', 1024, 'application/x-sh');
    const jsFile = createMockFile('script.js', 1024, 'text/javascript');

    expect(validateDocumentFile(exeFile).isValid).toBe(false);
    expect(validateDocumentFile(scriptFile).isValid).toBe(false);
    expect(validateDocumentFile(jsFile).isValid).toBe(false);

    expect(validateDocumentFile(exeFile).error).toContain('Formato non supportato');

    // Whitelisted formats pass
    const pdf = createMockFile('document.pdf', 1024, 'application/pdf');
    const jpg = createMockFile('receipt.jpg', 1024, 'image/jpeg');
    const png = createMockFile('scan.png', 1024, 'image/png');
    const docx = createMockFile('contract.docx', 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    expect(validateDocumentFile(pdf).isValid).toBe(true);
    expect(validateDocumentFile(jpg).isValid).toBe(true);
    expect(validateDocumentFile(png).isValid).toBe(true);
    expect(validateDocumentFile(docx).isValid).toBe(true);
  });

  test('T2.26 — Rejects empty files with 0 bytes', () => {
    const emptyFile = createMockFile('empty.pdf', 0, 'application/pdf');
    const result = validateDocumentFile(emptyFile);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('vuoto');
  });

  test('T2.27 — Enforces non-empty document name validation', async () => {
    const validFile = createMockFile('test.pdf', 1024, 'application/pdf');

    await expect(
      caricaDocumento({
        file: validFile,
        nome: '',
        categoria: 'Contratti',
        casaId: 'casa_garibaldi',
        currentUser: marco,
        userData: marcoData
      })
    ).rejects.toThrow('Nome documento obbligatorio.');

    await expect(
      caricaDocumento({
        file: validFile,
        nome: '   ',
        categoria: 'Contratti',
        casaId: 'casa_garibaldi',
        currentUser: marco,
        userData: marcoData
      })
    ).rejects.toThrow('Nome documento obbligatorio.');
  });

  test('T2.28 — Multi-tenant isolation: documents from one house are completely hidden from another house', async () => {
    seedHousehold({
      houseId: 'casa_garibaldi',
      users: [marco],
      documenti: [
        {
          id: 'doc_alpha',
          nome: 'Contratto Riservato Garibaldi',
          categoria: 'Contratti',
          caricatoDaNome: 'Marco',
          casaId: 'casa_garibaldi'
        }
      ]
    });

    seedHousehold({
      houseId: 'casa_verdi',
      users: [outsider],
      documenti: [
        {
          id: 'doc_beta',
          nome: 'Contratto Casa Verdi',
          categoria: 'Contratti',
          caricatoDaNome: 'Outsider',
          casaId: 'casa_verdi'
        }
      ]
    });

    // Render as outsider from casa_verdi
    renderWithProviders(<ViewDocumenti />, {
      user: outsider,
      userData: outsiderData,
      route: '/documenti'
    });

    // Outsider should see Casa Verdi's document but NOT Casa Garibaldi's document
    expect(await screen.findByText('Contratto Casa Verdi')).toBeInTheDocument();
    expect(screen.queryByText('Contratto Riservato Garibaldi')).not.toBeInTheDocument();
  });

  test('T2.29 — Deletion cancellation preserves document in UI and store', async () => {
    seedHousehold({
      houseId: 'casa_garibaldi',
      users: [marco],
      documenti: [
        {
          id: 'doc_keep',
          nome: 'Documento Importante',
          categoria: 'Garanzie',
          caricatoDaNome: 'Marco',
          casaId: 'casa_garibaldi'
        }
      ]
    });

    // Mock user clicking "Annulla" / Cancel
    window.confirm = jest.fn(() => false);

    renderWithProviders(<ViewDocumenti />, {
      user: marco,
      userData: marcoData,
      route: '/documenti'
    });

    expect(await screen.findByText('Documento Importante')).toBeInTheDocument();

    const deleteBtn = screen.getByTitle('Elimina');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();

    // Document is still in UI
    expect(screen.getByText('Documento Importante')).toBeInTheDocument();

    // Document is still in mockStore
    expect(mockStore.collections.documenti['doc_keep']).toBeDefined();
  });

  test('T2.30 — Rollback integrity: deletes uploaded file from storage if Firestore metadata fails', async () => {
    const validFile = createMockFile('rollback_test.pdf', 2048, 'application/pdf');

    // Simulate Firestore addDoc failure
    const firestore = require('firebase/firestore');
    const spyAddDoc = jest.spyOn(firestore, 'addDoc').mockRejectedValueOnce(new Error('Firestore network partition'));

    await expect(
      caricaDocumento({
        file: validFile,
        nome: 'Test Rollback',
        categoria: 'Contratti',
        casaId: 'casa_garibaldi',
        currentUser: marco,
        userData: marcoData
      })
    ).rejects.toThrow('Firestore network partition');

    spyAddDoc.mockRestore();

    // Verify storage file was cleaned up (no lingering file for rollback_test)
    const storageFiles = Object.keys(mockStore.storageFiles);
    const orphanFile = storageFiles.find((p) => p.includes('rollback_test.pdf'));
    expect(orphanFile).toBeUndefined();
  });

  test('T2.31 — Sanitizes document names and filenames preventing path traversal and script injection', () => {
    // 1. Path traversal characters stripped
    const dirtyFilename = '../../../etc/passwd.pdf';
    const cleanFilename = sanitizeFileName(dirtyFilename);
    expect(cleanFilename).not.toContain('/');
    expect(cleanFilename).not.toContain('\\');
    expect(cleanFilename).toBe('.._.._.._etc_passwd.pdf');

    // 2. HTML tags stripped
    const htmlName = '<b>Contratto Affitto</b>';
    expect(sanitizeText(htmlName, 120)).toBe('Contratto Affitto');

    // 3. Script tags stripped
    const xssName = '<script>alert("hack")</script>Contratto';
    const cleanName = sanitizeText(xssName, 120);
    expect(cleanName).not.toContain('<script>');
    expect(cleanName).not.toContain('</script>');
    expect(cleanName).toContain('Contratto');

    // 4. File size formatter boundary tests
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1024)).toBe('1.00 KB');
    expect(formatFileSize(1048576)).toBe('1.00 MB');
    expect(formatFileSize(15728640)).toBe('15.00 MB');
  });
});
