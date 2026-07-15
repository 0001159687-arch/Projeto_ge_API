const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/produto.controller');

router.get('/',      controller.listarProdutos);
router.get('/:id',   controller.buscarProduto);
router.post('/',     controller.criarProduto);
router.put('/:id',   controller.atualizarProduto);
router.delete('/:id',controller.deletarProduto);

module.exports = router;
