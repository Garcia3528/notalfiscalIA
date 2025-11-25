const ContaPagar = require('../models/ContaPagar');

const ContaPagarController = {
  async listar(req, res) {
    try {
      const { incluirInativos } = req.query;
      const contas = await ContaPagar.findAll(incluirInativos ? undefined : true);
      res.json(contas);
    } catch (error) {
      console.error('Erro ao listar contas a pagar:', error);
      if (error?.code === 'DATABASE_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          message: 'Banco de dados não configurado no servidor. Defina DATABASE_URL ou variáveis DB_*.'
        });
      }
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  },

  async buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const conta = await ContaPagar.findWithParcelas(id);
      if (!conta) return res.status(404).json({ error: 'Conta a pagar não encontrada' });
      res.json(conta);
    } catch (error) {
      console.error('Erro ao buscar conta a pagar:', error);
      if (error?.code === 'DATABASE_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          message: 'Banco de dados não configurado no servidor. Defina DATABASE_URL ou variáveis DB_*.'
        });
      }
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  },

  async criar(req, res) {
    try {
      const { parcelas = [], tiposDespesaIds = [], ...conta } = req.body;
      const created = await ContaPagar.create(conta, parcelas, tiposDespesaIds);
      res.status(201).json(created);
    } catch (error) {
      console.error('Erro ao criar conta a pagar:', error);
      if (error?.code === 'DATABASE_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          message: 'Banco de dados não configurado no servidor. Defina DATABASE_URL ou variáveis DB_*.'
        });
      }
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  },

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const atualizado = await ContaPagar.update(id, req.body);
      res.json(atualizado);
    } catch (error) {
      console.error('Erro ao atualizar conta a pagar:', error);
      if (error?.code === 'DATABASE_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          message: 'Banco de dados não configurado no servidor. Defina DATABASE_URL ou variáveis DB_*.'
        });
      }
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  },

  async inativar(req, res) {
    try {
      const { id } = req.params;
      const result = await ContaPagar.inactivate(id);
      res.json(result);
    } catch (error) {
      console.error('Erro ao inativar conta a pagar:', error);
      if (error?.code === 'DATABASE_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          message: 'Banco de dados não configurado no servidor. Defina DATABASE_URL ou variáveis DB_*.'
        });
      }
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  },

  async reativar(req, res) {
    try {
      const { id } = req.params;
      const result = await ContaPagar.reactivate(id);
      res.json(result);
    } catch (error) {
      console.error('Erro ao reativar conta a pagar:', error);
      if (error?.code === 'DATABASE_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          message: 'Banco de dados não configurado no servidor. Defina DATABASE_URL ou variáveis DB_*.'
        });
      }
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  },
};

module.exports = ContaPagarController;
