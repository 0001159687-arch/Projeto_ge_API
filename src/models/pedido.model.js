const db = require('../config/db');

// LISTAR todos os pedidos
exports.listarPedidos = () => {
    return new Promise((resolve, reject) => {
        db.query(
            'SELECT * FROM pedidos ORDER BY id DESC',
            (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            }
        );
    });
};

// BUSCAR pedido + itens por ID
exports.buscarPedidoPorId = (id) => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM pedidos WHERE id = ?', [id], (err, rows) => {
            if (err) return reject(err);
            if (!rows[0]) return resolve(null);
            const pedido = rows[0];
            db.query(
                `SELECT ip.*, p.nome AS produto_nome
                 FROM itens_pedido ip
                 JOIN produtos p ON p.id = ip.produto_id
                 WHERE ip.pedido_id = ?`,
                [id],
                (err2, itens) => {
                    if (err2) return reject(err2);
                    pedido.itens = itens;
                    resolve(pedido);
                }
            );
        });
    });
};

// CRIAR pedido + itens (transação)
exports.criarPedido = (dados) => {
    const { cliente, forma, condicao, data, prazo, status, total, itens } = dados;
    return new Promise((resolve, reject) => {
        db.getConnection((err, conn) => {
            if (err) return reject(err);
            conn.beginTransaction(err2 => {
                if (err2) { conn.release(); return reject(err2); }

                conn.query(
                    'INSERT INTO pedidos (cliente, forma_pagamento, condicao_pagamento, data_pedido, prazo_entrega, status, total) VALUES (?,?,?,?,?,?,?)',
                    [cliente, forma, condicao, data || null, prazo || null, status || 'Aberto', total || 0],
                    (err3, result) => {
                        if (err3) return conn.rollback(() => { conn.release(); reject(err3); });

                        const pedidoId = result.insertId;

                        if (!itens || itens.length === 0) {
                            return conn.commit(err4 => {
                                conn.release();
                                if (err4) return reject(err4);
                                resolve({ id: pedidoId });
                            });
                        }

                        const values = itens.map(i => [pedidoId, i.produto_id, i.qtd, i.preco]);
                        conn.query(
                            'INSERT INTO itens_pedido (pedido_id, produto_id, qtd, preco) VALUES ?',
                            [values],
                            (err5) => {
                                if (err5) return conn.rollback(() => { conn.release(); reject(err5); });

                                // Descontar estoque
                                const estoqueUpdates = itens.map(i =>
                                    new Promise((res, rej) => {
                                        conn.query(
                                            'UPDATE produtos SET estoque = estoque - ? WHERE id = ? AND estoque >= ?',
                                            [i.qtd, i.produto_id, i.qtd],
                                            (err, result) => {
                                                if (err) return rej(err);
                                                if (result.affectedRows === 0) return rej(new Error(`Estoque insuficiente para o produto ID ${i.produto_id}`));
                                                res();
                                            }
                                        );
                                    })
                                );

                                Promise.all(estoqueUpdates)
                                    .then(() => conn.commit(err6 => {
                                        conn.release();
                                        if (err6) return reject(err6);
                                        resolve({ id: pedidoId });
                                    }))
                                    .catch(errEstoque => conn.rollback(() => { conn.release(); reject(errEstoque); }));
                            }
                        );
                    }
                );
            });
        });
    });
};

// ATUALIZAR pedido
exports.atualizarPedido = (id, dados) => {
    const { cliente, forma, condicao, data, prazo, status, total } = dados;
    return new Promise((resolve, reject) => {
        db.query(
            'UPDATE pedidos SET cliente=?, forma_pagamento=?, condicao_pagamento=?, data_pedido=?, prazo_entrega=?, status=?, total=? WHERE id=?',
            [cliente, forma, condicao, data || null, prazo || null, status, total || 0, id],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

// DELETAR pedido e restaurar estoque
exports.deletarPedido = (id) => {
    return new Promise((resolve, reject) => {
        db.getConnection((err, conn) => {
            if (err) return reject(err);
            conn.beginTransaction(err2 => {
                if (err2) { conn.release(); return reject(err2); }

                conn.query('SELECT produto_id, qtd FROM itens_pedido WHERE pedido_id = ?', [id], (err3, itens) => {
                    if (err3) return conn.rollback(() => { conn.release(); reject(err3); });

                    const restaurar = (itens || []).map(i =>
                        new Promise((res, rej) => {
                            conn.query('UPDATE produtos SET estoque = estoque + ? WHERE id = ?', [i.qtd, i.produto_id],
                                (e) => e ? rej(e) : res());
                        })
                    );

                    Promise.all(restaurar)
                        .then(() => {
                            conn.query('DELETE FROM itens_pedido WHERE pedido_id = ?', [id], (err4) => {
                                if (err4) return conn.rollback(() => { conn.release(); reject(err4); });
                                conn.query('DELETE FROM pedidos WHERE id = ?', [id], (err5, result) => {
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
