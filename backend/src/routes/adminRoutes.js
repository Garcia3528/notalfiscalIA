const express = require('express');
const router = express.Router();
const { createTables } = require('../../scripts/migrate');
const RAGService = require('../services/RAGService');
const { supabase, isSupabaseConfigured } = require('../config/supabase');

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

// POST /api/admin/rag/backfill -> gera embeddings para rag_chunks com embedding NULL
router.post('/rag/backfill', async (req, res) => {
  try {
    if (!isAuthorized(req)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!isSupabaseConfigured || !supabase) {
      return res.status(503).json({ success: false, message: 'Supabase não configurado' });
    }

    const apiKey = req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'GEMINI_API_KEY ausente (header X-Gemini-Key ou variável de ambiente)' });
    }

    const limit = parseInt(req.body?.limit || '200', 10);
    const service = new RAGService(apiKey);

    const { data: rows, error } = await supabase
      .from('rag_chunks')
      .select('id, content')
      .is('embedding', null)
      .limit(limit);

    if (error) {
      return res.status(500).json({ success: false, message: 'Erro ao listar chunks: ' + error.message });
    }

    if (!rows || rows.length === 0) {
      return res.json({ success: true, processed: 0, message: 'Nenhum rag_chunk sem embedding encontrado.' });
    }

    let ok = 0, fail = 0;
    for (const row of rows) {
      try {
        const emb = await service.embedText(row.content || '');
        const { error: updErr } = await supabase
          .from('rag_chunks')
          .update({ embedding: emb })
          .eq('id', row.id);
        if (updErr) throw new Error(updErr.message);
        ok++;
      } catch (e) {
        fail++;
      }
    }

    return res.json({ success: true, processed: rows.length, updated: ok, failed: fail });
  } catch (error) {
    console.error('Erro no backfill de embeddings:', error);
    res.status(500).json({ success: false, message: error.message || 'Erro interno' });
  }
});
