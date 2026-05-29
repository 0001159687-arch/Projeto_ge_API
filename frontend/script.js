// ============================================================
// SISTEMA DE VENDAS — SCRIPT.JS
// ============================================================

const API = 'http://localhost:3000';

let pedidoItens = [];

// ============================================================
// HELPERS E UTILITÁRIOS HTTP
// ============================================================
async function GET(rota) {
    const res = await fetch(API + rota);
    if (!res.ok) throw new Error('Erro ao buscar ' + rota);
    return res.json();
}
async function POST(rota, dados) {
    const res = await fetch(API + rota, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Erro ao salvar');
    return json;
}
async function PUT(rota, dados) {
    const res = await fetch(API + rota, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Erro ao atualizar');
    return res.json();
}
async function DELETE(rota) {
    const res = await fetch(API + rota, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir');
    return res.json();
}

function showToast(msg, tipo = 'success') {
    const toast = document.getElementById('toast');
    if(!toast) return;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    document.getElementById('toast-icon').textContent = icons[tipo] || '✅';
    document.getElementById('toast-msg').textContent  = msg;
    toast.className = `show toast-${tipo}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.className = '', 3500);
}

// Fechar os modais ao clicar no fundo escuro
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
});

function openModal(id) {
    const modal = document.getElementById(id);
    if(modal) modal.classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if(modal) { modal.classList.remove('active'); clearAllErrors(id); }
}

function limparCampos(modalId) {
    const modal = document.getElementById(modalId);
    if(!modal) return;
    modal.querySelectorAll('input:not([disabled]), select, textarea').forEach(el => el.value = '');
    modal.querySelectorAll('input[type="hidden"]').forEach(el => el.value = '');
    
    if(modalId === 'modal-pedido') {
        pedidoItens = [];
        renderItensPedido();
        document.getElementById('ped-data').valueAsDate = new Date();
        document.getElementById('modal-pedido-title').textContent = 'Novo Pedido';
    }
}

function filterTable(tableId, value) {
    const filtro = value.toLowerCase();
    const linhas = document.querySelectorAll(`#${tableId} tbody tr`);
    linhas.forEach(linha => {
        linha.style.display = linha.innerText.toLowerCase().includes(filtro) ? '' : 'none';
    });
}

// ============================================================
// SELECTS
// ============================================================
async function popularSelects() {
    async function carregarOpcoes(rota, selectId, chaveTexto) {
        try {
            const data = await GET(rota);
            const select = document.getElementById(selectId);
            if(!select) return;
            select.innerHTML = '<option value="">Selecione...</option>';
            data.forEach(item => {
                select.innerHTML += `<option value="${item.id}">${item[chaveTexto]}</option>`;
            });
        } catch(e) { console.log(e); }
    }
    await carregarOpcoes('/cidades',   'c-cidade',    'nome');
    await carregarOpcoes('/clientes',  'ped-cliente', 'nome');
    await carregarOpcoes('/condicoes', 'ped-condicao','nome');  // coluna é 'nome'
    await carregarOpcoes('/formas',    'ped-forma',   'nome');  // coluna é 'nome'
}

// ============================================================
// CLIENTES
// ============================================================
async function carregarClientes() {
    try {
        const clientes = await GET('/clientes');
        const tbody = document.getElementById('tbody-clientes');
        tbody.innerHTML = clientes.map(c => `
            <tr>
                <td>${c.id}</td>
                <td>${c.nome || ''}</td>
                <td>${c.endereco || ''}</td>
                <td>${c.bairro || ''}</td>
                <td>${c.cep || ''}</td>
                <td>${c.cidade || ''}</td>
                <td>${c.cpf || ''}</td>
                <td>${c.email || ''}</td>
                <td>${c.telefone || ''}</td>
                <td class="acoes">
                    <button onclick="editarCliente('${c.id}')">✏️</button>
                    <button onclick="deletarCliente('${c.id}')">🗑️</button>
                </td>
            </tr>`).join('');
    } catch(erro) { console.log(erro); }
}

// ── VALIDAÇÃO E MÁSCARAS ─────────────────────────────────────
function setFieldError(id, msg) {
    const el = document.getElementById(id);
    el.style.borderColor = 'var(--red)';
    el.style.boxShadow   = '0 0 0 3px rgba(232,64,64,.15)';
    let tip = el.parentElement.querySelector('.field-error');
    if(!tip) { tip = document.createElement('span'); tip.className = 'field-error'; el.parentElement.appendChild(tip); }
    tip.textContent = msg;
}

function clearFieldError(id) {
    const el = document.getElementById(id);
    el.style.borderColor = '';
    el.style.boxShadow   = '';
    const tip = el.parentElement.querySelector('.field-error');
    if(tip) tip.remove();
}

function clearAllErrors(modalId) {
    document.querySelectorAll(`#${modalId} .field-error`).forEach(e => e.remove());
    document.querySelectorAll(`#${modalId} input, #${modalId} select`).forEach(el => {
        el.style.borderColor = '';
        el.style.boxShadow   = '';
    });
}

function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if(cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let soma = 0;
    for(let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
    let r = (soma * 10) % 11; if(r === 10 || r === 11) r = 0;
    if(r !== parseInt(cpf[9])) return false;
    soma = 0;
    for(let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
    r = (soma * 10) % 11; if(r === 10 || r === 11) r = 0;
    return r === parseInt(cpf[10]);
}

function aplicarMascaraTel(el) {
    el.addEventListener('input', () => {
        let v = el.value.replace(/\D/g,'');
        if(v.length > 11) v = v.slice(0,11);
        if(v.length > 6) v = `(${v.slice(0,2)})${v.slice(2,7)}-${v.slice(7)}`;
        else if(v.length > 2) v = `(${v.slice(0,2)})${v.slice(2)}`;
        else if(v.length > 0) v = `(${v}`;
        el.value = v;
        clearFieldError('c-tel');
    });
}

function aplicarMascaraCPF(el) {
    el.addEventListener('input', () => {
        let v = el.value.replace(/\D/g,'');
        if(v.length > 11) v = v.slice(0,11);
        if(v.length > 9)      v = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
        else if(v.length > 6) v = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
        else if(v.length > 3) v = `${v.slice(0,3)}.${v.slice(3)}`;
        el.value = v;
        clearFieldError('c-cpf');
    });
}

function aplicarMascaraCEP(el) {
    el.addEventListener('input', () => {
        let v = el.value.replace(/\D/g,'');
        if(v.length > 8) v = v.slice(0,8);
        if(v.length > 5) v = `${v.slice(0,5)}-${v.slice(5)}`;
        el.value = v;
        clearFieldError('c-cep');
    });
}

// Aplica máscaras quando o DOM carrega
document.addEventListener('DOMContentLoaded', () => {
    aplicarMascaraTel(document.getElementById('c-tel'));
    aplicarMascaraCPF(document.getElementById('c-cpf'));
    aplicarMascaraCEP(document.getElementById('c-cep'));

    // Limpar erros ao digitar — Cliente
    ['c-nome','c-end','c-num','c-email','c-bairro','c-cidade'].forEach(id => {
        document.getElementById(id)?.addEventListener('input',  () => clearFieldError(id));
        document.getElementById(id)?.addEventListener('change', () => clearFieldError(id));
    });

    // Limpar erros ao digitar — Produto
    ['p-nome','p-preco','p-estoque'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => clearFieldError(id));
    });

    // Limpar erros ao digitar — Cidade
    ['cid-nome','cid-uf'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => clearFieldError(id));
    });
    // UF sempre maiúscula ao digitar
    document.getElementById('cid-uf')?.addEventListener('input', e => {
        e.target.value = e.target.value.toUpperCase();
    });

    // Limpar erros ao digitar — Forma
    ['fp-nome','fp-tipo'].forEach(id => {
        document.getElementById(id)?.addEventListener('input',  () => clearFieldError(id));
        document.getElementById(id)?.addEventListener('change', () => clearFieldError(id));
    });

    // Limpar erros ao digitar — Condição
    ['cp-nome','cp-parcelas'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => clearFieldError(id));
    });

    // Limpar erros ao digitar — Pedido
    ['ped-cliente','ped-condicao','ped-forma','ped-data','ped-prazo'].forEach(id => {
        document.getElementById(id)?.addEventListener('input',  () => clearFieldError(id));
        document.getElementById(id)?.addEventListener('change', () => clearFieldError(id));
    });
});

async function saveCliente() {
    const id = document.getElementById('c-id').value;
    const selectCidade = document.getElementById('c-cidade');

    clearAllErrors('modal-cliente');

    const nome     = document.getElementById('c-nome').value.trim();
    const telefone = document.getElementById('c-tel').value.trim();
    const endereco = document.getElementById('c-end').value.trim();
    const numero   = document.getElementById('c-num').value.trim();
    const email    = document.getElementById('c-email').value.trim();
    const cpf      = document.getElementById('c-cpf').value.trim();
    const cep      = document.getElementById('c-cep').value.trim();
    const bairro   = document.getElementById('c-bairro').value.trim();
    const cidadeId = selectCidade.value;
    const cidade   = selectCidade.options[selectCidade.selectedIndex]?.text || '';

    let valido = true;

    if(!nome) {
        setFieldError('c-nome', 'Nome é obrigatório'); valido = false;
    } else if(nome.length < 3) {
        setFieldError('c-nome', 'Nome muito curto'); valido = false;
    }

    if(!telefone) {
        setFieldError('c-tel', 'Telefone é obrigatório'); valido = false;
    } else if(telefone.replace(/\D/g,'').length < 10) {
        setFieldError('c-tel', 'Telefone inválido'); valido = false;
    }

    if(!endereco) {
        setFieldError('c-end', 'Endereço é obrigatório'); valido = false;
    }

    if(!numero) {
        setFieldError('c-num', 'Número é obrigatório'); valido = false;
    }

    if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldError('c-email', 'E-mail inválido'); valido = false;
    }

    if(cpf && !validarCPF(cpf)) {
        setFieldError('c-cpf', 'CPF inválido'); valido = false;
    }

    if(cep && cep.replace(/\D/g,'').length !== 8) {
        setFieldError('c-cep', 'CEP inválido'); valido = false;
    }

    if(!bairro) {
        setFieldError('c-bairro', 'Bairro é obrigatório'); valido = false;
    }

    if(!cidadeId) {
        setFieldError('c-cidade', 'Selecione uma cidade'); valido = false;
    }

    if(!valido) return;

    const cliente = { nome, telefone, endereco, numero, email, cpf, cep, bairro, cidade };

    try {
        if(id) await PUT(`/clientes/${id}`, cliente);
        else   await POST(`/clientes`, cliente);
        closeModal('modal-cliente');
        carregarClientes();
        showToast(id ? 'Cliente atualizado! ✨' : 'Cliente salvo! ✨');
    } catch(erro) { showToast('Erro ao salvar cliente', 'error'); console.log(erro); }
}

async function editarCliente(id){
    try {
        const cliente = await GET(`/clientes/${id}`);
        document.getElementById('c-id').value    = cliente.id       || '';
        document.getElementById('c-nome').value  = cliente.nome     || '';
        document.getElementById('c-tel').value   = cliente.telefone || '';
        document.getElementById('c-end').value   = cliente.endereco || '';
        document.getElementById('c-num').value   = cliente.numero   || '';
        document.getElementById('c-email').value = cliente.email    || '';
        document.getElementById('c-cpf').value   = cliente.cpf      || '';
        document.getElementById('c-cep').value   = cliente.cep      || '';
        document.getElementById('c-bairro').value= cliente.bairro   || '';
        
        await popularSelects();
        openModal('modal-cliente');
    } catch(erro) { console.log(erro); }
}

async function deletarCliente(id){
    if(!confirm('Excluir cliente?')) return;
    try {
        await DELETE(`/clientes/${id}`);
        carregarClientes();
        showToast('Cliente excluído!', 'info');
    } catch(erro) { console.log(erro); }
}

// ============================================================
// PRODUTOS
// ============================================================
async function carregarProdutos(){
    try {
        const produtos = await GET('/produtos');
        const tbody = document.getElementById('tbody-produtos');
        tbody.innerHTML = produtos.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.nome || ''}</td>
                <td>UN</td>
                <td>R$ ${Number(p.preco || 0).toFixed(2)}</td>
                <td>${p.estoque || '0'}</td>
                <td class="acoes">
                    <button onclick="editarProduto('${p.id}')">✏️</button>
                    <button onclick="deletarProduto('${p.id}')">🗑️</button>
                </td>
            </tr>`).join('');
            
        document.getElementById('total-produtos').innerText = `Total de produtos: ${produtos.length}`;
    } catch(erro) { console.log(erro); }
}

async function saveProduto(){
    const id = document.getElementById('p-id').value;
    clearAllErrors('modal-produto');

    const nome     = document.getElementById('p-nome').value.trim();
    const preco    = document.getElementById('p-preco').value;
    const estoque  = document.getElementById('p-estoque').value;

    let valido = true;

    if(!nome) {
        setFieldError('p-nome', 'Nome é obrigatório'); valido = false;
    } else if(nome.length < 2) {
        setFieldError('p-nome', 'Nome muito curto'); valido = false;
    }

    if(preco === '' || preco === null) {
        setFieldError('p-preco', 'Preço é obrigatório'); valido = false;
    } else if(Number(preco) < 0) {
        setFieldError('p-preco', 'Preço não pode ser negativo'); valido = false;
    }

    if(estoque === '' || estoque === null) {
        setFieldError('p-estoque', 'Estoque é obrigatório'); valido = false;
    } else if(Number(estoque) < 0) {
        setFieldError('p-estoque', 'Estoque não pode ser negativo'); valido = false;
    }

    if(!valido) return;

    const produto = {
        nome,
        preco:     Number(preco),
        // estoque gerenciado pelas compras — não atualiza manualmente
        descricao: document.getElementById('p-desc').value.trim()
    };

    try {
        if(id) await PUT(`/produtos/${id}`, produto);
        else   await POST(`/produtos`, produto);
        closeModal('modal-produto');
        carregarProdutos();
        showToast(id ? 'Produto atualizado! ✨' : 'Produto salvo! ✨');
    } catch(erro) { showToast('Erro ao salvar produto', 'error'); console.log(erro); }
}

async function editarProduto(id){
    try {
        const produto = await GET(`/produtos/${id}`);
        document.getElementById('p-id').value      = produto.id       || '';
        document.getElementById('p-nome').value    = produto.nome     || '';
        document.getElementById('p-preco').value   = produto.preco    || '';
        document.getElementById('p-estoque').value = produto.estoque  || '';
        document.getElementById('p-desc').value    = produto.descricao|| '';
        openModal('modal-produto');
    } catch(erro) { console.log(erro); }
}

async function deletarProduto(id){
    if(!confirm('Excluir produto?')) return;
    try {
        await DELETE(`/produtos/${id}`);
        carregarProdutos();
        showToast('Produto excluído!', 'info');
    } catch(erro) { console.log(erro); }
}

// ============================================================
// CIDADES
// ============================================================
async function carregarCidades() {
    try {
        const cidades = await GET('/cidades');
        document.getElementById('tbody-cidades').innerHTML = cidades.map(c => `
            <tr>
                <td>${c.id}</td><td>${c.nome || ''}</td><td style="text-transform:uppercase">${c.uf || ''}</td>
                <td class="acoes"><button onclick="editarCidade('${c.id}')">✏️</button><button onclick="deletarCidade('${c.id}')">🗑️</button></td>
            </tr>`).join('');
    } catch(e) { console.log(e); }
}

async function saveCidade() {
    const id = document.getElementById('cid-id').value;
    clearAllErrors('modal-cidade');

    const nome = document.getElementById('cid-nome').value.trim();
    const uf   = document.getElementById('cid-uf').value.trim().toUpperCase();
    const ufsValidas = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

    let valido = true;

    if(!nome) {
        setFieldError('cid-nome', 'Nome da cidade é obrigatório'); valido = false;
    } else if(nome.length < 3) {
        setFieldError('cid-nome', 'Nome muito curto'); valido = false;
    }

    if(!uf) {
        setFieldError('cid-uf', 'UF é obrigatória'); valido = false;
    } else if(uf.length !== 2 || !ufsValidas.includes(uf)) {
        setFieldError('cid-uf', 'UF inválida'); valido = false;
    }

    if(!valido) return;

    try {
        if(id) await PUT(`/cidades/${id}`, { nome, uf }); else await POST(`/cidades`, { nome, uf });
        closeModal('modal-cidade'); carregarCidades(); showToast('Cidade salva! ✨');
    } catch(e) { showToast('Erro ao salvar cidade', 'error'); }
}

async function editarCidade(id) {
    try {
        const cid = await GET(`/cidades/${id}`);
        document.getElementById('cid-id').value   = cid.id   || '';
        document.getElementById('cid-nome').value = cid.nome || '';
        document.getElementById('cid-uf').value   = cid.uf   || '';
        openModal('modal-cidade');
    } catch(e) { console.log(e); }
}

async function deletarCidade(id) {
    if(!confirm('Excluir cidade?')) return;
    try { await DELETE(`/cidades/${id}`); carregarCidades(); showToast('Cidade excluída!', 'info'); } catch(e) {}
}

// ============================================================
// FORMAS DE PAGAMENTO  (coluna no banco: nome, tipo)
// ============================================================
async function carregarFormas() {
    try {
        const formas = await GET('/formas');
        document.getElementById('tbody-formas').innerHTML = formas.map(f => `
            <tr>
                <td>${f.id}</td><td>${f.nome || ''}</td><td>${f.tipo || ''}</td>
                <td class="acoes"><button onclick="editarForma('${f.id}')">✏️</button><button onclick="deletarForma('${f.id}')">🗑️</button></td>
            </tr>`).join('');
    } catch(e) { console.log(e); }
}

async function saveForma() {
    const id = document.getElementById('fp-id').value;
    clearAllErrors('modal-forma');

    const nome = document.getElementById('fp-nome').value.trim();
    const tipo = document.getElementById('fp-tipo').value;
    let valido = true;

    if(!nome) {
        setFieldError('fp-nome', 'Nome é obrigatório'); valido = false;
    } else if(nome.length < 3) {
        setFieldError('fp-nome', 'Nome muito curto'); valido = false;
    }

    if(!tipo) {
        setFieldError('fp-tipo', 'Selecione um tipo'); valido = false;
    }

    if(!valido) return;

    try {
        if(id) await PUT(`/formas/${id}`, { nome, tipo }); else await POST(`/formas`, { nome, tipo });
        closeModal('modal-forma'); carregarFormas(); showToast('Forma salva! ✨');
    } catch(e) { showToast('Erro ao salvar forma', 'error'); }
}

async function editarForma(id) {
    try {
        const f = await GET(`/formas/${id}`);
        document.getElementById('fp-id').value   = f.id   || '';
        document.getElementById('fp-nome').value = f.nome || '';  // era f.desc — corrigido
        document.getElementById('fp-tipo').value = f.tipo || '';
        openModal('modal-forma');
    } catch(e) {}
}

async function deletarForma(id) {
    if(!confirm('Excluir forma?')) return;
    try { await DELETE(`/formas/${id}`); carregarFormas(); showToast('Excluído!', 'info'); } catch(e) {}
}

// ============================================================
// CONDIÇÕES DE PAGAMENTO  (coluna no banco: nome, parcelas)
// ============================================================
async function carregarCondicoes() {
    try {
        const conds = await GET('/condicoes');
        document.getElementById('tbody-condicoes').innerHTML = conds.map(c => `
            <tr>
                <td>${c.id}</td><td>${c.nome || ''}</td><td>${c.parcelas || ''}x</td>
                <td class="acoes"><button onclick="editarCondicao('${c.id}')">✏️</button><button onclick="deletarCondicao('${c.id}')">🗑️</button></td>
            </tr>`).join('');
    } catch(e) {}
}

async function saveCondicao() {
    const id = document.getElementById('cp-id').value;
    clearAllErrors('modal-condicao');

    const nome     = document.getElementById('cp-nome').value.trim();
    const parcelas = document.getElementById('cp-parcelas').value;
    let valido = true;

    if(!nome) {
        setFieldError('cp-nome', 'Nome é obrigatório'); valido = false;
    } else if(nome.length < 2) {
        setFieldError('cp-nome', 'Nome muito curto'); valido = false;
    }

    if(!parcelas) {
        setFieldError('cp-parcelas', 'Parcelas é obrigatório'); valido = false;
    } else if(Number(parcelas) < 1) {
        setFieldError('cp-parcelas', 'Mínimo 1 parcela'); valido = false;
    } else if(Number(parcelas) > 120) {
        setFieldError('cp-parcelas', 'Máximo 120 parcelas'); valido = false;
    }

    if(!valido) return;

    try {
        if(id) await PUT(`/condicoes/${id}`, { nome, parcelas }); else await POST(`/condicoes`, { nome, parcelas });
        closeModal('modal-condicao'); carregarCondicoes(); showToast('Condição salva! ✨');
    } catch(e) { showToast('Erro ao salvar condição', 'error'); }
}

async function editarCondicao(id) {
    try {
        const c = await GET(`/condicoes/${id}`);
        document.getElementById('cp-id').value       = c.id       || '';
        document.getElementById('cp-nome').value     = c.nome     || '';      // era c.desc — corrigido
        document.getElementById('cp-parcelas').value = c.parcelas || '';      // era c.prazo — corrigido
        openModal('modal-condicao');
    } catch(e) {}
}

async function deletarCondicao(id) {
    if(!confirm('Excluir condição?')) return;
    try { await DELETE(`/condicoes/${id}`); carregarCondicoes(); showToast('Excluído!', 'info'); } catch(e) {}
}

// ============================================================
// PEDIDOS E CARRINHO DE ITENS
// ============================================================
function statusBadge(status) {
    const map = {
        'Aberto':       'status-aberto',
        'Em andamento': 'status-andamento',
        'Concluído':    'status-concluido',
        'Cancelado':    'status-cancelado',
    };
    const cls = map[status] || 'status-aberto';
    return `<span class="status-badge ${cls}">${status || 'Aberto'}</span>`;
}

async function carregarPedidos() {
    try {
        const pedidos = await GET('/pedidos');
        document.getElementById('tbody-pedidos').innerHTML = pedidos.map(ped => {
            const dataPed  = ped.data_pedido   ? ped.data_pedido.split('T')[0].split('-').reverse().join('/')   : '';
            const prazoPed = ped.prazo_entrega ? ped.prazo_entrega.split('T')[0].split('-').reverse().join('/') : '';
            // Calcula total dos itens se disponível
            const total = ped.total != null ? `R$ ${Number(ped.total).toFixed(2)}` : '—';
            return `
                <tr>
                    <td>${ped.id}</td>
                    <td>${dataPed}</td>
                    <td>${ped.cliente            || ''}</td>
                    <td>${ped.condicao_pagamento || ''}</td>
                    <td>${ped.forma_pagamento    || ''}</td>
                    <td>${prazoPed}</td>
                    <td style="font-weight:700;color:var(--blue)">${total}</td>
                    <td>${statusBadge(ped.status)}</td>
                    <td class="acoes">
                        <button onclick="editarPedido('${ped.id}')">✏️</button>
                        <button onclick="deletarPedido('${ped.id}')">🗑️</button>
                    </td>
                </tr>`;
        }).join('');
    } catch(e) { console.log(e); }
}

async function openProdPicker() {
    openModal('modal-prod-picker');
    try {
        const produtos = await GET('/produtos');
        document.getElementById('tbody-picker').innerHTML = produtos.map(p => {
            const semEstoque = !p.estoque || Number(p.estoque) <= 0;
            return `
            <tr style="${semEstoque ? 'opacity:0.5' : ''}">
                <td>${p.id}</td>
                <td>${p.nome || ''}</td>
                <td>R$ ${Number(p.preco || 0).toFixed(2)}</td>
                <td style="font-weight:700; color:${semEstoque ? 'var(--red)' : 'var(--green)'}">
                    ${semEstoque ? '⚠️ Sem estoque' : p.estoque}
                </td>
                <td class="acoes">
                    <button class="btn btn-primary" style="width:auto; padding:6px 12px; font-size:12px;"
                        ${semEstoque ? 'disabled title="Produto sem estoque" style="width:auto;padding:6px 12px;font-size:12px;opacity:0.4;cursor:not-allowed;background:var(--gray-400)"' : ''}
                        onclick="${semEstoque ? '' : `addProdutoAoPedido('${p.id}', '${p.nome}', ${p.preco || 0}, ${p.estoque || 0})`}">
                        ${semEstoque ? 'Indisponível' : '+ Adicionar'}
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch(erro) { console.log(erro); }
}

function renderItensPedido() {
    const tbody = document.getElementById('tbody-itens-pedido');
    let total = 0;
    
    tbody.innerHTML = pedidoItens.map((item, index) => {
        const subtotal = item.preco * item.qtd;
        total += subtotal;
        return `
            <tr>
                <td>${item.nome}</td>
                <td>${item.qtd} UN</td>
                <td>R$ ${Number(item.preco).toFixed(2)}</td>
                <td>R$ ${Number(subtotal).toFixed(2)}</td>
                <td class="acoes"><button style="width:28px;height:28px;" onclick="removerItemPedido(${index})">✕</button></td>
            </tr>`;
    }).join('');
    
    document.getElementById('ped-total-line').innerText = `Total: R$ ${total.toFixed(2)}`;
}

function addProdutoAoPedido(id, nome, preco, estoque) {
    const existente = pedidoItens.find(i => i.id === id);
    const qtdAtual  = existente ? existente.qtd : 0;

    if(qtdAtual + 1 > Number(estoque)) {
        showToast(`Estoque insuficiente! Disponível: ${estoque}`, 'error');
        return;
    }

    if(existente) {
        existente.qtd += 1;
    } else {
        pedidoItens.push({ id, nome, preco: Number(preco), qtd: 1, estoque: Number(estoque) });
    }
    renderItensPedido();
    closeModal('modal-prod-picker');
    showToast(`${nome} adicionado ao pedido!`);
}

function removerItemPedido(index) {
    pedidoItens.splice(index, 1);
    renderItensPedido();
}

async function editarPedido(id) {
    try {
        const ped = await GET(`/pedidos/${id}`);
        await popularSelects();
        document.getElementById('ped-id').value     = ped.id || '';
        document.getElementById('ped-data').value   = ped.data_pedido   ? ped.data_pedido.split('T')[0]   : '';
        document.getElementById('ped-prazo').value  = ped.prazo_entrega ? ped.prazo_entrega.split('T')[0] : '';
        document.getElementById('ped-status').value = ped.status || 'Aberto';
        // Selecionar cliente pelo nome (campo texto no banco)
        const selCli = document.getElementById('ped-cliente');
        Array.from(selCli.options).forEach(o => { if(o.text === ped.cliente) selCli.value = o.value; });
        const selCond = document.getElementById('ped-condicao');
        Array.from(selCond.options).forEach(o => { if(o.text === ped.condicao_pagamento) selCond.value = o.value; });
        const selForma = document.getElementById('ped-forma');
        Array.from(selForma.options).forEach(o => { if(o.text === ped.forma_pagamento) selForma.value = o.value; });
        // Carrega itens do pedido
        pedidoItens = (ped.itens || []).map(i => ({
            id: String(i.produto_id), nome: i.produto_nome || '', preco: Number(i.preco), qtd: i.qtd
        }));
        renderItensPedido();
        document.getElementById('modal-pedido-title').textContent = 'Editar Pedido #' + id;
        openModal('modal-pedido');
    } catch(e) { console.log(e); showToast('Erro ao carregar pedido', 'error'); }
}

async function savePedido() {
    const id         = document.getElementById('ped-id').value;
    const elCliente  = document.getElementById('ped-cliente');
    const elCondicao = document.getElementById('ped-condicao');
    const elForma    = document.getElementById('ped-forma');
    const data       = document.getElementById('ped-data').value;
    const prazo      = document.getElementById('ped-prazo').value;

    clearAllErrors('modal-pedido');
    let valido = true;

    if(!elCliente.value) {
        setFieldError('ped-cliente', 'Selecione um cliente'); valido = false;
    }
    if(!elCondicao.value) {
        setFieldError('ped-condicao', 'Selecione uma condição'); valido = false;
    }
    if(!elForma.value) {
        setFieldError('ped-forma', 'Selecione uma forma de pagamento'); valido = false;
    }
    if(!data) {
        setFieldError('ped-data', 'Data é obrigatória'); valido = false;
    }
    if(prazo && data && prazo < data) {
        setFieldError('ped-prazo', 'Prazo não pode ser antes da data do pedido'); valido = false;
    }
    if(pedidoItens.length === 0) {
        showToast('Adicione pelo menos um produto ao pedido!', 'error'); valido = false;
    }

    if(!valido) return;

    const pedido = {
        cliente:  elCliente.options[elCliente.selectedIndex].text,
        condicao: elCondicao.options[elCondicao.selectedIndex]?.text || '',
        forma:    elForma.options[elForma.selectedIndex]?.text || '',
        data, prazo,
        status:   document.getElementById('ped-status').value || 'Aberto',
        itens:    pedidoItens.map(i => ({ produto_id: i.id, qtd: i.qtd, preco: i.preco }))
    };

    try {
        if(id) await PUT(`/pedidos/${id}`, pedido);
        else   await POST('/pedidos', pedido);
        closeModal('modal-pedido');
        pedidoItens = [];
        document.getElementById('modal-pedido-title').textContent = 'Novo Pedido';
        carregarPedidos();
        carregarProdutos();
        showToast(id ? 'Pedido atualizado!' : 'Pedido salvo!');
    } catch(e) {
        const msg = e.message || '';
        showToast(msg.includes('Estoque insuficiente') ? msg : 'Erro ao salvar pedido', 'error');
        console.log(e);
    }
}

async function deletarPedido(id) {
    if(!confirm('Excluir este pedido?')) return;
    try { await DELETE(`/pedidos/${id}`); carregarPedidos(); showToast('Pedido excluído!', 'info'); } catch(e) {}
}

// ============================================================
// NAVEGAÇÃO E BOTÕES "NOVO"
// ============================================================
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;
        if(!page) return;

        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
        const pagina = document.getElementById(`page-${page}`);
        if(pagina) pagina.classList.add('active');

        if(page === 'clientes') carregarClientes();
        if(page === 'produtos') carregarProdutos();
        if(page === 'pedidos')  carregarPedidos();
        if(page === 'cidades')  carregarCidades();
        if(page === 'formas')   carregarFormas();
        if(page === 'condicoes')carregarCondicoes();
        if(page === 'compras')  carregarCompras();
    });
});

document.querySelectorAll('.btn-new').forEach(btn => {
    btn.addEventListener('click', async () => {
        const section = btn.closest('.page-section');
        if(!section) return;
        const pageId = section.id;

        if(pageId === 'page-clientes'){
            limparCampos('modal-cliente'); await popularSelects(); openModal('modal-cliente');
        } else if(pageId === 'page-produtos'){
            limparCampos('modal-produto'); openModal('modal-produto');
        } else if(pageId === 'page-pedidos'){
            limparCampos('modal-pedido'); await popularSelects(); openModal('modal-pedido');
        } else if(pageId === 'page-cidades'){
            limparCampos('modal-cidade'); openModal('modal-cidade');
        } else if(pageId === 'page-formas'){
            limparCampos('modal-forma'); openModal('modal-forma');
        } else if(pageId === 'page-condicoes'){
            limparCampos('modal-condicao'); openModal('modal-condicao');
        } else if(pageId === 'page-compras'){
            compraItens = [];
            renderItensCompra();
            document.getElementById('cmp-id').value = '';
            document.getElementById('cmp-fornecedor').value = '';
            document.getElementById('cmp-data').valueAsDate = new Date();
            document.getElementById('cmp-previsao').value = '';
            document.getElementById('modal-compra-title').textContent = 'Nova Compra';
            clearAllErrors('modal-compra');
            await popularSelectsCompra();
            openModal('modal-compra');
        }
    });
});

// ============================================================
// INICIALIZAÇÃO
// ============================================================
carregarClientes();
popularSelects();

// ============================================================
// SIDEBAR MOBILE — HAMBURGUER
// ============================================================
(function() {
    const toggle  = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if(!toggle) return;

    function openSidebar()  { sidebar.classList.add('open'); overlay.classList.add('open'); }
    function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }

    toggle.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
    overlay.addEventListener('click', closeSidebar);

    // Fecha ao clicar em item de menu no mobile
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => { if(window.innerWidth <= 768) closeSidebar(); });
    });
})();

// ============================================================
// COMPRAS
// ============================================================
let compraItens = [];

async function carregarCompras() {
    try {
        const compras = await GET('/compras');
        document.getElementById('tbody-compras').innerHTML = compras.map(c => {
            const dataC    = c.data_compra      ? c.data_compra.split('T')[0].split('-').reverse().join('/')      : '';
            const previsao = c.previsao_entrega ? c.previsao_entrega.split('T')[0].split('-').reverse().join('/') : '';
            const total    = c.total != null ? `R$ ${Number(c.total).toFixed(2)}` : '—';
            const statusMap = {
                'Pendente':   'status-andamento',
                'Confirmada': 'status-aberto',
                'Recebida':   'status-concluido',
                'Cancelada':  'status-cancelado',
            };
            const badgeCls = statusMap[c.status] || 'status-aberto';
            return `
                <tr>
                    <td>${c.id}</td>
                    <td>${dataC}</td>
                    <td>${c.fornecedor || ''}</td>
                    <td>${c.condicao_pagamento || ''}</td>
                    <td>${c.forma_pagamento || ''}</td>
                    <td>${previsao}</td>
                    <td style="font-weight:700;color:var(--green)">${total}</td>
                    <td><span class="status-badge ${badgeCls}">${c.status || ''}</span></td>
                    <td class="acoes">
                        <button onclick="editarCompra('${c.id}')">✏️</button>
                        <button onclick="deletarCompra('${c.id}')">🗑️</button>
                    </td>
                </tr>`;
        }).join('');
    } catch(e) { console.log(e); }
}

async function openProdPickerCompra() {
    openModal('modal-prod-picker-compra');
    try {
        const produtos = await GET('/produtos');
        document.getElementById('tbody-picker-compra').innerHTML = produtos.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.nome || ''}</td>
                <td style="color:var(--blue);font-weight:700">${p.estoque || 0}</td>
                <td>
                    <input type="number" min="0.01" step="0.01" placeholder="R$ 0.00"
                        id="custo-${p.id}" style="width:110px;padding:6px 8px;border:1px solid var(--gray-200);border-radius:6px;font-size:13px">
                </td>
                <td class="acoes">
                    <button class="btn btn-success" style="width:auto;padding:6px 12px;font-size:12px"
                        onclick="addProdutoAoCompra('${p.id}', '${p.nome}', ${p.estoque || 0})">
                        + Adicionar
                    </button>
                </td>
            </tr>`).join('');
    } catch(e) { console.log(e); }
}

function addProdutoAoCompra(id, nome, estoqueAtual) {
    const custoEl = document.getElementById(`custo-${id}`);
    const custo   = custoEl ? Number(custoEl.value) : 0;

    if(!custo || custo <= 0) {
        showToast('Informe o preço de custo do produto!', 'error');
        custoEl?.focus();
        return;
    }

    const qtdEl = document.getElementById(`qtd-${id}`);
    const qtd   = qtdEl ? Number(qtdEl.value) : 1;

    const existente = compraItens.find(i => i.id === id);
    if(existente) {
        existente.qtd += 1;
        existente.preco_custo = custo;
    } else {
        compraItens.push({ id, nome, preco_custo: custo, qtd: 1, estoqueAtual });
    }
    renderItensCompra();
    closeModal('modal-prod-picker-compra');
    showToast(`${nome} adicionado à compra!`);
}

function renderItensCompra() {
    const tbody = document.getElementById('tbody-itens-compra');
    let total = 0;

    tbody.innerHTML = compraItens.map((item, index) => {
        const subtotal = item.preco_custo * item.qtd;
        total += subtotal;
        return `
            <tr>
                <td>${item.nome}</td>
                <td>
                    <input type="number" min="1" value="${item.qtd}" style="width:70px;padding:5px 8px;border:1px solid var(--gray-200);border-radius:6px;font-size:13px"
                        onchange="atualizarQtdCompra(${index}, this.value)">
                </td>
                <td>R$ ${Number(item.preco_custo).toFixed(2)}</td>
                <td style="font-weight:700">R$ ${Number(subtotal).toFixed(2)}</td>
                <td class="acoes">
                    <button style="width:28px;height:28px" onclick="removerItemCompra(${index})">✕</button>
                </td>
            </tr>`;
    }).join('');

    document.getElementById('cmp-total-line').innerText = `Total: R$ ${total.toFixed(2)}`;
}

function atualizarQtdCompra(index, val) {
    const qtd = parseInt(val);
    if(qtd > 0) { compraItens[index].qtd = qtd; renderItensCompra(); }
}

function removerItemCompra(index) {
    compraItens.splice(index, 1);
    renderItensCompra();
}

async function saveCompra() {
    clearAllErrors('modal-compra');
    let valido = true;

    const fornecedor = document.getElementById('cmp-fornecedor').value.trim();
    const elCondicao = document.getElementById('cmp-condicao');
    const elForma    = document.getElementById('cmp-forma');
    const data       = document.getElementById('cmp-data').value;
    const previsao   = document.getElementById('cmp-previsao').value;
    const id         = document.getElementById('cmp-id').value;

    if(!fornecedor) {
        setFieldError('cmp-fornecedor', 'Fornecedor é obrigatório'); valido = false;
    }
    if(!elCondicao.value) {
        setFieldError('cmp-condicao', 'Selecione uma condição'); valido = false;
    }
    if(!elForma.value) {
        setFieldError('cmp-forma', 'Selecione uma forma de pagamento'); valido = false;
    }
    if(!data) {
        setFieldError('cmp-data', 'Data é obrigatória'); valido = false;
    }
    if(previsao && data && previsao < data) {
        setFieldError('cmp-previsao', 'Previsão não pode ser antes da data da compra'); valido = false;
    }
    if(compraItens.length === 0) {
        showToast('Adicione pelo menos um produto à compra!', 'error'); valido = false;
    }
    if(!valido) return;

    const compra = {
        fornecedor,
        condicao: elCondicao.options[elCondicao.selectedIndex]?.text || '',
        forma:    elForma.options[elForma.selectedIndex]?.text || '',
        data, previsao,
        status:   document.getElementById('cmp-status').value || 'Pendente',
        itens:    compraItens.map(i => ({ produto_id: i.id, qtd: i.qtd, preco_custo: i.preco_custo }))
    };

    try {
        if(id) await PUT(`/compras/${id}`, compra);
        else   await POST('/compras', compra);
        closeModal('modal-compra');
        compraItens = [];
        document.getElementById('modal-compra-title').textContent = 'Nova Compra';
        carregarCompras();
        carregarProdutos(); // Atualiza estoque na aba produtos
        showToast(id ? 'Compra atualizada!' : 'Compra registrada! Estoque atualizado ✅');
    } catch(e) {
        showToast('Erro ao registrar compra', 'error');
        console.log(e);
    }
}

async function editarCompra(id) {
    try {
        const c = await GET(`/compras/${id}`);
        await popularSelectsCompra();

        document.getElementById('cmp-id').value        = c.id || '';
        document.getElementById('cmp-fornecedor').value = c.fornecedor || '';
        document.getElementById('cmp-data').value      = c.data_compra      ? c.data_compra.split('T')[0]      : '';
        document.getElementById('cmp-previsao').value  = c.previsao_entrega ? c.previsao_entrega.split('T')[0] : '';
        document.getElementById('cmp-status').value    = c.status || 'Pendente';

        const selCond = document.getElementById('cmp-condicao');
        Array.from(selCond.options).forEach(o => { if(o.text === c.condicao_pagamento) selCond.value = o.value; });
        const selForma = document.getElementById('cmp-forma');
        Array.from(selForma.options).forEach(o => { if(o.text === c.forma_pagamento) selForma.value = o.value; });

        compraItens = (c.itens || []).map(i => ({
            id: String(i.produto_id), nome: i.produto_nome || '', preco_custo: Number(i.preco_custo), qtd: i.qtd
        }));
        renderItensCompra();
        document.getElementById('modal-compra-title').textContent = 'Editar Compra #' + id;
        openModal('modal-compra');
    } catch(e) { showToast('Erro ao carregar compra', 'error'); console.log(e); }
}

async function deletarCompra(id) {
    if(!confirm('Excluir esta compra? O estoque adicionado será revertido!')) return;
    try {
        await DELETE(`/compras/${id}`);
        carregarCompras();
        carregarProdutos();
        showToast('Compra excluída! Estoque revertido.', 'info');
    } catch(e) { showToast('Erro ao excluir compra', 'error'); }
}

async function popularSelectsCompra() {
    async function load(rota, selectId, chave) {
        try {
            const data = await GET(rota);
            const sel  = document.getElementById(selectId);
            if(!sel) return;
            sel.innerHTML = '<option value="">Selecione...</option>';
            data.forEach(i => sel.innerHTML += `<option value="${i.id}">${i[chave]}</option>`);
        } catch(e) {}
    }
    await load('/condicoes', 'cmp-condicao', 'nome');
    await load('/formas',    'cmp-forma',    'nome');
}