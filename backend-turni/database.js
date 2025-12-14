// database.js
const { Sequelize } = require('sequelize');

// Configurazione per SQLite
// Il database sarà un file chiamato 'database.sqlite' nella cartella del progetto
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite', // Questo è il percorso del file
  logging: false // Metti true se vuoi vedere le query nel terminale
});

module.exports = sequelize;