// routes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 

// Importazione Modelli
const Turno = require('./models/Turno');
const Utente = require('./models/Utente');
const Casa = require('./models/Casa');
const Debito = require('./models/Debito');
const Nota = require('./models/Nota'); // <--- NUOVO IMPORT

// --- CONFIGURAZIONE SICUREZZA ---
const SECRET_KEY = "CAMBIA_QUESTA_FRASE_CON_UNA_SEGRETA_IN_PRODUZIONE";

// Middleware "Buttafuori"
function autentica(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: "Accesso negato: Token mancante" });

  jwt.verify(token, SECRET_KEY, (err, userDecoded) => {
    if (err) return res.status(403).json({ message: "Token non valido o scaduto" });
    req.user = userDecoded; 
    next();
  });
}

// ==========================================
//  API AUTENTICAZIONE
// ==========================================

router.post('/utenti', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const nuovoUtente = await Utente.create({ username, password: hashedPassword });
    res.status(201).json({ message: "Utente creato", userId: nuovoUtente.id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const utente = await Utente.findOne({ where: { username } });

    if (!utente) return res.status(401).json({ ok: false, message: "Utente non trovato" });

    const passwordValida = await bcrypt.compare(password, utente.password);
    
    if (passwordValida) {
      const token = jwt.sign(
        { id: utente.id, username: utente.username }, 
        SECRET_KEY, 
        { expiresIn: '2h' }
      );

      res.json({ 
        ok: true, 
        message: "Login effettuato", 
        token: token, 
        username: utente.username,
        casaId: utente.CasaId 
      });
    } else {
      res.status(401).json({ ok: false, message: "Password errata" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/utenti/me', autentica, async (req, res) => {
  try {
    const utente = await Utente.findByPk(req.user.id, { 
      include: Casa,
      attributes: { exclude: ['password'] }
    });
    res.json(utente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
//  API CASA
// ==========================================

router.post('/casa/crea', autentica, async (req, res) => {
  const { nomeCasa } = req.body;
  try {
    const codice = Math.random().toString(36).substring(2, 8).toUpperCase();
    const nuovaCasa = await Casa.create({ nome: nomeCasa, codiceUnivoco: codice });
    
    // Aggiorniamo l'utente nel DB
    const utente = await Utente.findByPk(req.user.id);
    if (utente) { await utente.setCasa(nuovaCasa); }

    res.json({ ok: true, casa: nuovaCasa, message: "Casa creata con successo!" });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

router.post('/casa/unisciti', autentica, async (req, res) => {
  const { codice } = req.body;
  try {
    const casa = await Casa.findOne({ where: { codiceUnivoco: codice } });
    if (!casa) return res.status(404).json({ ok: false, message: "Codice casa non valido." });

    const utente = await Utente.findByPk(req.user.id);
    if (utente) { await utente.setCasa(casa); }

    res.json({ ok: true, casa: casa, message: `Benvenuto in ${casa.nome}!` });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

router.post('/casa/lascia', autentica, async (req, res) => {
  try {
    const utente = await Utente.findByPk(req.user.id);
    if (utente) {
      await utente.setCasa(null);
      res.json({ ok: true, message: "Hai lasciato la casa." });
    } else {
      res.status(404).json({ message: "Utente non trovato" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/casa/:id', autentica, async (req, res) => {
    // Logica eliminazione casa (opzionale)
});

// ==========================================
//  API TURNI (Logica "Fresh Data")
// ==========================================

// 1. Ottieni TUTTI i turni
router.get('/turni', autentica, async (req, res) => {
  try {
    const utente = await Utente.findByPk(req.user.id);
    
    if (!utente.CasaId) return res.json([]); 
    
    const turni = await Turno.findAll({ where: { CasaId: utente.CasaId } });
    res.json(turni);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Ottieni SINGOLO turno
router.get('/turni/:id', autentica, async (req, res) => {
    try {
      const turno = await Turno.findByPk(req.params.id);
      if (!turno) return res.status(404).json({ message: 'Turno non trovato' });
  
      const utente = await Utente.findByPk(req.user.id);

      // Sicurezza
      if (turno.CasaId !== utente.CasaId) {
          return res.status(403).json({ message: "Non autorizzato" });
      }
  
      res.json(turno);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});

// 3. Crea turno
router.post('/turni', autentica, async (req, res) => {
  try {
    const utente = await Utente.findByPk(req.user.id);

    if (!utente.CasaId) {
        return res.status(400).json({ message: "Nessuna casa associata." });
    }

    const datiTurno = {
      ...req.body,
      CasaId: utente.CasaId 
    };

    const nuovoTurno = await Turno.create(datiTurno);
    res.status(201).json(nuovoTurno);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// 4. Modifica turno
router.put('/turni/:id', autentica, async (req, res) => {
  try {
    const turno = await Turno.findByPk(req.params.id);
    if (!turno) return res.status(404).json({ message: 'Non trovato' });

    const utente = await Utente.findByPk(req.user.id);

    if (turno.CasaId !== utente.CasaId) {
      return res.status(403).json({ message: "Non puoi modificare turni di altre case!" });
    }

    await turno.update(req.body);
    res.json(turno);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. Elimina turno
router.delete('/turni/:id', autentica, async (req, res) => {
  try {
    const turno = await Turno.findByPk(req.params.id);
    if (!turno) return res.status(404).json({ message: 'Non trovato' });

    const utente = await Utente.findByPk(req.user.id);

    if (turno.CasaId !== utente.CasaId) {
      return res.status(403).json({ message: "Non puoi eliminare turni di altre case!" });
    }

    await turno.destroy();
    res.json({ message: 'Eliminato' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
//  API DEBITI
// ==========================================

// 1. Ottieni coinquilini
router.get('/utenti/casa', autentica, async (req, res) => {
  try {
    const utente = await Utente.findByPk(req.user.id);
    if (!utente.CasaId) return res.json([]);

    const coinquilini = await Utente.findAll({ 
      where: { CasaId: utente.CasaId },
      attributes: ['id', 'username'] 
    });
    res.json(coinquilini);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. Ottieni tutti i debiti
router.get('/debiti', autentica, async (req, res) => {
  try {
    const utente = await Utente.findByPk(req.user.id);
    if (!utente.CasaId) return res.json([]);

    const debiti = await Debito.findAll({
      where: { CasaId: utente.CasaId },
      include: [
        { model: Utente, as: 'Creditore', attributes: ['username'] },
        { model: Utente, as: 'Debitore', attributes: ['username'] }
      ],
      order: [['data', 'DESC']]
    });
    res.json(debiti);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. Aggiungi debito
router.post('/debiti', autentica, async (req, res) => {
  try {
    const { importo, descrizione, data, debitoreId, creditoreId, dividiConTutti } = req.body;
    const utente = await Utente.findByPk(req.user.id);
    
    if (!utente.CasaId) return res.status(400).json({ message: "Non hai una casa." });

    // Determiniamo chi ha pagato (se non specificato, sei tu)
    const chiHaPagatoId = creditoreId ? parseInt(creditoreId) : req.user.id;

    // --- CASO A: Divisione spese tra TUTTI (Split) ---
    if (dividiConTutti) {
        // 1. Troviamo tutti i coinquilini della casa
        const coinquilini = await Utente.findAll({ where: { CasaId: utente.CasaId } });
        
        if (coinquilini.length < 2) {
            return res.status(400).json({ message: "Sei da solo in casa, non puoi dividere le spese!" });
        }

        // 2. Calcoliamo la quota a testa (Totale / Numero Persone)
        // Es: 100€ in 4 persone = 25€ a testa. 
        // Gli altri 3 devono dare 25€ a chi ha pagato.
        const importoNum = parseFloat(importo);
        const quota = (importoNum / coinquilini.length).toFixed(2); 

        // 3. Creiamo un debito per OGNI coinquilino (tranne chi ha pagato)
        const promesseDebiti = coinquilini.map(coinquilino => {
            // Se il coinquilino NON è quello che ha pagato, creiamo il debito
            if (coinquilino.id !== chiHaPagatoId) {
                return Debito.create({
                    importo: quota, 
                    descrizione: `${descrizione} (Quota divisa)`,
                    data: data || new Date(),
                    DebitoreId: coinquilino.id,
                    CreditoreId: chiHaPagatoId,
                    CasaId: utente.CasaId
                });
            }
        });

        // Aspettiamo che il DB finisca di salvare tutto
        await Promise.all(promesseDebiti);
        
        return res.status(201).json({ message: `Spesa divisa! Ognuno deve ${quota}€` });
    }

    // --- CASO B: Debito Singolo (Come prima) ---
    else {
        if (!debitoreId) return res.status(400).json({ message: "Seleziona chi deve pagare." });
        if (parseInt(debitoreId) === chiHaPagatoId) return res.status(400).json({ message: "Non puoi avere debiti con te stesso." });

        await Debito.create({
            importo,
            descrizione,
            data: data || new Date(),
            DebitoreId: debitoreId,
            CreditoreId: chiHaPagatoId,
            CasaId: utente.CasaId
        });
        
        return res.status(201).json({ message: "Debito aggiunto!" });
    }

  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 4. Salda debito
router.delete('/debiti/:id', autentica, async (req, res) => {
  try {
    const debito = await Debito.findByPk(req.params.id);
    if (!debito) return res.status(404).json({ message: "Non trovato" });

    const utente = await Utente.findByPk(req.user.id);
    if (debito.CasaId !== utente.CasaId) return res.status(403).json({ message: "Vietato." });

    await debito.destroy();
    res.json({ message: "Debito saldato" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
//  API BACHECA (NUOVO)
// ==========================================

// 1. Leggi tutte le note della casa
router.get('/bacheca', autentica, async (req, res) => {
  try {
    const utente = await Utente.findByPk(req.user.id);
    if (!utente.CasaId) return res.json([]);

    const note = await Nota.findAll({
      where: { CasaId: utente.CasaId },
      include: [{ model: Utente, as: 'Autore', attributes: ['username'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(note);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. Aggiungi Nota (CORRETTO)
router.post('/bacheca', autentica, async (req, res) => {
  try {
    const { titolo, contenuto, data } = req.body; // <--- ORA LEGGIAMO LA DATA
    const utente = await Utente.findByPk(req.user.id);
    
    if (!utente.CasaId) return res.status(400).json({ message: "Non hai una casa." });

    await Nota.create({
      titolo,
      contenuto,
      data: data, // <--- ORA USIAMO LA DATA (o null) DEL FRONTEND
      AutoreId: req.user.id,
      CasaId: utente.CasaId
    });

    res.status(201).json({ message: "Nota aggiunta!" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. Modifica Nota (Solo Autore)
router.put('/bacheca/:id', autentica, async (req, res) => {
  try {
    const nota = await Nota.findByPk(req.params.id);
    if (!nota) return res.status(404).json({ message: "Non trovata" });

    if (nota.AutoreId !== req.user.id) {
       return res.status(403).json({ message: "Puoi modificare solo le tue note." });
    }

    await nota.update(req.body);
    res.json(nota);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. Elimina Nota (Solo Autore)
router.delete('/bacheca/:id', autentica, async (req, res) => {
  try {
    const nota = await Nota.findByPk(req.params.id);
    if (!nota) return res.status(404).json({ message: "Non trovata" });

    if (nota.AutoreId !== req.user.id) {
       return res.status(403).json({ message: "Puoi eliminare solo le tue note." });
    }

    await nota.destroy();
    res.json({ message: "Nota eliminata" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;