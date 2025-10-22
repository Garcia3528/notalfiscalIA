const express = require('express');
const router = express.Router();
const TipoDespesaController = require('../controllers/TipoDespesaController');

/**
 * @route GET /api/tipos-despesa
 * @desc Listar tipos de despesa com paginação e filtros
 * @access Public
 * @query page - Número da página (padrão: 1)
 * @query limit - Itens por página (padrão: 10, máximo: 100)
 * @query search - Termo de busca
 * @query categoria - Filtrar por categoria
 * @query ativo - Filtrar por status ativo (true/false)
 */
router.get('/', TipoDespesaController.listar);

/**
 * @route GET /api/tipos-despesa/categorias
 * @desc Obter lista de categorias disponíveis
 * @access Public
 */
router.get('/categorias', TipoDespesaController.obterCategorias);

/**
 * @route GET /api/tipos-despesa/buscar
 * @desc Buscar tipos de despesa por termo
 * @access Public
 * @query termo - Termo de busca (mínimo 2 caracteres)
 */
router.get('/buscar', TipoDespesaController.buscar);

/**
 * @route POST /api/tipos-despesa/classificar
 * @desc Classificar despesa automaticamente
 * @access Public
 * @body descricao - Descrição da despesa para classificação
 */
router.post('/classificar', TipoDespesaController.classificarDespesa);

/**
 * @route GET /api/tipos-despesa/:id
 * @desc Buscar tipo de despesa por ID
 * @access Public
 */
router.get('/:id', TipoDespesaController.buscarPorId);

/**
 * @route POST /api/tipos-despesa
 * @desc Criar novo tipo de despesa
 * @access Public
 */
router.post('/', TipoDespesaController.criar);

/**
 * @route PUT /api/tipos-despesa/:id
 * @desc Atualizar tipo de despesa
 * @access Public
 */
router.put('/:id', TipoDespesaController.atualizar);

/**
 * @route PATCH /api/tipos-despesa/:id/inativar
 * @desc Inativar tipo de despesa
 * @access Public
 */
router.patch('/:id/inativar', TipoDespesaController.inativar);

/**
 * @route PATCH /api/tipos-despesa/:id/reativar
 * @desc Reativar tipo de despesa
 * @access Public
 */
router.patch('/:id/reativar', TipoDespesaController.reativar);

module.exports = router;