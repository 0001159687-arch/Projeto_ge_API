const catalogoModel = require('../models/catalogo.model');

exports.listarCatalogo = async (req, res) => {
    try { res.json(await catalogoModel.listarCatalogo(req.params.fornecedor_id)); }
    catch (e) { res.status(500).json({ message: e.message }); }
};

exports.adicionarAoCatalogo = async (req, res) => {
    try { res.json(await catalogoModel.adicionarAoCatalogo(req.body)); }
    catch (e) { res.status(500).json({ message: e.message }); }
};

exports.removerDoCatalogo = async (req, res) => {
    try { res.json(await catalogoModel.removerDoCatalogo(req.params.id)); }
    catch (e) { res.status(500).json({ message: e.message }); }
};

exports.atualizarPreco = async (req, res) => {
    try { res.json(await catalogoModel.atualizarPreco(req.params.id, req.body.preco_custo)); }
    catch (e) { res.status(500).json({ message: e.message }); }
};

exports.produtosDisponiveis = async (req, res) => {
    try { res.json(await catalogoModel.produtosDisponiveis(req.params.fornecedor_id)); }
    catch (e) { res.status(500).json({ message: e.message }); }
};
