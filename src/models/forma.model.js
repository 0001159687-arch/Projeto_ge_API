const db = require('../config/db');

exports.listarFormas = () => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM formas_pagamento', (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

exports.buscarFormaPorId = (id) => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM formas_pagamento WHERE id = ?', [id], (err, rows) => {
            if (err) return reject(err);
            resolve(rows[0]);
        });
    });
};

exports.criarForma = (dados) => {
    const { nome, tipo } = dados;
    return new Promise((resolve, reject) => {
        db.query(
            'INSERT INTO formas_pagamento (nome, tipo) VALUES (?,?)',
            [nome, tipo],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

exports.atualizarForma = (id, dados) => {
    const { nome, tipo } = dados;
    return new Promise((resolve, reject) => {
        db.query(
            'UPDATE formas_pagamento SET nome=?, tipo=? WHERE id=?',
            [nome, tipo, id],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

exports.deletarForma = (id) => {
    return new Promise((resolve, reject) => {
        db.query('DELETE FROM formas_pagamento WHERE id = ?', [id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};
