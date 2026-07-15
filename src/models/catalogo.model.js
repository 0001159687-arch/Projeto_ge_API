const db = require('../config/db');

// Lista catálogo do fornecedor, casando nome_produto com o produto cadastrado
// (pelo nome) para trazer estoque/preço atual e o produto_id — necessário para
// a tela de Compras dar entrada no estoque do produto correto.
exports.listarCatalogo = (fornecedor_id) => new Promise((resolve, reject) => {
    db.query(`
        SELECT cf.id, cf.fornecedor_id, cf.nome_produto, cf.preco_custo,
               p.id AS produto_id, p.nome AS produto_nome, p.estoque
        FROM catalogo_fornecedor cf
        LEFT JOIN produtos p ON p.nome = cf.nome_produto
        WHERE cf.fornecedor_id = ?
        ORDER BY cf.nome_produto`, [fornecedor_id],
        (err, rows) => { if (err) return reject(err); resolve(rows); }
    );
});

// Adiciona produto ao catálogo do fornecedor (por nome — não há mais produto_id)
exports.adicionarAoCatalogo = (dados) => new Promise((resolve, reject) => {
    const { fornecedor_id, nome_produto, preco_custo } = dados;
    db.query(
        'INSERT INTO catalogo_fornecedor (fornecedor_id, nome_produto, preco_custo) VALUES (?,?,?)',
        [fornecedor_id, nome_produto, preco_custo],
        (err, result) => { if (err) return reject(err); resolve({ id: result.insertId }); }
    );
});

// Remove produto do catálogo
exports.removerDoCatalogo = (id) => new Promise((resolve, reject) => {
    db.query('DELETE FROM catalogo_fornecedor WHERE id = ?', [id],
        (err, result) => { if (err) return reject(err); resolve(result); }
    );
});

// Atualiza preço de custo — o trigger trk_catalogo_preco_venda no banco
// cuida automaticamente de atualizar produtos.preco com +20%.
exports.atualizarPreco = (id, preco_custo) => new Promise((resolve, reject) => {
    db.query('UPDATE catalogo_fornecedor SET preco_custo = ? WHERE id = ?', [preco_custo, id],
        (err, result) => { if (err) return reject(err); resolve(result); }
    );
});

// Lista produtos cadastrados que ainda NÃO estão no catálogo do fornecedor (por nome)
exports.produtosDisponiveis = (fornecedor_id) => new Promise((resolve, reject) => {
    db.query(`
        SELECT p.id, p.nome, p.preco
        FROM produtos p
        WHERE NOT EXISTS (
            SELECT 1 FROM catalogo_fornecedor cf
            WHERE cf.fornecedor_id = ? AND cf.nome_produto = p.nome
        )
        ORDER BY p.nome`, [fornecedor_id],
        (err, rows) => { if (err) return reject(err); resolve(rows); }
    );
});
