const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/cidade.controller');

router.get('/',      controller.listarCidades);
router.get('/:id',   controller.buscarCidade);
router.post('/',     controller.criarCidade);
router.put('/:id',   controller.atualizarCidade);
router.delete('/:id',controller.deletarCidade);

module.exports = router;
