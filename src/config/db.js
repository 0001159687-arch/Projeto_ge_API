const mysql = require('mysql2');
require('dotenv').config();
const { garantirColunasDeJuros, garantirTriggerPrecoVenda } = require('./autoMigracao');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_DATABASE || 'sistema_vendas_ge',
    port: process.env.DB_PORT || 3306,

    ssl: process.env.DB_HOST
        ? {
            rejectUnauthorized: false
        }
        : undefined
});

// Promise que resolve quando a conexão inicial + auto-migração terminam.
pool.pronto = new Promise((resolve) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Erro ao conectar ao banco de dados:', err.message);
            return resolve();
        }

        console.log('Conectado ao banco de dados MySQL!');
        connection.release();

        garantirColunasDeJuros(pool)
            .then(() => garantirTriggerPrecoVenda(pool))
            .finally(resolve);
    });
});

module.exports = pool;