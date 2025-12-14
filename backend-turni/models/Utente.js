const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Utente = sequelize.define('Utente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true // Non possono esistere due utenti con lo stesso nome
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

module.exports = Utente;