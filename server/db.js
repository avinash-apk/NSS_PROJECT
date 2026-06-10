const {Pool} = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 25,
});

pool.on('connect', () => {
  console.log('Connected to Docker PostgreSQL');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
