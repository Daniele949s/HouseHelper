#!/usr/bin/env node
/**
 * Idempotent production audit & backfill for /case -> /inviti/{codice}.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node scripts/backfill-invites.mjs --dry-run
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node scripts/backfill-invites.mjs --apply
 *
 * Checks every document in /case, verifies that /inviti/{codiceUnivoco} exists
 * and points to the exact same casaId, and optionally creates missing invite docs.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'househelper-12050';
const APPLY = process.argv.includes('--apply');
const CRED_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!CRED_PATH || !fs.existsSync(CRED_PATH)) {
  console.error('[ERROR] Set GOOGLE_APPLICATION_CREDENTIALS to a valid Firebase Service Account JSON file.');
  process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(CRED_PATH, 'utf8'));

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claim}`);
  const sig = signer.sign(sa.private_key, 'base64url');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claim}.${sig}`,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(`OAuth token exchange failed: ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

async function listCollection(token, collectionName) {
  const docs = [];
  let pageToken = '';
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}`;
  do {
    const url = pageToken ? `${base}?pageSize=200&pageToken=${encodeURIComponent(pageToken)}` : `${base}?pageSize=200`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(`Failed listing ${collectionName}: ${JSON.stringify(data)}`);
    if (Array.isArray(data.documents)) docs.push(...data.documents);
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

async function createInvite(token, code, payload) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/inviti?documentId=${encodeURIComponent(code)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        casaId: { stringValue: payload.casaId },
        nomeCasa: { stringValue: payload.nomeCasa },
        creatoreId: { stringValue: payload.creatoreId },
        creatoIl: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed creating /inviti/${code}: ${res.status} ${txt}`);
  }
}

const token = await getAccessToken();
const houses = await listCollection(token, 'case');
const invites = await listCollection(token, 'inviti');

const inviteMap = new Map();
for (const inv of invites) {
  const code = inv.name.split('/').pop();
  inviteMap.set(code, inv.fields?.casaId?.stringValue || null);
}

let ok = 0;
let missing = 0;
let mismatched = 0;
let backfilled = 0;

for (const h of houses) {
  const casaId = h.name.split('/').pop();
  const code = (h.fields?.codiceUnivoco?.stringValue || '').trim().toUpperCase();
  const nomeCasa = h.fields?.nome?.stringValue || 'Casa';
  const creatoreId = h.fields?.adminUid?.stringValue || h.fields?.creatoreId?.stringValue || '';

  if (!code) {
    console.warn(`[WARN] House ${casaId} has no codiceUnivoco`);
    continue;
  }

  if (!inviteMap.has(code)) {
    missing += 1;
    console.log(`[MISSING] /inviti/${code} -> casaId=${casaId} (${nomeCasa})`);
    if (APPLY) {
      await createInvite(token, code, { casaId, nomeCasa, creatoreId });
      backfilled += 1;
      console.log(`  [CREATED] /inviti/${code}`);
    }
  } else if (inviteMap.get(code) !== casaId) {
    mismatched += 1;
    console.error(`[MISMATCH] /inviti/${code} points to ${inviteMap.get(code)}, expected ${casaId}`);
  } else {
    ok += 1;
  }
}

console.log(
  `\n[SUMMARY] mode=${APPLY ? 'APPLY' : 'DRY-RUN'} houses=${houses.length} invites=${invites.length} ok=${ok} missing=${missing} backfilled=${backfilled} mismatched=${mismatched}`
);
if (mismatched > 0 || (!APPLY && missing > 0)) {
  process.exit(2);
}
