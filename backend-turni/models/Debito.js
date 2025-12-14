// models/Debito.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Debito = sequelize.define('Debito', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  importo: {
    type: DataTypes.FLOAT, // O DECIMAL per precisione
    allowNull: false
  },
  descrizione: {
    type: DataTypes.STRING,
    allowNull: false // Es: "Bolletta Luce", "Pizza"
  },
  data: {
    type: DataTypes.DATEONLY, // Ci basta la data senza ora
    allowNull: false
  },
  saldato: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

module.exports = Debito;