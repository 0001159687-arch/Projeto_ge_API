const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/compra.controller');

router.get('/',       controller.listarCompras);
router.get('/:id',    controller.buscarCompra);
router.post('/',      controller.criarCompra);
router.put('/:id',    controller.atualizarCompra);
router.delete('/:id', controller.deletarCompra);

module.exports = router;
