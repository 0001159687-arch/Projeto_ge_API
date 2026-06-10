const db = require('../config/db');

// LISTAR todas as compras
exports.listarCompras = () => {
    return new Promise((resolve, reject) => {
        db.query(
            'SELECT * FROM compras ORDER BY id DESC',
            (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            }
        );
    });
};

// BUSCAR compra + itens por ID
exports.buscarCompraPorId = (id) => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM compras WHERE id = ?', [id], (err, rows) => {
            if (err) return reject(err);
            if (!rows[0]) return resolve(null);
            const compra = rows[0];
            db.query(
                `SELECT ic.*, p.nome AS produto_nome
                 FROM itens_compra ic
                 JOIN produtos p ON p.id = ic.produto_id
                 WHERE ic.compra_id = ?`,
                [id],
                (err2, itens) => {
                    if (err2) return reject(err2);
                    compra.itens = itens;
                    resolve(compra);
                }
            );
        });
    });
};

// CRIAR compra + itens + somar estoque (transação)
exports.criarCompra = (dados) => {
    const { fornecedor, forma, condicao, data, previsao, status, total, itens } = dados;
    return new Promise((resolve, reject) => {
        db.getConnection((err, conn) => {
            if (err) return reject(err);
            conn.beginTransaction(err2 => {
                if (err2) { conn.release(); return reject(err2); }

                conn.query(
                    'INSERT INTO compras (fornecedor, forma_pagamento, condicao_pagamento, data_compra, previsao_entrega, status, total) VALUES (?,?,?,?,?,?,?)',
                    [fornecedor, forma, condicao, data || null, previsao || null, status || 'Pendente', total || 0],
                    (err3, result) => {
                        if (err3) return conn.rollback(() => { conn.release(); reject(err3); });

                        const compraId = result.insertId;

                        if (!itens || itens.length === 0) {
                            return conn.commit(err4 => {
                                conn.release();
                                if (err4) return reject(err4);
                                resolve({ id: compraId });
                            });
                        }

                        const values = itens.map(i => [compraId, i.produto_id, i.qtd, i.preco_custo]);
                        conn.query(
                            'INSERT INTO itens_compra (compra_id, produto_id, qtd, preco_custo) VALUES ?',
                            [values],
                            (err5) => {
                                if (err5) return conn.rollback(() => { conn.release(); reject(err5); });

                                // Somar estoque
                                const estoqueUpdates = itens.map(i =>
                                    new Promise((res, rej) => {
                                        conn.query(
                                            'UPDATE produtos SET estoque = estoque + ? WHERE id = ?',
                                            [i.qtd, i.produto_id],
                                            (e) => e ? rej(e) : res()
                                        );
                                    })
                                );

                                Promise.all(estoqueUpdates)
                                    .then(() => conn.commit(err6 => {
                                        conn.release();
                                        if (err6) return reject(err6);
                                        resolve({ id: compraId });
                                    }))
                                    .catch(e => conn.rollback(() => { conn.release(); reject(e); }));
                            }
                        );
                    }
                );
            });
        });
    });
};

// ATUALIZAR compra (campos sem mexer em itens/estoque)
exports.atualizarCompra = (id, dados) => {
    const { fornecedor, forma, condicao, data, previsao, status, total } = dados;
    return new Promise((resolve, reject) => {
        db.query(
            'UPDATE compras SET fornecedor=?, forma_pagamento=?, condicao_pagamento=?, data_compra=?, previsao_entrega=?, status=?, total=? WHERE id=?',
            [fornecedor, forma, condicao, data || null, previsao || null, status, total || 0, id],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

// DELETAR compra — reverte estoque adicionado
exports.deletarCompra = (id) => {
    return new Promise((resolve, reject) => {
        db.getConnection((err, conn) => {
            if (err) return reject(err);
            conn.beginTransaction(err2 => {
                if (err2) { conn.release(); return reject(err2); }

                conn.query('SELECT produto_id, qtd FROM itens_compra WHERE compra_id = ?', [id], (err3, itens) => {
                    if (err3) return conn.rollback(() => { conn.release(); reject(err3); });

                    const reverter = (itens || []).map(i =>
                        new Promise((res, rej) => {
                            conn.query(
                                'UPDATE produtos SET estoque = GREATEST(0, estoque - ?) WHERE id = ?',
                                [i.qtd, i.produto_id],
                                (e) => e ? rej(e) : res()
                            );
                        })
                    );

                    Promise.all(reverter)
                        .then(() => {
                            conn.query('DELETE FROM itens_compra WHERE compra_id = ?', [id], (err4) => {
                                if (err4) return conn.rollback(() => { conn.release(); reject(err4); });
                                conn.query('DELETE FROM compras WHERE id = ?', [id], (err5, result) => {
                                    if (err5) return conn.rollback(() => { conn.release(); reject(err5); });
                                    conn.commit(err6 => {
                                        conn.release();
                                        if (err6) return reject(err6);
                                        resolve(result);
                                    });
                                });
                            });
                        })
                        .catch(e => conn.rollback(() => { conn.release(); reject(e); }));
                });
            });
        });
    });
};
