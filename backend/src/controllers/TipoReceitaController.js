const TipoReceita = require('../models/TipoReceita');

const TipoReceitaController = {
  async listar(req, res) {
    try {
      const { incluirInativos } = req.query;
      const itens = await TipoReceita.findAll(incluirInativos ? undefined : true);
      res.json(itens);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const item = await TipoReceita.findById(id);
      if (!item) return res.status(404).json({ error: 'Tipo de Receita não encontrado' });
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async porCategoria(req, res) {
    try {
      const { categoria } = req.params;
      const itens = await TipoReceita.findByCategoria(categoria);
      res.json(itens);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async criar(req, res) {
    try {
      const novo = await TipoReceita.create(req.body);
      res.status(201).json(novo);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const atualizado = await TipoReceita.update(id, req.body);
      res.json(atualizado);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async inativar(req, res) {
    try {
      const { id } = req.params;
      const result = await TipoReceita.inactivate(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async reativar(req, res) {
    try {
      const { id } = req.params;
      const result = await TipoReceita.reactivate(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = TipoReceitaController;