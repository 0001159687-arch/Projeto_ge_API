const condicaoModel = require('../models/condicao.model');

exports.listarCondicoes = async (req, res) => {
    try {
        const condicoes = await condicaoModel.listarCondicoes();
        res.json(condicoes);
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.buscarCondicao = async (req, res) => {
    try {
        const condicao = await condicaoModel.buscarCondicaoPorId(req.params.id);
        if (!condicao) return res.status(404).json({ message: 'Condição não encontrada' });
        res.json(condicao);
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.criarCondicao = async (req, res) => {
    try {
        await condicaoModel.criarCondicao(req.body);
        res.json({ message: 'Condição de pagamento cadastrada!' });
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.atualizarCondicao = async (req, res) => {
    try {
        await condicaoModel.atualizarCondicao(req.params.id, req.body);
        res.json({ message: 'Condição de pagamento atualizada!' });
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.deletarCondicao = async (req, res) => {
    try {
        await condicaoModel.deletarCondicao(req.params.id);
        res.json({ message: 'Condição de pagamento excluída!' });
    } catch (error) {
        res.status(500).json(error);
    }
};
