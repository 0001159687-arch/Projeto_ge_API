const mysql  = require('mysql2/promise');
require('dotenv').config();

// Pool separado usando a API de promises do mysql2 — sem callbacks, sem mistura async/await.
const pool = mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD || 'admin',
    database:           process.env.DB_DATABASE || 'sistema_vendas_ge',
    port:               process.env.DB_PORT     || 3306,
    waitForConnections: true,
    connectionLimit:    10,
});

// ──────────────────────────────────────────────────────────────
// O preço de venda do produto é responsabilidade exclusiva do
// trigger "trk_catalogo_preco_venda" (veja autoMigracao.js):
// ele dispara quando catalogo_fornecedor.preco_custo muda e
// aplica produtos.preco = preco_custo * 1.20. A Compra NÃO
// altera mais o preço de venda em nenhuma situação — só soma
// estoque e registra o histórico de itens/preço de custo.
// ──────────────────────────────────────────────────────────────

// LISTAR todas as compras com total
exports.listarCompras = async () => {
    const [rows] = await pool.query(`
        SELECT c.*,
               COALESCE(SUM(ic.qtd * ic.preco_custo), 0) AS subtotal,
               COALESCE(SUM(ic.qtd * ic.preco_custo), 0) + c.valor_juros AS total
        FROM compras c
        LEFT JOIN itens_compra ic ON ic.compra_id = c.id
        GROUP BY c.id
        ORDER BY c.id DESC`);
    return rows;
};

// BUSCAR compra + itens por ID
exports.buscarCompraPorId = async (id) => {
    const [rows] = await pool.query('SELECT * FROM compras WHERE id = ?', [id]);
    if (!rows[0]) return null;
    const compra = rows[0];
    const [itens] = await pool.query(
        `SELECT ic.*, p.nome AS produto_nome
         FROM itens_compra ic
         JOIN produtos p ON p.id = ic.produto_id
         WHERE ic.compra_id = ?`,
        [id]
    );
    compra.itens = itens;
    return compra;
};

// CRIAR compra + itens + SOMAR ESTOQUE (transação)
exports.criarCompra = async (dados) => {
    const { fornecedor, forma, condicao, data, previsao, status, itens, juros_percentual, valor_juros } = dados;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [result] = await conn.query(
            'INSERT INTO compras (fornecedor, forma_pagamento, condicao_pagamento, data_compra, previsao_entrega, status, juros_percentual, valor_juros) VALUES (?,?,?,?,?,?,?,?)',
            [fornecedor, forma, condicao, data, previsao || null, status || 'Pendente', juros_percentual || 0, valor_juros || 0]
        );
        const compraId = result.insertId;

        if (itens && itens.length > 0) {
            const values = itens.map(i => [compraId, i.produto_id, i.qtd, i.preco_custo]);
            await conn.query('INSERT INTO itens_compra (compra_id, produto_id, qtd, preco_custo) VALUES ?', [values]);

            // SOMAR estoque de cada produto comprado
            for (const i of itens) {
                await conn.query('UPDATE produtos SET estoque = estoque + ? WHERE id = ?', [i.qtd, i.produto_id]);
            }
        }

        await conn.commit();
        return { id: compraId };

    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// ATUALIZAR compra (só campos, não mexe em itens/estoque)
exports.atualizarCompra = async (id, dados) => {
    const { fornecedor, forma, condicao, data, previsao, status, juros_percentual, valor_juros } = dados;
    const [result] = await pool.query(
        'UPDATE compras SET fornecedor=?, forma_pagamento=?, condicao_pagamento=?, data_compra=?, previsao_entrega=?, status=?, juros_percentual=?, valor_juros=? WHERE id=?',
        [fornecedor, forma, condicao, data, previsao || null, status, juros_percentual || 0, valor_juros || 0, id]
    );
    return result;
};

// DELETAR compra — REMOVE estoque adicionado
exports.deletarCompra = async (id) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [itens] = await conn.query('SELECT produto_id, qtd FROM itens_compra WHERE compra_id = ?', [id]);

        for (const i of itens) {
            await conn.query(
                'UPDATE produtos SET estoque = GREATEST(0, estoque - ?) WHERE id = ?',
                [i.qtd, i.produto_id]
            );
        }

        await conn.query('DELETE FROM itens_compra WHERE compra_id = ?', [id]);
        const [result] = await conn.query('DELETE FROM compras WHERE id = ?', [id]);

        await conn.commit();
        return result;

    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};
