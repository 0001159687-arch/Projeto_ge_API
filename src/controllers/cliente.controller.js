const clienteModel = require('../models/cliente.model');

exports.listarClientes = async (req, res) => {
    try {
        const clientes = await clienteModel.listarClientes();
        res.json(clientes);
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.buscarCliente = async (req, res) => {
    try {
        const cliente = await clienteModel.buscarClientePorId(req.params.id);
        if (!cliente) return res.status(404).json({ message: 'Cliente não encontrado' });
        res.json(cliente);
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.criarCliente = async (req, res) => {
    try {
        await clienteModel.criarCliente(req.body);
        res.json({ message: 'Cliente cadastrado com sucesso!' });
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.atualizarCliente = async (req, res) => {
    try {
        await clienteModel.atualizarCliente(req.params.id, req.body);
        res.json({ message: 'Cliente atualizado!' });
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.deletarCliente = async (req, res) => {
    try {
        await clienteModel.deletarCliente(req.params.id);
        res.json({ message: 'Cliente excluído!' });
    } catch (error) {
        res.status(500).json(error);
    }
};
