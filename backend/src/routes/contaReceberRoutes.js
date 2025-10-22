const express = require('express');
const router = express.Router();
const ContaReceberController = require('../controllers/ContaReceberController');

router.get('/', ContaReceberController.listar);
router.get('/:id', ContaReceberController.buscarPorId);
router.post('/', ContaReceberController.criar);
router.put('/:id', ContaReceberController.atualizar);
router.patch('/:id/inativar', ContaReceberController.inativar);
router.patch('/:id/reativar', ContaReceberController.reativar);

module.exports = router;