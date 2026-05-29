const formaModel = require('../models/forma.model');

exports.listarFormas = async (req, res) => {
    try {
        const formas = await formaModel.listarFormas();
        res.json(formas);
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.buscarForma = async (req, res) => {
    try {
        const forma = await formaModel.buscarFormaPorId(req.params.id);
        if (!forma) return res.status(404).json({ message: 'Forma não encontrada' });
        res.json(forma);
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.criarForma = async (req, res) => {
    try {
        await formaModel.criarForma(req.body);
        res.json({ message: 'Forma de pagamento cadastrada!' });
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.atualizarForma = async (req, res) => {
    try {
        await formaModel.atualizarForma(req.params.id, req.body);
        res.json({ message: 'Forma de pagamento atualizada!' });
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.deletarForma = async (req, res) => {
    try {
        await formaModel.deletarForma(req.params.id);
        res.json({ message: 'Forma de pagamento excluída!' });
    } catch (error) {
        res.status(500).json(error);
    }
};
