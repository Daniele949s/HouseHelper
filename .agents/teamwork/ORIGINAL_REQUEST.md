# Original User Request

## Initial Request — 2026-11-02T09:31:01Z

Modernize House Helper into a competitive, production-ready household management application with a completely refreshed UI/UX, while resolving existing architectural technical debt. Do not use emoticons or emojis anywhere in the user interface or codebase.

Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
Integrity mode: development

Reference material:
- Knowledge graph and architecture report at `/home/daniele949/Desktop/Cose/HouseHelper/househelper/graphify-out/` (`GRAPH_REPORT.md`, `graph.json`, `graph.html`)
- Tech stack: React 19 (`react@^19.2.3`), Firebase (`firebase@^12.14.0`), React Router, Create React App setup

## Requirements

### R1. UI/UX Modernization and Competitive Design Overhaul
Redesign and modernize the user interface across all application pages and components, including Authentication (`src/pages/Autenticazione/`), Cleaning Shifts / Chores (`src/pages/TurniPulizia/`), Debts & Expenses (`src/pages/Debiti/`, `src/pages/Spesa/`), Bulletin Board & Calendar (`src/pages/Bacheca/`), and feedback/mascot components (`src/components/MiniGuy.js`, `src/components/Celebration.js`, `src/components/InteractiveMascot.js`). Deliver a modern, polished, and responsive interface suitable for daily household use.

### R2. Strict Prohibition on Emoticons and Emojis
DO NOT USE EMOTICONS / EMOJIS anywhere in the UI or codebase. All icons, status indicators, and graphical elements must use professional iconography (such as vector or SVG icons) rather than text emoticons or Unicode emojis. Any existing emoticons or emojis across views and component files must be removed or replaced.

### R3. Codebase Architecture and Technical Debt Cleanup
Refactor the codebase architecture to resolve the 17 circular import cycles centered around `src/App.js` and page components. Clean up unused legacy template files and disparate styling in `css_template/`, consolidating styles without breaking active application functionality.

### R4. Automated Verification and Build Integrity
Provide automated tests and verification checks (including component/unit tests and build verification) ensuring that all modernized pages load, core user flows remain functional, zero emoticons/emojis exist in rendered components, and the application builds cleanly without errors or circular import cycles.

## Acceptance Criteria

### UI/UX & Design Integrity
- [ ] All primary views (Authentication, TurniPulizia, Debiti, Spesa, Bacheca, Calendario) render with the modernized visual design and responsive layout.
- [ ] Zero emoticons or Unicode emojis are present in any user-facing component or rendered UI element.
- [ ] An automated scan or test script confirms zero emoji or emoticon characters in rendered text or JSX literals in `src/`.

### Architectural & Build Verification
- [ ] The application compiles cleanly with `npm run build` with zero build errors.
- [ ] Circular dependency analysis confirms zero circular import cycles between `src/App.js` and page modules.
- [ ] Legacy assets in `css_template/` are cleaned up, with no orphaned styles or broken imports in active components.

### Automated Testing
- [ ] Automated tests run via `npm test` or a dedicated test runner pass with zero failures.
- [ ] Automated tests verify key user interaction flows across authentication, chore management, and expense tracking.


## Follow-up — 2026-11-03T12:35:05Z

Continue HouseHelper project execution to deliver production-ready code: verify and complete Milestones M3 and M4 (achieving 100% test pass across 4 tiers), then execute Phase 2 covering application security hardening, public repository audit, household document management with Firebase Storage, and advanced cross-device ergonomics optimization.

Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
Integrity mode: development

## Reference Material
- Architecture blueprint: /home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md
- Verification scripts: scripts/verify-zero-emojis.js, scripts/check-circular.js

## Requirements

### R1. Milestone M3 Verification and Gate Completion
Execute the automated verification checks (`node scripts/verify-zero-emojis.js`, `node scripts/check-circular.js`, `npm run build`, and `CI=true npm test -- --watchAll=false`) on the modernized domain pages (`src/pages/Autenticazione/`, `SceltaCasa.js`, `homeUtente.js`, `TurniPulizia/`, `Debiti/`, `Spesa/`, `Bacheca/`), and complete M3 gate review and audit verification.

### R2. Milestone M4 100% Test Pass
Complete Milestone M4, ensuring a 100% test pass rate across all 4 test tiers with zero regressions, verifying that all unit, integration, and UI tests pass reliably.

### R3. Application Security Hardening and Public Repository Audit
Conduct deep application security hardening including auditing and updating `firestore.rules` to enforce strict household-scoped data access, anti-tamper validation, and input sanitization. Audit the public repository and git history to scan for and eliminate any sensitive information, credentials, or API keys.

### R4. Household Document Management and Cross-Device Ergonomics
Implement household document management using Firebase Storage to allow household members to upload, view, and organize documents (such as rent contracts, utilities, receipts) scoped strictly to their household. Optimize interface ergonomics tailored for mobile touchscreens and desktop widescreens while maintaining the zero-emoji design standard.

## Acceptance Criteria

### Milestone M3 Verification
- [ ] `node scripts/verify-zero-emojis.js` exits with code 0 (zero emojis across all codebase files).
- [ ] `node scripts/check-circular.js` exits with code 0 (zero circular dependencies).
- [ ] `npm run build` completes with exit code 0 and zero build errors.
- [ ] Milestone M3 gate verification is completed and approved.

### Milestone M4 Test Suite
- [ ] `CI=true npm test -- --watchAll=false` passes with 100% success across all 4 tiers with zero failing tests.
- [ ] Zero regressions are introduced in existing application flows.

### Phase 2 Security Hardening & Repository Audit
- [ ] `firestore.rules` contains rules restricting read/write access strictly to authenticated members of the respective household.
- [ ] Rules enforce anti-tamper validation and data sanitization on write operations.
- [ ] Repository files and git commit history scan confirms zero sensitive credentials, secrets, or private API keys.

### Phase 2 Document Management & Ergonomics
- [ ] Household members can upload, view, and organize house documents (rent contracts, utilities, receipts) stored in Firebase Storage.
- [ ] Document access is restricted strictly to members of the corresponding household.
- [ ] Interface layouts and interactions are optimized for mobile touch targets and desktop wide displays without any emojis or emoticons.
- [ ] Automated tests cover document upload, retrieval, and access control flows.


## Follow-up — 2026-11-03T13:02:14Z

M4 is officially cleared and passed. The user is asking why we are still at M4. Please immediately transition to Phase 2:
1. Deep application security hardening (firestore.rules audit, data sanitization, anti-tamper).
2. Public repo audit (scan git history and code for any secrets/credentials/keys).
3. Household document management with Firebase Storage (upload, view, organize documents).
4. Advanced mobile and desktop ergonomics optimization.


## Follow-up — 2026-11-03T13:02:19Z

M4 is officially cleared and passed. The user is asking why we are still at M4. Please immediately transition to Phase 2:
1. Deep application security hardening (firestore.rules audit, data sanitization, anti-tamper).
2. Public repo audit (scan git history and code for any secrets/credentials/keys).
3. Household document management with Firebase Storage (upload, view, organize documents).
4. Advanced mobile and desktop ergonomics optimization.


## Follow-up — 2026-11-03T13:24:14Z

The user requested to pause/stop work here because they need to shut down their PC. M5 is verified and passing cleanly on disk (26/26 test suites passed, 209/209 tests, 0 secrets, 0 emojis, 0 circular dependencies). Please cleanly checkpoint your status in PROJECT.md and pause execution.


## Follow-up — 2026-11-03T13:24:09Z

The user requested to pause/stop work here because they need to shut down their PC. M5 is verified and passing cleanly on disk (26/26 test suites passed, 209/209 tests, 0 secrets, 0 emojis, 0 circular dependencies). Please cleanly checkpoint your status in PROJECT.md and pause execution.


## Follow-up — 2026-11-03T14:37:05Z

Implement Milestone M6 for HouseHelper to deliver production-ready code and achieve final project completion: implement household document management with Firebase Storage, optimize cross-device ergonomics, and pass all verification checks.

Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
Integrity mode: development

## Verification Resources
- `scripts/verify-zero-emojis.js`
- `scripts/check-circular.js`
- `scripts/audit-secrets.js`
- `src/test/mockFirebase.js`

## Requirements

### R1. Household Document Management with Firebase Storage
Enable household members to upload, view, download, categorize, and delete house documents (e.g. rental contracts, utility bills, appliance warranties, receipts) scoped strictly to `casaId`. Implement storage security rules in `storage.rules` ensuring only authenticated users belonging to `casaId` can access/upload files. Add dedicated Documents page/component (`src/pages/Documenti/ViewDocumenti.js`), register route in `src/App.js`, and add navigation entry to `DesktopNavigation.js` and `MobileNavigation.js`. Integrate with the non-blocking feedback system (`Toast`, `ConfirmModal`) and zero-emoji FontAwesome vector iconography. Add mock Firebase Storage support in `src/test/mockFirebase.js` and author automated unit/integration tests for document upload and retrieval.

### R2. Advanced Cross-Device Ergonomics Optimization
Optimize mobile ergonomics with touch-optimized targets (>= 44px), bottom-sheet/drawer comfort, and responsive form controls. Optimize desktop ergonomics with multi-column dashboard, spacious table/card layouts, and keyboard accessibility.

### R3. Final Quality Verification
Ensure all automated verification checks pass cleanly with zero violations: verify zero emojis/emoticons across all files, zero circular dependencies, zero secrets across repository and git history, 100% pass rate on test suites, and clean production build compilation.

## Acceptance Criteria

### Household Document Management
- [ ] Household members can upload, view, download, categorize, and delete house documents scoped strictly to their `casaId`.
- [ ] `storage.rules` restricts file read and write operations strictly to authenticated members belonging to the respective `casaId`.
- [ ] Dedicated Documents page/component `src/pages/Documenti/ViewDocumenti.js` is implemented and routed in `src/App.js`.
- [ ] Navigation entries for Documents are added to `DesktopNavigation.js` and `MobileNavigation.js`.
- [ ] Document management flows integrate with `Toast` non-blocking notifications, `ConfirmModal` confirmations, and FontAwesome vector icons with zero emojis.
- [ ] Mock Firebase Storage support is added to `src/test/mockFirebase.js`, with automated unit and integration tests passing for document upload, retrieval, and access control.

### Cross-Device Ergonomics
- [ ] Mobile UI elements provide touch targets >= 44px, bottom-sheet/drawer navigation, and responsive form controls.
- [ ] Desktop UI provides multi-column dashboard layout, spacious table/card views, and keyboard accessibility.

### Final Quality Verification
- [ ] `node scripts/verify-zero-emojis.js` exits with 0 violations.
- [ ] `node scripts/check-circular.js` exits with 0 cycles.
- [ ] `node scripts/audit-secrets.js` exits with 0 secrets.
- [ ] `npm test -- --watchAll=false` passes with 100% test pass rate.
- [ ] `npm run build` completes with 0 errors.


## Follow-up — 2026-11-04T00:08:24Z

Implementazione delle nuove funzionalità della roadmap per l'applicazione HouseHelper (gestione spese con algoritmo di debt simplification ed export resoconti, rotazione configurabile e checklist turni con modalità vacanza, rubrica contatti utili, esperienza PWA con consultazione offline e notifiche), con rigorosa aderenza alla sicurezza applicativa, isolamento multi-tenant, assenza totale di emoji e 100% di test passanti.

Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
Integrity mode: development

## Verification Resources
- Test suite standard: `npm test`
- Build check: `npm run build`
- Secret audit: `npm run audit:secrets`
- Emoji check: controlli automatici / script anti-emoji
- Circular dependency check: controlli dipendenze circolari

## Requirements

### R1. Finanza & Spese Intelligenti (senza OCR)
- Implementare l'algoritmo di Semplificazione Debiti ("Debt Simplification") per minimizzare il numero totale di transazioni necessarie a pareggiare tutti i debiti tra i coinquilini della casa.
- Supportare ripartizioni personalizzate delle spese: divisione per quote fisse personalizzate, per percentuali o escludendo coinquilini specifici.
- Implementare l'esportazione dei resoconti mensili delle spese e debiti in formato PDF e CSV scaricabili.

### R2. Automazione dei Turni & Manutenzione
- Aggiungere l'opzione configurabile nelle impostazioni della casa per la rotazione automatica settimanale/ciclica dei turni tra i coinquilini registrati.
- Introdurre la modalità "In Vacanza / Fuori Casa" impostabile nel profilo/dashboard con periodo di assenza, saltando l'assegnazione dei turni durante quel periodo.
- Integrare una checklist dettagliata per ciascun turno con sotto-mansioni spuntabili (es. pulire fornelli, svuotare cestino) con stato persistente su Firestore.

### R3. Rubrica Contatti Utili della Casa
- Creare una sezione integrata per i contatti utili e di emergenza della casa (proprietario, idraulico, amministratore, emergenze) con pulsanti rapidi per chiamata telefonica (`tel:`) ed email (`mailto:`).

### R4. Esperienza Mobile & PWA
- Configurare Progressive Web App (PWA) tramite Service Worker e Web App Manifest per consentire l'installazione su schermata Home e la consultazione offline delle liste e delle note già caricate.
- Implementare un sistema di notifiche e promemoria per turni imminenti e nuove spese registrate.

### R5. Refactoring Prestazioni (Condizionale)
- Verificare le prestazioni di rendering e query Firestore, applicando code-splitting con `React.lazy` o memoization solo se effettivamente necessario per mantenere la massima reattività.

### R6. Sicurezza Applicativa & Protezione dei Dati
- Prevenzione XSS & HTML injection: tutti gli input utente (contatti, note, divisioni personalizzate, checklist) devono essere rigorosamente validati e sanificati tramite `src/utils/security.js`.
- Autorizzazione multi-tenant (anti-IDOR): verificare rigorosamente la proprietà di `casaId` in tutte le operazioni e nelle regole di Firestore e Storage; nessun utente può accedere o manomettere dati di un'altra casa.
- Protezione anti-tamper sui calcoli numerici: validare accuratamente percentuali di divisione e importi (impedire valori negativi, divisione per zero e manipolazioni a virgola mobile).
- Protezione DoS & burst: prevenire il doppio invio di transazioni/spese (double-click prevention), imporre limiti di lunghezza agli input e gestire una cache offline PWA sicura senza dispersione di dati tra sessioni utente differenti.
- Sicurezza repository pubblico: ZERO segreti, credenziali private, chiavi API o token personali nel codice o nei commit; verifica obbligatoria tramite `npm run audit:secrets`.

### R7. Vincoli di Sistema e UI
- ZERO EMOJI ed emoticon ovunque nell'interfaccia utente e nel codice sorgente: utilizzare rigorosamente ed esclusivamente icone vettoriali SVG / FontAwesome.
- Mantenimento del rigido isolamento multi-tenant (`casaId`).
- Zero dipendenze circolari in tutto il progetto.
- Mantenimento del 100% dei test passanti su tutte le 30 suite esistenti (280/280 test) e creazione di test automatici a copertura di tutte le nuove funzionalità e regole.

## Acceptance Criteria

### Finanza & Spese
- [ ] L'algoritmo di semplificazione debiti calcola e visualizza correttamente la lista minima di transazioni per azzerare i debiti tra coinquilini.
- [ ] La creazione/modifica spesa supporta correttamente la divisione in parti uguali, per importo fisso, per percentuale o con esclusione di membri specifici.
- [ ] Il download dei resoconti mensili genera file PDF e CSV validi e formattati correttamente con spese e saldi.

### Automazione Turni
- [ ] Nelle impostazioni casa è presente l'opzione per abilitare/disabilitare la rotazione automatica periodica dei turni.
- [ ] Gli utenti con stato "In Vacanza / Fuori Casa" attivo vengono esclusi dall'assegnazione e rotazione dei turni per la durata del periodo impostato.
- [ ] Ogni turno permette di visualizzare e spuntare sotto-mansioni della checklist, con salvataggio e sincronizzazione in tempo reale su Firestore.

### Contatti Utili
- [ ] È presente la rubrica dei contatti utili con scheda per ciascun contatto ed esecuzione rapida di chiamata (`tel:`) ed email (`mailto:`).

### PWA & Notifiche
- [ ] L'applicazione dispone di Web App Manifest e Service Worker validi ed è installabile su dispositivi mobili/desktop.
- [ ] Liste e note rimangono consultabili anche in assenza temporanea di connessione di rete (offline).
- [ ] Il sistema di notifiche/promemoria avvisa correttamente l'utente per i turni imminenti e le nuove spese.

### Sicurezza Applicativa & Repository
- [ ] Tutti gli input utente vengono sanificati con `src/utils/security.js` prima del rendering o del salvataggio.
- [ ] Nessuna operazione o regola Firestore/Storage permette ad un utente di una casa di leggere o modificare dati associati a un diverso `casaId`.
- [ ] Input non validi, importi negativi o percentuali errate non vengono accettati e non provocano errori di runtime o divisioni per zero.
- [ ] La sottomissione di nuove transazioni impedisce invii multipli accidentali da clic ripetuti.
- [ ] `npm run audit:secrets` viene eseguito e termina con esito positivo senza alcuna violazione o segreto rilevato.

### Qualità del Codice & Vincoli Architetturali
- [ ] Nessuna emoji o carattere emoticon è presente nel codice o nell'interfaccia utente.
- [ ] Nessuna dipendenza circolare introdotta nel progetto.
- [ ] Tutte le suite di test esistenti (30 suite, 280 test) e le nuove suite aggiunte passano al 100% (`npm test`).
- [ ] Il comando `npm run build` completa senza errori.
