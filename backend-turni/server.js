// server.js
const express = require('express');
const cors = require('cors');
const sequelize = require('./database');

// --- IMPORTAZIONE MODELLI ---
const Turno = require('./models/Turno');
const Utente = require('./models/Utente');
const Casa = require('./models/Casa');
const Debito = require('./models/Debito'); // <--- NUOVO

// --- IMPORTAZIONE ROTTE ---
const routes = require('./routes');

// --- DEFINIZIONE RELAZIONI (ASSOCIAZIONI) ---

// 1. Relazione Casa - Utenti
Casa.hasMany(Utente);
Utente.belongsTo(Casa);

// 2. Relazione Casa - Turni
Casa.hasMany(Turno);
Turno.belongsTo(Casa);

// 3. Relazione Casa - Debiti (NUOVO)
Casa.hasMany(Debito);
Debito.belongsTo(Casa);

// 4. Relazione Utenti - Debiti (NUOVO)
// Un utente può avere molti crediti (soldi che deve ricevere)
Utente.hasMany(Debito, { as: 'Crediti', foreignKey: 'CreditoreId' });
// Un utente può avere molti debiti (soldi che deve dare)
Utente.hasMany(Debito, { as: 'Debiti', foreignKey: 'DebitoreId' });

// Un debito appartiene a un Creditore e a un Debitore specifici
Debito.belongsTo(Utente, { as: 'Creditore', foreignKey: 'CreditoreId' });
Debito.belongsTo(Utente, { as: 'Debitore', foreignKey: 'DebitoreId' });

// --- CONFIGURAZIONE SERVER ---
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Collega le rotte con prefisso /api
app.use('/api', routes);

// Rotta base di test
app.get('/', (req, res) => {
  res.send('Server HouseHelper attivo!');
});

// --- AVVIO SERVER E DB ---
async function startServer() {
  try {
    // Verifica connessione
    await sequelize.authenticate();
    console.log('✅ Connessione al database riuscita.');

    // Sincronizza i modelli e AGGIORNA le tabelle (crea tabella Debiti e colonne foreigne)
    await sequelize.sync({ alter: true }); 
    console.log('✅ Tabelle sincronizzate e relazioni aggiornate.');

    app.listen(PORT, () => {
      console.log(`🚀 Server backend in ascolto su http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Errore avvio server:', error);
  }
}

startServer();