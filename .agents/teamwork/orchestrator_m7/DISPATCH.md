## 2026-11-04T00:09:57Z

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

---
### Orchestrator Assignment & Identity
- Working directory: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator_m7/`
- Project root: `/home/daniele949/Desktop/Cose/HouseHelper/househelper`
- Original Request path: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md`
