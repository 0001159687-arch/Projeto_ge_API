const produtoModel = require('../models/produto.model');

exports.listarProdutos = async (req, res) => {
    try {
        const produtos = await produtoModel.listarProdutos();
        res.json(produtos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.buscarProduto = async (req, res) => {
    try {
        const produto = await produtoModel.buscarProdutoPorId(req.params.id);
        if (!produto) return res.status(404).json({ message: 'Produto não encontrado' });
        res.json(produto);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.criarProduto = async (req, res) => {
    try {
        const result = await produtoModel.criarProduto(req.body);
        res.json({ message: 'Produto cadastrado com sucesso!', id: result.insertId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.atualizarProduto = async (req, res) => {
    try {
        await produtoModel.atualizarProduto(req.params.id, req.body);
        res.json({ message: 'Produto atualizado!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deletarProduto = async (req, res) => {
    try {
        await produtoModel.deletarProduto(req.params.id);
        res.json({ message: 'Produto excluído!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
