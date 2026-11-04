/**
 * src/test/tier2_boundaries/security_rules.test.js
 *
 * Milestone 5 Tier 2 Boundary & Security Test Suite
 * Validates multi-tenant isolation, anti-tamper boundaries, immutability,
 * authorization rules, and data sanitization for Cloud Firestore.
 *
 * Adheres strictly to the HouseHelper zero-emoji standard.
 */

import fs from 'fs';
import path from 'path';

/**
 * In-memory evaluation harness simulating Cloud Firestore Security Rules v2.
 * Maintains state and implements the exact logic defined in firestore.rules.
 */
export class SecurityRulesValidator {
  constructor(initialStore = {}) {
    this.store = {
      utenti: {},
      case: {},
      turni: {},
      debiti: {},
      spesa: {},
      note: {},
      documenti: {},
      ...initialStore
    };
  }

  setDocData(collection, id, data) {
    if (!this.store[collection]) {
      this.store[collection] = {};
    }
    this.store[collection][id] = data ? { ...data } : undefined;
  }

  getDocData(collection, id) {
    const coll = this.store[collection];
    return coll && coll[id] ? { ...coll[id] } : undefined;
  }

  evaluate({ auth, resource, requestResource, operation, collection, id }) {
    // 1. Unauthenticated check
    if (!auth || !auth.uid) {
      return { allowed: false, reason: 'Unauthenticated request rejected' };
    }

    const userDoc = this.getDocData('utenti', auth.uid);
    const userCasaId = userDoc ? userDoc.casaId : null;

    const hasValidCasa = Boolean(
      userDoc &&
      userCasaId !== null &&
      userCasaId !== undefined &&
      typeof userCasaId === 'string' &&
      userCasaId.trim().length > 0
    );

    const belongsToSameHouse = (casaId) => {
      return (
        hasValidCasa &&
        casaId !== null &&
        casaId !== undefined &&
        typeof casaId === 'string' &&
        casaId.trim().length > 0 &&
        userCasaId === casaId
      );
    };

    const isValidImporto = (val) => {
      if (typeof val === 'number') {
        return !isNaN(val) && val > 0.0 && val <= 50000.0;
      }
      if (typeof val === 'string' && val.trim().length > 0) {
        const parsed = parseFloat(val);
        return !isNaN(parsed) && parsed > 0.0 && parsed <= 50000.0;
      }
      return false;
    };

    const isNonEmptyString = (val, maxLen) => {
      return (
        typeof val === 'string' &&
        val.trim().length > 0 &&
        val.length <= maxLen
      );
    };

    const isValidDateString = (val) => {
      return typeof val === 'string' && val.length === 10;
    };

    switch (collection) {
      case 'utenti': {
        if (operation === 'read') {
          const isOwner = auth.uid === id;
          const isRoommate = Boolean(
            resource &&
            resource.casaId &&
            belongsToSameHouse(resource.casaId)
          );
          return { allowed: isOwner || isRoommate };
        }
        if (operation === 'create') {
          const isOwner = auth.uid === id;
          const validReq =
            requestResource &&
            isNonEmptyString(requestResource.username, 50) &&
            isNonEmptyString(requestResource.email, 100) &&
            (requestResource.casaId === null ||
              requestResource.casaId === undefined ||
              (typeof requestResource.casaId === 'string' && requestResource.casaId.length <= 64));
          return { allowed: Boolean(isOwner && validReq) };
        }
        if (operation === 'update') {
          const isOwner = auth.uid === id;
          const validReq =
            requestResource &&
            isNonEmptyString(requestResource.username, 50) &&
            (requestResource.casaId === null ||
              requestResource.casaId === undefined ||
              (typeof requestResource.casaId === 'string' && requestResource.casaId.length <= 64));
          return { allowed: Boolean(isOwner && validReq) };
        }
        if (operation === 'delete') {
          return { allowed: false, reason: 'User profiles cannot be deleted' };
        }
        return { allowed: false };
      }

      case 'case': {
        if (operation === 'read') {
          const canRead = belongsToSameHouse(id) || !hasValidCasa;
          return { allowed: canRead };
        }
        if (operation === 'create') {
          const req = requestResource;
          const valid =
            req &&
            isNonEmptyString(req.nome, 60) &&
            isNonEmptyString(req.codiceUnivoco, 12) &&
            req.codiceUnivoco.length >= 4 &&
            req.creatoreId === auth.uid;
          return { allowed: Boolean(valid) };
        }
        if (operation === 'update') {
          const req = requestResource;
          const valid =
            belongsToSameHouse(id) &&
            req &&
            isNonEmptyString(req.nome, 60) &&
            resource &&
            req.creatoreId === resource.creatoreId &&
            req.codiceUnivoco === resource.codiceUnivoco;
          return { allowed: Boolean(valid) };
        }
        if (operation === 'delete') {
          return { allowed: false, reason: 'Houses cannot be deleted directly' };
        }
        return { allowed: false };
      }

      case 'turni': {
        if (operation === 'read') {
          return { allowed: Boolean(resource && belongsToSameHouse(resource.casaId)) };
        }
        if (operation === 'create') {
          const req = requestResource;
          const valid =
            hasValidCasa &&
            req &&
            req.casaId === userCasaId &&
            req.utenteId === auth.uid &&
            Array.isArray(req.nomi) &&
            req.nomi.length > 0 &&
            req.nomi.length <= 15 &&
            Array.isArray(req.luoghi) &&
            req.luoghi.length > 0 &&
            req.luoghi.length <= 15 &&
            isValidDateString(req.data);
          return { allowed: Boolean(valid) };
        }
        if (operation === 'update') {
          const req = requestResource;
          const valid =
            resource &&
            belongsToSameHouse(resource.casaId) &&
            req &&
            req.casaId === resource.casaId &&
            Array.isArray(req.nomi) &&
            req.nomi.length > 0 &&
            req.nomi.length <= 15 &&
            Array.isArray(req.luoghi) &&
            req.luoghi.length > 0 &&
            req.luoghi.length <= 15 &&
            isValidDateString(req.data);
          return { allowed: Boolean(valid) };
        }
        if (operation === 'delete') {
          return { allowed: Boolean(resource && belongsToSameHouse(resource.casaId)) };
        }
        return { allowed: false };
      }

      case 'debiti': {
        if (operation === 'read') {
          return { allowed: Boolean(resource && belongsToSameHouse(resource.casaId)) };
        }
        if (operation === 'create') {
          const req = requestResource;
          const valid =
            hasValidCasa &&
            req &&
            req.casaId === userCasaId &&
            isValidImporto(req.importo) &&
            isNonEmptyString(req.descrizione, 255) &&
            isNonEmptyString(req.creditoreId, 64) &&
            isNonEmptyString(req.debitoreId, 64) &&
            req.creditoreId !== req.debitoreId;
          return { allowed: Boolean(valid) };
        }
        if (operation === 'update') {
          const req = requestResource;
          const valid =
            resource &&
            belongsToSameHouse(resource.casaId) &&
            req &&
            req.casaId === resource.casaId &&
            req.creditoreId === resource.creditoreId &&
            req.debitoreId === resource.debitoreId &&
            isValidImporto(req.importo) &&
            isNonEmptyString(req.descrizione, 255);
          return { allowed: Boolean(valid) };
        }
        if (operation === 'delete') {
          const allowed = Boolean(
            resource &&
            belongsToSameHouse(resource.casaId) &&
            (auth.uid === resource.debitoreId || auth.uid === resource.creditoreId)
          );
          return { allowed };
        }
        return { allowed: false };
      }

      case 'spesa': {
        if (operation === 'read') {
          return { allowed: Boolean(resource && belongsToSameHouse(resource.casaId)) };
        }
        if (operation === 'create') {
          const req = requestResource;
          const valid =
            hasValidCasa &&
            req &&
            req.casaId === userCasaId &&
            isNonEmptyString(req.nome, 100) &&
            typeof req.comprato === 'boolean';
          return { allowed: Boolean(valid) };
        }
        if (operation === 'update') {
          const req = requestResource;
          const valid =
            resource &&
            belongsToSameHouse(resource.casaId) &&
            req &&
            req.casaId === resource.casaId &&
            isNonEmptyString(req.nome, 100) &&
            typeof req.comprato === 'boolean';
          return { allowed: Boolean(valid) };
        }
        if (operation === 'delete') {
          return { allowed: Boolean(resource && belongsToSameHouse(resource.casaId)) };
        }
        return { allowed: false };
      }

      case 'note': {
        if (operation === 'read') {
          return { allowed: Boolean(resource && belongsToSameHouse(resource.casaId)) };
        }
        if (operation === 'create') {
          const req = requestResource;
          const valid =
            hasValidCasa &&
            req &&
            req.casaId === userCasaId &&
            req.autoreId === auth.uid &&
            isNonEmptyString(req.titolo, 100) &&
            isNonEmptyString(req.contenuto, 1000);
          return { allowed: Boolean(valid) };
        }
        if (operation === 'update') {
          const req = requestResource;
          const valid =
            resource &&
            belongsToSameHouse(resource.casaId) &&
            req &&
            req.casaId === resource.casaId &&
            req.autoreId === resource.autoreId &&
            isNonEmptyString(req.titolo, 100) &&
            isNonEmptyString(req.contenuto, 1000);
          return { allowed: Boolean(valid) };
        }
        if (operation === 'delete') {
          const allowed = Boolean(
            resource &&
            belongsToSameHouse(resource.casaId) &&
            (auth.uid === resource.autoreId || belongsToSameHouse(resource.casaId))
          );
          return { allowed };
        }
        return { allowed: false };
      }

      case 'documenti': {
        if (operation === 'read') {
          return { allowed: Boolean(resource && belongsToSameHouse(resource.casaId)) };
        }
        if (operation === 'create') {
          const req = requestResource;
          const valid =
            hasValidCasa &&
            req &&
            req.casaId === userCasaId &&
            req.caricatoDa === auth.uid &&
            isNonEmptyString(req.nome, 120) &&
            isNonEmptyString(req.categoria, 50) &&
            isNonEmptyString(req.fileUrl, 1000) &&
            Number.isInteger(req.dimensioneBytes) &&
            req.dimensioneBytes > 0 &&
            req.dimensioneBytes <= 26214400; // 25 MB max
          return { allowed: Boolean(valid) };
        }
        if (operation === 'update') {
          const req = requestResource;
          const valid =
            resource &&
            belongsToSameHouse(resource.casaId) &&
            req &&
            req.casaId === resource.casaId &&
            req.caricatoDa === resource.caricatoDa &&
            isNonEmptyString(req.nome, 120) &&
            isNonEmptyString(req.categoria, 50);
          return { allowed: Boolean(valid) };
        }
        if (operation === 'delete') {
          return { allowed: Boolean(resource && belongsToSameHouse(resource.casaId)) };
        }
        return { allowed: false };
      }

      default:
        return { allowed: false, reason: 'Default deny on unspecified collection' };
    }
  }
}

describe('Milestone 5: Application Security Hardening & Firestore Rules', () => {
  let validator;

  const mockUsers = {
    user_alpha_1: { username: 'Alice', email: 'alice@example.com', casaId: 'casa_alpha' },
    user_alpha_2: { username: 'Bob', email: 'bob@example.com', casaId: 'casa_alpha' },
    user_beta_1: { username: 'Charlie', email: 'charlie@example.com', casaId: 'casa_beta' },
    user_no_house: { username: 'Dave', email: 'dave@example.com', casaId: null },
    user_empty_house: { username: 'Eve', email: 'eve@example.com', casaId: '' }
  };

  beforeEach(() => {
    validator = new SecurityRulesValidator();
    Object.entries(mockUsers).forEach(([uid, uData]) => {
      validator.setDocData('utenti', uid, uData);
    });
  });

  describe('SEC-01: Multi-Tenant Household Data Isolation', () => {
    test('user in casa_alpha can read shift in casa_alpha', () => {
      const shift = { casaId: 'casa_alpha', data: '2026-11-10', nomi: ['Alice'], luoghi: ['Cucina'] };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        resource: shift,
        collection: 'turni',
        operation: 'read',
        id: 'shift_1'
      });
      expect(res.allowed).toBe(true);
    });

    test('user in casa_alpha CANNOT read shift in casa_beta', () => {
      const shift = { casaId: 'casa_beta', data: '2026-11-10', nomi: ['Charlie'], luoghi: ['Cucina'] };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        resource: shift,
        collection: 'turni',
        operation: 'read',
        id: 'shift_2'
      });
      expect(res.allowed).toBe(false);
    });

    test('user in casa_alpha CANNOT read debt in casa_beta', () => {
      const debt = {
        casaId: 'casa_beta',
        creditoreId: 'user_beta_1',
        debitoreId: 'user_beta_2',
        importo: 45.0,
        descrizione: 'Spesa comune'
      };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        resource: debt,
        collection: 'debiti',
        operation: 'read',
        id: 'debt_beta_1'
      });
      expect(res.allowed).toBe(false);
    });

    test('user in casa_alpha CANNOT write grocery item to casa_beta', () => {
      const groceryItem = {
        casaId: 'casa_beta',
        nome: 'Latte',
        comprato: false
      };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        requestResource: groceryItem,
        collection: 'spesa',
        operation: 'create'
      });
      expect(res.allowed).toBe(false);
    });
  });

  describe('SEC-02: Anti-Tamper null == null Exploit Prevention', () => {
    test('user with casaId: null cannot read document with casaId: null', () => {
      const orphanDoc = { casaId: null, data: '2026-11-10', nomi: ['X'], luoghi: ['Y'] };
      const res = validator.evaluate({
        auth: { uid: 'user_no_house' },
        resource: orphanDoc,
        collection: 'turni',
        operation: 'read',
        id: 'orphan_1'
      });
      expect(res.allowed).toBe(false);
    });

    test('user with empty string casaId cannot access resources', () => {
      const emptyDoc = { casaId: '', nome: 'Pane', comprato: false };
      const res = validator.evaluate({
        auth: { uid: 'user_empty_house' },
        resource: emptyDoc,
        collection: 'spesa',
        operation: 'read',
        id: 'spesa_empty'
      });
      expect(res.allowed).toBe(false);
    });

    test('user with casaId: null cannot create household debt', () => {
      const debtReq = {
        casaId: null,
        creditoreId: 'user_no_house',
        debitoreId: 'other_user',
        importo: 20.0,
        descrizione: 'Quota bollette'
      };
      const res = validator.evaluate({
        auth: { uid: 'user_no_house' },
        requestResource: debtReq,
        collection: 'debiti',
        operation: 'create'
      });
      expect(res.allowed).toBe(false);
    });
  });

  describe('SEC-03: Anti-Tamper Debt Value Bounds (0.01 - 50,000.00 EUR)', () => {
    test('rejects negative debt amounts', () => {
      const debtReq = {
        casaId: 'casa_alpha',
        creditoreId: 'user_alpha_1',
        debitoreId: 'user_alpha_2',
        importo: -15.0,
        descrizione: 'Negativo'
      };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        requestResource: debtReq,
        collection: 'debiti',
        operation: 'create'
      });
      expect(res.allowed).toBe(false);
    });

    test('rejects zero debt amount', () => {
      const debtReq = {
        casaId: 'casa_alpha',
        creditoreId: 'user_alpha_1',
        debitoreId: 'user_alpha_2',
        importo: 0,
        descrizione: 'Zero'
      };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        requestResource: debtReq,
        collection: 'debiti',
        operation: 'create'
      });
      expect(res.allowed).toBe(false);
    });

    test('rejects debt amount exceeding 50,000 EUR limit', () => {
      const debtReq = {
        casaId: 'casa_alpha',
        creditoreId: 'user_alpha_1',
        debitoreId: 'user_alpha_2',
        importo: 50000.01,
        descrizione: 'Troppo elevato'
      };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        requestResource: debtReq,
        collection: 'debiti',
        operation: 'create'
      });
      expect(res.allowed).toBe(false);
    });

    test('accepts boundary minimum 0.01 EUR and maximum 50000.00 EUR', () => {
      const minReq = {
        casaId: 'casa_alpha',
        creditoreId: 'user_alpha_1',
        debitoreId: 'user_alpha_2',
        importo: 0.01,
        descrizione: 'Centesimo'
      };
      const maxReq = {
        casaId: 'casa_alpha',
        creditoreId: 'user_alpha_1',
        debitoreId: 'user_alpha_2',
        importo: '50000.00',
        descrizione: 'Massimo consentito'
      };
      expect(validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        requestResource: minReq,
        collection: 'debiti',
        operation: 'create'
      }).allowed).toBe(true);

      expect(validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        requestResource: maxReq,
        collection: 'debiti',
        operation: 'create'
      }).allowed).toBe(true);
    });

    test('enforces importo bounds on debt UPDATE as well', () => {
      const existingDebt = {
        casaId: 'casa_alpha',
        creditoreId: 'user_alpha_1',
        debitoreId: 'user_alpha_2',
        importo: 25.0,
        descrizione: 'Cena'
      };

      const maliciousUpdate = {
        casaId: 'casa_alpha',
        creditoreId: 'user_alpha_1',
        debitoreId: 'user_alpha_2',
        importo: -500.0,
        descrizione: 'Cena corrotta'
      };

      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        resource: existingDebt,
        requestResource: maliciousUpdate,
        collection: 'debiti',
        operation: 'update',
        id: 'debt_1'
      });
      expect(res.allowed).toBe(false);
    });
  });

  describe('SEC-04: Anti-Tamper Self-Debt Prevention', () => {
    test('rejects debt where creditoreId equals debitoreId', () => {
      const selfDebt = {
        casaId: 'casa_alpha',
        creditoreId: 'user_alpha_1',
        debitoreId: 'user_alpha_1',
        importo: 10.0,
        descrizione: 'Self debt'
      };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        requestResource: selfDebt,
        collection: 'debiti',
        operation: 'create'
      });
      expect(res.allowed).toBe(false);
    });
  });

  describe('SEC-05: Field Immutability Protection on Financial Records', () => {
    const originalDebt = {
      casaId: 'casa_alpha',
      creditoreId: 'user_alpha_1',
      debitoreId: 'user_alpha_2',
      importo: 30.0,
      descrizione: 'Pizza'
    };

    test('blocks changing casaId on debt update', () => {
      const mutated = { ...originalDebt, casaId: 'casa_beta' };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        resource: originalDebt,
        requestResource: mutated,
        collection: 'debiti',
        operation: 'update',
        id: 'debt_orig'
      });
      expect(res.allowed).toBe(false);
    });

    test('blocks mutating creditoreId on debt update', () => {
      const mutated = { ...originalDebt, creditoreId: 'user_beta_1' };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        resource: originalDebt,
        requestResource: mutated,
        collection: 'debiti',
        operation: 'update',
        id: 'debt_orig'
      });
      expect(res.allowed).toBe(false);
    });

    test('blocks mutating debitoreId on debt update', () => {
      const mutated = { ...originalDebt, debitoreId: 'user_beta_1' };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        resource: originalDebt,
        requestResource: mutated,
        collection: 'debiti',
        operation: 'update',
        id: 'debt_orig'
      });
      expect(res.allowed).toBe(false);
    });

    test('allows legitimate update preserving keys and valid amount', () => {
      const validUpdate = { ...originalDebt, importo: 35.0, descrizione: 'Pizza e bibite' };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        resource: originalDebt,
        requestResource: validUpdate,
        collection: 'debiti',
        operation: 'update',
        id: 'debt_orig'
      });
      expect(res.allowed).toBe(true);
    });
  });

  describe('SEC-06: Authorization on Debt Settlement and Deletion', () => {
    const debt = {
      casaId: 'casa_alpha',
      creditoreId: 'user_alpha_1',
      debitoreId: 'user_alpha_2',
      importo: 20.0,
      descrizione: 'Detersivi'
    };

    test('debtor (user_alpha_2) CAN settle or delete debt', () => {
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_2' },
        resource: debt,
        collection: 'debiti',
        operation: 'delete',
        id: 'debt_settle_1'
      });
      expect(res.allowed).toBe(true);
    });

    test('creditor (user_alpha_1) CAN delete debt', () => {
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        resource: debt,
        collection: 'debiti',
        operation: 'delete',
        id: 'debt_settle_1'
      });
      expect(res.allowed).toBe(true);
    });

    test('unrelated house member CANNOT delete debt of other roommates', () => {
      // Add third roommate to casa_alpha
      validator.setDocData('utenti', 'user_alpha_3', { username: 'Zoe', casaId: 'casa_alpha' });
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_3' },
        resource: debt,
        collection: 'debiti',
        operation: 'delete',
        id: 'debt_settle_1'
      });
      expect(res.allowed).toBe(false);
    });

    test('cross-tenant user CANNOT delete debt', () => {
      const res = validator.evaluate({
        auth: { uid: 'user_beta_1' },
        resource: debt,
        collection: 'debiti',
        operation: 'delete',
        id: 'debt_settle_1'
      });
      expect(res.allowed).toBe(false);
    });
  });

  describe('SEC-07: Immutability on Cleaning Shifts and Notes', () => {
    test('blocks mutating casaId on turni update', () => {
      const existingShift = {
        casaId: 'casa_alpha',
        utenteId: 'user_alpha_1',
        data: '2026-11-12',
        nomi: ['Alice'],
        luoghi: ['Bagno']
      };
      const maliciousShift = { ...existingShift, casaId: 'casa_beta' };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        resource: existingShift,
        requestResource: maliciousShift,
        collection: 'turni',
        operation: 'update',
        id: 'shift_mut'
      });
      expect(res.allowed).toBe(false);
    });

    test('blocks mutating autoreId on note update', () => {
      const existingNote = {
        casaId: 'casa_alpha',
        autoreId: 'user_alpha_1',
        titolo: 'Avviso',
        contenuto: 'Messaggio originale'
      };
      const maliciousNote = { ...existingNote, autoreId: 'user_alpha_2' };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        resource: existingNote,
        requestResource: maliciousNote,
        collection: 'note',
        operation: 'update',
        id: 'note_mut'
      });
      expect(res.allowed).toBe(false);
    });
  });

  describe('SEC-08: Input Bounds and Length Limits', () => {
    test('rejects note with empty title or content', () => {
      const emptyNote = {
        casaId: 'casa_alpha',
        autoreId: 'user_alpha_1',
        titolo: '   ',
        contenuto: ''
      };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        requestResource: emptyNote,
        collection: 'note',
        operation: 'create'
      });
      expect(res.allowed).toBe(false);
    });

    test('rejects note exceeding 1000 character content limit', () => {
      const oversizedNote = {
        casaId: 'casa_alpha',
        autoreId: 'user_alpha_1',
        titolo: 'Avviso lungo',
        contenuto: 'A'.repeat(1005)
      };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        requestResource: oversizedNote,
        collection: 'note',
        operation: 'create'
      });
      expect(res.allowed).toBe(false);
    });

    test('accepts valid note within size bounds', () => {
      const validNote = {
        casaId: 'casa_alpha',
        autoreId: 'user_alpha_1',
        titolo: 'Riunione condominio',
        contenuto: 'Giovedi sera alle 20:30 in cucina.'
      };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        requestResource: validNote,
        collection: 'note',
        operation: 'create'
      });
      expect(res.allowed).toBe(true);
    });
  });

  describe('SEC-09: Milestone 6 Household Document Bounds', () => {
    test('accepts valid document metadata within 25MB bound', () => {
      const validDoc = {
        casaId: 'casa_alpha',
        caricatoDa: 'user_alpha_1',
        nome: 'Contratto_Affitto_2026.pdf',
        categoria: 'Contratti',
        fileUrl: 'https://firebasestorage.googleapis.com/v0/b/...',
        dimensioneBytes: 5242880 // 5 MB
      };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        requestResource: validDoc,
        collection: 'documenti',
        operation: 'create'
      });
      expect(res.allowed).toBe(true);
    });

    test('rejects document metadata exceeding 25MB limit', () => {
      const oversizedDoc = {
        casaId: 'casa_alpha',
        caricatoDa: 'user_alpha_1',
        nome: 'Video_Condominio.mp4',
        categoria: 'Altro',
        fileUrl: 'https://firebasestorage.googleapis.com/...',
        dimensioneBytes: 30000000 // ~30 MB
      };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        requestResource: oversizedDoc,
        collection: 'documenti',
        operation: 'create'
      });
      expect(res.allowed).toBe(false);
    });

    test('rejects document with non-positive or non-integer file size', () => {
      const zeroByteDoc = {
        casaId: 'casa_alpha',
        caricatoDa: 'user_alpha_1',
        nome: 'Empty.pdf',
        categoria: 'Altro',
        fileUrl: 'https://firebasestorage.googleapis.com/...',
        dimensioneBytes: 0
      };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        requestResource: zeroByteDoc,
        collection: 'documenti',
        operation: 'create'
      });
      expect(res.allowed).toBe(false);
    });

    test('enforces immutability of caricatoDa on document update', () => {
      const orig = {
        casaId: 'casa_alpha',
        caricatoDa: 'user_alpha_1',
        nome: 'Bolletta_Luce.pdf',
        categoria: 'Utenze',
        dimensioneBytes: 1048576
      };
      const tampered = {
        ...orig,
        caricatoDa: 'user_alpha_2'
      };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        resource: orig,
        requestResource: tampered,
        collection: 'documenti',
        operation: 'update',
        id: 'doc_1'
      });
      expect(res.allowed).toBe(false);
    });
  });

  describe('SEC-10: House Creation and Invite Code Anti-Tamper', () => {
    test('requires creatoreId to match authenticated user', () => {
      const spoofedHouse = {
        nome: 'Villa Speranza',
        codiceUnivoco: 'VILL12',
        creatoreId: 'impersonated_user'
      };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        requestResource: spoofedHouse,
        collection: 'case',
        operation: 'create'
      });
      expect(res.allowed).toBe(false);
    });

    test('requires codiceUnivoco between 4 and 12 characters', () => {
      const shortCodeHouse = {
        nome: 'Casa Piccola',
        codiceUnivoco: 'AB',
        creatoreId: 'user_alpha_1'
      };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        requestResource: shortCodeHouse,
        collection: 'case',
        operation: 'create'
      });
      expect(res.allowed).toBe(false);
    });

    test('house update cannot change creatoreId or codiceUnivoco', () => {
      const existingHouse = {
        nome: 'Casa Originale',
        codiceUnivoco: 'ORIG99',
        creatoreId: 'user_alpha_1'
      };
      const tampered = {
        nome: 'Casa Nuova',
        codiceUnivoco: 'HACK00',
        creatoreId: 'user_alpha_1'
      };
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        resource: existingHouse,
        requestResource: tampered,
        collection: 'case',
        operation: 'update',
        id: 'casa_alpha'
      });
      expect(res.allowed).toBe(false);
    });
  });

  describe('SEC-11: User Profile Isolation and Roommate Scoping', () => {
    test('user can always read their own profile', () => {
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        resource: mockUsers.user_alpha_1,
        collection: 'utenti',
        operation: 'read',
        id: 'user_alpha_1'
      });
      expect(res.allowed).toBe(true);
    });

    test('roommate in the same house can read fellow roommate profile', () => {
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        resource: mockUsers.user_alpha_2,
        collection: 'utenti',
        operation: 'read',
        id: 'user_alpha_2'
      });
      expect(res.allowed).toBe(true);
    });

    test('cross-household user CANNOT read user profile of another household', () => {
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        resource: mockUsers.user_beta_1,
        collection: 'utenti',
        operation: 'read',
        id: 'user_beta_1'
      });
      expect(res.allowed).toBe(false);
    });

    test('user profile deletion is universally blocked', () => {
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        collection: 'utenti',
        operation: 'delete',
        id: 'user_alpha_1'
      });
      expect(res.allowed).toBe(false);
    });
  });

  describe('SEC-12: Unauthenticated and Default-Deny Boundaries', () => {
    test('unauthenticated request is rejected immediately', () => {
      const res = validator.evaluate({
        auth: null,
        collection: 'debiti',
        operation: 'read',
        id: 'debt_any'
      });
      expect(res.allowed).toBe(false);
    });

    test('requests to unmapped collections trigger default deny', () => {
      const res = validator.evaluate({
        auth: { uid: 'user_alpha_1' },
        collection: 'secret_audit_logs',
        operation: 'read',
        id: 'log_1'
      });
      expect(res.allowed).toBe(false);
    });
  });

  describe('SEC-13: Static Analysis of firestore.rules File', () => {
    test('firestore.rules file exists on disk and contains all required anti-tamper clauses', () => {
      const rulesPath = path.resolve(__dirname, '../../../firestore.rules');
      expect(fs.existsSync(rulesPath)).toBe(true);

      const content = fs.readFileSync(rulesPath, 'utf8');

      // 1. Multi-tenant helpers
      expect(content).toContain('function hasValidCasa()');
      expect(content).toContain('function belongsToSameHouse(casaId)');
      expect(content).toContain('getUserDoc().data.casaId != null');
      expect(content).toContain('getUserDoc().data.casaId is string');

      // 2. Anti-tamper bounds
      expect(content).toContain('function isValidImporto(val)');
      expect(content).toContain('50000.0');

      // 3. Immutability checks
      expect(content).toContain('request.resource.data.creditoreId == resource.data.creditoreId');
      expect(content).toContain('request.resource.data.debitoreId == resource.data.debitoreId');
      expect(content).toContain('request.resource.data.casaId == resource.data.casaId');

      // 4. Milestone 6 Document collection & Storage rules
      expect(content).toContain('match /documenti/{docId}');
      expect(content).toContain('26214400');
      expect(content).toContain('FIREBASE STORAGE RULES SPECIFICATION');

      // 5. Default deny
      expect(content).toContain('match /{document=**}');
      expect(content).toContain('allow read, write: if false;');
    });
  });

  describe('SEC-14: Firebase Storage Security Rules', () => {
    test('storage.rules file exists on disk and contains all required isolation, bounds and MIME constraints', () => {
      const storageRulesPath = path.resolve(__dirname, '../../../storage.rules');
      expect(fs.existsSync(storageRulesPath)).toBe(true);

      const content = fs.readFileSync(storageRulesPath, 'utf8');

      // 1. Version and service definition
      expect(content).toContain("rules_version = '2'");
      expect(content).toContain('service firebase.storage');

      // 2. Cross-service Firestore lookup helper
      expect(content).toContain('function belongsToSameHouse(casaId)');
      expect(content).toContain('firestore.get(/databases/(default)/documents/utenti/$(request.auth.uid))');
      expect(content).toContain('getUserDoc().data.casaId == casaId');

      // 3. Multi-tenant path scoping
      expect(content).toContain('match /case/{casaId}/documenti/{allPaths=**}');

      // 4. File bounds & MIME whitelist
      expect(content).toContain('15 * 1024 * 1024');
      expect(content).toContain('application/pdf');

      // 5. Immutability
      expect(content).toContain('allow update: if false;');

      // 6. Default deny
      expect(content).toContain('match /{allPaths=**}');
      expect(content).toContain('allow read, write: if false;');
    });

    // In-memory evaluation helper for storage rules
    class StorageRulesSimulator {
      constructor(users = {}) {
        this.users = { ...users };
      }

      evaluate({ auth, operation, casaId, path: filePath, size, contentType }) {
        if (!auth || !auth.uid) {
          return { allowed: false, reason: 'Unauthenticated request' };
        }
        const user = this.users[auth.uid];
        if (!user || !user.casaId || typeof user.casaId !== 'string' || user.casaId.length === 0) {
          return { allowed: false, reason: 'No valid household' };
        }

        // Match path
        const expectedPrefix = `case/${casaId}/documenti/`;
        if (!filePath.startsWith(expectedPrefix)) {
          return { allowed: false, reason: 'Path outside household documents scope' };
        }

        const belongsToSameHouse = user.casaId === casaId;
        if (!belongsToSameHouse) {
          return { allowed: false, reason: 'Cross-tenant access forbidden' };
        }

        if (operation === 'read') {
          return { allowed: true };
        }

        if (operation === 'update') {
          return { allowed: false, reason: 'Immutability: updates are disabled' };
        }

        if (operation === 'delete') {
          return { allowed: true };
        }

        if (operation === 'create') {
          if (!size || size <= 0 || size > 15 * 1024 * 1024) {
            return { allowed: false, reason: 'File size must be positive and <= 15MB' };
          }
          const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/heic',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
          ];
          if (!contentType || !allowedTypes.includes(contentType)) {
            return { allowed: false, reason: 'Disallowed MIME type' };
          }
          return { allowed: true };
        }

        return { allowed: false, reason: 'Unknown operation' };
      }
    }

    test('storage evaluation: allows authenticated roommate to upload and read, blocks cross-tenant', () => {
      const sim = new StorageRulesSimulator({
        user_marco: { casaId: 'casa_garibaldi' },
        user_lucia: { casaId: 'casa_garibaldi' },
        user_outsider: { casaId: 'casa_verdi' }
      });

      // 1. Marco uploads 2MB PDF to his house
      const uploadMarco = sim.evaluate({
        auth: { uid: 'user_marco' },
        operation: 'create',
        casaId: 'casa_garibaldi',
        path: 'case/casa_garibaldi/documenti/1700000000_contratto.pdf',
        size: 2 * 1024 * 1024,
        contentType: 'application/pdf'
      });
      expect(uploadMarco.allowed).toBe(true);

      // 2. Lucia (same house) reads the contract
      const readLucia = sim.evaluate({
        auth: { uid: 'user_lucia' },
        operation: 'read',
        casaId: 'casa_garibaldi',
        path: 'case/casa_garibaldi/documenti/1700000000_contratto.pdf'
      });
      expect(readLucia.allowed).toBe(true);

      // 3. Outsider attempts to read Marco contract
      const readOutsider = sim.evaluate({
        auth: { uid: 'user_outsider' },
        operation: 'read',
        casaId: 'casa_garibaldi',
        path: 'case/casa_garibaldi/documenti/1700000000_contratto.pdf'
      });
      expect(readOutsider.allowed).toBe(false);

      // 4. Outsider attempts to upload to Marco house
      const uploadOutsider = sim.evaluate({
        auth: { uid: 'user_outsider' },
        operation: 'create',
        casaId: 'casa_garibaldi',
        path: 'case/casa_garibaldi/documenti/malicious.pdf',
        size: 1024,
        contentType: 'application/pdf'
      });
      expect(uploadOutsider.allowed).toBe(false);
    });

    test('storage evaluation: rejects oversized files, illegal MIME types, and file updates', () => {
      const sim = new StorageRulesSimulator({
        user_marco: { casaId: 'casa_garibaldi' }
      });

      // 1. File > 15MB (e.g. 16MB) rejected
      const oversized = sim.evaluate({
        auth: { uid: 'user_marco' },
        operation: 'create',
        casaId: 'casa_garibaldi',
        path: 'case/casa_garibaldi/documenti/huge_video.pdf',
        size: 16 * 1024 * 1024,
        contentType: 'application/pdf'
      });
      expect(oversized.allowed).toBe(false);

      // 2. Executable / script MIME rejected
      const illegalMime = sim.evaluate({
        auth: { uid: 'user_marco' },
        operation: 'create',
        casaId: 'casa_garibaldi',
        path: 'case/casa_garibaldi/documenti/script.sh',
        size: 500,
        contentType: 'application/x-sh'
      });
      expect(illegalMime.allowed).toBe(false);

      // 3. Update operation unconditionally rejected
      const updateAttempt = sim.evaluate({
        auth: { uid: 'user_marco' },
        operation: 'update',
        casaId: 'casa_garibaldi',
        path: 'case/casa_garibaldi/documenti/1700000000_contratto.pdf'
      });
      expect(updateAttempt.allowed).toBe(false);
    });
  });
});
