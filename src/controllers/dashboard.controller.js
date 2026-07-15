const dashModel = require('../models/dashboard.model');

function hoje() {
    return new Date().toISOString().slice(0, 10);
}
function inicioMes() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// Valida um período de datas (formato 'YYYY-MM-DD', comparável como string):
//  - nenhuma das duas pode ser no futuro
//  - dataInicio não pode ser maior que dataFim
// Retorna uma mensagem de erro (string) se inválido, ou null se válido.
function validarPeriodo(dataInicio, dataFim) {
    const hojeStr = hoje();
    if (dataInicio > hojeStr) return 'A data inicial não pode ser uma data que ainda não chegou.';
    if (dataFim > hojeStr)    return 'A data final não pode ser uma data que ainda não chegou.';
    if (dataInicio > dataFim) return 'A data inicial não pode ser maior que a data final.';
    return null;
}

// GET /dashboard/admin?dataInicio=&dataFim=&estoqueMin=
exports.dashboardAdmin = async (req, res) => {
    try {
        const dataInicio = req.query.dataInicio || inicioMes();
        const dataFim    = req.query.dataFim    || hoje();
        const estoqueMin = req.query.estoqueMin ? Number(req.query.estoqueMin) : 5;

        const erroPeriodo = validarPeriodo(dataInicio, dataFim);
        if (erroPeriodo) return res.status(400).json({ message: erroPeriodo });

        const [totalFornecedores, totalProdutos, compras, estoqueBaixo] = await Promise.all([
            dashModel.totalFornecedores(),
            dashModel.totalProdutos(),
            dashModel.comprasPeriodo(dataInicio, dataFim),
            dashModel.produtosEstoqueBaixo(estoqueMin)
        ]);

        res.json({
            totalFornecedores,
            totalProdutos,
            compras: { qtd: compras.qtd_compras, valor: Number(compras.total_valor) },
            estoqueBaixo,
            filtros: { dataInicio, dataFim, estoqueMin }
        });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /dashboard/vendas?dataInicio=&dataFim=&limiteMaisVendidos=
exports.dashboardVendas = async (req, res) => {
    try {
        const dataFim    = req.query.dataFim    || hoje();
        const dataInicio = req.query.dataInicio || inicioMes();
        const limite      = req.query.limiteMaisVendidos ? Number(req.query.limiteMaisVendidos) : 5;
        const hojeStr = hoje();

        const erroPeriodo = validarPeriodo(dataInicio, dataFim);
        if (erroPeriodo) return res.status(400).json({ message: erroPeriodo });

        const [vendasDia, vendasPeriodo, totalClientes, maisVendidos] = await Promise.all([
            dashModel.vendasPeriodo(hojeStr, hojeStr),
            dashModel.vendasPeriodo(dataInicio, dataFim),
            dashModel.totalClientes(),
            dashModel.produtosMaisVendidos(dataInicio, dataFim, limite)
        ]);

        res.json({
            vendasDia:     { qtd: vendasDia.qtd_pedidos,     valor: Number(vendasDia.total_valor) },
            vendasPeriodo: { qtd: vendasPeriodo.qtd_pedidos, valor: Number(vendasPeriodo.total_valor) },
            totalClientes,
            maisVendidos,
            filtros: { dataInicio, dataFim, limiteMaisVendidos: limite }
        });
    } catch (e) { res.status(500).json({ message: e.message }); }
};
