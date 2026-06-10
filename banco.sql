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
  id       INT AUTO_INCREMENT PRIMARY KEY,
  nome     VARCHAR(100)   NOT NULL,
  parcelas INT            DEFAULT 1,
  juros    DECIMAL(5,2)   DEFAULT 0.00  -- percentual de acréscimo, ex: 2.50 = 2,5%
);

-- ── Pedidos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  cliente             VARCHAR(150),
  forma_pagamento     VARCHAR(100),
  condicao_pagamento  VARCHAR(100),
  data_pedido         DATE,
  prazo_entrega       DATE,
  status              VARCHAR(30)   DEFAULT 'Aberto',
  total               DECIMAL(10,2) DEFAULT 0.00   -- total com juros aplicados
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

-- ── Dados de exemplo ─────────────────────────────────────────
INSERT INTO cidades (nome, uf) VALUES ('Uba', 'MG'), ('Tocantins', 'MG');

INSERT INTO formas_pagamento (nome, tipo) VALUES
  ('Dinheiro',         'À Vista'),
  ('Cartão de Débito', 'À Vista'),
  ('Cartão de Crédito','À Vista'),
  ('PIX',              'À Vista'),
  ('Boleto Bancário',  'À Prazo');

INSERT INTO condicoes_pagamento (nome, parcelas, juros) VALUES
  ('À Vista',  1, 0.00),
  ('30 Dias',  1, 2.00),
  ('15 Dias',  1, 1.00);

INSERT INTO clientes (nome, endereco, numero, bairro, cep, cidade, cpf, email, telefone) VALUES
  ('Faye','Rua das Flores','45','Centro','36500-000','Uba','123.456.789-00','faye@gmail.com','(32) 99999-1111'),
  ('Atom','Av. Brasil','120','Jardim América','77000-000','Tocantins','234.567.890-11','atom@gmail.com','(63) 98888-2222');

INSERT INTO produtos (nome, unidade, preco, estoque) VALUES
  ('Cadeira Escritório', 1, 450.00, 12),
  ('Mesa Escritório',    1, 850.00, 23);
  
-- ── Compras (entrada de estoque) ─────────────────────────────
CREATE TABLE IF NOT EXISTS compras (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  fornecedor          VARCHAR(150),
  forma_pagamento     VARCHAR(100),
  condicao_pagamento  VARCHAR(100),
  data_compra         DATE,
  previsao_entrega    DATE,
  status              VARCHAR(30)   DEFAULT 'Pendente',
  total               DECIMAL(10,2) DEFAULT 0.00   -- total com juros aplicados
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
  produto_id    INT NOT NULL,
  preco_custo   DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id)    REFERENCES produtos(id)     ON DELETE CASCADE,
  UNIQUE KEY unico_forn_prod (fornecedor_id, produto_id)
);

-- ── Dados de exemplo: Fornecedores ───────────────────────────
INSERT INTO fornecedores
  (nome, telefone, endereco, numero, email, cnpj, cep, bairro, cidade)
VALUES
  ('Moveis MG',         '(31) 98765-4321', 'Rua das Industrias', '100', 'contato@moveismg.com.br',      '11222333000181', '30130-010', 'Centro',      'Belo Horizonte'),
  ('Escritorio Brasil', '(31) 99876-5432', 'Av. Comercial',      '200', 'vendas@escritoriobrasil.com.br','44555666000191', '30140-020', 'Funcionarios','Belo Horizonte');

-- ── Dados de exemplo: Catálogo por fornecedor ────────────────
INSERT INTO catalogo_fornecedor
  (fornecedor_id, produto_id, preco_custo)
VALUES
  (1, 1, 300.00),
  (1, 2, 650.00),
  (2, 1, 320.00),
  (2, 2, 680.00);

-- ── Migração: execute apenas se o banco JÁ EXISTIA antes desta versão ──────
-- ALTER TABLE condicoes_pagamento ADD COLUMN IF NOT EXISTS juros DECIMAL(5,2) DEFAULT 0.00;
-- ALTER TABLE pedidos             ADD COLUMN IF NOT EXISTS total DECIMAL(10,2) DEFAULT 0.00;
-- ALTER TABLE compras             ADD COLUMN IF NOT EXISTS total DECIMAL(10,2) DEFAULT 0.00;
