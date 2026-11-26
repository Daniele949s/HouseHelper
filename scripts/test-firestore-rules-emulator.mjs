#!/usr/bin/env node
/**
 * scripts/test-firestore-rules-emulator.mjs
 * Automated Firebase Emulator Suite Security Rules verification for HouseHelper.
 * Evaluates real firestore.rules against:
 *   1. Anonymous user
 *   2. Authenticated user without household (unassigned)
 *   3. Pending member + null/unexpected/legacy statoMembro edge cases
 *   4. Active House A members (memberA, memberA2, memberA3)
 *   5. House B member (cross-tenant)
 *   6. Ex-member (after leave/kick)
 *   7. House A Administrator (adminA)
 * Pure ASCII only. Uses Node 24 native fetch + assert.
 */

import assert from 'node:assert/strict';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'househelper-12050';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const FS_BASE = `http://${FS_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function toFsValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFsValue) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = toFsValue(val);
    return { mapValue: { fields } };
  }
  throw new Error(`Unsupported value type: ${typeof v}`);
}

function toFsDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFsValue(v);
  return { fields };
}

async function createAuthUser(email, password = 'password123') {
  const url = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Auth signUp failed for ${email}: ${JSON.stringify(data)}`);
  return { uid: data.localId, token: data.idToken, email };
}

async function adminWrite(docPath, obj) {
  const res = await fetch(`${FS_BASE}/${docPath}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer owner'
    },
    body: JSON.stringify(toFsDoc(obj))
  });
  if (!res.ok) {
    throw new Error(`Admin seed failed for ${docPath}: ${res.status} ${await res.text()}`);
  }
}

async function clearFirestore() {
  const url = `http://${FS_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Clear Firestore failed: ${res.status}`);
}

async function clearAuth() {
  const url = `http://${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Clear Auth failed: ${res.status}`);
}

async function fsRequest(method, docPath, { token = null, body = null, query = '' } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${FS_BASE}/${docPath}${query}`, {
    method,
    headers,
    body: body ? JSON.stringify(toFsDoc(body)) : undefined
  });
  return { status: res.status, ok: res.ok, text: await res.text() };
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log(`[PASS] ${name}`);
  } catch (err) {
    results.push({ name, pass: false, error: err.message });
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

async function expectAllow(promise, label) {
  const res = await promise;
  assert.equal(res.ok, true, `${label}: expected ALLOW (2xx), got ${res.status} ${res.text}`);
}

async function expectDeny(promise, label) {
  const res = await promise;
  assert.equal(res.status, 403, `${label}: expected DENY (403), got ${res.status} ${res.text}`);
}

async function main() {
  await clearFirestore();
  await clearAuth();

  // Create identities covering all 7 roles + statoMembro edge cases
  const adminA = await createAuthUser('admin-a@test.local');
  const memberA = await createAuthUser('member-a@test.local');
  const memberA2 = await createAuthUser('member-a2@test.local');
  const memberA3 = await createAuthUser('member-a3@test.local');
  const pendingA = await createAuthUser('pending-a@test.local');
  const unassigned = await createAuthUser('unassigned@test.local');
  const nullStateA = await createAuthUser('null-state@test.local');
  const unexpectedStateA = await createAuthUser('unexpected-state@test.local');
  const legacyA = await createAuthUser('legacy-a@test.local');
  const memberB = await createAuthUser('member-b@test.local');
  const exMemberA = await createAuthUser('ex-member-a@test.local');

  // Seed houses & invite pointers
  await adminWrite('case/casa_a', {
    nome: 'Casa Alpha',
    codiceUnivoco: 'ALPHA1',
    creatoreId: adminA.uid,
    adminUid: adminA.uid
  });
  await adminWrite('inviti/ALPHA1', {
    casaId: 'casa_a',
    nomeCasa: 'Casa Alpha',
    creatoreId: adminA.uid
  });
  await adminWrite('case/casa_del', {
    nome: 'Casa Delete Me',
    codiceUnivoco: 'DEL999',
    creatoreId: adminA.uid,
    adminUid: adminA.uid
  });
  await adminWrite('case/casa_b', {
    nome: 'Casa Beta',
    codiceUnivoco: 'BETA02',
    creatoreId: memberB.uid,
    adminUid: memberB.uid
  });

  // Seed user profiles
  await adminWrite(`utenti/${adminA.uid}`, {
    username: 'AdminA', email: adminA.email, casaId: 'casa_a', ruoloCasa: 'admin', statoMembro: 'active'
  });
  await adminWrite(`utenti/${memberA.uid}`, {
    username: 'MemberA', email: memberA.email, casaId: 'casa_a', ruoloCasa: 'member', statoMembro: 'active'
  });
  await adminWrite(`utenti/${memberA2.uid}`, {
    username: 'MemberA2', email: memberA2.email, casaId: 'casa_a', ruoloCasa: 'member', statoMembro: 'active'
  });
  await adminWrite(`utenti/${memberA3.uid}`, {
    username: 'MemberA3', email: memberA3.email, casaId: 'casa_a', ruoloCasa: 'member', statoMembro: 'active'
  });
  await adminWrite(`utenti/${pendingA.uid}`, {
    username: 'PendingA', email: pendingA.email, casaId: 'casa_a', ruoloCasa: 'member', statoMembro: 'pending'
  });
  await adminWrite(`utenti/${unassigned.uid}`, {
    username: 'Unassigned', email: unassigned.email, casaId: null, ruoloCasa: null, statoMembro: null
  });
  await adminWrite(`utenti/${nullStateA.uid}`, {
    username: 'NullStateA', email: nullStateA.email, casaId: 'casa_a', ruoloCasa: 'member', statoMembro: null
  });
  await adminWrite(`utenti/${unexpectedStateA.uid}`, {
    username: 'SuspendedA', email: unexpectedStateA.email, casaId: 'casa_a', ruoloCasa: 'member', statoMembro: 'suspended'
  });
  await adminWrite(`utenti/${legacyA.uid}`, {
    username: 'LegacyA', email: legacyA.email, casaId: 'casa_a'
  });
  await adminWrite(`utenti/${memberB.uid}`, {
    username: 'MemberB', email: memberB.email, casaId: 'casa_b', ruoloCasa: 'admin', statoMembro: 'active'
  });
  await adminWrite(`utenti/${exMemberA.uid}`, {
    username: 'ExMemberA', email: exMemberA.email, casaId: null, ruoloCasa: null, statoMembro: null
  });

  // Seed House A resources
  await adminWrite('debiti/deb_a1', {
    casaId: 'casa_a',
    creditoreId: memberA.uid,
    debitoreId: memberA2.uid,
    importo: 25.5,
    descrizione: 'Bolletta luce',
    saldato: false
  });
  await adminWrite('documenti/doc_a1', {
    casaId: 'casa_a',
    caricatoDa: memberA.uid,
    nome: 'Contratto affitto.pdf',
    categoria: 'contratti',
    fileUrl: 'https://example.com/contratto.pdf',
    dimensioneBytes: 102400
  });
  await adminWrite('contatti/cnt_a1', {
    casaId: 'casa_a',
    nome: 'Idraulico Rossi',
    categoria: 'emergenza',
    telefono: '+39051123456'
  });
  await adminWrite('note/nota_a1', {
    casaId: 'casa_a',
    autoreId: memberA.uid,
    titolo: 'Lettura contatore',
    contenuto: 'Venerdi alle 9'
  });

  // 1. ANONYMOUS ACCESS
  await check('Anonymous DENIED reading casa_a', () =>
    expectDeny(fsRequest('GET', 'case/casa_a'), 'anon get casa'));
  await check('Anonymous DENIED reading inviti/ALPHA1', () =>
    expectDeny(fsRequest('GET', 'inviti/ALPHA1'), 'anon get invite'));
  await check('Anonymous DENIED reading debiti/deb_a1', () =>
    expectDeny(fsRequest('GET', 'debiti/deb_a1'), 'anon get debito'));
  await check('Anonymous DENIED reading documenti/doc_a1', () =>
    expectDeny(fsRequest('GET', 'documenti/doc_a1'), 'anon get doc'));
  await check('Anonymous DENIED reading utenti/memberA', () =>
    expectDeny(fsRequest('GET', `utenti/${memberA.uid}`), 'anon get user'));

  // 2. UNAUTHENTICATED-TO-HOUSE (UNASSIGNED) INVITE FLOW
  await check('Unassigned ALLOWED exact GET on inviti/ALPHA1', () =>
    expectAllow(fsRequest('GET', 'inviti/ALPHA1', { token: unassigned.token }), 'unassigned get invite'));
  await check('Unassigned DENIED listing /inviti collection', () =>
    expectDeny(fsRequest('GET', 'inviti', { token: unassigned.token }), 'unassigned list inviti'));
  await check('Unassigned DENIED direct GET on case/casa_a', () =>
    expectDeny(fsRequest('GET', 'case/casa_a', { token: unassigned.token }), 'unassigned get casa_a'));
  await check('Unassigned ALLOWED transitional limit=1 lookup on /case for legacy invites', () =>
    expectAllow(fsRequest('GET', 'case', { token: unassigned.token, query: '?pageSize=1' }), 'unassigned list case limit=1'));
  await check('Unassigned DENIED listing >1 houses on /case collection', () =>
    expectDeny(fsRequest('GET', 'case', { token: unassigned.token, query: '?pageSize=2' }), 'unassigned list case limit=2'));
  await check('Unassigned DENIED joining casa_a directly as admin/active', () =>
    expectDeny(fsRequest('PATCH', `utenti/${unassigned.uid}`, {
      token: unassigned.token,
      body: { username: 'Unassigned', email: unassigned.email, casaId: 'casa_a', ruoloCasa: 'admin', statoMembro: 'active' }
    }), 'unassigned join as admin'));
  await check('Unassigned ALLOWED joining casa_a as member/pending', () =>
    expectAllow(fsRequest('PATCH', `utenti/${unassigned.uid}`, {
      token: unassigned.token,
      body: { username: 'Unassigned', email: unassigned.email, casaId: 'casa_a', ruoloCasa: 'member', statoMembro: 'pending' }
    }), 'unassigned join as pending'));

  // 3. CROSS-HOUSE ISOLATION (House A vs House B)
  await check('MemberA ALLOWED reading casa_a', () =>
    expectAllow(fsRequest('GET', 'case/casa_a', { token: memberA.token }), 'memberA get casa_a'));
  await check('MemberB DENIED reading casa_a', () =>
    expectDeny(fsRequest('GET', 'case/casa_a', { token: memberB.token }), 'memberB get casa_a'));
  await check('MemberB DENIED reading House A debiti', () =>
    expectDeny(fsRequest('GET', 'debiti/deb_a1', { token: memberB.token }), 'memberB get deb_a1'));
  await check('MemberB DENIED reading House A documenti', () =>
    expectDeny(fsRequest('GET', 'documenti/doc_a1', { token: memberB.token }), 'memberB get doc_a1'));
  await check('MemberB DENIED reading House A contatti', () =>
    expectDeny(fsRequest('GET', 'contatti/cnt_a1', { token: memberB.token }), 'memberB get cnt_a1'));
  await check('MemberB DENIED reading MemberA profile', () =>
    expectDeny(fsRequest('GET', `utenti/${memberA.uid}`, { token: memberB.token }), 'memberB get memberA'));

  // 4. MEMBER STATE ALLOWLIST (pending, null, unexpected, legacy)
  await check('PendingA ALLOWED reading own profile', () =>
    expectAllow(fsRequest('GET', `utenti/${pendingA.uid}`, { token: pendingA.token }), 'pendingA get self'));
  await check('PendingA ALLOWED reading casa_a metadata', () =>
    expectAllow(fsRequest('GET', 'case/casa_a', { token: pendingA.token }), 'pendingA get casa_a'));
  await check('PendingA DENIED reading House A debiti', () =>
    expectDeny(fsRequest('GET', 'debiti/deb_a1', { token: pendingA.token }), 'pendingA get deb_a1'));
  await check('PendingA DENIED reading House A documenti', () =>
    expectDeny(fsRequest('GET', 'documenti/doc_a1', { token: pendingA.token }), 'pendingA get doc_a1'));
  await check('PendingA DENIED self-approving to active', () =>
    expectDeny(fsRequest('PATCH', `utenti/${pendingA.uid}`, {
      token: pendingA.token,
      body: { username: 'PendingA', email: pendingA.email, casaId: 'casa_a', ruoloCasa: 'member', statoMembro: 'active' }
    }), 'pendingA self-approve'));
  await check('NullStateA (statoMembro: null) DENIED reading House A debiti', () =>
    expectDeny(fsRequest('GET', 'debiti/deb_a1', { token: nullStateA.token }), 'nullState get deb_a1'));
  await check('SuspendedA (statoMembro: suspended) DENIED reading House A debiti', () =>
    expectDeny(fsRequest('GET', 'debiti/deb_a1', { token: unexpectedStateA.token }), 'suspended get deb_a1'));
  await check('LegacyA (statoMembro absent) ALLOWED reading House A debiti', () =>
    expectAllow(fsRequest('GET', 'debiti/deb_a1', { token: legacyA.token }), 'legacy get deb_a1'));

  // 5. EX-MEMBER REVOCATION
  await check('ExMemberA DENIED reading House A debiti', () =>
    expectDeny(fsRequest('GET', 'debiti/deb_a1', { token: exMemberA.token }), 'exMember get deb_a1'));
  await check('ExMemberA DENIED reading House A documenti', () =>
    expectDeny(fsRequest('GET', 'documenti/doc_a1', { token: exMemberA.token }), 'exMember get doc_a1'));
  await check('ExMemberA DENIED reading House A contatti', () =>
    expectDeny(fsRequest('GET', 'contatti/cnt_a1', { token: exMemberA.token }), 'exMember get cnt_a1'));
  await check('ExMemberA DENIED reading MemberA profile', () =>
    expectDeny(fsRequest('GET', `utenti/${memberA.uid}`, { token: exMemberA.token }), 'exMember get memberA'));

  // 6. PROFILE SELF-UPDATE, HOUSE HOPPING, ROLE ESCALATION & ADMIN PRIVILEGES
  await check('MemberA ALLOWED updating own username without changing role', () =>
    expectAllow(fsRequest('PATCH', `utenti/${memberA.uid}`, {
      token: memberA.token,
      body: { username: 'MemberA-Renamed', email: memberA.email, casaId: 'casa_a', ruoloCasa: 'member', statoMembro: 'active' }
    }), 'memberA self-update username'));
  await check('MemberA DENIED hopping directly to casa_b without leaving', () =>
    expectDeny(fsRequest('PATCH', `utenti/${memberA.uid}`, {
      token: memberA.token,
      body: { username: 'MemberA-Renamed', email: memberA.email, casaId: 'casa_b', ruoloCasa: 'member', statoMembro: 'pending' }
    }), 'memberA hop to casa_b'));
  await check('MemberA DENIED self-escalating to admin', () =>
    expectDeny(fsRequest('PATCH', `utenti/${memberA.uid}`, {
      token: memberA.token,
      body: { username: 'MemberA-Renamed', email: memberA.email, casaId: 'casa_a', ruoloCasa: 'admin', statoMembro: 'active' }
    }), 'memberA self-escalate'));
  await check('MemberA DENIED approving PendingA', () =>
    expectDeny(fsRequest('PATCH', `utenti/${pendingA.uid}`, {
      token: memberA.token,
      body: { username: 'PendingA', email: pendingA.email, casaId: 'casa_a', ruoloCasa: 'member', statoMembro: 'active' }
    }), 'memberA approve pendingA'));
  await check('AdminA ALLOWED approving PendingA', () =>
    expectAllow(fsRequest('PATCH', `utenti/${pendingA.uid}`, {
      token: adminA.token,
      body: { username: 'PendingA', email: pendingA.email, casaId: 'casa_a', ruoloCasa: 'member', statoMembro: 'active' }
    }), 'adminA approve pendingA'));
  await check('MemberA DENIED deleting casa_del', () =>
    expectDeny(fsRequest('DELETE', 'case/casa_del', { token: memberA.token }), 'memberA delete house'));
  await check('AdminA ALLOWED deleting casa_del', () =>
    expectAllow(fsRequest('DELETE', 'case/casa_del', { token: adminA.token }), 'adminA delete house'));

  // 7. EXPENSE & SETTLEMENT INTEGRITY
  await check('MemberA ALLOWED creating valid debt with MemberA2', () =>
    expectAllow(fsRequest('PATCH', 'debiti/deb_new_ok', {
      token: memberA.token,
      body: { casaId: 'casa_a', creditoreId: memberA.uid, debitoreId: memberA2.uid, importo: 12.5, descrizione: 'Pizza', saldato: false }
    }), 'memberA create valid debt'));
  await check('MemberA DENIED creating debt with cross-house MemberB', () =>
    expectDeny(fsRequest('PATCH', 'debiti/deb_cross', {
      token: memberA.token,
      body: { casaId: 'casa_a', creditoreId: memberA.uid, debitoreId: memberB.uid, importo: 10, descrizione: 'Cross', saldato: false }
    }), 'memberA create cross-house debt'));
  await check('MemberA3 (unrelated roommate) DENIED updating deb_a1', () =>
    expectDeny(fsRequest('PATCH', 'debiti/deb_a1', {
      token: memberA3.token,
      body: { casaId: 'casa_a', creditoreId: memberA.uid, debitoreId: memberA2.uid, importo: 999, descrizione: 'Tampered', saldato: true }
    }), 'memberA3 tamper deb_a1'));
  await check('MemberA2 (debtor) DENIED shrinking importo on deb_a1', () =>
    expectDeny(fsRequest('PATCH', 'debiti/deb_a1', {
      token: memberA2.token,
      body: { casaId: 'casa_a', creditoreId: memberA.uid, debitoreId: memberA2.uid, importo: 0.01, descrizione: 'Bolletta luce', saldato: false }
    }), 'memberA2 shrink importo'));
  await check('MemberA2 (debtor) ALLOWED settling deb_a1 without changing importo', () =>
    expectAllow(fsRequest('PATCH', 'debiti/deb_a1', {
      token: memberA2.token,
      body: { casaId: 'casa_a', creditoreId: memberA.uid, debitoreId: memberA2.uid, importo: 25.5, descrizione: 'Bolletta luce', saldato: true }
    }), 'memberA2 settle deb_a1'));
  await check('MemberA (creditor) ALLOWED updating importo on deb_a1', () =>
    expectAllow(fsRequest('PATCH', 'debiti/deb_a1', {
      token: memberA.token,
      body: { casaId: 'casa_a', creditoreId: memberA.uid, debitoreId: memberA2.uid, importo: 30.0, descrizione: 'Bolletta luce rettificata', saldato: false }
    }), 'memberA update importo'));
  await check('AdminA DENIED creating mismatched /inviti/WRONG1 for casa_a', () =>
    expectDeny(fsRequest('PATCH', 'inviti/WRONG1', {
      token: adminA.token,
      body: { casaId: 'casa_a', nomeCasa: 'Casa Alpha', creatoreId: adminA.uid }
    }), 'adminA create mismatched invite'));
  await check('MemberA (already housed) DENIED creating orphan house', () =>
    expectDeny(fsRequest('PATCH', 'case/casa_orphan', {
      token: memberA.token,
      body: { nome: 'Orphan', codiceUnivoco: 'ORPH99', creatoreId: memberA.uid, adminUid: memberA.uid }
    }), 'memberA create orphan house'));
  await check('ExMemberA (homeless) ALLOWED creating a new house', () =>
    expectAllow(fsRequest('PATCH', 'case/casa_fresh', {
      token: exMemberA.token,
      body: { nome: 'Casa Nuova', codiceUnivoco: 'NEW123', creatoreId: exMemberA.uid, adminUid: exMemberA.uid }
    }), 'exMemberA create fresh house'));

  // 8. DOCUMENT URL INTEGRITY
  await check('MemberA DENIED creating document with javascript: URL', () =>
    expectDeny(fsRequest('PATCH', 'documenti/doc_xss', {
      token: memberA.token,
      body: { casaId: 'casa_a', caricatoDa: memberA.uid, nome: 'Bad.pdf', categoria: 'altro', fileUrl: 'javascript:alert(1)', dimensioneBytes: 500 }
    }), 'memberA create xss doc'));
  await check('MemberA DENIED hijacking fileUrl on existing doc_a1', () =>
    expectDeny(fsRequest('PATCH', 'documenti/doc_a1', {
      token: memberA.token,
      body: { casaId: 'casa_a', caricatoDa: memberA.uid, nome: 'Contratto affitto.pdf', categoria: 'contratti', fileUrl: 'https://evil.example/phish.pdf', dimensioneBytes: 102400 }
    }), 'memberA hijack fileUrl'));
  await check('MemberA ALLOWED renaming doc_a1 with immutable fileUrl', () =>
    expectAllow(fsRequest('PATCH', 'documenti/doc_a1', {
      token: memberA.token,
      body: { casaId: 'casa_a', caricatoDa: memberA.uid, nome: 'Contratto 2026.pdf', categoria: 'contratti', fileUrl: 'https://example.com/contratto.pdf', dimensioneBytes: 102400 }
    }), 'memberA rename doc_a1'));

  // 9. NOTICE BOARD (BACHECA & CALENDARIO) AUTHOR-IMPERSONATION & DELETE INTEGRITY
  await check('MemberA2 (non-author, non-admin) DENIED editing MemberA note', () =>
    expectDeny(fsRequest('PATCH', 'note/nota_a1', {
      token: memberA2.token,
      body: { casaId: 'casa_a', autoreId: memberA.uid, titolo: 'Falso avviso', contenuto: 'Modificato da terzi' }
    }), 'memberA2 impersonate memberA note'));
  await check('MemberA (author) ALLOWED editing own note', () =>
    expectAllow(fsRequest('PATCH', 'note/nota_a1', {
      token: memberA.token,
      body: { casaId: 'casa_a', autoreId: memberA.uid, titolo: 'Lettura contatore', contenuto: 'Aggiornato alle 10' }
    }), 'memberA edit own note'));
  await check('MemberA2 (non-author, non-admin) DENIED deleting MemberA note', () =>
    expectDeny(fsRequest('DELETE', 'note/nota_a1', { token: memberA2.token }), 'memberA2 delete memberA note'));
  await check('AdminA ALLOWED deleting MemberA note', () =>
    expectAllow(fsRequest('DELETE', 'note/nota_a1', { token: adminA.token }), 'adminA delete memberA note'));

  const failed = results.filter((r) => !r.pass);
  console.log(`\n[SUMMARY] ${results.length - failed.length}/${results.length} Firestore Emulator Security Rules checks passed.`);
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
