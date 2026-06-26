const db = require('../config/db');

// LISTAR
exports.listarClientes = () => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM clientes', (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

// BUSCAR POR ID
exports.buscarClientePorId = (id) => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM clientes WHERE id = ?', [id], (err, rows) => {
            if (err) return reject(err);
            resolve(rows[0]);
        });
    });
};

// CRIAR
exports.criarCliente = (dados) => {
    const { nome, endereco, numero, bairro, cep, cidade, cpf, email, telefone } = dados;
    return new Promise((resolve, reject) => {
        db.query(
            'INSERT INTO clientes (nome, endereco, numero, bairro, cep, cidade, cpf, email, telefone) VALUES (?,?,?,?,?,?,?,?,?)',
            [nome, endereco, numero, bairro, cep, cidade, cpf, email, telefone],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

// ATUALIZAR
exports.atualizarCliente = (id, dados) => {
    const { nome, endereco, numero, bairro, cep, cidade, cpf, email, telefone } = dados;
    return new Promise((resolve, reject) => {
        db.query(
            'UPDATE clientes SET nome=?, endereco=?, numero=?, bairro=?, cep=?, cidade=?, cpf=?, email=?, telefone=? WHERE id=?',
            [nome, endereco, numero, bairro, cep, cidade, cpf, email, telefone, id],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

// DELETAR
exports.deletarCliente = (id) => {
    return new Promise((resolve, reject) => {
        db.query('DELETE FROM clientes WHERE id = ?', [id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};
