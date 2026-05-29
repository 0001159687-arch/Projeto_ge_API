const db = require('../config/db');

exports.listarCondicoes = () => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM condicoes_pagamento', (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

exports.buscarCondicaoPorId = (id) => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM condicoes_pagamento WHERE id = ?', [id], (err, rows) => {
            if (err) return reject(err);
            resolve(rows[0]);
        });
    });
};

exports.criarCondicao = (dados) => {
    const { nome, parcelas } = dados;
    return new Promise((resolve, reject) => {
        db.query(
            'INSERT INTO condicoes_pagamento (nome, parcelas) VALUES (?,?)',
            [nome, parcelas || 1],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

exports.atualizarCondicao = (id, dados) => {
    const { nome, parcelas } = dados;
    return new Promise((resolve, reject) => {
        db.query(
            'UPDATE condicoes_pagamento SET nome=?, parcelas=? WHERE id=?',
            [nome, parcelas, id],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

exports.deletarCondicao = (id) => {
    return new Promise((resolve, reject) => {
        db.query('DELETE FROM condicoes_pagamento WHERE id = ?', [id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};
