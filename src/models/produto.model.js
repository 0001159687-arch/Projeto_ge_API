const db = require('../config/db');

exports.listarProdutos = () => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM produtos', (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

exports.buscarProdutoPorId = (id) => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM produtos WHERE id = ?', [id], (err, rows) => {
            if (err) return reject(err);
            resolve(rows[0]);
        });
    });
};

exports.criarProduto = (dados) => {
    const { nome, unidade, preco, estoque, descricao } = dados;
    return new Promise((resolve, reject) => {
        db.query(
            'INSERT INTO produtos (nome, unidade, preco, estoque, descricao) VALUES (?,?,?,?,?)',
            [nome, unidade || 1, preco, estoque || 0, descricao || ''],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

exports.atualizarProduto = (id, dados) => {
    const { nome, unidade, preco, estoque, descricao } = dados;
    return new Promise((resolve, reject) => {
        db.query(
            'UPDATE produtos SET nome=?, unidade=?, preco=?, estoque=?, descricao=? WHERE id=?',
            [nome, unidade, preco, estoque, descricao, id],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

exports.deletarProduto = (id) => {
    return new Promise((resolve, reject) => {
        db.query('DELETE FROM produtos WHERE id = ?', [id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};
