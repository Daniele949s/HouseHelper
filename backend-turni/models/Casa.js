// models/Casa.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Casa = sequelize.define('Casa', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  codiceUnivoco: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true // Es: "X7K9P2"
  }
});

module.exports = Casa;