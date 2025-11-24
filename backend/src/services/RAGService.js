const { GoogleGenerativeAI } = require('@google/generative-ai');
const { supabase, isSupabaseConfigured } = require('../config/supabase');

class RAGService {
  constructor(apiKeyOverride = null, genModelOverride = null, embedModelOverride = null) {
    this.disabled = process.env.DISABLE_AI === 'true';
    this.topK = parseInt(process.env.RAG_TOP_K || '8', 10);
    this.similarityThreshold = parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.2');

    this.apiKey = apiKeyOverride || process.env.GEMINI_API_KEY || null;
    this.genModelName = genModelOverride || process.env.GEMINI_MODEL || 'gemini-flash-latest';
    this.embedModelName = embedModelOverride || process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';

    if (!this.disabled && this.apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.embedModel = this.genAI.getGenerativeModel({ model: this.embedModelName });
        this.genModel = this.genAI.getGenerativeModel({ model: this.genModelName });
      } catch (e) {
        console.warn('Falha ao inicializar modelos Gemini no RAGService:', e.message);
        this.genAI = null;
        this.embedModel = null;
        this.genModel = null;
      }
    } else {
      this.genAI = null;
      this.embedModel = null;
      this.genModel = null;
    }
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
    if (!this.embedModel) throw new Error('Serviço de embeddings indisponível (chave ausente ou inválida)');
    const isQuotaExceeded = (err) => {
      const msg = (err && err.message) ? err.message.toLowerCase() : '';
      return msg.includes('429') || msg.includes('too many requests') || msg.includes('quota');
    };
    const isInvalidKey = (err) => {
      const msg = (err && err.message) ? err.message.toLowerCase() : '';
      return msg.includes('api key invalid') || msg.includes('api key expired') || msg.includes('permission_denied') || msg.includes("method doesn't allow unregistered callers");
    };
    try {
      const res = await this.embedModel.embedContent(text);
      return res.embedding.values;
    } catch (e) {
      if (isInvalidKey(e)) {
        throw new Error('Chave da API Gemini inválida/expirada para embeddings');
      }
      if (isQuotaExceeded(e)) {
        throw new Error('Quota de embeddings excedida');
      }
      throw e;
    }
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
    let data, error;
    try {
      const res = await supabase.rpc('match_rag_chunks', {
        query_embedding: queryEmbedding,
        match_count: topK,
        similarity_threshold: similarityThreshold
      });
      data = res.data;
      error = res.error;
    } catch (e) {
      const msg = (e && e.message) ? e.message.toLowerCase() : '';
      const isSchemaMissing = msg.includes('schema cache') || msg.includes('does not exist');
      const mentionsRag = msg.includes('rag_chunks') || msg.includes('match_rag_chunks');
      if (isSchemaMissing && mentionsRag) {
        throw new Error('Schema RAG não instalado no Supabase. Execute backend/scripts/supabase-full.sql para criar a tabela rag_chunks e a função match_rag_chunks.');
      }
      throw new Error('Erro na busca por embeddings: ' + (e.message || String(e)));
    }
    if (error) {
      const msg = (error && error.message) ? error.message.toLowerCase() : '';
      const isSchemaMissing = msg.includes('schema cache') || msg.includes('does not exist');
      const mentionsRag = msg.includes('rag_chunks') || msg.includes('match_rag_chunks');
      if (isSchemaMissing && mentionsRag) {
        throw new Error('Schema RAG não instalado no Supabase. Execute backend/scripts/supabase-full.sql para criar a tabela rag_chunks e a função match_rag_chunks.');
      }
      throw new Error('Erro na busca por embeddings: ' + error.message);
    }
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
    // monta filtro OR com ilike em content e title
    const ors = tokens.slice(0, 5).flatMap(t => [
      `content.ilike.%${t}%`,
      `title.ilike.%${t}%`
    ]).join(',');
    let query = supabase.from('rag_chunks').select('id,title,content,metadata').limit(topK);
    if (ors) query = query.or(ors);
    try {
      let { data, error } = await query;
      if (error) {
        const msg = (error && error.message) ? error.message.toLowerCase() : '';
        const isSchemaMissing = msg.includes('schema cache') || msg.includes('does not exist');
        const mentionsRag = msg.includes('rag_chunks');
        if (isSchemaMissing && mentionsRag) {
          throw new Error('Schema RAG não instalado no Supabase. Execute backend/scripts/supabase-full.sql para criar a tabela rag_chunks.');
        }
        throw new Error('Erro na busca simples: ' + error.message);
      }
      // Fallback: se nada encontrado via tokens, tenta por frase inteira no content
      if ((!data || data.length === 0) && tokens.length >= 1) {
        const phrase = String(question || '').trim();
        const { data: dataPhrase, error: errPhrase } = await supabase
          .from('rag_chunks')
          .select('id,title,content,metadata')
          .ilike('content', `%${phrase}%`)
          .limit(topK);
        if (errPhrase) {
          const msg = (errPhrase && errPhrase.message) ? errPhrase.message.toLowerCase() : '';
          const isSchemaMissing = msg.includes('schema cache') || msg.includes('does not exist');
          const mentionsRag = msg.includes('rag_chunks');
          if (isSchemaMissing && mentionsRag) {
            throw new Error('Schema RAG não instalado no Supabase. Execute backend/scripts/supabase-full.sql para criar a tabela rag_chunks.');
          }
        }
        data = dataPhrase || [];
      }
      return { contexts: data || [] };
    } catch (e) {
      const msg = (e && e.message) ? e.message.toLowerCase() : '';
      const isSchemaMissing = msg.includes('schema cache') || msg.includes('does not exist');
      const mentionsRag = msg.includes('rag_chunks');
      if (isSchemaMissing && mentionsRag) {
        throw new Error('Schema RAG não instalado no Supabase. Execute backend/scripts/supabase-full.sql para criar a tabela rag_chunks.');
      }
      throw new Error('Erro na busca simples: ' + (e.message || String(e)));
    }
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
    if (!this.genModel) {
      throw new Error('Serviço de geração indisponível (chave ausente ou inválida)');
    }
    let contexts = [];
    if (mode === 'simple') {
      const { contexts: ctx } = await this.retrieveSimple(question);
      contexts = ctx;
    } else {
      const { contexts: ctx } = await this.retrieveByEmbeddings(question);
      contexts = ctx;
      // Fallback automático: se embeddings não retornarem nada, tenta simples
      if (!contexts || contexts.length === 0) {
        const { contexts: ctxSimple } = await this.retrieveSimple(question);
        contexts = ctxSimple;
        mode = 'simple';
      }
    }

    const prompt = this.buildPrompt(question, contexts);
    const isQuotaExceeded = (err) => {
      const msg = (err && err.message) ? err.message.toLowerCase() : '';
      return msg.includes('429') || msg.includes('too many requests') || msg.includes('quota');
    };
    const isInvalidKey = (err) => {
      const msg = (err && err.message) ? err.message.toLowerCase() : '';
      return msg.includes('api key invalid') || msg.includes('api key expired') || msg.includes('permission_denied') || msg.includes("method doesn't allow unregistered callers");
    };
    try {
      const result = await this.genModel.generateContent(prompt);
      const text = result.response.text();
      if (!contexts || contexts.length === 0) {
        return {
          answer: 'Com base nos contextos disponíveis, não encontrei trechos relevantes para responder. Tente reformular a pergunta ou indexar documentos contendo os termos desejados.',
          sources: [],
          mode
        };
      }
      return { answer: text, sources: contexts, mode };
    } catch (e) {
      if (isInvalidKey(e)) {
        throw new Error('Chave da API Gemini inválida/expirada para geração');
      }
      if (isQuotaExceeded(e)) {
        throw new Error('Quota de geração excedida');
      }
      throw e;
    }
  }
}

module.exports = RAGService;