const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/pedido.controller');

router.get('/',      controller.listarPedidos);
router.get('/:id',   controller.buscarPedido);
router.post('/',     controller.criarPedido);
router.put('/:id',   controller.atualizarPedido);
router.delete('/:id',controller.deletarPedido);

module.exports = router;
