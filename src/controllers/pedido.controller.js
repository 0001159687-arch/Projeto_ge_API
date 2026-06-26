const pedidoModel = require('../models/pedido.model');

exports.listarPedidos = async (req, res) => {
    try {
        const pedidos = await pedidoModel.listarPedidos();
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.buscarPedido = async (req, res) => {
    try {
        const pedido = await pedidoModel.buscarPedidoPorId(req.params.id);
        if (!pedido) return res.status(404).json({ message: 'Pedido não encontrado' });
        res.json(pedido);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.criarPedido = async (req, res) => {
    try {
        const result = await pedidoModel.criarPedido(req.body);
        res.json({ message: 'Pedido criado com sucesso!', id: result.id });
    } catch (error) {
        const msg = error.message || '';
        if (msg.includes('Estoque insuficiente')) {
            return res.status(400).json({ message: msg });
        }
        res.status(500).json({ message: error.message });
    }
};

exports.atualizarPedido = async (req, res) => {
    try {
        await pedidoModel.atualizarPedido(req.params.id, req.body);
        res.json({ message: 'Pedido atualizado!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deletarPedido = async (req, res) => {
    try {
        await pedidoModel.deletarPedido(req.params.id);
        res.json({ message: 'Pedido excluído!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
