// database.js
const { Sequelize } = require('sequelize');

// Se siamo su Render (o un altro cloud) esiste la variabile DATABASE_URL
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false // Necessario per Render
        }
      }
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: './database.sqlite', // File locale per sviluppo
      logging: false
    });

module.exports = sequelize;