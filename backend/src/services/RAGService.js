const { GoogleGenerativeAI } = require('@google/generative-ai');
const { supabase, isSupabaseConfigured } = require('../config/supabase');

class RAGService {
  constructor() {
    this.disabled = process.env.DISABLE_AI === 'true';
    this.topK = parseInt(process.env.RAG_TOP_K || '8', 10);
    this.similarityThreshold = parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.2');

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.embedModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    this.genModel = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  }

  // Util: quebra conteúdo em chunks simples por parágrafos
  chunkContent(text, maxChars = 1000) {
    if (!text) return [];
    const parts = text.split(/\n\n+/).map(t => t.trim()).filter(Boolean);
    const chunks = [];
    let buffer = '';
    for (const p of parts) {
      if ((buffer + '\n\n' + p).length <= maxChars) {
        buffer = buffer ? buffer + '\n\n' + p : p;
      } else {
        if (buffer) chunks.push(buffer);
        if (p.length <= maxChars) {
          buffer = p;
        } else {
          // fragmenta parágrafo longo
          for (let i = 0; i < p.length; i += maxChars) {
            chunks.push(p.slice(i, i + maxChars));
          }
          buffer = '';
        }
      }
    }
    if (buffer) chunks.push(buffer);
    return chunks;
  }

  async embedText(text) {
    if (this.disabled) throw new Error('IA desativada (DISABLE_AI=true)');
    const res = await this.embedModel.embedContent(text);
    return res.embedding.values;
  }

  async indexDocuments(documents) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase não configurado');
    }
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new Error('Nenhum documento para indexar');
    }

    const rowsToInsert = [];

    for (const doc of documents) {
      const title = doc.title || 'Documento';
      const content = doc.content || '';
      const metadata = doc.metadata || {};
      const chunks = this.chunkContent(content);
      for (const chunk of chunks) {
        const emb = await this.embedText(chunk);
        rowsToInsert.push({ title, content: chunk, metadata, embedding: emb });
      }
    }

    const { data, error } = await supabase.from('rag_chunks').insert(rowsToInsert).select('id');
    if (error) throw new Error('Erro ao inserir embeddings: ' + error.message);
    return { inserted: data?.length || 0 };
  }

  async retrieveByEmbeddings(question, topK = this.topK, similarityThreshold = this.similarityThreshold) {
    if (!isSupabaseConfigured || !supabase) {
      return { contexts: [] };
    }
    const queryEmbedding = await this.embedText(question);
    const { data, error } = await supabase.rpc('match_rag_chunks', {
      query_embedding: queryEmbedding,
      match_count: topK,
      similarity_threshold: similarityThreshold
    });
    if (error) throw new Error('Erro na busca por embeddings: ' + error.message);
    const contexts = (data || []).map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      metadata: row.metadata,
      score: row.score
    }));
    return { contexts };
  }

  async retrieveSimple(question, topK = 5) {
    if (!isSupabaseConfigured || !supabase) {
      return { contexts: [] };
    }
    const tokens = String(question || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(t => t.length >= 3);
    if (tokens.length === 0) return { contexts: [] };
    // monta filtro OR com ilike
    const ors = tokens.slice(0, 5).map(t => `content.ilike.%${t}%`).join(',');
    let query = supabase.from('rag_chunks').select('id,title,content,metadata').limit(topK);
    if (ors) query = query.or(ors);
    const { data, error } = await query;
    if (error) throw new Error('Erro na busca simples: ' + error.message);
    return { contexts: data || [] };
  }

  buildPrompt(question, contexts) {
    const header = `Você é um agente RAG. Responda à pergunta usando APENAS os trechos fornecidos. Cite as fontes relevantes. Se faltar informação, diga claramente.`;
    const ctxText = contexts.map((c, i) => `Fonte ${i + 1} - ${c.title}\n${c.content}`).join('\n\n');
    const prompt = `${header}\n\nPergunta:\n${question}\n\nContextos:\n${ctxText}\n\nResponda de forma estruturada, com justificativas e referências (Fonte X).`;
    return prompt;
  }

  async answerWithRAG(question, mode = 'embeddings') {
    if (this.disabled) {
      return { answer: 'IA desativada (DISABLE_AI=true).', sources: [], mode };
    }
    let contexts = [];
    if (mode === 'simple') {
      const { contexts: ctx } = await this.retrieveSimple(question);
      contexts = ctx;
    } else {
      const { contexts: ctx } = await this.retrieveByEmbeddings(question);
      contexts = ctx;
    }

    const prompt = this.buildPrompt(question, contexts);
    const result = await this.genModel.generateContent(prompt);
    const text = result.response.text();
    return { answer: text, sources: contexts, mode };
  }
}

module.exports = RAGService;