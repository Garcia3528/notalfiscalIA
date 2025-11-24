// Backfill de embeddings para rag_chunks existentes (embedding NULL)
// Uso: node backend/scripts/backfill-embeddings.js
// Requisitos: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (ou ANON), GEMINI_API_KEY

require('dotenv').config();
const RAGService = require('../src/services/RAGService');
const { supabase, isSupabaseConfigured } = require('../src/config/supabase');

async function main() {
  try {
    if (!isSupabaseConfigured || !supabase) {
      console.error('Supabase não configurado. Configure SUPABASE_URL e SUPABASE_ANON_KEY no .env');
      process.exit(1);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const service = new RAGService(apiKey);
    if (!service.embedModel) {
      console.error('Modelo de embeddings indisponível. Verifique GEMINI_API_KEY.');
      process.exit(1);
    }

    const limit = parseInt(process.env.RAG_BACKFILL_LIMIT || '200', 10);
    console.log(`Iniciando backfill de embeddings (limite ${limit})...`);

    const { data: rows, error } = await supabase
      .from('rag_chunks')
      .select('id, title, content')
      .is('embedding', null)
      .limit(limit);
    if (error) throw error;

    if (!rows || rows.length === 0) {
      console.log('Nenhum rag_chunk sem embedding encontrado. Nada a fazer.');
      return;
    }

    let ok = 0, fail = 0;
    for (const row of rows) {
      try {
        const emb = await service.embedText(row.content);
        const { error: upErr } = await supabase
          .from('rag_chunks')
          .update({ embedding: emb })
          .eq('id', row.id);
        if (upErr) throw upErr;
        ok++;
        if (ok % 10 === 0) console.log(`Embeddings atualizados: ${ok}/${rows.length}`);
      } catch (e) {
        fail++;
        console.warn(`Falha ao atualizar chunk ${row.id}: ${e.message}`);
      }
    }

    console.log(`Backfill concluído. Sucesso: ${ok}, Falhas: ${fail}`);
  } catch (e) {
    console.error('Erro no backfill de embeddings:', e.message);
    process.exit(1);
  }
}

main();