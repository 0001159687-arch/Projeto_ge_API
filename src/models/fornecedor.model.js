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
        resolve(rows[0] || null);
    });
});

exports.criarFornecedor = (dados) => new Promise((resolve, reject) => {
    const { nome, telefone, endereco, numero, bairro, cep, cidade, cnpj, email } = dados;
    db.query(
        'INSERT INTO fornecedores (nome, telefone, endereco, numero, bairro, cep, cidade, cnpj, email) VALUES (?,?,?,?,?,?,?,?,?)',
        [nome, telefone, endereco, numero, bairro, cep, cidade, cnpj, email],
        (err, result) => { if (err) return reject(err); resolve({ id: result.insertId }); }
    );
});

exports.atualizarFornecedor = (id, dados) => new Promise((resolve, reject) => {
    const { nome, telefone, endereco, numero, bairro, cep, cidade, cnpj, email } = dados;
    db.query(
        'UPDATE fornecedores SET nome=?, telefone=?, endereco=?, numero=?, bairro=?, cep=?, cidade=?, cnpj=?, email=? WHERE id=?',
        [nome, telefone, endereco, numero, bairro, cep, cidade, cnpj, email, id],
        (err, result) => { if (err) return reject(err); resolve(result); }
    );
});

exports.deletarFornecedor = (id) => new Promise((resolve, reject) => {
    db.query('DELETE FROM fornecedores WHERE id = ?', [id], (err, result) => {
        if (err) return reject(err);
        resolve(result);
    });
});
