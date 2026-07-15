-- =============================================================
-- TRIGGER: atualiza preço de venda do produto automaticamente
-- sempre que o preço de custo no catálogo do fornecedor mudar.
--
-- Regra: preco_venda = novo preco_custo * 1.20  (+20% de margem)
-- Vínculo: catalogo_fornecedor.nome_produto = produtos.nome
--
-- Execute este script UMA vez no banco sistema_vendas_ge:
--   mysql -u root -p sistema_vendas_ge < trigger_preco_venda.sql
-- =============================================================

DELIMITER $$

DROP TRIGGER IF EXISTS trk_catalogo_preco_venda$$

CREATE TRIGGER trk_catalogo_preco_venda
AFTER UPDATE ON catalogo_fornecedor
FOR EACH ROW
BEGIN
    -- Só age quando o preço de custo realmente mudou
    IF NEW.preco_custo <> OLD.preco_custo THEN
        UPDATE produtos
        SET    preco = ROUND(NEW.preco_custo * 1.20, 2)
        WHERE  nome  = NEW.nome_produto;
    END IF;
END$$

DELIMITER ;

-- Confirma a criação
SELECT 'Trigger trk_catalogo_preco_venda criado com sucesso.' AS status;
