const db = require('../config/db');

exports.listarCidades = () => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM cidades', (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

exports.buscarCidadePorId = (id) => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM cidades WHERE id = ?', [id], (err, rows) => {
            if (err) return reject(err);
            resolve(rows[0]);
        });
    });
};

exports.criarCidade = (dados) => {
    const { nome, uf } = dados;
    return new Promise((resolve, reject) => {
        db.query(
            'INSERT INTO cidades (nome, uf) VALUES (?,?)',
            [nome, uf],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

exports.atualizarCidade = (id, dados) => {
    const { nome, uf } = dados;
    return new Promise((resolve, reject) => {
        db.query(
            'UPDATE cidades SET nome=?, uf=? WHERE id=?',
            [nome, uf, id],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

exports.deletarCidade = (id) => {
    return new Promise((resolve, reject) => {
        db.query('DELETE FROM cidades WHERE id = ?', [id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};
