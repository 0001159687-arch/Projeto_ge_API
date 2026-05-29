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
  nome     VARCHAR(100) NOT NULL,
  parcelas INT          DEFAULT 1
);

-- ── Pedidos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  cliente             VARCHAR(150),
  forma_pagamento     VARCHAR(100),
  condicao_pagamento  VARCHAR(100),
  data_pedido         DATE,
  prazo_entrega       DATE,
  status              VARCHAR(30) DEFAULT 'Aberto'
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

INSERT INTO condicoes_pagamento (nome, parcelas) VALUES
  ('À Vista', 1),
  ('30 Dias', 1),
  ('15 Dias', 1);

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
  status              VARCHAR(30) DEFAULT 'Pendente'
);

-- ── Itens da compra ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS itens_compra (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  compra_id   INT NOT NULL,
  produto_id  INT NOT NULL,
  qtd         INT            DEFAULT 1,
  preco_custo DECIMAL(10,2)  NOT NULL,
  FOREIGN KEY (compra_id)  REFERENCES compras(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- ── Fornecedores ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fornecedores (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  nome     VARCHAR(150) NOT NULL,
  endereco VARCHAR(200),
  numero   VARCHAR(10),
  bairro   VARCHAR(100),
  cep      VARCHAR(10),
  cidade   VARCHAR(100),
  cnpj     VARCHAR(20),
  email    VARCHAR(150),
  telefone VARCHAR(20)
);
