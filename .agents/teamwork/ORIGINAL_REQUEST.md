# Original User Request

## Approved Task Prompt — 2026-11-08T13:27:35Z

Rinnovare per la produzione forme, colori, card, ombre, bordi e dettagli stilistici dell'applicazione HouseHelper rendendo il design accattivante, semplice, intuitivo, distintivo e moderno, applicando congiuntamente i principi delle skill frontend-design e apple-design.

Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
Integrity mode: development

## Requirements

### R1. Rinnovamento visuale e identità distintiva (frontend-design)
Rinnovare forme, colori, card, ombre, bordi e dettagli stilistici di tutte le viste e componenti dell'applicazione HouseHelper, evitando l'aspetto generico o templated delle UI AI-generated (evitare palette piatte o card clonate con ombre anonime). Adottare scelte cromatiche decise, armoniose e con un punto di vista distintivo per una gestione casa/coinquilini moderna e piacevole. Applicare il principio "spend your boldness in one place" garantendo un elemento visivo memorabile e distintivo per ciascuna area chiave, mantenendo l'intorno sobrio, ordinato e leggibile. Curare il trattamento di forme, bordi (border-radius calibrato, bordi sottili e accenti) e ombre morbide a strati.

### R2. Ergonomia e standard Apple HIG (apple-design)
Applicare il rigore Apple HIG: accessibilità visiva dei contrasti, tipografia di sistema chiara, disciplina del Liquid Glass (blur solo su elementi funzionali flottanti come topbar/bottom bar). Mantenere e rispettare la differenziazione ergonomica tra Mobile (one-handed reach, `MobileBottomBar`, safe area, touch target >= 44px) e Desktop (sidebar persistente, multi-colonna, stati hover al cursore). Micro-copywriting in italiano semplice, naturale e diretto.

### R3. Vincoli tecnici inderogabili
Esclusione totale di emoji in tutta l'interfaccia utente (utilizzare esclusivamente icone vettoriali SVG). Mantenere il 100% dei test passanti e la compilazione pulita priva di errori.

## Verification Resources
- Test suite: `npm test`
- Build check: `npm run build`
- Zero-emoji script: `scripts/verify-zero-emojis.js`
- Design skills: `/home/daniele949/.agents/skills/frontend-design/SKILL.md` e `/home/daniele949/.agents/skills/apple-design/SKILL.md`

## Acceptance Criteria

### Test e Compilazione
- [ ] `npm test` viene eseguito e supera il 100% dei test senza errori o regressioni
- [ ] `npm run build` compila con successo senza errori
- [ ] Lo script di verifica delle emoji (`scripts/verify-zero-emojis.js`) viene eseguito e passa con zero emoji rilevate

### Iconografia e Micro-copy
- [ ] Zero emoji presenti in qualsiasi vista o componente dell'applicazione; tutti gli elementi grafici utilizzano icone vettoriali SVG
- [ ] Micro-copywriting dell'interfaccia interamente in italiano semplice, naturale e diretto

### Ergonomia e Standard Apple HIG
- [ ] I contrasti cromatici e testuali rispettano gli standard di accessibilità Apple HIG
- [ ] L'effetto Liquid Glass (sfocatura/blur) è applicato esclusivamente ad elementi funzionali flottanti (topbar e bottom bar)
- [ ] Layout Mobile rispetta safe area, touch target minimi di almeno 44px e one-handed reach con `MobileBottomBar`
- [ ] Layout Desktop mantiene sidebar persistente, organizzazione multi-colonna e stati hover per il cursore

### Qualità Frontend Design
- [ ] Tutte le viste e i componenti dell'applicazione sono aggiornati con forme raffinate, bordi sottili/accenti calibrati e ombre morbide a strati
- [ ] Ciascuna area chiave dell'applicazione include un elemento visivo distintivo memorabile ("spend your boldness in one place"), mantenendo il contesto sobrio e leggibile


## Follow-up — 2026-11-08T22:03:05Z

La quota è stata ripristinata e l'utente ha richiesto di riprendere i lavori (/teamwork /apple-design /frontend-design Riprendi). Riprendi l'esecuzione della Milestone M9 / M10 verificando lo stato di worker_m9 e procedendo con il piano stabilito.


## Follow-up — 2026-11-08T22:52:49Z

Direttiva aggiuntiva prioritaria dell'utente:
Integra esplicitamente nella Milestone M11 (Audit finale e pre-rilascio) una verifica approfondita di sicurezza per repository pubblico: scansione contro segreti hardcodati, credenziali, chiavi private, token personali o dati sensibili (es. esecuzione rigorosa di `npm run audit:secrets` o script di secret scanning su tutti i file e la cronologia dei commit), garantendo che il codice sia al 100% pulito e sicuro prima del push su un repository pubblico.
