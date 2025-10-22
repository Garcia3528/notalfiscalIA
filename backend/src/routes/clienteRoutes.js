const express = require('express');
const router = express.Router();
const ClienteController = require('../controllers/ClienteController');

router.get('/', ClienteController.listar);
router.get('/buscar', ClienteController.buscar);
router.get('/:id', ClienteController.buscarPorId);
router.post('/', ClienteController.criar);
router.put('/:id', ClienteController.atualizar);
router.patch('/:id/inativar', ClienteController.inativar);
router.patch('/:id/reativar', ClienteController.reativar);

module.exports = router;