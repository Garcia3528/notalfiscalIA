const Faturado = require('../models/Faturado');

const FaturadoController = {
  async listar(req, res) {
    try {
      const { incluirInativos } = req.query;
      const itens = await Faturado.findAll(incluirInativos ? undefined : true);
      res.json(itens);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const item = await Faturado.findById(id);
      if (!item) return res.status(404).json({ error: 'Faturado não encontrado' });
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async buscar(req, res) {
    try {
      const { q } = req.query;
      const resultados = await Faturado.search(q || '');
      res.json(resultados);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async criar(req, res) {
    try {
      const payload = { ...req.body, ativo: true };
      const novo = await Faturado.create(payload);
      res.status(201).json(novo);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const atualizado = await Faturado.update(id, req.body);
      res.json(atualizado);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async inativar(req, res) {
    try {
      const { id } = req.params;
      const result = await Faturado.inactivate(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async reativar(req, res) {
    try {
      const { id } = req.params;
      const result = await Faturado.reactivate(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = FaturadoController;