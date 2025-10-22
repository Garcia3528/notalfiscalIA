const express = require('express');
const ClassificacaoController = require('../controllers/ClassificacaoController');

const router = express.Router();
const classificacaoController = new ClassificacaoController();

/**
 * @route POST /api/classificacao/classificar
 * @desc Classifica uma despesa automaticamente
 * @body {
 *   dadosExtraidos: Object,
 *   opcoes?: {
 *     usarIA?: boolean,
 *     incluirSugestoes?: boolean,
 *     limiteSugestoes?: number
 *   }
 * }
 */
router.post('/classificar', async (req, res) => {
  await classificacaoController.classificar(req, res);
});

/**
 * @route POST /api/classificacao/lote
 * @desc Classifica múltiplas despesas em lote
 * @body {
 *   despesas: Array<{id: string, dadosExtraidos: Object}>,
 *   opcoes?: {
 *     usarIA?: boolean,
 *     incluirSugestoes?: boolean
 *   }
 * }
 */
router.post('/lote', async (req, res) => {
  await classificacaoController.classificarLote(req, res);
});

/**
 * @route POST /api/classificacao/sugestoes
 * @desc Obtém sugestões de categorias para uma despesa
 * @body {
 *   dadosExtraidos: Object,
 *   limite?: number
 * }
 */
router.post('/sugestoes', async (req, res) => {
  await classificacaoController.obterSugestoes(req, res);
});

/**
 * @route GET /api/classificacao/categorias
 * @desc Lista todas as categorias disponíveis
 */
router.get('/categorias', async (req, res) => {
  await classificacaoController.listarCategorias(req, res);
});

/**
 * @route GET /api/classificacao/categorias/:categoria
 * @desc Obtém informações detalhadas de uma categoria
 * @param {string} categoria - Código da categoria
 */
router.get('/categorias/:categoria', async (req, res) => {
  await classificacaoController.obterCategoria(req, res);
});

/**
 * @route POST /api/classificacao/feedback
 * @desc Registra feedback sobre uma classificação
 * @body {
 *   dadosExtraidos: Object,
 *   categoriaOriginal: string,
 *   categoriaCorreta: string,
 *   feedback: {
 *     correto: boolean,
 *     comentario?: string,
 *     confiancaUsuario?: number
 *   }
 * }
 */
router.post('/feedback', async (req, res) => {
  await classificacaoController.registrarFeedback(req, res);
});

/**
 * @route GET /api/classificacao/teste
 * @desc Endpoint para testar a classificação com dados de exemplo
 */
router.get('/teste', async (req, res) => {
  await classificacaoController.testar(req, res);
});

module.exports = router;