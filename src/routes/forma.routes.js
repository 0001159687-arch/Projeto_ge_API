const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/forma.controller');

router.get('/',      controller.listarFormas);
router.get('/:id',   controller.buscarForma);
router.post('/',     controller.criarForma);
router.put('/:id',   controller.atualizarForma);
router.delete('/:id',controller.deletarForma);

module.exports = router;
