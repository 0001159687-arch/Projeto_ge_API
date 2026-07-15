// Rede de segurança para erros que não foram tratados dentro do próprio
// controller (ex: erro síncrono, JSON inválido no body). Os controllers já
// tratam seus próprios erros com { message: ... } — este middleware só
// garante que, mesmo nesses casos excepcionais, a resposta siga o mesmo
// formato usado no resto da API.
module.exports = (err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: err.message || 'Erro interno do servidor' });
};
