const express = require('express');
const router = express.Router();
const FaturadoController = require('../controllers/FaturadoController');

router.get('/', FaturadoController.listar);
router.get('/buscar', FaturadoController.buscar);
router.get('/:id', FaturadoController.buscarPorId);
router.post('/', FaturadoController.criar);
router.put('/:id', FaturadoController.atualizar);
router.patch('/:id/inativar', FaturadoController.inativar);
router.patch('/:id/reativar', FaturadoController.reativar);

module.exports = router;