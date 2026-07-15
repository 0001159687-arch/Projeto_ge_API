const mysql  = require('mysql2');
require('dotenv').config();
const { garantirColunasDeJuros, garantirTriggerPrecoVenda } = require('./autoMigracao');

const pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_DATABASE || 'sistema_vendas_ge',
    port:     process.env.DB_PORT     || 3306,
});

// Promise que resolve quando a conexão inicial + auto-migração terminam.
// server.js espera essa promise antes de abrir a porta, evitando que
// alguma requisição chegue antes das colunas de juros existirem.
pool.pronto = new Promise((resolve) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Erro ao conectar ao banco de dados:', err.message);
            return resolve(); // não bloqueia o boot — rotas vão mostrar o erro real do MySQL
        }
        console.log('Conectado ao banco de dados MySQL!');
        connection.release();

        // Garante que as colunas usadas pela funcionalidade de Juros existam,
        // mesmo que migracao_juros.sql não tenha sido executado manualmente.
        garantirColunasDeJuros(pool)
            .then(() => garantirTriggerPrecoVenda(pool))
            .finally(resolve);
    });
});

module.exports = pool;
