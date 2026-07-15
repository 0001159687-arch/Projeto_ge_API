const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/catalogo.controller');

router.get('/fornecedor/:fornecedor_id',           controller.listarCatalogo);
router.get('/fornecedor/:fornecedor_id/disponiveis', controller.produtosDisponiveis);
router.post('/',                                   controller.adicionarAoCatalogo);
router.put('/:id',                                 controller.atualizarPreco);
router.delete('/:id',                              controller.removerDoCatalogo);

module.exports = router;
