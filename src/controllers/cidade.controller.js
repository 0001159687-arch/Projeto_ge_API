const cidadeModel = require('../models/cidade.model');

exports.listarCidades = async (req, res) => {
    try {
        const cidades = await cidadeModel.listarCidades();
        res.json(cidades);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.buscarCidade = async (req, res) => {
    try {
        const cidade = await cidadeModel.buscarCidadePorId(req.params.id);
        if (!cidade) return res.status(404).json({ message: 'Cidade não encontrada' });
        res.json(cidade);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.criarCidade = async (req, res) => {
    try {
        await cidadeModel.criarCidade(req.body);
        res.json({ message: 'Cidade cadastrada com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.atualizarCidade = async (req, res) => {
    try {
        await cidadeModel.atualizarCidade(req.params.id, req.body);
        res.json({ message: 'Cidade atualizada!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deletarCidade = async (req, res) => {
    try {
        await cidadeModel.deletarCidade(req.params.id);
        res.json({ message: 'Cidade excluída!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
