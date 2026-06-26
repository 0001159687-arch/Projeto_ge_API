const db = require('../config/db');

exports.listarFornecedores = () => new Promise((resolve, reject) => {
    db.query('SELECT * FROM fornecedores ORDER BY nome', (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
    });
});

exports.buscarFornecedorPorId = (id) => new Promise((resolve, reject) => {
    db.query('SELECT * FROM fornecedores WHERE id = ?', [id], (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0]);
    });
});

exports.criarFornecedor = (dados) => new Promise((resolve, reject) => {
    const { nome, telefone, endereco, numero, email, cnpj, cep, bairro, cidade } = dados;
    db.query(
        'INSERT INTO fornecedores (nome, telefone, endereco, numero, email, cnpj, cep, bairro, cidade) VALUES (?,?,?,?,?,?,?,?,?)',
        [nome, telefone, endereco, numero, email, cnpj, cep, bairro, cidade],
        (err, result) => {
            if (err) return reject(err);
            resolve({ id: result.insertId });
        }
    );
});

exports.atualizarFornecedor = (id, dados) => new Promise((resolve, reject) => {
    const { nome, telefone, endereco, numero, email, cnpj, cep, bairro, cidade } = dados;
    db.query(
        'UPDATE fornecedores SET nome=?, telefone=?, endereco=?, numero=?, email=?, cnpj=?, cep=?, bairro=?, cidade=? WHERE id=?',
        [nome, telefone, endereco, numero, email, cnpj, cep, bairro, cidade, id],
        (err, result) => {
            if (err) return reject(err);
            resolve(result);
        }
    );
});

exports.deletarFornecedor = (id) => new Promise((resolve, reject) => {
    db.query('DELETE FROM fornecedores WHERE id = ?', [id], (err, result) => {
        if (err) return reject(err);
        resolve(result);
    });
});
