const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/fornecedor.controller');

router.get('/',       controller.listarFornecedores);
router.get('/:id',    controller.buscarFornecedor);
router.post('/',      controller.criarFornecedor);
router.put('/:id',    controller.atualizarFornecedor);
router.delete('/:id', controller.deletarFornecedor);

module.exports = router;
