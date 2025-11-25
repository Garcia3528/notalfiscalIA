const Fornecedor = require('../models/Fornecedor');
const Joi = require('joi');

// Schema de validação para fornecedor
const fornecedorSchema = Joi.object({
  razao_social: Joi.string().required().min(2).max(255).messages({
    'string.empty': 'Razão social é obrigatória',
    'string.min': 'Razão social deve ter pelo menos 2 caracteres',
    'string.max': 'Razão social deve ter no máximo 255 caracteres'
  }),
  nome_fantasia: Joi.string().allow('', null).max(255).messages({
    'string.max': 'Nome fantasia deve ter no máximo 255 caracteres'
  }),
  cnpj: Joi.string().required().pattern(/^\d{14}$/).messages({
    'string.empty': 'CNPJ é obrigatório',
    'string.pattern.base': 'CNPJ deve conter exatamente 14 dígitos'
  }),
  endereco: Joi.string().allow('', null).max(500).messages({
    'string.max': 'Endereço deve ter no máximo 500 caracteres'
  }),
  telefone: Joi.string().allow('', null).max(20).messages({
    'string.max': 'Telefone deve ter no máximo 20 caracteres'
  }),
  email: Joi.string().email().allow('', null).max(255).messages({
    'string.email': 'Email deve ter um formato válido',
    'string.max': 'Email deve ter no máximo 255 caracteres'
  }),
  ativo: Joi.boolean().default(true)
});

const fornecedorUpdateSchema = fornecedorSchema.fork(['cnpj'], (schema) => schema.optional());

class FornecedorController {
  async listar(req, res) {
    try {
      const { page = 1, limit = 10, search, ativo } = req.query;
      
      // Validar parâmetros de paginação
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      
      let fornecedores;
      
      if (search) {
        fornecedores = await Fornecedor.search(search);
      } else {
        fornecedores = await Fornecedor.findAll();
      }
      
      // Filtrar por status ativo se especificado
      if (ativo !== undefined) {
        const isAtivo = ativo === 'true';
        fornecedores = fornecedores.filter(f => f.ativo === isAtivo);
      }
      
      // Implementar paginação
      const total = fornecedores.length;
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedFornecedores = fornecedores.slice(startIndex, endIndex);
      
      res.json({
        success: true,
        data: paginatedFornecedores,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: endIndex < total,
          hasPrev: pageNum > 1
        }
      });
    } catch (error) {
      console.error('Erro ao listar fornecedores:', error);
      if (error?.code === 'DATABASE_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          message: 'Banco de dados não configurado no servidor. Defina DATABASE_URL ou variáveis DB_*.'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  async buscarPorId(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }
      
      const fornecedor = await Fornecedor.buscarPorId(parseInt(id));
      
      if (!fornecedor) {
        return res.status(404).json({
          success: false,
          message: 'Fornecedor não encontrado'
        });
      }
      
      res.json({
        success: true,
        data: fornecedor
      });
    } catch (error) {
      console.error('Erro ao buscar fornecedor:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  async criar(req, res) {
    try {
      // Validar dados de entrada
      const { error, value } = fornecedorSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }
      
      // Verificar se CNPJ já existe
        const fornecedorExistente = await Fornecedor.findByCnpj(value.cnpj);
        if (fornecedorExistente) {
        return res.status(409).json({
          success: false,
          message: 'CNPJ já cadastrado'
        });
      }
      
      const fornecedor = await Fornecedor.criar(value);
      
      res.status(201).json({
        success: true,
        message: 'Fornecedor criado com sucesso',
        data: fornecedor
      });
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      if (error?.code === 'DATABASE_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          message: 'Banco de dados não configurado no servidor. Defina DATABASE_URL ou variáveis DB_*.'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }
      
      // Validar dados de entrada
      const { error, value } = fornecedorUpdateSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }
      
      // Verificar se fornecedor existe
      const fornecedorExistente = await Fornecedor.buscarPorId(parseInt(id));
      if (!fornecedorExistente) {
        return res.status(404).json({
          success: false,
          message: 'Fornecedor não encontrado'
        });
      }
      
      // Se CNPJ foi alterado, verificar se não existe outro fornecedor com o mesmo CNPJ
      if (value.cnpj && value.cnpj !== fornecedorExistente.cnpj) {
        const cnpjExistente = await Fornecedor.findByCnpj(value.cnpj);
        if (cnpjExistente) {
          return res.status(409).json({
            success: false,
            message: 'CNPJ já cadastrado para outro fornecedor'
          });
        }
      }
      
      const fornecedor = await Fornecedor.atualizar(parseInt(id), value);
      
      res.json({
        success: true,
        message: 'Fornecedor atualizado com sucesso',
        data: fornecedor
      });
    } catch (error) {
      console.error('Erro ao atualizar fornecedor:', error);
      if (error?.code === 'DATABASE_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          message: 'Banco de dados não configurado no servidor. Defina DATABASE_URL ou variáveis DB_*.'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  async inativar(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }
      
      const fornecedor = await Fornecedor.buscarPorId(parseInt(id));
      if (!fornecedor) {
        return res.status(404).json({
          success: false,
          message: 'Fornecedor não encontrado'
        });
      }
      
      if (!fornecedor.ativo) {
        return res.status(400).json({
          success: false,
          message: 'Fornecedor já está inativo'
        });
      }
      
      await Fornecedor.inativar(parseInt(id));
      
      res.json({
        success: true,
        message: 'Fornecedor inativado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao inativar fornecedor:', error);
      if (error?.code === 'DATABASE_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          message: 'Banco de dados não configurado no servidor. Defina DATABASE_URL ou variáveis DB_*.'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  async reativar(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }
      
      const fornecedor = await Fornecedor.buscarPorId(parseInt(id));
      if (!fornecedor) {
        return res.status(404).json({
          success: false,
          message: 'Fornecedor não encontrado'
        });
      }
      
      if (fornecedor.ativo) {
        return res.status(400).json({
          success: false,
          message: 'Fornecedor já está ativo'
        });
      }
      
      await Fornecedor.reativar(parseInt(id));
      
      res.json({
        success: true,
        message: 'Fornecedor reativado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao reativar fornecedor:', error);
      if (error?.code === 'DATABASE_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          message: 'Banco de dados não configurado no servidor. Defina DATABASE_URL ou variáveis DB_*.'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  async buscar(req, res) {
    try {
      const { termo } = req.query;
      
      if (!termo || termo.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Termo de busca deve ter pelo menos 2 caracteres'
        });
      }
      
      const fornecedores = await Fornecedor.search(termo.trim());
      
      res.json({
        success: true,
        data: fornecedores
      });
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      if (error?.code === 'DATABASE_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          message: 'Banco de dados não configurado no servidor. Defina DATABASE_URL ou variáveis DB_*.'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = new FornecedorController();
