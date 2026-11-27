#!/usr/bin/env node
/**
 * scripts/test-e2e-multiuser-lifecycle.mjs
 * Complete multi-user, two-household lifecycle & concurrency verification against
 * real Firebase Auth + Cloud Firestore Emulators (loaded with repo firestore.rules).
 *
 * Actors:
 *   - adminA (House A administrator)
 *   - memberA1 (House A member -> approved -> later kicked)
 *   - memberA2 (House A member -> approved -> later leaves)
 *   - externalB (House B administrator / cross-tenant adversary)
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

async function clearEmulators() {
  const r1 = await fetch(`http://${FS_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' });
  const r2 = await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
  assert.equal(r1.ok, true, 'Clear Firestore emulator failed');
  assert.equal(r2.ok, true, 'Clear Auth emulator failed');
}

async function signUpUnverified(email, password = 'Password123!') {
  const res = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const data = await res.json();
  assert.equal(res.ok, true, `signUp failed for ${email}: ${JSON.stringify(data)}`);
  return { uid: data.localId, token: data.idToken, email, password };
}

async function verifyAndRefreshToken(user) {
  const sendRes = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: user.token })
  });
  assert.equal(sendRes.ok, true, `sendOobCode failed for ${user.email}`);

  const oobRes = await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/oobCodes`);
  const oobData = await oobRes.json();
  const match = (oobData.oobCodes || []).filter((c) => c.email === user.email && c.requestType === 'VERIFY_EMAIL').pop();
  assert.ok(match?.oobCode, `Missing VERIFY_EMAIL oobCode for ${user.email}`);

  const applyRes = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:update?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oobCode: match.oobCode })
  });
  assert.equal(applyRes.ok, true, `apply oobCode failed for ${user.email}`);

  const signInRes = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true })
  });
  const signInData = await signInRes.json();
  assert.equal(signInRes.ok, true, `re-signIn failed for ${user.email}`);
  return { ...user, token: signInData.idToken };
}

async function fsReq(method, docPath, { token = null, body = null } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${FS_BASE}/${docPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(toFsDoc(body)) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, ok: res.ok, text, json };
}

const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log(`[PASS] ${name}`);
  } catch (err) {
    results.push({ name, pass: false, error: err.message });
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

async function expectAllow(p, label) {
  const r = await p;
  assert.equal(r.ok, true, `${label}: expected ALLOW, got ${r.status} ${r.text}`);
  return r;
}

async function expectDeny(p, label) {
  const r = await p;
  assert.equal(r.status, 403, `${label}: expected DENY (403), got ${r.status} ${r.text}`);
  return r;
}

async function main() {
  await clearEmulators();

  // 1. SIGNUP (UNVERIFIED) + DIRECT FIRESTORE BLOCKING
  let adminA = await signUpUnverified('admin-a@lifecycle.test');
  let memberA1 = await signUpUnverified('member-a1@lifecycle.test');
  let memberA2 = await signUpUnverified('member-a2@lifecycle.test');
  let externalB = await signUpUnverified('external-b@lifecycle.test');

  await step('1. Unverified users create initial null profiles but are DENIED creating houses', async () => {
    for (const [u, name] of [[adminA, 'AdminA'], [memberA1, 'MemberA1'], [memberA2, 'MemberA2'], [externalB, 'ExternalB']]) {
      await expectAllow(fsReq('PATCH', `utenti/${u.uid}`, {
        token: u.token,
        body: { username: name, email: u.email, casaId: null, ruoloCasa: null, statoMembro: null }
      }), `${name} initial profile`);
    }
    await expectDeny(fsReq('PATCH', 'case/casa_a', {
      token: adminA.token,
      body: { nome: 'Casa Alpha', codiceUnivoco: 'CODEA1', creatoreId: adminA.uid, adminUid: adminA.uid }
    }), 'unverified adminA create house');
  });

  // 2. EMAIL VERIFICATION + TOKEN REFRESH -> CREATE TWO HOUSES
  adminA = await verifyAndRefreshToken(adminA);
  memberA1 = await verifyAndRefreshToken(memberA1);
  memberA2 = await verifyAndRefreshToken(memberA2);
  externalB = await verifyAndRefreshToken(externalB);

  await step('2. Verified adminA and externalB create House A and House B with invite pointers', async () => {
    await expectAllow(fsReq('PATCH', 'case/casa_a', {
      token: adminA.token,
      body: { nome: 'Casa Alpha', codiceUnivoco: 'CODEA1', creatoreId: adminA.uid, adminUid: adminA.uid }
    }), 'adminA create casa_a');
    await expectAllow(fsReq('PATCH', 'inviti/CODEA1', {
      token: adminA.token,
      body: { casaId: 'casa_a', nomeCasa: 'Casa Alpha', creatoreId: adminA.uid }
    }), 'adminA create invite CODEA1');
    await expectAllow(fsReq('PATCH', `utenti/${adminA.uid}`, {
      token: adminA.token,
      body: { username: 'AdminA', email: adminA.email, casaId: 'casa_a', ruoloCasa: 'admin', statoMembro: 'active' }
    }), 'adminA attach casa_a');

    await expectAllow(fsReq('PATCH', 'case/casa_b', {
      token: externalB.token,
      body: { nome: 'Casa Beta', codiceUnivoco: 'CODEB2', creatoreId: externalB.uid, adminUid: externalB.uid }
    }), 'externalB create casa_b');
    await expectAllow(fsReq('PATCH', 'inviti/CODEB2', {
      token: externalB.token,
      body: { casaId: 'casa_b', nomeCasa: 'Casa Beta', creatoreId: externalB.uid }
    }), 'externalB create invite CODEB2');
    await expectAllow(fsReq('PATCH', `utenti/${externalB.uid}`, {
      token: externalB.token,
      body: { username: 'ExternalB', email: externalB.email, casaId: 'casa_b', ruoloCasa: 'admin', statoMembro: 'active' }
    }), 'externalB attach casa_b');
  });

  // 3. INVITE LOOKUP + JOIN (PENDING) + DENIAL OF SELF-APPROVAL & PRIVATE DATA
  await step('3. memberA1 & memberA2 resolve /inviti/CODEA1, join as pending, and are blocked until approved', async () => {
    await expectAllow(fsReq('GET', 'inviti/CODEA1', { token: memberA1.token }), 'memberA1 get invite');
    await expectDeny(fsReq('GET', 'case/casa_a', { token: memberA1.token }), 'unassigned memberA1 direct get casa_a');

    for (const [u, name] of [[memberA1, 'MemberA1'], [memberA2, 'MemberA2']]) {
      await expectAllow(fsReq('PATCH', `utenti/${u.uid}`, {
        token: u.token,
        body: { username: name, email: u.email, casaId: 'casa_a', ruoloCasa: 'member', statoMembro: 'pending' }
      }), `${name} join pending`);
    }

    await expectDeny(fsReq('PATCH', `utenti/${memberA1.uid}`, {
      token: memberA1.token,
      body: { username: 'MemberA1', email: memberA1.email, casaId: 'casa_a', ruoloCasa: 'member', statoMembro: 'active' }
    }), 'memberA1 self-approve');
    await expectDeny(fsReq('PATCH', 'debiti/deb_pending', {
      token: memberA1.token,
      body: { casaId: 'casa_a', creditoreId: adminA.uid, debitoreId: memberA1.uid, importo: 10, descrizione: 'Pending', saldato: false }
    }), 'pending memberA1 create debt');
  });

  // 4. ADMIN APPROVAL + CROSS-HOUSE ISOLATION
  await step('4. Non-admin cannot approve; adminA approves memberA1 and memberA2', async () => {
    await expectDeny(fsReq('PATCH', `utenti/${memberA2.uid}`, {
      token: memberA1.token,
      body: { username: 'MemberA2', email: memberA2.email, casaId: 'casa_a', ruoloCasa: 'member', statoMembro: 'active' }
    }), 'pending memberA1 approve memberA2');
    await expectDeny(fsReq('PATCH', `utenti/${memberA1.uid}`, {
      token: externalB.token,
      body: { username: 'MemberA1', email: memberA1.email, casaId: 'casa_a', ruoloCasa: 'member', statoMembro: 'active' }
    }), 'externalB approve memberA1');

    for (const [u, name] of [[memberA1, 'MemberA1'], [memberA2, 'MemberA2']]) {
      await expectAllow(fsReq('PATCH', `utenti/${u.uid}`, {
        token: adminA.token,
        body: { username: name, email: u.email, casaId: 'casa_a', ruoloCasa: 'member', statoMembro: 'active' }
      }), `adminA approve ${name}`);
    }
  });

  // 5. SHARED EXPENSE, TAMPERING DENIALS, SETTLEMENT & CONCURRENT MULTI-USER WRITES
  await step('5. Shared expense split, debtor protection, settlement, and concurrent multi-user writes', async () => {
    await expectAllow(fsReq('PATCH', 'debiti/deb_split_1', {
      token: adminA.token,
      body: { casaId: 'casa_a', creditoreId: adminA.uid, debitoreId: memberA1.uid, importo: 30.0, descrizione: 'Bolletta gas (Quota)', saldato: false }
    }), 'adminA create split debt 1');
    await expectAllow(fsReq('PATCH', 'debiti/deb_split_2', {
      token: adminA.token,
      body: { casaId: 'casa_a', creditoreId: adminA.uid, debitoreId: memberA2.uid, importo: 30.0, descrizione: 'Bolletta gas (Quota)', saldato: false }
    }), 'adminA create split debt 2');

    // Denied actions: debtor shrinking amount, unrelated roommate tampering, externalB reading
    await expectDeny(fsReq('PATCH', 'debiti/deb_split_1', {
      token: memberA1.token,
      body: { casaId: 'casa_a', creditoreId: adminA.uid, debitoreId: memberA1.uid, importo: 1.0, descrizione: 'Bolletta gas (Quota)', saldato: false }
    }), 'memberA1 shrink importo');
    await expectDeny(fsReq('PATCH', 'debiti/deb_split_1', {
      token: memberA2.token,
      body: { casaId: 'casa_a', creditoreId: adminA.uid, debitoreId: memberA1.uid, importo: 30.0, descrizione: 'Bolletta gas (Quota)', saldato: true }
    }), 'memberA2 tamper memberA1 debt');
    await expectDeny(fsReq('GET', 'debiti/deb_split_1', { token: externalB.token }), 'externalB read casa_a debt');

    // Concurrent multi-user operations in House A: settlement + grocery + chore simultaneously
    const [settleRes, groceryRes, choreRes] = await Promise.all([
      fsReq('PATCH', 'debiti/deb_split_1', {
        token: memberA1.token,
        body: { casaId: 'casa_a', creditoreId: adminA.uid, debitoreId: memberA1.uid, importo: 30.0, descrizione: 'Bolletta gas (Quota)', saldato: true }
      }),
      fsReq('PATCH', 'spesa/item_concurrent_1', {
        token: memberA2.token,
        body: { casaId: 'casa_a', nome: 'Latte parzialmente scremato', comprato: false }
      }),
      fsReq('PATCH', 'turni/turno_a1', {
        token: adminA.token,
        body: { casaId: 'casa_a', utenteId: adminA.uid, nomi: ['MemberA1'], luoghi: ['Cucina'], data: '2026-12-01', completato: false }
      })
    ]);
    assert.equal(settleRes.ok, true, `concurrent settle failed: ${settleRes.status}`);
    assert.equal(groceryRes.ok, true, `concurrent grocery failed: ${groceryRes.status}`);
    assert.equal(choreRes.ok, true, `concurrent chore failed: ${choreRes.status}`);

    // Verify externalB cannot read/modify House A chore or grocery
    await expectDeny(fsReq('GET', 'turni/turno_a1', { token: externalB.token }), 'externalB read casa_a chore');
    await expectDeny(fsReq('GET', 'spesa/item_concurrent_1', { token: externalB.token }), 'externalB read casa_a grocery');

    // MemberA1 completes the chore
    await expectAllow(fsReq('PATCH', 'turni/turno_a1', {
      token: memberA1.token,
      body: { casaId: 'casa_a', utenteId: adminA.uid, nomi: ['MemberA1'], luoghi: ['Cucina'], data: '2026-12-01', completato: true }
    }), 'memberA1 complete chore');
  });

  // 6. VOLUNTARY LEAVE (memberA2) + IMMEDIATE REVOCATION
  await step('6. memberA2 leaves House A and is immediately revoked from all House A data', async () => {
    await expectAllow(fsReq('PATCH', `utenti/${memberA2.uid}`, {
      token: memberA2.token,
      body: { username: 'MemberA2', email: memberA2.email, casaId: null, ruoloCasa: null, statoMembro: null }
    }), 'memberA2 leave casa_a');

    await expectDeny(fsReq('GET', 'case/casa_a', { token: memberA2.token }), 'ex-memberA2 get casa_a');
    await expectDeny(fsReq('GET', 'debiti/deb_split_2', { token: memberA2.token }), 'ex-memberA2 get debt');
    await expectDeny(fsReq('GET', 'turni/turno_a1', { token: memberA2.token }), 'ex-memberA2 get chore');
    await expectDeny(fsReq('GET', 'spesa/item_concurrent_1', { token: memberA2.token }), 'ex-memberA2 get grocery');
    await expectDeny(fsReq('GET', `utenti/${adminA.uid}`, { token: memberA2.token }), 'ex-memberA2 get adminA profile');
  });

  // 7. ADMIN KICK (memberA1) + IMMEDIATE REVOCATION
  await step('7. adminA kicks memberA1 and memberA1 is immediately revoked from all House A data', async () => {
    // Non-admin / external cannot kick
    await expectDeny(fsReq('PATCH', `utenti/${memberA1.uid}`, {
      token: externalB.token,
      body: { username: 'MemberA1', email: memberA1.email, casaId: null, ruoloCasa: null, statoMembro: null }
    }), 'externalB kick memberA1');

    // AdminA kicks memberA1
    await expectAllow(fsReq('PATCH', `utenti/${memberA1.uid}`, {
      token: adminA.token,
      body: { username: 'MemberA1', email: memberA1.email, casaId: null, ruoloCasa: null, statoMembro: null }
    }), 'adminA kick memberA1');

    await expectDeny(fsReq('GET', 'case/casa_a', { token: memberA1.token }), 'kicked memberA1 get casa_a');
    await expectDeny(fsReq('GET', 'debiti/deb_split_1', { token: memberA1.token }), 'kicked memberA1 get debt');
    await expectDeny(fsReq('GET', 'turni/turno_a1', { token: memberA1.token }), 'kicked memberA1 get chore');
    await expectDeny(fsReq('GET', 'spesa/item_concurrent_1', { token: memberA1.token }), 'kicked memberA1 get grocery');
    await expectDeny(fsReq('GET', `utenti/${adminA.uid}`, { token: memberA1.token }), 'kicked memberA1 get adminA profile');
  });

  const failed = results.filter((r) => !r.pass);
  console.log(`\n[SUMMARY] ${results.length - failed.length}/${results.length} multi-user two-household lifecycle checks passed.`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
