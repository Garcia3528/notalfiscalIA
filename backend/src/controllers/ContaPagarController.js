const ContaPagar = require('../models/ContaPagar');

const ContaPagarController = {
  async listar(req, res) {
    try {
      const { incluirInativos } = req.query;
      const contas = await ContaPagar.findAll(incluirInativos ? undefined : true);
      res.json(contas);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const conta = await ContaPagar.findWithParcelas(id);
      if (!conta) return res.status(404).json({ error: 'Conta a pagar não encontrada' });
      res.json(conta);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async criar(req, res) {
    try {
      const { parcelas = [], tiposDespesaIds = [], ...conta } = req.body;
      const created = await ContaPagar.create(conta, parcelas, tiposDespesaIds);
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const atualizado = await ContaPagar.update(id, req.body);
      res.json(atualizado);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async inativar(req, res) {
    try {
      const { id } = req.params;
      const result = await ContaPagar.inactivate(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async reativar(req, res) {
    try {
      const { id } = req.params;
      const result = await ContaPagar.reactivate(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = ContaPagarController;