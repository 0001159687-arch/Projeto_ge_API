// Garante que as colunas novas (usadas pela funcionalidade de Juros) existam no banco,
// sem precisar rodar nenhum script manualmente. É seguro chamar isso toda vez que o
// servidor inicia: só cria a coluna se ela ainda não existir.
//
// Isso existe para o projeto funcionar mesmo que o arquivo migracao_juros.sql não
// tenha sido executado manualmente no banco.

const COLUNAS_NECESSARIAS = [
    { tabela: 'condicoes_pagamento', coluna: 'juros_parcela',    definicao: "DECIMAL(5,2) NOT NULL DEFAULT 0.00" },
    { tabela: 'pedidos',             coluna: 'juros_percentual', definicao: "DECIMAL(5,2) NOT NULL DEFAULT 0.00" },
    { tabela: 'pedidos',             coluna: 'valor_juros',      definicao: "DECIMAL(10,2) NOT NULL DEFAULT 0.00" },
    { tabela: 'compras',             coluna: 'juros_percentual', definicao: "DECIMAL(5,2) NOT NULL DEFAULT 0.00" },
    { tabela: 'compras',             coluna: 'valor_juros',      definicao: "DECIMAL(10,2) NOT NULL DEFAULT 0.00" },
];

function colunaExiste(pool, tabela, coluna) {
    return new Promise((resolve, reject) => {
        pool.query(
            `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [tabela, coluna],
            (err, rows) => {
                if (err) return reject(err);
                resolve(rows.length > 0);
            }
        );
    });
}

function adicionarColuna(pool, tabela, coluna, definicao) {
    // Nota: tabela/coluna/definicao vêm só da constante COLUNAS_NECESSARIAS acima
    // (nunca de input do usuário), por isso é seguro interpolar direto no SQL aqui.
    // MySQL não aceita identificadores de tabela/coluna como parâmetro (?) em ALTER TABLE.
    return new Promise((resolve, reject) => {
        pool.query(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

async function garantirColunasDeJuros(pool) {
    for (const { tabela, coluna, definicao } of COLUNAS_NECESSARIAS) {
        try {
            const existe = await colunaExiste(pool, tabela, coluna);
            if (!existe) {
                await adicionarColuna(pool, tabela, coluna, definicao);
                console.log(`[migração automática] coluna "${coluna}" criada em "${tabela}"`);
            }
        } catch (e) {
            // Não derruba o servidor por isso — só avisa. As rotas que dependem
            // dessas colunas vão continuar mostrando o erro real do MySQL se algo
            // der errado (ex: tabela "compras"/"pedidos" não existe ainda).
            console.error(`[migração automática] não foi possível verificar/criar "${tabela}.${coluna}":`, e.message);
        }
    }
}

// ─────────────────────────────────────────────────────────────
// TRIGGER: trk_catalogo_preco_venda
// Sempre que catalogo_fornecedor.preco_custo for alterado,
// atualiza produtos.preco = novo_custo * 1.20 (+20% de margem).
// ─────────────────────────────────────────────────────────────
async function garantirTriggerPrecoVenda(pool) {
    try {
        await new Promise((resolve, reject) => {
            pool.query('DROP TRIGGER IF EXISTS trk_catalogo_preco_venda', (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        await new Promise((resolve, reject) => {
            pool.query(`
                CREATE TRIGGER trk_catalogo_preco_venda
                AFTER UPDATE ON catalogo_fornecedor
                FOR EACH ROW
                BEGIN
                    IF NEW.preco_custo <> OLD.preco_custo THEN
                        UPDATE produtos
                        SET    preco = ROUND(NEW.preco_custo * 1.20, 2)
                        WHERE  nome  = NEW.nome_produto;
                    END IF;
                END
            `, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        console.log('[migração automática] trigger "trk_catalogo_preco_venda" criado/atualizado.');
    } catch (e) {
        console.error('[migração automática] não foi possível criar trigger de preço de venda:', e.message);
    }
}

module.exports = { garantirColunasDeJuros, garantirTriggerPrecoVenda };
