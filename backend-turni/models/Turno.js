const { DataTypes } = require('sequelize');
const sequelize = require('../database'); // Importiamo la connessione

const Turno = sequelize.define('Turno', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nomi: {
    type: DataTypes.JSON, // MySQL salverà l'array ["Mario", "Luigi"] come JSON
    allowNull: false
  },
  data: {
    type: DataTypes.DATE,
    allowNull: false
  },
  luoghi: {
    type: DataTypes.JSON,
    allowNull: false
  },
  procedura: {
    type: DataTypes.JSON,
    allowNull: false
  },
  fasciaOraria: {
    type: DataTypes.JSON,
    allowNull: false
  }
});

module.exports = Turno;