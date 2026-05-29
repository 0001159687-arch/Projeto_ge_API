const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors());
app.use(express.json());

// ── Rotas ────────────────────────────────────────────────────
const clienteRoutes   = require('./routes/cliente.routes');
const produtoRoutes   = require('./routes/produto.routes');
const pedidoRoutes    = require('./routes/pedido.routes');
const cidadeRoutes    = require('./routes/cidade.routes');
const formaRoutes     = require('./routes/forma.routes');
const condicaoRoutes  = require('./routes/condicao.routes');
const compraRoutes    = require('./routes/compra.routes');
const fornecedorRoutes = require('./routes/fornecedor.routes');

app.use('/clientes',   clienteRoutes);
app.use('/produtos',   produtoRoutes);
app.use('/pedidos',    pedidoRoutes);
app.use('/cidades',    cidadeRoutes);
app.use('/formas',     formaRoutes);
app.use('/condicoes',  condicaoRoutes);
app.use('/compras',    compraRoutes);
app.use('/fornecedores', fornecedorRoutes);

// ── Middleware de erro (deve ser o último) ───────────────────
const errorMiddleware = require('./middlewares/error.middleware');
app.use(errorMiddleware);

module.exports = app;
