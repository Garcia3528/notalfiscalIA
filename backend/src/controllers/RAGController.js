const RAGService = require('../services/RAGService');

class RAGController {
  constructor() {
    this.service = new RAGService();
  }

  // POST /api/rag/index
  index = async (req, res) => {
    try {
      const { documents } = req.body || {};
      const result = await this.service.indexDocuments(documents || []);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  // POST /api/rag/simple
  simple = async (req, res) => {
    try {
      const { question } = req.body || {};
      if (!question) return res.status(400).json({ success: false, message: 'Pergunta é obrigatória' });
      const { answer, sources } = await this.service.answerWithRAG(question, 'simple');
      res.json({ success: true, answer, sources });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  // POST /api/rag/embeddings
  embeddings = async (req, res) => {
    try {
      const { question } = req.body || {};
      if (!question) return res.status(400).json({ success: false, message: 'Pergunta é obrigatória' });
      const { answer, sources } = await this.service.answerWithRAG(question, 'embeddings');
      res.json({ success: true, answer, sources });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}

module.exports = new RAGController();