const db = require('../config/db');

// Lista catálogo do fornecedor com dados do produto
exports.listarCatalogo = (fornecedor_id) => new Promise((resolve, reject) => {
    db.query(`
        SELECT cf.id, cf.fornecedor_id, cf.produto_id, cf.preco_custo,
               p.nome AS produto_nome, p.estoque
        FROM catalogo_fornecedor cf
        JOIN produtos p ON p.id = cf.produto_id
        WHERE cf.fornecedor_id = ?
        ORDER BY p.nome`, [fornecedor_id],
        (err, rows) => { if (err) return reject(err); resolve(rows); }
    );
});

// Adiciona produto ao catálogo do fornecedor
exports.adicionarAoCatalogo = (dados) => new Promise((resolve, reject) => {
    const { fornecedor_id, produto_id, preco_custo } = dados;
    db.query(
        'INSERT INTO catalogo_fornecedor (fornecedor_id, produto_id, preco_custo) VALUES (?,?,?) ON DUPLICATE KEY UPDATE preco_custo = VALUES(preco_custo)',
        [fornecedor_id, produto_id, preco_custo],
        (err, result) => { if (err) return reject(err); resolve({ id: result.insertId }); }
    );
});

// Remove produto do catálogo
exports.removerDoCatalogo = (id) => new Promise((resolve, reject) => {
    db.query('DELETE FROM catalogo_fornecedor WHERE id = ?', [id],
        (err, result) => { if (err) return reject(err); resolve(result); }
    );
});

// Atualiza preço de custo
exports.atualizarPreco = (id, preco_custo) => new Promise((resolve, reject) => {
    db.query('UPDATE catalogo_fornecedor SET preco_custo = ? WHERE id = ?', [preco_custo, id],
        (err, result) => { if (err) return reject(err); resolve(result); }
    );
});

// Lista produtos que NÃO estão no catálogo do fornecedor (para adicionar)
exports.produtosDisponiveis = (fornecedor_id) => new Promise((resolve, reject) => {
    db.query(`
        SELECT p.id, p.nome, p.preco
        FROM produtos p
        WHERE p.id NOT IN (
            SELECT produto_id FROM catalogo_fornecedor WHERE fornecedor_id = ?
        )
        ORDER BY p.nome`, [fornecedor_id],
        (err, rows) => { if (err) return reject(err); resolve(rows); }
    );
});
