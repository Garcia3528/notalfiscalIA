const ContaReceber = require('../models/ContaReceber');

const ContaReceberController = {
  async listar(req, res) {
    try {
      const { status, incluirInativos } = req.query;
      const contas = await ContaReceber.findAll({ ativo: incluirInativos ? undefined : true, status });
      res.json(contas);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const conta = await ContaReceber.findWithParcelas(id);
      if (!conta) return res.status(404).json({ error: 'Conta a receber não encontrada' });
      res.json(conta);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async criar(req, res) {
    try {
      const created = await ContaReceber.create(req.body);
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const atualizado = await ContaReceber.update(id, req.body);
      res.json(atualizado);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async inativar(req, res) {
    try {
      const { id } = req.params;
      const result = await ContaReceber.inactivate(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async reativar(req, res) {
    try {
      const { id } = req.params;
      const result = await ContaReceber.reactivate(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = ContaReceberController;