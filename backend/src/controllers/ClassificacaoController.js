const ClassificacaoService = require('../services/ClassificacaoService');
const Joi = require('joi');

class ClassificacaoController {
  constructor() {}

  /**
   * Classifica uma despesa automaticamente
   */
  async classificar(req, res) {
    try {
      const apiKeyOverride = req.headers['x-gemini-key'] || req.headers['X-Gemini-Key'];
      const classificacaoService = new ClassificacaoService(apiKeyOverride);
      // Validação dos dados de entrada
      const schema = Joi.object({
        dadosExtraidos: Joi.object().required(),
        opcoes: Joi.object({
          usarIA: Joi.boolean().default(true),
          incluirSugestoes: Joi.boolean().default(false),
          limiteSugestoes: Joi.number().min(1).max(10).default(3)
        }).default({})
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.details.map(detail => detail.message),
          codigo: 'DADOS_INVALIDOS'
        });
      }

      const { dadosExtraidos, opcoes } = value;

      // Realiza a classificação prioritariamente com IA Gemini
      let resultado;
      try {
        resultado = await classificacaoService.classificarComIA(dadosExtraidos);
      } catch (e) {
        console.warn('⚠️ Falha na IA Gemini, usando fallback por regras/keywords:', e.message);
        resultado = await classificacaoService.classificarDespesa(dadosExtraidos);
      }

      // Adiciona sugestões se solicitado
      let sugestoes = [];
      if (opcoes.incluirSugestoes) {
        sugestoes = await this.classificacaoService.sugerirCategorias(
          dadosExtraidos, 
          opcoes.limiteSugestoes
        );
      }

      // Adiciona informações da categoria
      const infoCategoria = classificacaoService.obterInfoCategoria(resultado.categoria);

      res.json({
        success: true,
        data: {
          classificacao: {
            ...resultado,
            categoria_info: infoCategoria
          },
          sugestoes: sugestoes,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Erro na classificação:', error);
      
      // Identifica o tipo de erro para mensagens mais específicas
      let statusCode = 500;
      let mensagemErro = 'Erro interno do servidor';
      let codigoErro = 'ERRO_INTERNO';
      
      if (error.message && error.message.includes('Gemini')) {
        if (error.message.includes('503') || error.message.includes('overloaded') || error.message.includes('Service Unavailable')) {
          statusCode = 503;
          mensagemErro = 'Serviço de IA temporariamente indisponível';
          codigoErro = 'IA_INDISPONIVEL';
        } else if (error.message.includes('Timeout')) {
          statusCode = 504;
          mensagemErro = 'Tempo limite excedido ao consultar serviço de IA';
          codigoErro = 'IA_TIMEOUT';
        } else {
          statusCode = 502;
          mensagemErro = 'Erro ao comunicar com serviço de IA';
          codigoErro = 'IA_ERRO_COMUNICACAO';
        }
      } else if (error.message && error.message.includes('JSON')) {
        statusCode = 422;
        mensagemErro = 'Erro ao processar resposta da classificação';
        codigoErro = 'ERRO_PROCESSAMENTO';
      }
      
      res.status(statusCode).json({
        success: false,
        message: mensagemErro,
        codigo: codigoErro,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Classifica múltiplas despesas em lote
   */
  async classificarLote(req, res) {
    try {
      const apiKeyOverride = req.headers['x-gemini-key'] || req.headers['X-Gemini-Key'];
      const classificacaoService = new ClassificacaoService(apiKeyOverride);
      const schema = Joi.object({
        despesas: Joi.array().items(
          Joi.object({
            id: Joi.string().required(),
            dadosExtraidos: Joi.object().required()
          })
        ).min(1).max(50).required(),
        opcoes: Joi.object({
          usarIA: Joi.boolean().default(true),
          incluirSugestoes: Joi.boolean().default(false)
        }).default({})
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.details.map(detail => detail.message)
        });
      }

      const { despesas, opcoes } = value;
      const resultados = [];

      // Processa cada despesa
      for (const despesa of despesas) {
        try {
          // Classificação prioritária com IA Gemini por item
          let resultado;
          try {
            resultado = await classificacaoService.classificarComIA(despesa.dadosExtraidos);
          } catch (e) {
            console.warn(`⚠️ Falha na IA Gemini para despesa ${despesa.id}, usando fallback:`, e.message);
            resultado = await classificacaoService.classificarDespesa(despesa.dadosExtraidos);
          }
          const infoCategoria = classificacaoService.obterInfoCategoria(resultado.categoria);

          let sugestoes = [];
          if (opcoes.incluirSugestoes) {
            sugestoes = await this.classificacaoService.sugerirCategorias(despesa.dadosExtraidos, 3);
          }

          resultados.push({
            id: despesa.id,
            success: true,
            classificacao: {
              ...resultado,
              categoria_info: infoCategoria
            },
            sugestoes: sugestoes
          });

        } catch (error) {
          console.error(`Erro na classificação da despesa ${despesa.id}:`, error);
          resultados.push({
            id: despesa.id,
            success: false,
            error: error.message,
            classificacao: {
              categoria: 'OUTROS',
              confianca: 0.1,
              motivo: 'Erro no processamento'
            }
          });
        }
      }

      res.json({
        success: true,
        data: {
          resultados: resultados,
          resumo: {
            total: despesas.length,
            sucessos: resultados.filter(r => r.success).length,
            erros: resultados.filter(r => !r.success).length
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Erro na classificação em lote:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtém sugestões de categorias para uma despesa
   */
  async obterSugestoes(req, res) {
    try {
      const schema = Joi.object({
        dadosExtraidos: Joi.object().required(),
        limite: Joi.number().min(1).max(10).default(5)
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.details.map(detail => detail.message)
        });
      }

      const { dadosExtraidos, limite } = value;

      const sugestoes = await this.classificacaoService.sugerirCategorias(dadosExtraidos, limite);

      res.json({
        success: true,
        data: {
          sugestoes: sugestoes,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Erro ao obter sugestões:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Lista todas as categorias disponíveis
   */
  async listarCategorias(req, res) {
    try {
      const categorias = this.classificacaoService.listarCategorias();

      res.json({
        success: true,
        data: {
          categorias: categorias,
          total: categorias.length
        }
      });

    } catch (error) {
      console.error('Erro ao listar categorias:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtém informações detalhadas de uma categoria
   */
  async obterCategoria(req, res) {
    try {
      const { categoria } = req.params;

      if (!categoria) {
        return res.status(400).json({
          success: false,
          message: 'Categoria não informada'
        });
      }

      const info = this.classificacaoService.obterInfoCategoria(categoria.toUpperCase());

      if (!info || info === this.classificacaoService.obterInfoCategoria('OUTROS')) {
        return res.status(404).json({
          success: false,
          message: 'Categoria não encontrada'
        });
      }

      res.json({
        success: true,
        data: {
          categoria: categoria.toUpperCase(),
          ...info
        }
      });

    } catch (error) {
      console.error('Erro ao obter categoria:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Registra feedback sobre uma classificação
   */
  async registrarFeedback(req, res) {
    try {
      const schema = Joi.object({
        dadosExtraidos: Joi.object().required(),
        categoriaOriginal: Joi.string().required(),
        categoriaCorreta: Joi.string().required(),
        feedback: Joi.object({
          correto: Joi.boolean().required(),
          comentario: Joi.string().allow('').optional(),
          confiancaUsuario: Joi.number().min(0).max(1).optional()
        }).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.details.map(detail => detail.message)
        });
      }

      const { dadosExtraidos, categoriaOriginal, categoriaCorreta, feedback } = value;

      // Registra o feedback para aprendizado futuro
      await this.classificacaoService.aprenderClassificacao(
        dadosExtraidos,
        categoriaCorreta,
        {
          ...feedback,
          categoriaOriginal,
          timestamp: new Date().toISOString()
        }
      );

      res.json({
        success: true,
        message: 'Feedback registrado com sucesso',
        data: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Erro ao registrar feedback:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Endpoint para testar a classificação com dados de exemplo
   */
  async testar(req, res) {
    try {
      const dadosExemplo = {
        fornecedor: {
          nome: "POSTO SHELL LTDA",
          cnpj: "12.345.678/0001-90"
        },
        itens: [
          {
            descricao: "GASOLINA COMUM",
            quantidade: 30.5,
            valorUnitario: 5.89,
            valorTotal: 179.65
          }
        ],
        valorTotal: 179.65,
        dataEmissao: "2024-01-15"
      };

      // Usa IA Gemini no teste também, com fallback
      let resultado;
      try {
        resultado = await this.classificacaoService.classificarComIA(dadosExemplo);
      } catch (e) {
        console.warn('⚠️ Falha na IA Gemini no teste, usando fallback:', e.message);
        resultado = await this.classificacaoService.classificarDespesa(dadosExemplo);
      }
      const sugestoes = await this.classificacaoService.sugerirCategorias(dadosExemplo, 3);

      res.json({
        success: true,
        data: {
          dadosExemplo: dadosExemplo,
          classificacao: resultado,
          sugestoes: sugestoes,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Erro no teste de classificação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = ClassificacaoController;