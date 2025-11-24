const express = require('express');
const router = express.Router();
const ContaPagarController = require('../controllers/ContaPagarController');

router.get('/', ContaPagarController.listar);
router.get('/:id', ContaPagarController.buscarPorId);
router.post('/', ContaPagarController.criar);
router.put('/:id', ContaPagarController.atualizar);
router.patch('/:id/inativar', ContaPagarController.inativar);
router.patch('/:id/reativar', ContaPagarController.reativar);

module.exports = router;