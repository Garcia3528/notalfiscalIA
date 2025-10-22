const Cliente = require('../models/Cliente');

const ClienteController = {
  async listar(req, res) {
    try {
      const { incluirInativos } = req.query;
      const clientes = await Cliente.findAll(incluirInativos ? undefined : true);
      res.json(clientes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const cliente = await Cliente.findById(id);
      if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });
      res.json(cliente);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async buscar(req, res) {
    try {
      const { q } = req.query;
      const resultados = await Cliente.search(q || '');
      res.json(resultados);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async criar(req, res) {
    try {
      const novo = await Cliente.create(req.body);
      res.status(201).json(novo);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const atualizado = await Cliente.update(id, req.body);
      res.json(atualizado);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async inativar(req, res) {
    try {
      const { id } = req.params;
      const result = await Cliente.inactivate(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async reativar(req, res) {
    try {
      const { id } = req.params;
      const result = await Cliente.reactivate(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = ClienteController;