const compraModel = require('../models/compra.model');

exports.listarCompras = async (req, res) => {
    try {
        const compras = await compraModel.listarCompras();
        res.json(compras);
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.buscarCompra = async (req, res) => {
    try {
        const compra = await compraModel.buscarCompraPorId(req.params.id);
        if (!compra) return res.status(404).json({ message: 'Compra não encontrada' });
        res.json(compra);
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.criarCompra = async (req, res) => {
    try {
        const result = await compraModel.criarCompra(req.body);
        res.json({ message: 'Compra registrada com sucesso!', id: result.id });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Erro ao registrar compra' });
    }
};

exports.atualizarCompra = async (req, res) => {
    try {
        await compraModel.atualizarCompra(req.params.id, req.body);
        res.json({ message: 'Compra atualizada!' });
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.deletarCompra = async (req, res) => {
    try {
        await compraModel.deletarCompra(req.params.id);
        res.json({ message: 'Compra excluída e estoque revertido!' });
    } catch (error) {
        res.status(500).json(error);
    }
};
