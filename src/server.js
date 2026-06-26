require('dotenv').config();

const app = require('./app');
const db  = require('./config/db');

const PORT = process.env.PORT || 3000;

// Espera a conexão inicial + auto-migração das colunas de juros terminarem
// antes de aceitar requisições, evitando erro 500 por coluna ausente.
db.pronto.then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
});
