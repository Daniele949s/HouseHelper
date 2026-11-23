#!/usr/bin/env node
/**
 * scripts/e2e-playwright.mjs
 * Main E2E Playwright-CLI test runner for HouseHelper (Flows F1-F10).
 * Pure ASCII only.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TestTracker,
  createPlaywrightClient,
  startCraDevServer,
  startStaticBuildServer,
  waitForHttpReady
} from './e2e-lib.mjs';
import {
  DEFAULT_AUTH_HOST,
  DEFAULT_FIRESTORE_HOST,
  DEFAULT_PROJECT_ID,
  buildFixtures,
  probeEmulator,
  seedEmulator
} from './e2e-seed.mjs';

import { runF1 } from './e2e-flows/f1.mjs';
import { runF2 } from './e2e-flows/f2.mjs';
import { runF3 } from './e2e-flows/f3.mjs';
import { runF4 } from './e2e-flows/f4.mjs';
import { runF5 } from './e2e-flows/f5.mjs';
import { runF6 } from './e2e-flows/f6.mjs';
import { runF7 } from './e2e-flows/f7.mjs';
import { runF8 } from './e2e-flows/f8.mjs';
import { runF9 } from './e2e-flows/f9.mjs';
import { runF10 } from './e2e-flows/f10.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const FLOW_RUNNERS = {
  F1: runF1,
  F2: runF2,
  F3: runF3,
  F4: runF4,
  F5: runF5,
  F6: runF6,
  F7: runF7,
  F8: runF8,
  F9: runF9,
  F10: runF10
};

function parseCliArgs(argv) {
  const opts = {
    url: 'http://127.0.0.1:3000',
    phase: 'all',
    flows: null,
    startServer: false,
    serveBuild: false,
    mode: 'auto',
    strictA11y: false,
    skipKnownPreRemediation: false,
    headed: false,
    authHost: DEFAULT_AUTH_HOST,
    firestoreHost: DEFAULT_FIRESTORE_HOST,
    projectId: DEFAULT_PROJECT_ID
  };

  for (const arg of argv) {
    if (arg.startsWith('--url=')) opts.url = arg.slice('--url='.length).replace(/\/$/, '');
    else if (arg.startsWith('--phase=')) opts.phase = arg.slice('--phase='.length).toLowerCase();
    else if (arg.startsWith('--flows=')) {
      opts.flows = arg
        .slice('--flows='.length)
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
    } else if (arg === '--start-server') opts.startServer = true;
    else if (arg === '--serve-build') opts.serveBuild = true;
    else if (arg.startsWith('--mode=')) opts.mode = arg.slice('--mode='.length).toLowerCase();
    else if (arg === '--strict-a11y') opts.strictA11y = true;
    else if (arg === '--skip-known-pre-remediation') opts.skipKnownPreRemediation = true;
    else if (arg === '--headed') opts.headed = true;
    else if (arg.startsWith('--auth-host=')) opts.authHost = arg.slice('--auth-host='.length);
    else if (arg.startsWith('--firestore-host=')) opts.firestoreHost = arg.slice('--firestore-host='.length);
    else if (arg.startsWith('--project-id=')) opts.projectId = arg.slice('--project-id='.length);
    else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  return opts;
}

function printUsage() {
  console.log([
    'HouseHelper E2E Playwright-CLI Runner',
    '',
    'Usage:',
    '  node scripts/e2e-playwright.mjs [options]',
    '',
    'Options:',
    '  --url=<baseUrl>                 Target app URL (default http://127.0.0.1:3000)',
    '  --phase=a|b|all                 a=F1 public/guards/shell, b=F2-F10 auth flows, all=F1-F10',
    '  --flows=F1,F2,...               Run specific flows (overrides --phase)',
    '  --start-server                  Start local CRA dev server (npm start) and stop on exit',
    '  --serve-build                   Serve ./build via built-in SPA HTTP server on URL port',
    '  --mode=auto|emulator|mock       Backend mode (default auto)',
    '  --strict-a11y                   Treat all a11y/contrast/layout checks as hard failures',
    '  --skip-known-pre-remediation    Report known pre-M2/M3/M4 UI items as PRE_REMEDIATION',
    '  --headed                        Run browser in visible headed mode'
  ].join('\n'));
}

function detectMockHookInFirebaseJs() {
  const fbPath = path.join(REPO_ROOT, 'src', 'firebase.js');
  if (!fs.existsSync(fbPath)) return false;
  const content = fs.readFileSync(fbPath, 'utf8');
  return content.includes('REACT_APP_E2E_MOCK');
}

function resolveSelectedFlows(opts) {
  if (opts.flows && opts.flows.length > 0) {
    for (const f of opts.flows) {
      if (!FLOW_RUNNERS[f]) {
        throw new Error(`Unknown flow "${f}". Valid flows: ${Object.keys(FLOW_RUNNERS).join(', ')}`);
      }
    }
    return opts.flows;
  }

  if (opts.phase === 'a') return ['F1'];
  if (opts.phase === 'b') return ['F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'];
  if (opts.phase === 'all') return Object.keys(FLOW_RUNNERS);
  throw new Error(`Unknown --phase="${opts.phase}". Expected a | b | all.`);
}

async function prepareBackend(opts, needsBackend) {
  const probe = await probeEmulator({
    authHost: opts.authHost,
    firestoreHost: opts.firestoreHost
  });
  const hasMockHook = detectMockHookInFirebaseJs();

  if (opts.mode === 'emulator') {
    if (!probe.ready) {
      throw new Error(
        `Emulator mode requested but Firebase Emulators are unreachable (auth=${opts.authHost}, firestore=${opts.firestoreHost}). Start emulators with: firebase emulators:start --only auth,firestore`
      );
    }
    const seeded = await seedEmulator({
      projectId: opts.projectId,
      authHost: opts.authHost,
      firestoreHost: opts.firestoreHost
    });
    return {
      hasBackend: true,
      backendKind: 'emulator',
      fixtures: seeded.fixtures,
      serverEnv: { REACT_APP_USE_FIREBASE_EMULATOR: 'true' }
    };
  }

  if (opts.mode === 'mock') {
    if (!hasMockHook) {
      throw new Error(
        'Mock mode requested (--mode=mock), but src/firebase.js does not implement REACT_APP_E2E_MOCK yet (owned by Milestone M1).'
      );
    }
    const fixtures = buildFixtures();
    return {
      hasBackend: true,
      backendKind: 'mock',
      fixtures,
      serverEnv: { REACT_APP_E2E_MOCK: 'true' }
    };
  }

  // auto mode
  if (probe.ready) {
    const seeded = await seedEmulator({
      projectId: opts.projectId,
      authHost: opts.authHost,
      firestoreHost: opts.firestoreHost
    });
    return {
      hasBackend: true,
      backendKind: 'emulator',
      fixtures: seeded.fixtures,
      serverEnv: { REACT_APP_USE_FIREBASE_EMULATOR: 'true' }
    };
  }

  if (hasMockHook && (opts.startServer || process.env.REACT_APP_E2E_MOCK === 'true')) {
    return {
      hasBackend: true,
      backendKind: 'mock',
      fixtures: buildFixtures(),
      serverEnv: { REACT_APP_E2E_MOCK: 'true' }
    };
  }

  if (needsBackend) {
    throw new Error(
      'Phase B (Flows F2-F10) requires a live backend, but neither Firebase Emulators (127.0.0.1:9099 & 127.0.0.1:8080) nor REACT_APP_E2E_MOCK hook in src/firebase.js are available. Start Firebase Emulators or complete M1 local runtime setup before running Phase B.'
    );
  }

  return {
    hasBackend: false,
    backendKind: 'none',
    fixtures: buildFixtures(),
    serverEnv: {}
  };
}

async function main() {
  const opts = parseCliArgs(process.argv.slice(2));
  const selectedFlows = resolveSelectedFlows(opts);
  const needsBackend = selectedFlows.some((f) => f !== 'F1');

  const backend = await prepareBackend(opts, needsBackend);
  console.log(
    `[E2E] Flows=${selectedFlows.join(',')} | Backend=${backend.backendKind} | URL=${opts.url}`
  );

  let serverHandle = null;
  let client = null;

  try {
    const parsedUrl = new URL(opts.url);
    const port = Number(parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80));

    if (opts.serveBuild) {
      serverHandle = await startStaticBuildServer(path.join(REPO_ROOT, 'build'), port);
      console.log(`[E2E] Serving ./build at ${serverHandle.url}`);
    } else if (opts.startServer) {
      console.log(`[E2E] Starting CRA dev server on port ${port}...`);
      serverHandle = await startCraDevServer(REPO_ROOT, port, backend.serverEnv);
      console.log(`[E2E] Dev server ready at ${serverHandle.url}`);
    } else {
      await waitForHttpReady(opts.url, 10000);
    }

    const baseUrl = serverHandle ? serverHandle.url : opts.url;
    const tracker = new TestTracker({
      skipKnownPreRemediation: opts.strictA11y ? false : opts.skipKnownPreRemediation
    });

    client = createPlaywrightClient({ headed: opts.headed });
    client.open(baseUrl);

    for (const flowId of selectedFlows) {
      console.log(`\n=== Running Flow ${flowId} ===`);
      await FLOW_RUNNERS[flowId]({
        client,
        baseUrl,
        tracker,
        fixtures: backend.fixtures,
        hasBackend: backend.hasBackend
      });
    }

    const summary = tracker.summary();
    console.log('\n========================================');
    console.log(
      `[E2E SUMMARY] Total=${summary.total} | Passed=${summary.passed} | Failed=${summary.failed} | PreRemediation=${summary.preRemediation}`
    );
    console.log('========================================');

    if (summary.failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    if (client) {
      client.dispose();
    }
    if (serverHandle) {
      await serverHandle.stop();
    }
  }
}

main().catch((err) => {
  console.error(`\n[E2E FATAL] ${err.message}`);
  process.exit(1);
});
