const fornecedorModel = require('../models/fornecedor.model');

exports.listarFornecedores = async (req, res) => {
    try { res.json(await fornecedorModel.listarFornecedores()); }
    catch (e) { res.status(500).json(e); }
};

exports.buscarFornecedor = async (req, res) => {
    try {
        const f = await fornecedorModel.buscarFornecedorPorId(req.params.id);
        if (!f) return res.status(404).json({ message: 'Fornecedor não encontrado' });
        res.json(f);
    } catch (e) { res.status(500).json(e); }
};

exports.criarFornecedor = async (req, res) => {
    try { res.json(await fornecedorModel.criarFornecedor(req.body)); }
    catch (e) { res.status(500).json({ message: e.message || 'Erro ao criar fornecedor' }); }
};

exports.atualizarFornecedor = async (req, res) => {
    try { res.json(await fornecedorModel.atualizarFornecedor(req.params.id, req.body)); }
    catch (e) { res.status(500).json(e); }
};

exports.deletarFornecedor = async (req, res) => {
    try { res.json(await fornecedorModel.deletarFornecedor(req.params.id)); }
    catch (e) { res.status(500).json(e); }
};
