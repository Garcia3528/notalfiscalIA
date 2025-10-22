const TipoDespesa = require('../models/TipoDespesa');
const Joi = require('joi');

// Schema de validação para tipo de despesa
const tipoDespesaSchema = Joi.object({
  nome: Joi.string().required().min(2).max(100).messages({
    'string.empty': 'Nome é obrigatório',
    'string.min': 'Nome deve ter pelo menos 2 caracteres',
    'string.max': 'Nome deve ter no máximo 100 caracteres'
  }),
  descricao: Joi.string().allow('', null).max(500).messages({
    'string.max': 'Descrição deve ter no máximo 500 caracteres'
  }),
  categoria: Joi.string().valid(
    'Operacional',
    'Administrativa',
    'Comercial',
    'Financeira',
    'Tributária',
    'Pessoal',
    'Infraestrutura',
    'Marketing',
    'Tecnologia',
    'Outros'
  ).required().messages({
    'any.only': 'Categoria deve ser uma das opções válidas',
    'string.empty': 'Categoria é obrigatória'
  }),
  palavras_chave: Joi.array().items(Joi.string().min(2).max(50)).max(20).messages({
    'array.max': 'Máximo 20 palavras-chave permitidas',
    'string.min': 'Palavra-chave deve ter pelo menos 2 caracteres',
    'string.max': 'Palavra-chave deve ter no máximo 50 caracteres'
  }),
  ativo: Joi.boolean().default(true)
});

const tipoDespesaUpdateSchema = tipoDespesaSchema.fork(['nome', 'categoria'], (schema) => schema.optional());

class TipoDespesaController {
  async listar(req, res) {
    try {
      const { page = 1, limit = 10, search, categoria, ativo } = req.query;
      
      // Validar parâmetros de paginação
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      
      let tiposDespesa;
      
      if (search) {
        tiposDespesa = await TipoDespesa.search(search);
      } else {
        tiposDespesa = await TipoDespesa.findAll();
      }
      
      // Filtrar por categoria se especificado
      if (categoria) {
        tiposDespesa = tiposDespesa.filter(t => t.categoria === categoria);
      }
      
      // Filtrar por status ativo se especificado
      if (ativo !== undefined) {
        const isAtivo = ativo === 'true';
        tiposDespesa = tiposDespesa.filter(t => t.ativo === isAtivo);
      }
      
      // Implementar paginação
      const total = tiposDespesa.length;
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedTipos = tiposDespesa.slice(startIndex, endIndex);
      
      res.json({
        success: true,
        data: paginatedTipos,
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
      console.error('Erro ao listar tipos de despesa:', error);
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
      
      const tipoDespesa = await TipoDespesa.buscarPorId(parseInt(id));
      
      if (!tipoDespesa) {
        return res.status(404).json({
          success: false,
          message: 'Tipo de despesa não encontrado'
        });
      }
      
      res.json({
        success: true,
        data: tipoDespesa
      });
    } catch (error) {
      console.error('Erro ao buscar tipo de despesa:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  async criar(req, res) {
    try {
      // Validar dados de entrada
      const { error, value } = tipoDespesaSchema.validate(req.body);
      
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
      
      // Verificar se nome já existe
      const tipoExistente = await TipoDespesa.search(value.nome);
      const nomeExiste = tipoExistente.some(tipo => 
        tipo.nome.toLowerCase() === value.nome.toLowerCase()
      );
      
      if (nomeExiste) {
        return res.status(409).json({
          success: false,
          message: 'Já existe um tipo de despesa com este nome'
        });
      }
      
      const tipoDespesa = await TipoDespesa.criar(value);
      
      res.status(201).json({
        success: true,
        message: 'Tipo de despesa criado com sucesso',
        data: tipoDespesa
      });
    } catch (error) {
      console.error('Erro ao criar tipo de despesa:', error);
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
      const { error, value } = tipoDespesaUpdateSchema.validate(req.body);
      
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
      
      // Verificar se tipo de despesa existe
      const tipoExistente = await TipoDespesa.buscarPorId(parseInt(id));
      if (!tipoExistente) {
        return res.status(404).json({
          success: false,
          message: 'Tipo de despesa não encontrado'
        });
      }
      
      // Se nome foi alterado, verificar se não existe outro tipo com o mesmo nome
      if (value.nome && value.nome.toLowerCase() !== tipoExistente.nome.toLowerCase()) {
        const tiposComMesmoNome = await TipoDespesa.search(value.nome);
        const nomeExiste = tiposComMesmoNome.some(tipo => 
          tipo.nome.toLowerCase() === value.nome.toLowerCase() && tipo.id !== parseInt(id)
        );
        
        if (nomeExiste) {
          return res.status(409).json({
            success: false,
            message: 'Já existe outro tipo de despesa com este nome'
          });
        }
      }
      
      const tipoDespesa = await TipoDespesa.atualizar(parseInt(id), value);
      
      res.json({
        success: true,
        message: 'Tipo de despesa atualizado com sucesso',
        data: tipoDespesa
      });
    } catch (error) {
      console.error('Erro ao atualizar tipo de despesa:', error);
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
      
      const tipoDespesa = await TipoDespesa.buscarPorId(parseInt(id));
      if (!tipoDespesa) {
        return res.status(404).json({
          success: false,
          message: 'Tipo de despesa não encontrado'
        });
      }
      
      if (!tipoDespesa.ativo) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de despesa já está inativo'
        });
      }
      
      await TipoDespesa.inativar(parseInt(id));
      
      res.json({
        success: true,
        message: 'Tipo de despesa inativado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao inativar tipo de despesa:', error);
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
      
      const tipoDespesa = await TipoDespesa.buscarPorId(parseInt(id));
      if (!tipoDespesa) {
        return res.status(404).json({
          success: false,
          message: 'Tipo de despesa não encontrado'
        });
      }
      
      if (tipoDespesa.ativo) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de despesa já está ativo'
        });
      }
      
      await TipoDespesa.reativar(parseInt(id));
      
      res.json({
        success: true,
        message: 'Tipo de despesa reativado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao reativar tipo de despesa:', error);
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
      
      const tiposDespesa = await TipoDespesa.search(termo.trim());
      
      res.json({
        success: true,
        data: tiposDespesa
      });
    } catch (error) {
      console.error('Erro ao buscar tipos de despesa:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  async obterCategorias(req, res) {
    try {
      const categorias = await TipoDespesa.obterCategorias();
      
      res.json({
        success: true,
        data: categorias
      });
    } catch (error) {
      console.error('Erro ao obter categorias:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  async classificarDespesa(req, res) {
    try {
      const { descricao } = req.body;
      
      if (!descricao || descricao.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Descrição deve ter pelo menos 3 caracteres'
        });
      }
      
      const tipoDespesa = await TipoDespesa.classificarDespesa(descricao.trim());
      
      res.json({
        success: true,
        data: tipoDespesa,
        message: tipoDespesa ? 'Classificação encontrada' : 'Nenhuma classificação automática encontrada'
      });
    } catch (error) {
      console.error('Erro ao classificar despesa:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = new TipoDespesaController();