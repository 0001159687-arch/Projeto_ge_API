const db = require('../config/db');

// LISTAR todas as compras com total calculado
exports.listarCompras = () => {
    return new Promise((resolve, reject) => {
        db.query(`
            SELECT c.*, COALESCE(SUM(ic.qtd * ic.preco_custo), 0) AS total
            FROM compras c
            LEFT JOIN itens_compra ic ON ic.compra_id = c.id
            GROUP BY c.id
            ORDER BY c.id DESC`, (err, compras) => {
            if (err) return reject(err);
            resolve(compras);
        });
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

// CRIAR compra + itens + INCREMENTAR estoque (transação)
exports.criarCompra = (dados) => {
    const { fornecedor, forma, condicao, data, previsao, status, itens } = dados;
    return new Promise((resolve, reject) => {
        db.getConnection((err, conn) => {
            if (err) return reject(err);
            conn.beginTransaction(err2 => {
                if (err2) { conn.release(); return reject(err2); }

                conn.query(
                    'INSERT INTO compras (fornecedor, forma_pagamento, condicao_pagamento, data_compra, previsao_entrega, status) VALUES (?,?,?,?,?,?)',
                    [fornecedor, forma, condicao, data, previsao, status || 'Pendente'],
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

                                // Incrementar estoque automaticamente
                                const estoqueUpdates = itens.map(i =>
                                    new Promise((res, rej) => {
                                        conn.query(
                                            'UPDATE produtos SET estoque = estoque + ? WHERE id = ?',
                                            [i.qtd, i.produto_id],
                                            (err, result) => {
                                                if (err) return rej(err);
                                                if (result.affectedRows === 0) return rej(new Error(`Produto ID ${i.produto_id} não encontrado`));
                                                res();
                                            }
                                        );
                                    })
                                );

                                Promise.all(estoqueUpdates)
                                    .then(() => {
                                        conn.commit(err6 => {
                                            conn.release();
                                            if (err6) return reject(err6);
                                            resolve({ id: compraId });
                                        });
                                    })
                                    .catch(errEstoque => {
                                        conn.rollback(() => { conn.release(); reject(errEstoque); });
                                    });
                            }
                        );
                    }
                );
            });
        });
    });
};

// ATUALIZAR status da compra
exports.atualizarCompra = (id, dados) => {
    const { fornecedor, forma, condicao, data, previsao, status } = dados;
    return new Promise((resolve, reject) => {
        db.query(
            'UPDATE compras SET fornecedor=?, forma_pagamento=?, condicao_pagamento=?, data_compra=?, previsao_entrega=?, status=? WHERE id=?',
            [fornecedor, forma, condicao, data, previsao, status, id],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

// DELETAR compra e REVERTER estoque
exports.deletarCompra = (id) => {
    return new Promise((resolve, reject) => {
        db.getConnection((err, conn) => {
            if (err) return reject(err);
            conn.beginTransaction(err2 => {
                if (err2) { conn.release(); return reject(err2); }
                // Reverter estoque antes de deletar
                conn.query('SELECT produto_id, qtd FROM itens_compra WHERE compra_id = ?', [id], (err3, itens) => {
                    if (err3) return conn.rollback(() => { conn.release(); reject(err3); });

                    const reverter = (itens || []).map(i =>
                        new Promise((res, rej) => {
                            conn.query('UPDATE produtos SET estoque = estoque - ? WHERE id = ? AND estoque >= ?',
                                [i.qtd, i.produto_id, i.qtd],
                                (e) => e ? rej(e) : res());
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
