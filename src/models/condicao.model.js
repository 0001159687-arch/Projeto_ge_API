const db = require('../config/db');

exports.listarCondicoes = () => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM condicoes_pagamento ORDER BY nome', (err, rows) => {
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
    const { nome, parcelas, juros } = dados;
    return new Promise((resolve, reject) => {
        db.query(
            'INSERT INTO condicoes_pagamento (nome, parcelas, juros) VALUES (?,?,?)',
            [nome, parcelas || 1, juros || 0],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

exports.atualizarCondicao = (id, dados) => {
    const { nome, parcelas, juros } = dados;
    return new Promise((resolve, reject) => {
        db.query(
            'UPDATE condicoes_pagamento SET nome=?, parcelas=?, juros=? WHERE id=?',
            [nome, parcelas, juros || 0, id],
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
