#!/usr/bin/env node
/**
 * scripts/e2e-seed.mjs
 * Deterministic E2E fixture generator and Firebase Emulator / Mock seeder for HouseHelper.
 * Pure ASCII only. Uses Node 24 native ESM and global fetch() with zero npm dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_PROJECT_ID = 'househelper-12050';
export const DEFAULT_AUTH_HOST = '127.0.0.1:9099';
export const DEFAULT_FIRESTORE_HOST = '127.0.0.1:8080';
export const E2E_DEFAULT_PASSWORD = process.env.E2E_TEST_PASSWORD || 'password123';

function formatIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(baseDate, days) {
  const next = new Date(baseDate.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function buildFixtures(referenceDate = new Date()) {
  const now = new Date(referenceDate.getTime());
  const todayStr = formatIsoDate(now);
  const plus3DaysStr = formatIsoDate(addDays(now, 3));
  const minus2DaysStr = formatIsoDate(addDays(now, -2));
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const users = {
    alice: {
      uid: 'uid_alice',
      email: 'alice@househelper.test',
      password: E2E_DEFAULT_PASSWORD,
      username: 'Alice',
      emailVerified: true,
      casaId: 'casa_alpha'
    },
    bob: {
      uid: 'uid_bob',
      email: 'bob@househelper.test',
      password: E2E_DEFAULT_PASSWORD,
      username: 'Bob',
      emailVerified: true,
      casaId: 'casa_alpha'
    },
    carol: {
      uid: 'uid_carol',
      email: 'carol@househelper.test',
      password: E2E_DEFAULT_PASSWORD,
      username: 'Carol',
      emailVerified: true,
      casaId: 'casa_beta'
    },
    unhomed: {
      uid: 'uid_unhomed',
      email: 'unhomed@househelper.test',
      password: E2E_DEFAULT_PASSWORD,
      username: 'Unhomed',
      emailVerified: true,
      casaId: null
    },
    unverified: {
      uid: 'uid_unverified',
      email: 'unverified@househelper.test',
      password: E2E_DEFAULT_PASSWORD,
      username: 'Unverified',
      emailVerified: false,
      casaId: null
    }
  };

  const collections = {
    utenti: {
      uid_alice: {
        username: 'Alice',
        email: users.alice.email,
        casaId: 'casa_alpha',
        inVacanza: false,
        vacanzaInizio: null,
        vacanzaFine: null,
        emailVerified: true,
        createdAt: threeDaysAgo.toISOString()
      },
      uid_bob: {
        username: 'Bob',
        email: users.bob.email,
        casaId: 'casa_alpha',
        inVacanza: false,
        vacanzaInizio: null,
        vacanzaFine: null,
        emailVerified: true,
        createdAt: threeDaysAgo.toISOString()
      },
      uid_carol: {
        username: 'Carol',
        email: users.carol.email,
        casaId: 'casa_beta',
        inVacanza: false,
        vacanzaInizio: null,
        vacanzaFine: null,
        emailVerified: true,
        createdAt: threeDaysAgo.toISOString()
      },
      uid_unhomed: {
        username: 'Unhomed',
        email: users.unhomed.email,
        casaId: null,
        inVacanza: false,
        vacanzaInizio: null,
        vacanzaFine: null,
        emailVerified: true,
        createdAt: threeDaysAgo.toISOString()
      },
      uid_unverified: {
        username: 'Unverified',
        email: users.unverified.email,
        casaId: null,
        inVacanza: false,
        vacanzaInizio: null,
        vacanzaFine: null,
        emailVerified: false,
        createdAt: threeDaysAgo.toISOString()
      }
    },
    case: {
      casa_alpha: {
        nome: 'Casa Aurora',
        codiceUnivoco: 'AUR042',
        creatoreId: 'uid_alice',
        impostazioniTurni: {
          giornoPreferito: 'Sabato',
          frequenza: 'settimanale'
        },
        createdAt: threeDaysAgo.toISOString()
      },
      casa_beta: {
        nome: 'Casa Beta',
        codiceUnivoco: 'BET999',
        creatoreId: 'uid_carol',
        impostazioniTurni: {
          giornoPreferito: 'Domenica',
          frequenza: 'settimanale'
        },
        createdAt: threeDaysAgo.toISOString()
      }
    },
    turni: {
      turno_alpha_today: {
        casaId: 'casa_alpha',
        utenteId: 'uid_alice',
        nomi: ['Alice'],
        luoghi: ['Cucina'],
        mansione: 'Pulizia Cucina',
        data: todayStr,
        fasciaOraria: ['09:00 - 10:00'],
        procedura: ['Sgrassare piano cottura', 'Svuotare cestino'],
        checklist: [
          {
            id: 'chk_1',
            text: 'Pulire fornelli',
            completed: true,
            completedBy: 'Alice',
            completedAt: oneHourAgo.toISOString()
          },
          {
            id: 'chk_2',
            text: 'Lavare pavimento',
            completed: false
          }
        ],
        completato: false,
        createdAt: threeDaysAgo.toISOString()
      },
      turno_alpha_future: {
        casaId: 'casa_alpha',
        utenteId: 'uid_bob',
        nomi: ['Bob'],
        luoghi: ['Bagno'],
        mansione: 'Pulizia Bagno',
        data: plus3DaysStr,
        fasciaOraria: ['18:00 - 19:00'],
        procedura: ['Igienizzare sanitari'],
        checklist: [
          {
            id: 'chk_3',
            text: 'Pulire specchio',
            completed: false
          }
        ],
        completato: false,
        createdAt: threeDaysAgo.toISOString()
      },
      turno_alpha_past: {
        casaId: 'casa_alpha',
        utenteId: 'uid_alice',
        nomi: ['Alice'],
        luoghi: ['Salotto'],
        mansione: 'Riordino Salotto',
        data: minus2DaysStr,
        fasciaOraria: ['15:00 - 16:00'],
        procedura: ['Passare aspirapolvere'],
        checklist: [],
        completato: true,
        createdAt: threeDaysAgo.toISOString()
      },
      turno_beta_isolated: {
        casaId: 'casa_beta',
        utenteId: 'uid_carol',
        nomi: ['Carol'],
        luoghi: ['Terrazzo Beta'],
        mansione: 'Turno Riservato Beta',
        data: todayStr,
        fasciaOraria: ['10:00 - 11:00'],
        procedura: [],
        checklist: [],
        completato: false,
        createdAt: threeDaysAgo.toISOString()
      }
    },
    debiti: {
      debito_alpha_recent: {
        casaId: 'casa_alpha',
        importo: 25.0,
        descrizione: 'Spesa supermercato',
        creditoreId: 'uid_alice',
        debitoreId: 'uid_bob',
        createdAt: oneHourAgo.toISOString()
      },
      debito_alpha_older: {
        casaId: 'casa_alpha',
        importo: 10.0,
        descrizione: 'Bolletta gas',
        creditoreId: 'uid_bob',
        debitoreId: 'uid_alice',
        createdAt: threeDaysAgo.toISOString()
      },
      debito_beta_isolated: {
        casaId: 'casa_beta',
        importo: 99.0,
        descrizione: 'Spesa Beta Riservata',
        creditoreId: 'uid_carol',
        debitoreId: 'uid_other_beta',
        createdAt: oneHourAgo.toISOString()
      }
    },
    spesa: {
      spesa_alpha_latte: {
        casaId: 'casa_alpha',
        nome: 'Latte',
        comprato: false,
        autoreId: 'uid_alice',
        createdAt: oneHourAgo.toISOString()
      },
      spesa_alpha_detersivo: {
        casaId: 'casa_alpha',
        nome: 'Detersivo piatti',
        comprato: false,
        autoreId: 'uid_bob',
        createdAt: oneHourAgo.toISOString()
      },
      spesa_alpha_pane: {
        casaId: 'casa_alpha',
        nome: 'Pane',
        comprato: true,
        autoreId: 'uid_alice',
        createdAt: threeDaysAgo.toISOString()
      },
      spesa_beta_isolated: {
        casaId: 'casa_beta',
        nome: 'Prodotto Beta Segreto',
        comprato: false,
        autoreId: 'uid_carol',
        createdAt: oneHourAgo.toISOString()
      }
    },
    note: {
      nota_alpha_urgente: {
        casaId: 'casa_alpha',
        autoreId: 'uid_alice',
        titolo: 'Lettura contatore acqua',
        contenuto: 'Ricordate di inviare la foto del contatore entro venerdi.',
        priorita: 'urgente',
        data: todayStr,
        isEvento: false,
        createdAt: oneHourAgo.toISOString()
      },
      nota_alpha_routine: {
        casaId: 'casa_alpha',
        autoreId: 'uid_bob',
        titolo: 'Sacchi raccolta differenziata',
        contenuto: 'Nuovi sacchi gialli nel ripostiglio.',
        priorita: 'info',
        data: null,
        isEvento: false,
        createdAt: threeDaysAgo.toISOString()
      },
      evento_alpha_today: {
        casaId: 'casa_alpha',
        autoreId: 'uid_alice',
        titolo: 'Cena coinquilini',
        contenuto: 'Serata pizza in casa alle 20:30.',
        categoria: 'Cena / Festa',
        data: todayStr,
        isEvento: true,
        priorita: 'info',
        createdAt: oneHourAgo.toISOString()
      },
      nota_beta_isolated: {
        casaId: 'casa_beta',
        autoreId: 'uid_carol',
        titolo: 'Avviso Beta Segreto',
        contenuto: 'Solo per Casa Beta.',
        priorita: 'importante',
        data: todayStr,
        isEvento: false,
        createdAt: oneHourAgo.toISOString()
      }
    },
    documenti: {
      doc_alpha_contratto: {
        casaId: 'casa_alpha',
        caricatoDa: 'uid_alice',
        caricatoDaNome: 'Alice',
        nome: 'Contratto Affitto 2026',
        categoria: 'Contratti',
        note: 'Contratto registrato 4+4',
        url: 'https://example.com/househelper/contratto-2026.pdf',
        fileUrl: 'https://example.com/househelper/contratto-2026.pdf',
        storagePath: 'case/casa_alpha/documenti/contratto-2026.pdf',
        dimensione: 122880,
        dimensioneBytes: 122880,
        dimensioneFormatted: '120 KB',
        formato: 'PDF',
        dataCaricamento: threeDaysAgo.toISOString()
      },
      doc_alpha_bolletta: {
        casaId: 'casa_alpha',
        caricatoDa: 'uid_bob',
        caricatoDaNome: 'Bob',
        nome: 'Bolletta Luce Ottobre',
        categoria: 'Bollette',
        note: 'Scadenza fine mese',
        url: 'https://example.com/househelper/bolletta-luce.pdf',
        fileUrl: 'https://example.com/househelper/bolletta-luce.pdf',
        storagePath: 'case/casa_alpha/documenti/bolletta-luce.pdf',
        dimensione: 46080,
        dimensioneBytes: 46080,
        dimensioneFormatted: '45 KB',
        formato: 'PDF',
        dataCaricamento: oneHourAgo.toISOString()
      },
      doc_beta_isolated: {
        casaId: 'casa_beta',
        caricatoDa: 'uid_carol',
        caricatoDaNome: 'Carol',
        nome: 'Documento Riservato Beta',
        categoria: 'Altro',
        note: 'Privato Beta',
        url: 'https://example.com/househelper/beta.pdf',
        fileUrl: 'https://example.com/househelper/beta.pdf',
        storagePath: 'case/casa_beta/documenti/beta.pdf',
        dimensione: 10240,
        dimensioneBytes: 10240,
        dimensioneFormatted: '10 KB',
        formato: 'PDF',
        dataCaricamento: oneHourAgo.toISOString()
      }
    },
    contatti: {
      contatto_alpha_emergenza: {
        casaId: 'casa_alpha',
        nome: '118 Emergenza',
        categoria: 'Emergenza',
        telefono: '+39 118',
        email: null,
        note: 'Numero unico emergenze sanitarie',
        creatoDa: 'uid_alice',
        createdAt: threeDaysAgo.toISOString()
      },
      contatto_alpha_idraulico: {
        casaId: 'casa_alpha',
        nome: 'Mario Rossi Idraulico',
        categoria: 'Idraulico',
        telefono: '+39 340 1234567',
        email: 'mario.idraulico@example.com',
        note: 'Interventi urgenti caldaia',
        creatoDa: 'uid_bob',
        createdAt: oneHourAgo.toISOString()
      },
      contatto_beta_isolated: {
        casaId: 'casa_beta',
        nome: 'Contatto Segreto Beta',
        categoria: 'Proprietario',
        telefono: '+39 333 9999999',
        email: null,
        note: 'Solo Beta',
        creatoDa: 'uid_carol',
        createdAt: oneHourAgo.toISOString()
      }
    }
  };

  return {
    meta: {
      projectId: DEFAULT_PROJECT_ID,
      today: todayStr,
      generatedAt: now.toISOString(),
      calendarCollection: 'note'
    },
    users,
    collections
  };
}

const ISO_DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const TIMESTAMP_FIELD_NAMES = new Set(['createdAt']);

export function toFirestoreValue(val, keyName = '') {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    if (TIMESTAMP_FIELD_NAMES.has(keyName) && ISO_DATE_TIME_REGEX.test(val)) {
      return { timestampValue: val };
    }
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => toFirestoreValue(item))
      }
    };
  }
  if (typeof val === 'object') {
    return {
      mapValue: {
        fields: toFirestoreFields(val)
      }
    };
  }
  return { stringValue: String(val) };
}

export function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toFirestoreValue(v, k);
  }
  return fields;
}

function replaceUidsDeep(value, uidMap) {
  if (typeof value === 'string') {
    return uidMap[value] || value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceUidsDeep(item, uidMap));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = replaceUidsDeep(v, uidMap);
    }
    return out;
  }
  return value;
}

export async function probeEmulator({
  authHost = DEFAULT_AUTH_HOST,
  firestoreHost = DEFAULT_FIRESTORE_HOST,
  timeoutMs = 1500
} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const [authRes, fsRes] = await Promise.all([
      fetch(`http://${authHost}/`, { signal: controller.signal }).catch(() => null),
      fetch(`http://${firestoreHost}/`, { signal: controller.signal }).catch(() => null)
    ]);
    return {
      authReachable: Boolean(authRes),
      firestoreReachable: Boolean(fsRes),
      ready: Boolean(authRes && fsRes)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonOrThrow(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}: ${text}`);
  }
  return data;
}

export async function seedEmulator({
  projectId = DEFAULT_PROJECT_ID,
  authHost = DEFAULT_AUTH_HOST,
  firestoreHost = DEFAULT_FIRESTORE_HOST,
  fixtures = buildFixtures()
} = {}) {
  const probe = await probeEmulator({ authHost, firestoreHost });
  if (!probe.ready) {
    throw new Error(
      `Firebase Emulators not reachable (auth=${authHost} [${probe.authReachable}], firestore=${firestoreHost} [${probe.firestoreReachable}]). Start emulators first with: firebase emulators:start --only auth,firestore`
    );
  }

  // 1. Clear existing Auth and Firestore emulator state
  await fetchJsonOrThrow(
    `http://${authHost}/emulator/v1/projects/${projectId}/accounts`,
    { method: 'DELETE' }
  );
  await fetchJsonOrThrow(
    `http://${firestoreHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
    { method: 'DELETE' }
  );

  // 2. Create Auth users and capture real UIDs
  const uidMap = {};
  const createdUsers = {};
  for (const [key, user] of Object.entries(fixtures.users)) {
    const signUpRes = await fetchJsonOrThrow(
      `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          displayName: user.username,
          returnSecureToken: true
        })
      }
    );

    const realUid = signUpRes.localId;
    uidMap[user.uid] = realUid;

    if (user.emailVerified) {
      await fetchJsonOrThrow(
        `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:update?key=fake-api-key`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken: signUpRes.idToken,
            emailVerified: true
          })
        }
      );
    }

    createdUsers[key] = {
      ...user,
      uid: realUid
    };
  }

  // 3. Remap UIDs across Firestore collections and seed documents as owner
  const remappedCollections = {};
  let docCount = 0;

  for (const [collName, docs] of Object.entries(fixtures.collections)) {
    remappedCollections[collName] = {};
    for (const [rawDocId, rawData] of Object.entries(docs)) {
      const docId = collName === 'utenti' ? (uidMap[rawDocId] || rawDocId) : rawDocId;
      const docData = replaceUidsDeep(rawData, uidMap);
      remappedCollections[collName][docId] = docData;

      const patchUrl = `http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents/${collName}/${docId}`;
      await fetchJsonOrThrow(patchUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer owner'
        },
        body: JSON.stringify({
          fields: toFirestoreFields(docData)
        })
      });
      docCount += 1;
    }
  }

  return {
    mode: 'emulator',
    projectId,
    authHost,
    firestoreHost,
    usersCount: Object.keys(createdUsers).length,
    documentsCount: docCount,
    uidMap,
    fixtures: {
      meta: fixtures.meta,
      users: createdUsers,
      collections: remappedCollections
    }
  };
}

export function writeMockFixtures(outPath, fixtures = buildFixtures()) {
  const resolved = path.resolve(outPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(fixtures, null, 2)}\n`, 'utf8');
  return resolved;
}

function parseArgs(argv) {
  const opts = {
    mode: 'auto',
    projectId: DEFAULT_PROJECT_ID,
    authHost: DEFAULT_AUTH_HOST,
    firestoreHost: DEFAULT_FIRESTORE_HOST,
    json: false,
    out: ''
  };

  for (const arg of argv) {
    if (arg.startsWith('--mode=')) opts.mode = arg.slice('--mode='.length);
    else if (arg.startsWith('--project-id=')) opts.projectId = arg.slice('--project-id='.length);
    else if (arg.startsWith('--auth-host=')) opts.authHost = arg.slice('--auth-host='.length);
    else if (arg.startsWith('--firestore-host=')) opts.firestoreHost = arg.slice('--firestore-host='.length);
    else if (arg.startsWith('--out=')) opts.out = arg.slice('--out='.length);
    else if (arg === '--json') opts.json = true;
  }

  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const fixtures = buildFixtures();

  let selectedMode = opts.mode;
  if (selectedMode === 'auto') {
    const probe = await probeEmulator({
      authHost: opts.authHost,
      firestoreHost: opts.firestoreHost
    });
    selectedMode = probe.ready ? 'emulator' : 'mock';
  }

  if (selectedMode === 'emulator') {
    const result = await seedEmulator({
      projectId: opts.projectId,
      authHost: opts.authHost,
      firestoreHost: opts.firestoreHost,
      fixtures
    });
    if (opts.out) {
      writeMockFixtures(opts.out, result.fixtures);
    }
    if (opts.json) {
      console.log(JSON.stringify(result.fixtures, null, 2));
    } else {
      console.log(
        `[SEED] Emulator seeded: project=${result.projectId}, users=${result.usersCount}, docs=${result.documentsCount}`
      );
    }
    return;
  }

  if (selectedMode === 'mock') {
    if (opts.out) {
      const savedPath = writeMockFixtures(opts.out, fixtures);
      if (!opts.json) {
        console.log(`[SEED] Mock fixtures written to ${savedPath}`);
      }
    }
    if (opts.json || !opts.out) {
      console.log(JSON.stringify(fixtures, null, 2));
    }
    return;
  }

  console.error(`[ERROR] Unknown --mode="${opts.mode}". Expected emulator | mock | auto.`);
  process.exit(1);
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isCli) {
  main().catch((err) => {
    console.error(`[SEED ERROR] ${err.message}`);
    process.exit(1);
  });
}
