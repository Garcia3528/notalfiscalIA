const { Pool } = require('pg');
require('dotenv').config();

const hasDbUrl = !!process.env.DATABASE_URL;
const hasSeparateConfig = !!(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);
const isProduction = process.env.NODE_ENV === 'production';

let pool = null;
let isDatabaseConfigured = false;

if (hasDbUrl) {
  // Preferir conexão por URL única quando disponível (e.g., Render Postgres)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  isDatabaseConfigured = true;
  console.log('🗄️ Usando DATABASE_URL para conexão com PostgreSQL');
} else if (hasSeparateConfig || !isProduction) {
  // Em desenvolvimento, permitir defaults locais; em produção, apenas se variáveis estiverem definidas
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    database: process.env.DB_NAME || 'nota_fiscal_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  isDatabaseConfigured = !!process.env.DB_HOST || !isProduction;
  console.log('🗄️ Usando configuração separada de PostgreSQL');
} else {
  console.warn('⚠️ Banco de dados PostgreSQL não configurado. Evitando criar pool em produção.');
}

if (pool) {
  // Listeners de pool apenas quando configurado
  pool.on('connect', () => {
    console.log('✅ Conectado ao banco de dados PostgreSQL');
  });

  pool.on('error', (err) => {
    console.error('❌ Erro na conexão com o banco de dados:', err);
    // Não derrubar o processo automaticamente; permitir resposta graciosa
  });
}

function safeQuery(text, params) {
  if (!pool) {
    const error = new Error('DATABASE_NOT_CONFIGURED');
    error.code = 'DATABASE_NOT_CONFIGURED';
    throw error;
  }
  return pool.query(text, params);
}

module.exports = {
  pool,
  isDatabaseConfigured,
  query: safeQuery,
};
