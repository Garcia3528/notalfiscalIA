const RAGService = require('../services/RAGService');

class RAGController {
  constructor() {}

  // POST /api/rag/index
  index = async (req, res) => {
    try {
      const apiKey = req.headers['x-gemini-key'] || undefined;
      const genModel = req.headers['x-gemini-model'] || undefined;
      const service = new RAGService(apiKey, genModel);
      const { documents } = req.body || {};
      const result = await service.indexDocuments(documents || []);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  // POST /api/rag/simple
  simple = async (req, res) => {
    try {
      const apiKey = req.headers['x-gemini-key'] || undefined;
      const genModel = req.headers['x-gemini-model'] || undefined;
      const service = new RAGService(apiKey, genModel);
      const { question } = req.body || {};
      if (!question) return res.status(400).json({ success: false, message: 'Pergunta é obrigatória' });
      const { answer, sources } = await service.answerWithRAG(question, 'simple');
      res.json({ success: true, answer, sources });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  // POST /api/rag/embeddings
  embeddings = async (req, res) => {
    try {
      const apiKey = req.headers['x-gemini-key'] || undefined;
      const genModel = req.headers['x-gemini-model'] || undefined;
      const service = new RAGService(apiKey, genModel);
      const { question } = req.body || {};
      if (!question) return res.status(400).json({ success: false, message: 'Pergunta é obrigatória' });
      const { answer, sources } = await service.answerWithRAG(question, 'embeddings');
      res.json({ success: true, answer, sources });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}

module.exports = new RAGController();