// models/Nota.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Nota = sequelize.define('Nota', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  titolo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contenuto: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  // La data diventa opzionale: se c'è, finisce nel calendario!
  data: {
    type: DataTypes.DATEONLY, 
    allowNull: true 
  }
}, {
    // Abilitiamo i timestamp automatici per sapere quando è stata CREATA la nota
    // (indipendentemente dalla data dell'evento)
    timestamps: true 
});

module.exports = Nota;