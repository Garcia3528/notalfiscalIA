const express = require('express');
const router = express.Router();
const TipoReceitaController = require('../controllers/TipoReceitaController');

router.get('/', TipoReceitaController.listar);
router.get('/categoria/:categoria', TipoReceitaController.porCategoria);
router.get('/:id', TipoReceitaController.buscarPorId);
router.post('/', TipoReceitaController.criar);
router.put('/:id', TipoReceitaController.atualizar);
router.patch('/:id/inativar', TipoReceitaController.inativar);
router.patch('/:id/reativar', TipoReceitaController.reativar);

module.exports = router;