-- ============================================================
-- MIGRAÇÃO: Juros por parcela (Cartão de Crédito / Boleto)
-- Execute este arquivo no banco sistema_vendas_ge já existente.
-- Seguro para rodar mais de uma vez (verifica se a coluna já existe
-- antes de criar, funciona em MySQL 5.7+, 8.x e MariaDB).
-- ============================================================

USE sistema_vendas_ge;

DELIMITER $$

DROP PROCEDURE IF EXISTS _add_col_se_nao_existe $$
CREATE PROCEDURE _add_col_se_nao_existe(
    IN p_tabela VARCHAR(64),
    IN p_coluna VARCHAR(64),
    IN p_definicao TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = p_tabela
          AND COLUMN_NAME  = p_coluna
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE ', p_tabela, ' ADD COLUMN ', p_coluna, ' ', p_definicao);
        SET @stmt = @ddl;
        PREPARE stmt FROM @stmt;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$

DELIMITER ;

-- 1) condicoes_pagamento.juros_parcela: % de juros POR PARCELA, aplicado
--    quando a forma de pagamento escolhida for "Cartão de Crédito" ou "Boleto Bancário".
CALL _add_col_se_nao_existe('condicoes_pagamento', 'juros_parcela',
    "DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Juros % por parcela (Cartão de Crédito / Boleto)'");

-- 2) Snapshot do juros aplicado em cada pedido/compra (não muda se a condição for editada depois)
CALL _add_col_se_nao_existe('pedidos', 'juros_percentual',
    "DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Percentual de juros aplicado sobre o total'");
CALL _add_col_se_nao_existe('pedidos', 'valor_juros',
    "DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Valor em R$ de juros aplicado sobre o total'");

CALL _add_col_se_nao_existe('compras', 'juros_percentual',
    "DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Percentual de juros aplicado sobre o total'");
CALL _add_col_se_nao_existe('compras', 'valor_juros',
    "DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Valor em R$ de juros aplicado sobre o total'");

DROP PROCEDURE IF EXISTS _add_col_se_nao_existe;

-- 3) Exemplo: defina o juros por parcela das condições "a prazo" já cadastradas.
--    Ajuste os valores/nomes conforme a necessidade do seu negócio. Por padrão fica 0.00
--    (sem juros) até você editar pela tela de Condições de Pagamento ou rodar algo como:
-- UPDATE condicoes_pagamento SET juros_parcela = 2.50 WHERE nome IN ('30 Dias', '15 Dias');
