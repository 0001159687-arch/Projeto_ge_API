const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/dashboard.controller');

router.get('/admin',  controller.dashboardAdmin);
router.get('/vendas', controller.dashboardVendas);

module.exports = router;
