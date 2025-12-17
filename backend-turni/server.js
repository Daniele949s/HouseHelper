// server.js
const express = require('express');
const cors = require('cors');
const sequelize = require('./database');

// --- IMPORTAZIONE MODELLI ---
const Turno = require('./models/Turno');
const Utente = require('./models/Utente');
const Casa = require('./models/Casa');
const Debito = require('./models/Debito');
const Nota = require('./models/Nota');

// --- IMPORTAZIONE ROTTE ---
const routes = require('./routes');

// --- DEFINIZIONE RELAZIONI (ASSOCIAZIONI) ---

// 1. Relazione Casa - Utenti
Casa.hasMany(Utente);
Utente.belongsTo(Casa);

// 2. Relazione Casa - Turni
Casa.hasMany(Turno);
Turno.belongsTo(Casa);

// 3. Relazione Casa - Debiti
Casa.hasMany(Debito);
Debito.belongsTo(Casa);

// 4. Relazione Utenti - Debiti
Utente.hasMany(Debito, { as: 'Crediti', foreignKey: 'CreditoreId' });
Utente.hasMany(Debito, { as: 'Debiti', foreignKey: 'DebitoreId' });

Debito.belongsTo(Utente, { as: 'Creditore', foreignKey: 'CreditoreId' });
Debito.belongsTo(Utente, { as: 'Debitore', foreignKey: 'DebitoreId' });

// 5. Relazione Bacheca
Casa.hasMany(Nota);
Nota.belongsTo(Casa);

Utente.hasMany(Nota, { as: 'NoteScritte', foreignKey: 'AutoreId' });
Nota.belongsTo(Utente, { as: 'Autore', foreignKey: 'AutoreId' });

// --- CONFIGURAZIONE SERVER ---
const app = express();

// MODIFICA FONDAMENTALE PER RENDER: La porta deve essere letta dall'ambiente
const PORT = process.env.PORT || 5000;

// Configurazione CORS per Produzione
const allowedOrigins = [
  'http://localhost:3000', // Per i test sul tuo PC
  // Quando avrai il link del frontend su Render (es. https://househelper-app.onrender.com), incollalo qui sotto:
];

app.use(cors({
  origin: function (origin, callback) {
    // Il "|| true" finale permette temporaneamente l'accesso a tutti.
    // Una volta che tutto funziona, potrai rimuoverlo per maggiore sicurezza.
    if (!origin || allowedOrigins.includes(origin) || true) {
      callback(null, true);
    } else {
      callback(new Error('Non consentito da CORS'));
    }
  }
}));

app.use(express.json());

// Collega le rotte con prefisso /api
app.use('/api', routes);

// Rotta base di test (utile per capire se il server su Render è vivo)
app.get('/', (req, res) => {
  res.send('Server HouseHelper attivo e funzionante!');
});

// --- AVVIO SERVER E DB ---
async function startServer() {
  try {
    // Verifica connessione al DB (Postgres su Render o SQLite locale)
    await sequelize.authenticate();
    console.log('✅ Connessione al database riuscita.');

    // Sincronizza i modelli
    await sequelize.sync({ alter: true }); 
    console.log('✅ Tabelle sincronizzate.');

    // Ascolta sulla porta dinamica
    app.listen(PORT, () => {
      console.log(`🚀 Server backend in ascolto sulla porta ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Errore avvio server:', error);
  }
}

startServer();