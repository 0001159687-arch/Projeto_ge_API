const db = require('../config/db');

// ── ADMINISTRAÇÃO DA LOJA ──────────────────────────────────────
exports.totalFornecedores = () => new Promise((resolve, reject) => {
    db.query('SELECT COUNT(*) AS total FROM fornecedores', (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0].total);
    });
});

exports.totalProdutos = () => new Promise((resolve, reject) => {
    db.query('SELECT COUNT(*) AS total FROM produtos', (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0].total);
    });
});

// Total de compras no período (data início/fim), com valor somado (já incluindo juros aplicados)
exports.comprasPeriodo = (dataInicio, dataFim) => new Promise((resolve, reject) => {
    db.query(`
        SELECT COUNT(*) AS qtd_compras,
               COALESCE(SUM(itens_total), 0) AS total_valor
        FROM (
            SELECT c.id, c.valor_juros + COALESCE((
                SELECT SUM(ic.qtd * ic.preco_custo) FROM itens_compra ic WHERE ic.compra_id = c.id
            ), 0) AS itens_total
            FROM compras c
            WHERE c.data_compra BETWEEN ? AND ?
        ) AS sub`,
        [dataInicio, dataFim],
        (err, rows) => {
            if (err) return reject(err);
            resolve(rows[0]);
        }
    );
});

// Produtos com estoque <= limite (padrão 5), filtrável
exports.produtosEstoqueBaixo = (limite = 5) => new Promise((resolve, reject) => {
    db.query(
        'SELECT id, nome, estoque FROM produtos WHERE estoque <= ? ORDER BY estoque ASC',
        [limite],
        (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        }
    );
});

// ── SISTEMA DE VENDAS ──────────────────────────────────────────
exports.vendasPeriodo = (dataInicio, dataFim) => new Promise((resolve, reject) => {
    db.query(`
        SELECT COUNT(*) AS qtd_pedidos,
               COALESCE(SUM(itens_total), 0) AS total_valor
        FROM (
            SELECT p.id, p.valor_juros + COALESCE((
                SELECT SUM(ip.qtd * ip.preco) FROM itens_pedido ip WHERE ip.pedido_id = p.id
            ), 0) AS itens_total
            FROM pedidos p
            WHERE p.data_pedido BETWEEN ? AND ?
        ) AS sub`,
        [dataInicio, dataFim],
        (err, rows) => {
            if (err) return reject(err);
            resolve(rows[0]);
        }
    );
});

exports.totalClientes = () => new Promise((resolve, reject) => {
    db.query('SELECT COUNT(*) AS total FROM clientes', (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0].total);
    });
});

// Produtos mais vendidos no período, limitado pela quantidade pedida
exports.produtosMaisVendidos = (dataInicio, dataFim, limite = 5) => new Promise((resolve, reject) => {
    db.query(`
        SELECT p.id, p.nome, SUM(ip.qtd) AS qtd_vendida,
               SUM(ip.qtd * ip.preco) AS total_vendido
        FROM itens_pedido ip
        JOIN pedidos  pe ON pe.id = ip.pedido_id
        JOIN produtos p  ON p.id  = ip.produto_id
        WHERE pe.data_pedido BETWEEN ? AND ?
        GROUP BY p.id, p.nome
        ORDER BY qtd_vendida DESC
        LIMIT ?`,
        [dataInicio, dataFim, limite],
        (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        }
    );
});
