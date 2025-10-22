const express = require('express');
const router = express.Router();
const AnaliseController = require('../controllers/AnaliseController');

/**
 * @route POST /api/analise/verificar
 * @desc Verifica se fornecedor, faturado e tipo de despesa existem
 * @access Public
 */
router.post('/verificar', AnaliseController.verificar);

/**
 * @route POST /api/analise/registrar
 * @desc Cria entidades ausentes e registra conta a pagar
 * @access Public
 */
router.post('/registrar', AnaliseController.registrar);

module.exports = router;