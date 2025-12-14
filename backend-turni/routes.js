// routes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 

// Importazione Modelli
const Turno = require('./models/Turno');
const Utente = require('./models/Utente');
const Casa = require('./models/Casa');
const Debito = require('./models/Debito'); // <--- NUOVO

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
//  API DEBITI (NUOVO)
// ==========================================

// 1. Ottieni coinquilini (Per il menu a tendina)
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

// 2. Ottieni tutti i debiti della casa
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
      order: [['data', 'DESC']] // I più recenti in alto
    });
    res.json(debiti);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. Aggiungi un debito
router.post('/debiti', autentica, async (req, res) => {
  try {
    const { importo, descrizione, data, debitoreId, creditoreId } = req.body;
    
    // Recupera la casa dell'utente che sta facendo l'azione
    const utente = await Utente.findByPk(req.user.id);
    if (!utente.CasaId) return res.status(400).json({ message: "Non hai una casa." });

    // Se non specificato, il creditore è chi sta scrivendo
    const creditoreFinale = creditoreId || req.user.id; 

    await Debito.create({
      importo,
      descrizione,
      data,
      DebitoreId: debitoreId,
      CreditoreId: creditoreFinale,
      CasaId: utente.CasaId
    });

    res.status(201).json({ message: "Debito aggiunto!" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 4. Salda (Elimina) un debito
router.delete('/debiti/:id', autentica, async (req, res) => {
  try {
    const debito = await Debito.findByPk(req.params.id);
    if (!debito) return res.status(404).json({ message: "Non trovato" });

    const utente = await Utente.findByPk(req.user.id);

    // Solo se il debito appartiene alla stessa casa dell'utente
    if (debito.CasaId !== utente.CasaId) {
        return res.status(403).json({ message: "Vietato toccare debiti altrui." });
    }

    await debito.destroy();
    res.json({ message: "Debito saldato/eliminato" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;