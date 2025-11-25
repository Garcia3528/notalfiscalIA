const express = require('express');
const router = express.Router();
const { createTables } = require('../../scripts/migrate');

// Proteção simples via secret em header
function isAuthorized(req) {
  const headerSecret = req.headers['x-admin-secret'] || '';
  const adminSecret = process.env.ADMIN_SECRET || process.env.JWT_SECRET || '';
  return adminSecret && headerSecret && headerSecret === adminSecret;
}

// POST /api/admin/migrate -> cria/ajusta todas as tabelas no Postgres
router.post('/migrate', async (req, res) => {
  try {
    if (!isAuthorized(req)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    await createTables();
    res.json({ success: true, message: 'Migração executada com sucesso' });
  } catch (error) {
    console.error('Erro ao executar migração:', error);
    res.status(500).json({ success: false, message: error.message || 'Erro interno' });
  }
});

module.exports = router;
