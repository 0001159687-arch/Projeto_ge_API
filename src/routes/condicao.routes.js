const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/condicao.controller');

router.get('/',      controller.listarCondicoes);
router.get('/:id',   controller.buscarCondicao);
router.post('/',     controller.criarCondicao);
router.put('/:id',   controller.atualizarCondicao);
router.delete('/:id',controller.deletarCondicao);

module.exports = router;
