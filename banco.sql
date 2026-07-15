-- ============================================================
-- SISTEMA DE VENDAS — banco.sql
-- Execute este arquivo no MySQL para criar todas as tabelas
-- ============================================================

CREATE DATABASE IF NOT EXISTS sistema_vendas_ge
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sistema_vendas_ge;

-- ── Cidades ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cidades (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  uf   CHAR(2)      NOT NULL
);

-- ── Clientes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  nome     VARCHAR(150) NOT NULL,
  endereco VARCHAR(200),
  numero   VARCHAR(10),
  bairro   VARCHAR(100),
  cep      VARCHAR(10),
  cidade   VARCHAR(100),
  cpf      VARCHAR(20),
  email    VARCHAR(150),
  telefone VARCHAR(20)
);

-- ── Produtos ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS produtos (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nome      VARCHAR(150) NOT NULL,
  unidade   INT          DEFAULT 1,
  preco     DECIMAL(10,2) NOT NULL,
  estoque   INT          DEFAULT 0,
  descricao TEXT
);

-- ── Formas de pagamento ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS formas_pagamento (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(20)  NOT NULL   -- 'À Vista' | 'À Prazo'
);

-- ── Condições de pagamento ────────────────────────────────────
CREATE TABLE IF NOT EXISTS condicoes_pagamento (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(100) NOT NULL,
  parcelas      INT          DEFAULT 1,
  juros_parcela DECIMAL(5,2) NOT NULL DEFAULT 0.00  -- % de juros por parcela (Cartão de Crédito / Boleto)
);

-- ── Pedidos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  cliente             VARCHAR(150),
  forma_pagamento     VARCHAR(100),
  condicao_pagamento  VARCHAR(100),
  data_pedido         DATE,
  prazo_entrega       DATE,
  status              VARCHAR(30) DEFAULT 'Aberto',
  juros_percentual    DECIMAL(5,2)  NOT NULL DEFAULT 0.00, -- % de juros aplicado sobre o total
  valor_juros         DECIMAL(10,2) NOT NULL DEFAULT 0.00  -- R$ de juros aplicado sobre o total
);

-- ── Itens do pedido ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS itens_pedido (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id  INT NOT NULL,
  produto_id INT NOT NULL,
  qtd        INT            DEFAULT 1,
  preco      DECIMAL(10,2)  NOT NULL,
  FOREIGN KEY (pedido_id)  REFERENCES pedidos(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- ── Compras (entrada de estoque) ─────────────────────────────
CREATE TABLE IF NOT EXISTS compras (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  fornecedor          VARCHAR(150),
  forma_pagamento     VARCHAR(100),
  condicao_pagamento  VARCHAR(100),
  data_compra         DATE,
  previsao_entrega    DATE,
  status              VARCHAR(30) DEFAULT 'Pendente',
  juros_percentual    DECIMAL(5,2)  NOT NULL DEFAULT 0.00, -- % de juros aplicado sobre o total
  valor_juros         DECIMAL(10,2) NOT NULL DEFAULT 0.00  -- R$ de juros aplicado sobre o total
);

-- ── Itens da compra ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS itens_compra (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  compra_id   INT NOT NULL,
  produto_id  INT NOT NULL,
  qtd         INT           DEFAULT 1,
  preco_custo DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (compra_id)  REFERENCES compras(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- ── Fornecedores ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fornecedores (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  nome     VARCHAR(150) NOT NULL,
  telefone VARCHAR(20),
  endereco VARCHAR(200),
  numero   VARCHAR(20),
  email    VARCHAR(150),
  cnpj     VARCHAR(20),
  cep      VARCHAR(10),
  bairro   VARCHAR(100),
  cidade   VARCHAR(100)
);

-- ── Catálogo de produtos por fornecedor ──────────────────────
CREATE TABLE IF NOT EXISTS catalogo_fornecedor (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  fornecedor_id INT NOT NULL,
  nome_produto  VARCHAR(150) NOT NULL,
  preco_custo   DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE CASCADE
);
