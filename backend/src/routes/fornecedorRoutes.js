const express = require('express');
const router = express.Router();
const FornecedorController = require('../controllers/FornecedorController');

/**
 * @route GET /api/fornecedores
 * @desc Listar fornecedores com paginação e filtros
 * @access Public
 * @query page - Número da página (padrão: 1)
 * @query limit - Itens por página (padrão: 10, máximo: 100)
 * @query search - Termo de busca
 * @query ativo - Filtrar por status ativo (true/false)
 */
router.get('/', FornecedorController.listar);

/**
 * @route GET /api/fornecedores/buscar
 * @desc Buscar fornecedores por termo
 * @access Public
 * @query termo - Termo de busca (mínimo 2 caracteres)
 */
router.get('/buscar', FornecedorController.buscar);

/**
 * @route GET /api/fornecedores/:id
 * @desc Buscar fornecedor por ID
 * @access Public
 */
router.get('/:id', FornecedorController.buscarPorId);

/**
 * @route POST /api/fornecedores
 * @desc Criar novo fornecedor
 * @access Public
 */
router.post('/', FornecedorController.criar);

/**
 * @route PUT /api/fornecedores/:id
 * @desc Atualizar fornecedor
 * @access Public
 */
router.put('/:id', FornecedorController.atualizar);

/**
 * @route PATCH /api/fornecedores/:id/inativar
 * @desc Inativar fornecedor
 * @access Public
 */
router.patch('/:id/inativar', FornecedorController.inativar);

/**
 * @route PATCH /api/fornecedores/:id/reativar
 * @desc Reativar fornecedor
 * @access Public
 */
router.patch('/:id/reativar', FornecedorController.reativar);

module.exports = router;