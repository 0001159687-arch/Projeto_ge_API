// ============================================================
// SISTEMA DE VENDAS — SCRIPT.JS
// ============================================================

const API = 'http://localhost:3000';

let adminChart;
let vendasChart;

function atualizarIcones() {
    const iconesMenu = { dashboard: 'house', 'dash-admin': 'layout-dashboard', fornecedores: 'truck', compras: 'shopping-bag', formas: 'credit-card', cidades: 'map-pinned', produtos: 'package', condicoes: 'calendar-clock', 'dash-vendas': 'chart-no-axes-combined', clientes: 'users', pedidos: 'clipboard-list' };
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        const icone = iconesMenu[item.dataset.page];
        const alvo = item.querySelector('.nav-icon');
        if (icone && alvo) alvo.innerHTML = `<i data-lucide="${icone}"></i>`;
    });
    if (window.lucide) window.lucide.createIcons();
}

function renderizarGraficoAdmin(produtos) {
    const canvas = document.getElementById('admin-chart');
    if (!canvas || !window.Chart) return;
    if (adminChart) adminChart.destroy();
    const itens = produtos.slice(0, 7);
    adminChart = new Chart(canvas, {
        type: 'bar',
        data: { labels: itens.map(p => p.nome), datasets: [{ data: itens.map(p => Number(p.estoque)), backgroundColor: '#93c5fd', hoverBackgroundColor: '#2563eb', borderRadius: 7, borderSkipped: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { displayColors: false } }, scales: { x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 0 } }, y: { beginAtZero: true, grid: { color: '#eef2f7' }, ticks: { color: '#94a3b8', font: { size: 10 }, precision: 0 } } } }
    });
}

function renderizarGraficoVendas(produtos) {
    const canvas = document.getElementById('vendas-chart');
    if (!canvas || !window.Chart) return;
    if (vendasChart) vendasChart.destroy();
    const itens = produtos.slice(0, 7);
    vendasChart = new Chart(canvas, {
        type: 'bar',
        data: { labels: itens.map(p => p.nome), datasets: [{ data: itens.map(p => Number(p.total_vendido)), backgroundColor: '#2563eb', hoverBackgroundColor: '#1d4ed8', borderRadius: 7, borderSkipped: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { label: c => `R$ ${Number(c.raw).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` } } }, scales: { x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 0 } }, y: { beginAtZero: true, grid: { color: '#eef2f7' }, ticks: { color: '#94a3b8', font: { size: 10 }, callback: v => `R$ ${v}` } } } }
    });
}

let pedidoItens = [];
let _condicoesCache = null; // cache de /condicoes, usado no cálculo de juros (Pedido/Compra)

// ============================================================
// HELPERS E UTILITÁRIOS HTTP
// ============================================================
async function GET(rota) {
    const res = await fetch(API + rota);
    if (!res.ok) {
        let msg = 'Erro ao buscar ' + rota;
        try { const json = await res.json(); if (json && json.message) msg = json.message; } catch(e) {}
        throw new Error(msg);
    }
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
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Erro ao atualizar');
    return json;
}
async function DELETE(rota) {
    const res = await fetch(API + rota, { method: 'DELETE' });
    if (!res.ok) {
        let msg = 'Erro ao excluir';
        try { const json = await res.json(); if (json && json.message) msg = json.message; } catch(e) {}
        throw new Error(msg);
    }
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

// Telinha de erro/aviso (modal) — usada para validações importantes (datas inválidas).
function showAlerta(msg, titulo = '⚠️ Atenção', cor = 'var(--red)') {
    document.getElementById('alerta-msg').textContent = msg;
    const tituloEl = document.getElementById('alerta-titulo');
    tituloEl.textContent = titulo;
    tituloEl.style.color = cor;
    openModal('modal-alerta');
}

// Valida um período "De" / "Até":
//  - nenhuma das duas datas pode ser no futuro
//  - "De" não pode ser maior que "Até"
// Retorna true se válido. Se inválido, marca os campos com erro e mostra a telinha de alerta.
function validarPeriodoData(inicioEl, fimEl) {
    clearFieldError(inicioEl.id);
    clearFieldError(fimEl.id);

    if(!inicioEl.value || !fimEl.value) return true; // campos vazios são preenchidos com padrão por quem chama

    const hoje   = hojeISO();
    const inicio = inicioEl.value;
    const fim    = fimEl.value;

    if(inicio > hoje) {
        setFieldError(inicioEl.id, 'Data não pode ser no futuro');
        showAlerta('A data "De" não pode ser uma data que ainda não chegou.');
        return false;
    }
    if(fim > hoje) {
        setFieldError(fimEl.id, 'Data não pode ser no futuro');
        showAlerta('A data "Até" não pode ser uma data que ainda não chegou.');
        return false;
    }
    if(inicio > fim) {
        setFieldError(inicioEl.id, '"De" não pode ser maior que "Até"');
        setFieldError(fimEl.id, '"De" não pode ser maior que "Até"');
        showAlerta('A data "De" não pode ser maior que a data "Até".');
        return false;
    }
    return true;
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
let _clientesCache = [];

async function carregarClientes() {
    try {
        const clientes = await GET('/clientes');
        // Ordena por nome (ordem alfabética)
        _clientesCache = [...clientes].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));

        // Popula as listas de sugestão (nomes e cidades únicos, ordenados)
        const nomes   = [...new Set(_clientesCache.map(c => c.nome).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
        const cidades = [...new Set(_clientesCache.map(c => c.cidade).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
        document.getElementById('lista-nomes-clientes').innerHTML   = nomes.map(n => `<option value="${n}">`).join('');
        document.getElementById('lista-cidades-clientes').innerHTML = cidades.map(c => `<option value="${c}">`).join('');

        filtrarClientes();
    } catch(erro) { console.log(erro); }
}

function filtrarClientes() {
    const nomeFiltro   = (document.getElementById('cli-filtro-nome')?.value   || '').trim().toLowerCase();
    const cidadeFiltro = (document.getElementById('cli-filtro-cidade')?.value || '').trim().toLowerCase();

    const filtrados = _clientesCache.filter(c => {
        const bateNome   = !nomeFiltro   || (c.nome   || '').toLowerCase().includes(nomeFiltro);
        const bateCidade = !cidadeFiltro || (c.cidade || '').toLowerCase().includes(cidadeFiltro);
        return bateNome && bateCidade;
    });

    const tbody = document.getElementById('tbody-clientes');
    if(filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--gray-400);padding:20px">Nenhum cliente encontrado</td></tr>`;
        return;
    }
    tbody.innerHTML = filtrados.map(c => `
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
}

function limparFiltrosClientes() {
    document.getElementById('cli-filtro-nome').value   = '';
    document.getElementById('cli-filtro-cidade').value = '';
    filtrarClientes();
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
    ['p-nome','p-preco'].forEach(id => {
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

    // Limpar erros ao digitar — Compra
    ['cmp-data','cmp-previsao'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => clearFieldError(id));
    });
    ['cmp-fornecedor','cmp-condicao','cmp-forma'].forEach(id => {
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
        // Seleciona a cidade correta após carregar as opções
        const selCid = document.getElementById('c-cidade');
        Array.from(selCid.options).forEach(o => { if(o.text === cliente.cidade) selCid.value = o.value; });
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
// CONDIÇÕES DE PAGAMENTO  (coluna no banco: nome, parcelas, juros_parcela)
// ============================================================
async function carregarCondicoes() {
    try {
        const conds = await GET('/condicoes');
        document.getElementById('tbody-condicoes').innerHTML = conds.map(c => `
            <tr>
                <td>${c.id}</td><td>${c.nome || ''}</td><td>${c.parcelas || ''}x</td>
                <td>${Number(c.juros_parcela || 0).toFixed(2)}%</td>
                <td class="acoes"><button onclick="editarCondicao('${c.id}')">✏️</button><button onclick="deletarCondicao('${c.id}')">🗑️</button></td>
            </tr>`).join('');
    } catch(e) {}
}

async function saveCondicao() {
    const id = document.getElementById('cp-id').value;
    clearAllErrors('modal-condicao');

    const nome     = document.getElementById('cp-nome').value.trim();
    const parcelas = document.getElementById('cp-parcelas').value;
    const juros_parcela = document.getElementById('cp-juros').value || 0;
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

    if(Number(juros_parcela) < 0) {
        setFieldError('cp-juros', 'Juros não pode ser negativo'); valido = false;
    }

    if(!valido) return;

    try {
        if(id) await PUT(`/condicoes/${id}`, { nome, parcelas, juros_parcela }); else await POST(`/condicoes`, { nome, parcelas, juros_parcela });
        _condicoesCache = null;
        closeModal('modal-condicao'); carregarCondicoes(); showToast('Condição salva! ✨');
    } catch(e) { showToast('Erro ao salvar condição', 'error'); }
}

async function editarCondicao(id) {
    try {
        const c = await GET(`/condicoes/${id}`);
        document.getElementById('cp-id').value       = c.id       || '';
        document.getElementById('cp-nome').value     = c.nome     || '';      // era c.desc — corrigido
        document.getElementById('cp-parcelas').value = c.parcelas || '';      // era c.prazo — corrigido
        document.getElementById('cp-juros').value     = c.juros_parcela || '';
        openModal('modal-condicao');
    } catch(e) {}
}

async function deletarCondicao(id) {
    if(!confirm('Excluir condição?')) return;
    try { await DELETE(`/condicoes/${id}`); _condicoesCache = null; carregarCondicoes(); showToast('Excluído!', 'info'); } catch(e) {}
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

// ============================================================
// JUROS — Cartão de Crédito / Boleto Bancário
// ============================================================
// Formas de pagamento que cobram juros conforme a Condição de Pagamento escolhida.
const FORMAS_COM_JUROS = ['cartão de crédito', 'cartao de credito', 'boleto bancário', 'boleto bancario', 'boleto'];

function formaTemJuros(nomeForma) {
    if(!nomeForma) return false;
    const n = nomeForma.trim().toLowerCase();
    return FORMAS_COM_JUROS.some(f => n.includes(f));
}

async function getCondicoesCache() {
    if(!_condicoesCache) {
        try { _condicoesCache = await GET('/condicoes'); } catch(e) { _condicoesCache = []; }
    }
    return _condicoesCache;
}

// Retorna { percentual, valor } de juros para um subtotal, dada a forma e condição selecionadas (pelo texto exibido nos <select>)
async function calcularJuros(nomeForma, nomeCondicao, subtotal) {
    if(!formaTemJuros(nomeForma) || !nomeCondicao) return { percentual: 0, valor: 0 };
    const condicoes = await getCondicoesCache();
    const cond = condicoes.find(c => c.nome === nomeCondicao);
    if(!cond) return { percentual: 0, valor: 0 };
    const jurosPorParcela = Number(cond.juros_parcela || 0);
    const parcelas        = Number(cond.parcelas || 1);
    const percentual = jurosPorParcela * parcelas;
    const valor = subtotal * (percentual / 100);
    return { percentual, valor };
}

async function renderItensPedido() {
    const tbody = document.getElementById('tbody-itens-pedido');
    let subtotal = 0;

    tbody.innerHTML = pedidoItens.map((item, index) => {
        const itemSubtotal = item.preco * item.qtd;
        subtotal += itemSubtotal;
        return `
            <tr>
                <td>${item.nome}</td>
                <td>${item.qtd} UN</td>
                <td>R$ ${Number(item.preco).toFixed(2)}</td>
                <td>R$ ${Number(itemSubtotal).toFixed(2)}</td>
                <td class="acoes"><button style="width:28px;height:28px;" onclick="removerItemPedido(${index})">✕</button></td>
            </tr>`;
    }).join('');

    document.getElementById('ped-subtotal-line').innerText = `Subtotal: R$ ${subtotal.toFixed(2)}`;

    const elForma    = document.getElementById('ped-forma');
    const elCondicao = document.getElementById('ped-condicao');
    const nomeForma    = elForma?.options[elForma.selectedIndex]?.text || '';
    const nomeCondicao = elCondicao?.options[elCondicao.selectedIndex]?.text || '';

    const { percentual, valor } = await calcularJuros(nomeForma, nomeCondicao, subtotal);
    const jurosLine = document.getElementById('ped-juros-line');

    if(percentual > 0) {
        jurosLine.style.display = '';
        jurosLine.innerText = `Juros (${percentual.toFixed(2)}%): R$ ${valor.toFixed(2)}`;
    } else {
        jurosLine.style.display = 'none';
        jurosLine.innerText = 'Juros: R$ 0.00';
    }

    document.getElementById('ped-total-line').innerText = `Total: R$ ${(subtotal + valor).toFixed(2)}`;
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

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('ped-forma')?.addEventListener('change', renderItensPedido);
    document.getElementById('ped-condicao')?.addEventListener('change', renderItensPedido);
});

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
    } catch(e) { console.log(e); showToast(e.message || 'Erro ao carregar pedido', 'error'); }
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

    const nomeForma    = elForma.options[elForma.selectedIndex]?.text || '';
    const nomeCondicao = elCondicao.options[elCondicao.selectedIndex]?.text || '';
    const itensSubtotal = pedidoItens.reduce((s, i) => s + (i.preco * i.qtd), 0);
    const { percentual: juros_percentual, valor: valor_juros } = await calcularJuros(nomeForma, nomeCondicao, itensSubtotal);

    const pedido = {
        cliente:  elCliente.options[elCliente.selectedIndex].text,
        condicao: nomeCondicao,
        forma:    nomeForma,
        data, prazo,
        status:   document.getElementById('ped-status').value || 'Aberto',
        itens:    pedidoItens.map(i => ({ produto_id: i.id, qtd: i.qtd, preco: i.preco })),
        juros_percentual,
        valor_juros
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

        if(page === 'dashboard') {
            voltarInicio();
            return;
        }

        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
        const pagina = document.getElementById(`page-${page}`);
        if(pagina) pagina.classList.add('active');
        const titulo = pagina?.querySelector('.page-header h2')?.textContent?.replace(/[^\p{L}\p{N}\s—-]/gu, '').trim();
        const topbarTitle = document.getElementById('topbar-section');
        if (topbarTitle && titulo) topbarTitle.textContent = titulo;

        if(page === 'clientes') carregarClientes();
        if(page === 'fornecedores') carregarFornecedores();
        if(page === 'produtos') carregarProdutos();
        if(page === 'pedidos')  carregarPedidos();
        if(page === 'cidades')  carregarCidades();
        if(page === 'formas')   carregarFormas();
        if(page === 'condicoes')carregarCondicoes();
        if(page === 'compras')  carregarCompras();
        if(page === 'dash-admin')  carregarDashboardAdmin();
        if(page === 'dash-vendas') carregarDashboardVendas();
    });
});

// ============================================================
// SISTEMA DE SENHA POR ÁREA
// ============================================================
const SENHAS_AREA = {
    vendas: 'vendas123',
    admin:  'admin123'
};

const NOMES_AREA = {
    vendas: { titulo: 'Sistema de Vendas',     icone: '🖥️', primeiraPagina: 'dash-vendas' },
    admin:  { titulo: 'Administração da Loja', icone: '📁', primeiraPagina: 'dash-admin' }
};

let areaAlvo = null;
let areaAtual = null;

function abrirSenha(area) {
    areaAlvo = area;
    document.getElementById('senha-titulo').textContent = NOMES_AREA[area].icone + ' ' + NOMES_AREA[area].titulo;
    document.getElementById('senha-input').value = '';
    document.getElementById('senha-erro').textContent = '';

    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById('page-senha').classList.add('active');

    setTimeout(() => document.getElementById('senha-input').focus(), 50);
}

function confirmarSenha() {
    const input = document.getElementById('senha-input');
    const erro  = document.getElementById('senha-erro');

    if(input.value === SENHAS_AREA[areaAlvo]) {
        entrarNaArea(areaAlvo);
    } else {
        erro.textContent = 'Senha incorreta. Tente novamente.';
        input.value = '';
        input.focus();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    atualizarIcones();
    document.getElementById('senha-input')?.addEventListener('keydown', e => {
        if(e.key === 'Enter') confirmarSenha();
    });
});

function entrarNaArea(area) {
    areaAtual = area;
    document.body.classList.remove('no-sidebar');

    // Atualiza logo da sidebar
    document.getElementById('sidebar-logo-icon').textContent = NOMES_AREA[area].icone;
    document.getElementById('sidebar-logo-text').textContent = NOMES_AREA[area].titulo;

    // Mostra só os itens da área escolhida
    document.querySelectorAll('.nav-item[data-area]').forEach(el => {
        el.style.display = (el.dataset.area === area) ? '' : 'none';
    });

    // Navega para a primeira página da área
    const page = NOMES_AREA[area].primeiraPagina;
    const item = document.querySelector(`.nav-item[data-page="${page}"]`);
    if(item) item.click();
}

function voltarInicio() {
    areaAtual = null;
    areaAlvo  = null;
    document.body.classList.add('no-sidebar');
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById('page-dashboard').classList.add('active');
}

document.querySelectorAll('.btn-new').forEach(btn => {
    btn.addEventListener('click', async () => {
        const section = btn.closest('.page-section');
        if(!section) return;
        const pageId = section.id;

        if(pageId === 'page-clientes'){
            limparCampos('modal-cliente'); await popularSelects(); openModal('modal-cliente');
        } else if(pageId === 'page-fornecedores'){
            limparCampos('modal-fornecedor'); await popularSelectsFornecedor();
            openModal('modal-fornecedor');
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
            document.getElementById('tbody-picker-compra').innerHTML =
                `<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--gray-400);font-size:13px">Selecione um fornecedor para ver o catálogo</td></tr>`;
            clearAllErrors('modal-compra');
            await popularSelectsCompra();
            openModal('modal-compra');
        }
    });
});

// ============================================================
// INICIALIZAÇÃO
// ============================================================
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

function addProdutoAoCompra(id, nome, precoCusto, estoqueAtual) {
    const qtdEl = document.getElementById(`qtd-compra-${id}`);
    const qtd   = qtdEl ? Math.max(1, Number(qtdEl.value)) : 1;

    const existente = compraItens.find(i => i.id === id);
    if(existente) {
        existente.qtd += qtd;
    } else {
        compraItens.push({ id, nome, preco_custo: Number(precoCusto), qtd, estoqueAtual });
    }
    renderItensCompra();
    // Feedback visual na linha
    const btn = document.querySelector(`button[onclick*="addProdutoAoCompra('${id}'"]`);
    if(btn) { 
        const row = btn.closest('tr');
        if(row) { row.style.background = '#d1fae5'; setTimeout(() => row.style.background = '', 700); }
    }
    showToast(`${nome} adicionado! ✅`);
}

// Cria produto automaticamente no banco com 20% a mais no preço de custo
// e em seguida o adiciona à compra
async function criarEAdicionarProduto(nomeProduto, precoCusto, btnEl) {
    try {
        if(btnEl) btnEl.disabled = true;
        const precoVenda = Number((precoCusto * 1.20).toFixed(2));
        const novo = await POST('/produtos', {
            nome:     nomeProduto,
            unidade:  1,
            preco:    precoVenda,
            estoque:  0,
            descricao: ''
        });
        const produtoId = novo.id;
        // Recarregar catálogo para atualizar o vínculo na linha
        const fornEl = document.getElementById('cmp-fornecedor');
        if(fornEl) fornEl.dispatchEvent(new Event('change'));
        // Adiciona à compra imediatamente
        addProdutoAoCompra(produtoId, nomeProduto, precoCusto, 0);
        showToast(`Produto "${nomeProduto}" criado com preço R$ ${precoVenda.toFixed(2)} (+20%) e adicionado à compra ✅`);
    } catch(e) {
        if(btnEl) btnEl.disabled = false;
        showToast('Erro ao criar produto: ' + (e.message || e), 'error');
    }
}

async function renderItensCompra() {
    const tbody = document.getElementById('tbody-itens-compra');
    let subtotal = 0;

    tbody.innerHTML = compraItens.map((item, index) => {
        const itemSubtotal = item.preco_custo * item.qtd;
        subtotal += itemSubtotal;
        return `
            <tr>
                <td>${item.nome}</td>
                <td>
                    <input type="number" min="1" value="${item.qtd}" style="width:70px;padding:5px 8px;border:1px solid var(--gray-200);border-radius:6px;font-size:13px"
                        onchange="atualizarQtdCompra(${index}, this.value)">
                </td>
                <td>R$ ${Number(item.preco_custo).toFixed(2)}</td>
                <td style="font-weight:700">R$ ${Number(itemSubtotal).toFixed(2)}</td>
                <td class="acoes">
                    <button style="width:28px;height:28px" onclick="removerItemCompra(${index})">✕</button>
                </td>
            </tr>`;
    }).join('');

    document.getElementById('cmp-subtotal-line').innerText = `Subtotal: R$ ${subtotal.toFixed(2)}`;

    const elForma    = document.getElementById('cmp-forma');
    const elCondicao = document.getElementById('cmp-condicao');
    const nomeForma    = elForma?.options[elForma.selectedIndex]?.text || '';
    const nomeCondicao = elCondicao?.options[elCondicao.selectedIndex]?.text || '';

    const { percentual, valor } = await calcularJuros(nomeForma, nomeCondicao, subtotal);
    const jurosLine = document.getElementById('cmp-juros-line');

    if(percentual > 0) {
        jurosLine.style.display = '';
        jurosLine.innerText = `Juros (${percentual.toFixed(2)}%): R$ ${valor.toFixed(2)}`;
    } else {
        jurosLine.style.display = 'none';
        jurosLine.innerText = 'Juros: R$ 0.00';
    }

    document.getElementById('cmp-total-line').innerText = `Total: R$ ${(subtotal + valor).toFixed(2)}`;
}

function atualizarQtdCompra(index, val) {
    const qtd = parseInt(val);
    if(qtd > 0) { compraItens[index].qtd = qtd; renderItensCompra(); }
}

function removerItemCompra(index) {
    compraItens.splice(index, 1);
    renderItensCompra();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('cmp-forma')?.addEventListener('change', renderItensCompra);
    document.getElementById('cmp-condicao')?.addEventListener('change', renderItensCompra);
});

async function saveCompra() {
    clearAllErrors('modal-compra');
    let valido = true;

    const elFornecedor = document.getElementById('cmp-fornecedor');
    const elCondicao   = document.getElementById('cmp-condicao');
    const elForma      = document.getElementById('cmp-forma');
    const data         = document.getElementById('cmp-data').value;
    const previsao     = document.getElementById('cmp-previsao').value;
    const id           = document.getElementById('cmp-id').value;

    if(!elFornecedor.value) {
        setFieldError('cmp-fornecedor', 'Selecione um fornecedor'); valido = false;
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

    const nomeForma    = elForma.options[elForma.selectedIndex]?.text || '';
    const nomeCondicao = elCondicao.options[elCondicao.selectedIndex]?.text || '';
    const itensSubtotal = compraItens.reduce((s, i) => s + (i.preco_custo * i.qtd), 0);
    const { percentual: juros_percentual, valor: valor_juros } = await calcularJuros(nomeForma, nomeCondicao, itensSubtotal);

    const compra = {
        fornecedor: elFornecedor.options[elFornecedor.selectedIndex]?.text || '',
        condicao:   nomeCondicao,
        forma:      nomeForma,
        data, previsao,
        status:   document.getElementById('cmp-status').value || 'Pendente',
        itens:    compraItens.map(i => ({ produto_id: i.id, qtd: i.qtd, preco_custo: i.preco_custo })),
        juros_percentual,
        valor_juros
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
        const selForn = document.getElementById('cmp-fornecedor');
        Array.from(selForn.options).forEach(o => { if(o.text === c.fornecedor) selForn.value = o.value; });
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
    } catch(e) { showToast(e.message || 'Erro ao carregar compra', 'error'); console.log(e); }
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
    await load('/condicoes',    'cmp-condicao',   'nome');
    await load('/formas',       'cmp-forma',      'nome');
    await load('/fornecedores', 'cmp-fornecedor', 'nome');
}

// ============================================================
// FORNECEDORES
// ============================================================

function aplicarMascaraCNPJ(el) {
    el.addEventListener('input', () => {
        let v = el.value.replace(/\D/g, '');
        if(v.length > 14) v = v.slice(0, 14);
        if(v.length > 12)      v = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12)}`;
        else if(v.length > 8)  v = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8)}`;
        else if(v.length > 5)  v = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5)}`;
        else if(v.length > 2)  v = `${v.slice(0,2)}.${v.slice(2)}`;
        el.value = v;
        clearFieldError('f-cnpj');
    });
}

function aplicarMascaraTelForn(el) {
    el.addEventListener('input', () => {
        let v = el.value.replace(/\D/g, '');
        if(v.length > 11) v = v.slice(0, 11);
        if(v.length > 6)      v = `(${v.slice(0,2)})${v.slice(2,7)}-${v.slice(7)}`;
        else if(v.length > 2) v = `(${v.slice(0,2)})${v.slice(2)}`;
        else if(v.length > 0) v = `(${v}`;
        el.value = v;
        clearFieldError('f-tel');
    });
}

function aplicarMascaraCEPForn(el) {
    el.addEventListener('input', () => {
        let v = el.value.replace(/\D/g, '');
        if(v.length > 8) v = v.slice(0, 8);
        if(v.length > 5) v = `${v.slice(0,5)}-${v.slice(5)}`;
        el.value = v;
        clearFieldError('f-cep');
    });
}

function validarCNPJ(cnpj) {
    cnpj = cnpj.replace(/\D/g, '');
    if(cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
    let tamanho = cnpj.length - 2, numeros = cnpj.substring(0, tamanho);
    const digitos = cnpj.substring(tamanho);
    let soma = 0, pos = tamanho - 7;
    for(let i = tamanho; i >= 1; i--) { soma += parseInt(numeros.charAt(tamanho - i)) * pos--; if(pos < 2) pos = 9; }
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if(resultado !== parseInt(digitos.charAt(0))) return false;
    tamanho += 1; numeros = cnpj.substring(0, tamanho); soma = 0; pos = tamanho - 7;
    for(let i = tamanho; i >= 1; i--) { soma += parseInt(numeros.charAt(tamanho - i)) * pos--; if(pos < 2) pos = 9; }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    return resultado === parseInt(digitos.charAt(1));
}

let _fornecedoresCache = [];

async function carregarFornecedores() {
    try {
        const fornecedores = await GET('/fornecedores');
        _fornecedoresCache = [...fornecedores].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));

        const nomes   = [...new Set(_fornecedoresCache.map(f => f.nome).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
        const cidades = [...new Set(_fornecedoresCache.map(f => f.cidade).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
        document.getElementById('lista-nomes-fornecedores').innerHTML   = nomes.map(n => `<option value="${n}">`).join('');
        document.getElementById('lista-cidades-fornecedores').innerHTML = cidades.map(c => `<option value="${c}">`).join('');

        filtrarFornecedores();
    } catch(e) { console.log(e); }
}

function filtrarFornecedores() {
    const nomeFiltro   = (document.getElementById('forn-filtro-nome')?.value   || '').trim().toLowerCase();
    const cidadeFiltro = (document.getElementById('forn-filtro-cidade')?.value || '').trim().toLowerCase();

    const filtrados = _fornecedoresCache.filter(f => {
        const bateNome   = !nomeFiltro   || (f.nome   || '').toLowerCase().includes(nomeFiltro);
        const bateCidade = !cidadeFiltro || (f.cidade || '').toLowerCase().includes(cidadeFiltro);
        return bateNome && bateCidade;
    });

    const tbody = document.getElementById('tbody-fornecedores');
    if(filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--gray-400);padding:20px">Nenhum fornecedor encontrado</td></tr>`;
        return;
    }
    tbody.innerHTML = filtrados.map(f => `
        <tr>
            <td>${f.id}</td>
            <td>${f.nome || ''}</td>
            <td>${f.endereco || ''}</td>
            <td>${f.bairro || ''}</td>
            <td>${f.cep || ''}</td>
            <td>${f.cidade || ''}</td>
            <td>${f.cnpj || ''}</td>
            <td>${f.email || ''}</td>
            <td>${f.telefone || ''}</td>
            <td class="acoes">
                <button onclick="editarFornecedor('${f.id}')">✏️</button>
                <button onclick="deletarFornecedor('${f.id}')">🗑️</button>
            </td>
        </tr>`).join('');
}

function limparFiltrosFornecedores() {
    document.getElementById('forn-filtro-nome').value   = '';
    document.getElementById('forn-filtro-cidade').value = '';
    filtrarFornecedores();
}

async function saveFornecedor() {
    const id = document.getElementById('f-id').value;
    const selectCidade = document.getElementById('f-cidade');
    clearAllErrors('modal-fornecedor');

    const nome     = document.getElementById('f-nome').value.trim();
    const telefone = document.getElementById('f-tel').value.trim();
    const endereco = document.getElementById('f-end').value.trim();
    const numero   = document.getElementById('f-num').value.trim();
    const email    = document.getElementById('f-email').value.trim();
    const cnpj     = document.getElementById('f-cnpj').value.trim();
    const cep      = document.getElementById('f-cep').value.trim();
    const bairro   = document.getElementById('f-bairro').value.trim();
    const cidadeId = selectCidade.value;
    const cidade   = selectCidade.options[selectCidade.selectedIndex]?.text || '';

    let valido = true;

    if(!nome) {
        setFieldError('f-nome', 'Nome é obrigatório'); valido = false;
    } else if(nome.length < 3) {
        setFieldError('f-nome', 'Nome muito curto'); valido = false;
    }
    if(!telefone) {
        setFieldError('f-tel', 'Telefone é obrigatório'); valido = false;
    } else if(telefone.replace(/\D/g, '').length < 10) {
        setFieldError('f-tel', 'Telefone inválido'); valido = false;
    }
    if(!endereco) {
        setFieldError('f-end', 'Endereço é obrigatório'); valido = false;
    }
    if(!numero) {
        setFieldError('f-num', 'Número é obrigatório'); valido = false;
    }
    if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldError('f-email', 'E-mail inválido'); valido = false;
    }
    if(cnpj && !validarCNPJ(cnpj)) {
        setFieldError('f-cnpj', 'CNPJ inválido'); valido = false;
    }
    if(cep && cep.replace(/\D/g, '').length !== 8) {
        setFieldError('f-cep', 'CEP inválido'); valido = false;
    }
    if(!bairro) {
        setFieldError('f-bairro', 'Bairro é obrigatório'); valido = false;
    }
    if(!cidadeId) {
        setFieldError('f-cidade', 'Selecione uma cidade'); valido = false;
    }

    if(!valido) return;

    const fornecedor = { nome, telefone, endereco, numero, email, cnpj, cep, bairro, cidade };

    try {
        if(id) {
            await PUT(`/fornecedores/${id}`, fornecedor);
            showToast('Fornecedor atualizado! ✨');
        } else {
            await POST('/fornecedores', fornecedor);
            showToast('Fornecedor salvo! ✨');
        }
        carregarFornecedores();
        closeModal('modal-fornecedor');
    } catch(e) { showToast(e.message || 'Erro ao salvar fornecedor', 'error'); console.log(e); }
}

async function editarFornecedor(id) {
    try {
        const f = await GET(`/fornecedores/${id}`);
        await popularSelectsFornecedor();
        document.getElementById('f-id').value     = f.id       || '';
        document.getElementById('f-nome').value   = f.nome     || '';
        document.getElementById('f-tel').value    = f.telefone || '';
        document.getElementById('f-end').value    = f.endereco || '';
        document.getElementById('f-num').value    = f.numero   || '';
        document.getElementById('f-email').value  = f.email    || '';
        document.getElementById('f-cnpj').value   = f.cnpj     || '';
        document.getElementById('f-cep').value    = f.cep      || '';
        document.getElementById('f-bairro').value = f.bairro   || '';
        const selCid = document.getElementById('f-cidade');
        Array.from(selCid.options).forEach(o => { if(o.text === f.cidade) selCid.value = o.value; });
        openModal('modal-fornecedor');
    } catch(e) { showToast(e.message || 'Erro ao carregar fornecedor', 'error'); console.log(e); }
}

async function deletarFornecedor(id) {
    if(!confirm('Excluir fornecedor?')) return;
    try {
        await DELETE(`/fornecedores/${id}`);
        carregarFornecedores();
        showToast('Fornecedor excluído!', 'info');
    } catch(e) { showToast('Erro ao excluir fornecedor', 'error'); }
}

async function popularSelectsFornecedor() {
    try {
        const cidades = await GET('/cidades');
        const sel = document.getElementById('f-cidade');
        sel.innerHTML = '<option value="">Selecione a Cidade</option>';
        cidades.forEach(c => sel.innerHTML += `<option value="${c.id}">${c.nome}</option>`);
    } catch(e) {}
}

// Inicializar máscaras e listeners do fornecedor quando DOM carrega
document.addEventListener('DOMContentLoaded', () => {
    aplicarMascaraTelForn(document.getElementById('f-tel'));
    aplicarMascaraCNPJ(document.getElementById('f-cnpj'));
    aplicarMascaraCEPForn(document.getElementById('f-cep'));
    ['f-nome','f-end','f-num','f-email','f-bairro'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => clearFieldError(id));
    });
    document.getElementById('f-cidade')?.addEventListener('change', () => clearFieldError('f-cidade'));
});

// ============================================================
// COMPRA: ao selecionar fornecedor, carrega catálogo dele
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('cmp-fornecedor')?.addEventListener('change', async function() {
        const fornId = this.value;
        const tbody  = document.getElementById('tbody-picker-compra');
        if(!fornId) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--gray-400);font-size:13px">Selecione um fornecedor para ver o catálogo</td></tr>`;
            return;
        }
        tbody.innerHTML = `<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--gray-400);font-size:13px">Carregando catálogo...</td></tr>`;
        try {
            const itens = await GET(`/catalogo/fornecedor/${fornId}`);
            if(itens.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--gray-400);font-size:13px">Este fornecedor não tem produtos no catálogo ainda.</td></tr>`;
                return;
            }
            tbody.innerHTML = itens.map(i => {
                const semVinculo = !i.produto_id;
                return `
                <tr style="${semVinculo ? 'opacity:.75' : ''}">
                    <td style="padding:10px 12px">
                        <span style="font-weight:600;color:var(--navy)">${i.nome_produto}</span>
                        ${semVinculo ? '<br><small style="color:var(--orange)">Produto será criado automaticamente com +20% de margem</small>' : ''}
                    </td>
                    <td style="padding:10px 8px;color:var(--blue);font-weight:700">${semVinculo ? '—' : i.estoque}</td>
                    <td style="padding:10px 8px;color:var(--green);font-weight:700">R$ ${Number(i.preco_custo).toFixed(2)}</td>
                    <td style="padding:6px 8px">
                        <input type="number" min="1" value="1"
                            id="qtd-compra-${i.produto_id || i.id}" class="compra-qtd-input">
                    </td>
                    <td style="padding:6px 8px">
                        <button class="btn-add-compra"
                            onclick="${semVinculo
                                ? `criarEAdicionarProduto('${i.nome_produto}', ${i.preco_custo}, this)`
                                : `addProdutoAoCompra('${i.produto_id}','${i.produto_nome}',${i.preco_custo},${i.estoque})`}">
                            +
                        </button>
                    </td>
                </tr>`;
            }).join('');
        } catch(e) { console.log(e); }
    });
});

// ============================================================
// DASHBOARD — ADMINISTRAÇÃO DA LOJA
// ============================================================
function inicioMesISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function hojeISO() {
    return new Date().toISOString().slice(0, 10);
}

// Limita os campos de "De"/"Até" dos dashboards a não aceitarem datas futuras
// (reforço visual no próprio seletor do navegador) e valida ao trocar a data.
document.addEventListener('DOMContentLoaded', () => {
    const hoje = hojeISO();
    [['dadm-inicio','dadm-fim'], ['dven-inicio','dven-fim']].forEach(([idIni, idFim]) => {
        const elIni = document.getElementById(idIni);
        const elFim = document.getElementById(idFim);
        if(!elIni || !elFim) return;
        elIni.max = hoje;
        elFim.max = hoje;
        elIni.addEventListener('change', () => validarPeriodoData(elIni, elFim));
        elFim.addEventListener('change', () => validarPeriodoData(elIni, elFim));
    });
});

async function carregarDashboardAdmin() {
    const inicioEl = document.getElementById('dadm-inicio');
    const fimEl    = document.getElementById('dadm-fim');
    const estoqueEl = document.getElementById('dadm-estoque-min');

    // Preenche datas padrão na primeira carga
    if(!inicioEl.value) inicioEl.value = inicioMesISO();
    if(!fimEl.value)    fimEl.value    = hojeISO();

    if(!validarPeriodoData(inicioEl, fimEl)) return;

    const params = new URLSearchParams({
        dataInicio: inicioEl.value,
        dataFim:    fimEl.value,
        estoqueMin: estoqueEl.value || 5
    });

    try {
        const d = await GET(`/dashboard/admin?${params}`);

        document.getElementById('dadm-fornecedores').textContent = d.totalFornecedores;
        document.getElementById('dadm-produtos').textContent     = d.totalProdutos;
        document.getElementById('dadm-compras-qtd').textContent  = d.compras.qtd;
        document.getElementById('dadm-compras-valor').textContent = `R$ ${d.compras.valor.toFixed(2)}`;
        document.getElementById('dadm-estoque-qtd').textContent  = d.estoqueBaixo.length;
        const health = document.getElementById('admin-health');
        if (health) health.textContent = d.estoqueBaixo.length;
        renderizarGraficoAdmin(d.estoqueBaixo);

        const tbody = document.getElementById('dadm-tbody-estoque');
        if(d.estoqueBaixo.length === 0) {
            tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:var(--gray-400);padding:20px">Nenhum produto com estoque baixo 🎉</td></tr>`;
        } else {
            tbody.innerHTML = d.estoqueBaixo.map(p => `
                <tr>
                    <td>${p.nome}</td>
                    <td style="color:var(--red);font-weight:700">${p.estoque}</td>
                </tr>`).join('');
        }
    } catch(e) { console.log(e); showToast(e.message || 'Erro ao carregar dashboard', 'error'); }
}

// ============================================================
// DASHBOARD — SISTEMA DE VENDAS
// ============================================================
async function carregarDashboardVendas() {
    const inicioEl = document.getElementById('dven-inicio');
    const fimEl    = document.getElementById('dven-fim');
    const limiteEl = document.getElementById('dven-limite');

    if(!inicioEl.value) inicioEl.value = inicioMesISO();
    if(!fimEl.value)    fimEl.value    = hojeISO();

    if(!validarPeriodoData(inicioEl, fimEl)) return;

    const params = new URLSearchParams({
        dataInicio: inicioEl.value,
        dataFim:    fimEl.value,
        limiteMaisVendidos: limiteEl.value || 5
    });

    // Se o campo "Top produtos" estiver vazio, esconde a seção e não faz a requisição de top
    const topSection = document.getElementById('dven-top-section');
    const limiteVazio = !limiteEl.value || Number(limiteEl.value) <= 0;

    try {
        const d = await GET(`/dashboard/vendas?${params}`);

        document.getElementById('dven-dia-qtd').textContent      = d.vendasDia.qtd;
        document.getElementById('dven-dia-valor').textContent    = `R$ ${d.vendasDia.valor.toFixed(2)}`;
        document.getElementById('dven-periodo-qtd').textContent  = d.vendasPeriodo.qtd;
        document.getElementById('dven-periodo-valor').textContent = `R$ ${d.vendasPeriodo.valor.toFixed(2)}`;
        document.getElementById('dven-clientes').textContent     = d.totalClientes;
        const ticket = d.vendasPeriodo.qtd ? d.vendasPeriodo.valor / d.vendasPeriodo.qtd : 0;
        const ticketEl = document.getElementById('vendas-ticket');
        if (ticketEl) ticketEl.textContent = ticket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
        renderizarGraficoVendas(d.maisVendidos);

        const tbody = document.getElementById('dven-tbody-vendidos');
        if(limiteVazio || d.maisVendidos.length === 0) {
            if(topSection) topSection.style.display = 'none';
            tbody.innerHTML = '';
        } else {
            if(topSection) topSection.style.display = '';
            tbody.innerHTML = d.maisVendidos.map(p => `
                <tr>
                    <td>${p.nome}</td>
                    <td style="color:var(--blue);font-weight:700">${p.qtd_vendida}</td>
                    <td style="color:var(--green);font-weight:700">R$ ${Number(p.total_vendido).toFixed(2)}</td>
                </tr>`).join('');
        }
    } catch(e) { console.log(e); showToast(e.message || 'Erro ao carregar dashboard', 'error'); }
}

// ============================================================
// EXPORTAR DASHBOARD ADMINISTRAÇÃO PARA PDF
// ============================================================
async function exportarDashboardAdminPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const dataGeracao = new Date().toLocaleString('pt-BR');

        const inicio = document.getElementById('dadm-inicio').value;
        const fim    = document.getElementById('dadm-fim').value;
        const fmtData = iso => iso ? iso.split('-').reverse().join('/') : '';

        let y = 20;

        // Cabeçalho
        doc.setFontSize(18);
        doc.setTextColor(13, 27, 62);
        doc.text('Dashboard — Administração da Loja', 14, y);
        y += 8;
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(`Período: ${fmtData(inicio)} até ${fmtData(fim)}  |  Gerado em: ${dataGeracao}`, 14, y);
        y += 4;
        doc.setDrawColor(220, 220, 220);
        doc.line(14, y, 196, y);
        y += 10;

        // Cards de métricas
        const fornecedores = document.getElementById('dadm-fornecedores').textContent;
        const produtos     = document.getElementById('dadm-produtos').textContent;
        const comprasQtd   = document.getElementById('dadm-compras-qtd').textContent;
        const comprasValor = document.getElementById('dadm-compras-valor').textContent;
        const estoqueQtd   = document.getElementById('dadm-estoque-qtd').textContent;

        doc.setFontSize(12);
        doc.setTextColor(13, 27, 62);
        doc.text('Resumo Geral', 14, y);
        y += 8;

        const metrics = [
            ['Total de Fornecedores', fornecedores],
            ['Total de Produtos', produtos],
            ['Compras no Período (qtd)', comprasQtd],
            ['Compras no Período (valor)', comprasValor],
            ['Produtos com Estoque Baixo', estoqueQtd],
        ];

        doc.setFontSize(10);
        metrics.forEach(([label, value]) => {
            doc.setTextColor(70, 70, 70);
            doc.text(label, 14, y);
            doc.setTextColor(13, 27, 62);
            doc.setFont(undefined, 'bold');
            doc.text(String(value), 120, y);
            doc.setFont(undefined, 'normal');
            y += 7;
        });

        y += 8;
        doc.setFontSize(12);
        doc.setTextColor(13, 27, 62);
        doc.text('Produtos com Estoque Baixo', 14, y);
        y += 4;

        // Tabela de estoque baixo
        const linhas = Array.from(document.querySelectorAll('#dadm-tbody-estoque tr')).map(tr =>
            Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())
        );

        if(doc.autoTable) {
            doc.autoTable({
                startY: y,
                head: [['Produto', 'Estoque Atual']],
                body: linhas.length ? linhas : [['Nenhum produto com estoque baixo', '']],
                theme: 'striped',
                headStyles: { fillColor: [13, 27, 62] },
                styles: { fontSize: 9 }
            });
        } else {
            // Fallback simples sem plugin de tabela
            linhas.forEach(([nome, estoque]) => {
                doc.setFontSize(9);
                doc.setTextColor(70,70,70);
                doc.text(nome || '', 14, y);
                doc.text(estoque || '', 150, y);
                y += 6;
            });
        }

        doc.save(`dashboard-administracao-${hojeISO()}.pdf`);
        showToast('PDF exportado com sucesso! ✨');
    } catch(e) {
        console.log(e);
        showToast('Erro ao exportar PDF', 'error');
    }
}

// ============================================================
// EXPORTAR CARDS DO DASHBOARD ADMIN — PDFs específicos por card
// ============================================================
function dadmCabecalhoPDF(doc, titulo) {
    const dataGeracao = new Date().toLocaleString('pt-BR');
    const inicio = document.getElementById('dadm-inicio').value;
    const fim    = document.getElementById('dadm-fim').value;
    const fmtData = iso => iso ? iso.split('-').reverse().join('/') : '';

    let y = 20;
    doc.setFontSize(18);
    doc.setTextColor(13, 27, 62);
    doc.text(titulo, 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Período: ${fmtData(inicio)} até ${fmtData(fim)}  |  Gerado em: ${dataGeracao}`, 14, y);
    y += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(14, y, 196, y);
    y += 10;
    return y;
}

async function exportarFornecedoresDashAdminPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = dadmCabecalhoPDF(doc, 'Total de Fornecedores');

        const valor = document.getElementById('dadm-fornecedores').textContent;
        doc.setFontSize(12);
        doc.setTextColor(70, 70, 70);
        doc.text('Total de Fornecedores cadastrados:', 14, y);
        doc.setFontSize(16);
        doc.setTextColor(13, 27, 62);
        doc.setFont(undefined, 'bold');
        doc.text(String(valor), 130, y);
        doc.setFont(undefined, 'normal');
        y += 12;

        const fornecedores = await GET('/fornecedores');
        const linhas = fornecedores.map(f => [f.nome || '', f.cidade || '', f.telefone || '']);

        if(doc.autoTable) {
            doc.autoTable({
                startY: y,
                head: [['Fornecedor', 'Cidade', 'Telefone']],
                body: linhas.length ? linhas : [['Nenhum fornecedor cadastrado', '', '']],
                theme: 'striped',
                headStyles: { fillColor: [13, 27, 62] },
                styles: { fontSize: 9 }
            });
        } else {
            linhas.forEach(([nome, cidade, tel]) => {
                doc.setFontSize(9);
                doc.setTextColor(70,70,70);
                doc.text(nome, 14, y);
                doc.text(cidade, 100, y);
                doc.text(tel, 150, y);
                y += 6;
            });
        }

        doc.save(`fornecedores-${hojeISO()}.pdf`);
        showToast('PDF exportado com sucesso! ✨');
    } catch(e) {
        console.log(e);
        showToast('Erro ao exportar PDF', 'error');
    }
}

async function exportarProdutosDashAdminPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = dadmCabecalhoPDF(doc, 'Total de Produtos');

        const valor = document.getElementById('dadm-produtos').textContent;
        doc.setFontSize(12);
        doc.setTextColor(70, 70, 70);
        doc.text('Total de Produtos cadastrados:', 14, y);
        doc.setFontSize(16);
        doc.setTextColor(13, 27, 62);
        doc.setFont(undefined, 'bold');
        doc.text(String(valor), 130, y);
        doc.setFont(undefined, 'normal');
        y += 12;

        const produtos = await GET('/produtos');
        const linhas = produtos.map(p => [
            p.nome || '',
            `R$ ${Number(p.preco || 0).toFixed(2)}`,
            String(p.estoque ?? '')
        ]);

        if(doc.autoTable) {
            doc.autoTable({
                startY: y,
                head: [['Produto', 'Preço', 'Estoque']],
                body: linhas.length ? linhas : [['Nenhum produto cadastrado', '', '']],
                theme: 'striped',
                headStyles: { fillColor: [13, 27, 62] },
                styles: { fontSize: 9 }
            });
        } else {
            linhas.forEach(([nome, preco, estoque]) => {
                doc.setFontSize(9);
                doc.setTextColor(70,70,70);
                doc.text(nome, 14, y);
                doc.text(preco, 120, y);
                doc.text(estoque, 165, y);
                y += 6;
            });
        }

        doc.save(`produtos-${hojeISO()}.pdf`);
        showToast('PDF exportado com sucesso! ✨');
    } catch(e) {
        console.log(e);
        showToast('Erro ao exportar PDF', 'error');
    }
}

async function exportarComprasDashAdminPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = dadmCabecalhoPDF(doc, 'Compras no Período');

        const qtd   = document.getElementById('dadm-compras-qtd').textContent;
        const valor = document.getElementById('dadm-compras-valor').textContent;

        doc.setFontSize(12);
        doc.setTextColor(70, 70, 70);
        doc.text('Quantidade de Compras:', 14, y);
        doc.setFontSize(16);
        doc.setTextColor(13, 27, 62);
        doc.setFont(undefined, 'bold');
        doc.text(String(qtd), 130, y);
        doc.setFont(undefined, 'normal');
        y += 10;

        doc.setFontSize(12);
        doc.setTextColor(70, 70, 70);
        doc.text('Valor Total:', 14, y);
        doc.setFontSize(16);
        doc.setTextColor(13, 27, 62);
        doc.setFont(undefined, 'bold');
        doc.text(String(valor), 130, y);
        doc.setFont(undefined, 'normal');

        doc.save(`compras-periodo-${hojeISO()}.pdf`);
        showToast('PDF exportado com sucesso! ✨');
    } catch(e) {
        console.log(e);
        showToast('Erro ao exportar PDF', 'error');
    }
}

async function exportarEstoqueBaixoDashAdminPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = dadmCabecalhoPDF(doc, 'Produtos com Estoque Baixo');

        const linhas = Array.from(document.querySelectorAll('#dadm-tbody-estoque tr')).map(tr =>
            Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())
        );
        const linhasValidas = linhas.filter(l => l.length === 2);

        if(doc.autoTable) {
            doc.autoTable({
                startY: y,
                head: [['Produto', 'Estoque Atual']],
                body: linhasValidas.length ? linhasValidas : [['Nenhum produto com estoque baixo', '']],
                theme: 'striped',
                headStyles: { fillColor: [13, 27, 62] },
                styles: { fontSize: 9 }
            });
        } else {
            linhasValidas.forEach(([nome, estoque]) => {
                doc.setFontSize(9);
                doc.setTextColor(70,70,70);
                doc.text(nome || '', 14, y);
                doc.text(estoque || '', 150, y);
                y += 6;
            });
        }

        doc.save(`estoque-baixo-${hojeISO()}.pdf`);
        showToast('PDF exportado com sucesso! ✨');
    } catch(e) {
        console.log(e);
        showToast('Erro ao exportar PDF', 'error');
    }
}

// ============================================================
// EXPORTAR DASHBOARD VENDAS PARA PDF
// ============================================================
async function exportarDashboardVendasPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const dataGeracao = new Date().toLocaleString('pt-BR');

        const inicio = document.getElementById('dven-inicio').value;
        const fim    = document.getElementById('dven-fim').value;
        const fmtData = iso => iso ? iso.split('-').reverse().join('/') : '';

        let y = 20;

        doc.setFontSize(18);
        doc.setTextColor(13, 27, 62);
        doc.text('Dashboard — Sistema de Vendas', 14, y);
        y += 8;
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(`Período: ${fmtData(inicio)} até ${fmtData(fim)}  |  Gerado em: ${dataGeracao}`, 14, y);
        y += 4;
        doc.setDrawColor(220, 220, 220);
        doc.line(14, y, 196, y);
        y += 10;

        const vendasDiaQtd      = document.getElementById('dven-dia-qtd').textContent;
        const vendasDiaValor    = document.getElementById('dven-dia-valor').textContent;
        const vendasPeriodoQtd  = document.getElementById('dven-periodo-qtd').textContent;
        const vendasPeriodoValor = document.getElementById('dven-periodo-valor').textContent;
        const totalClientes     = document.getElementById('dven-clientes').textContent;

        doc.setFontSize(12);
        doc.setTextColor(13, 27, 62);
        doc.text('Resumo Geral', 14, y);
        y += 8;

        const metrics = [
            ['Vendas do Dia (qtd)', vendasDiaQtd],
            ['Vendas do Dia (valor)', vendasDiaValor],
            ['Vendas no Período (qtd)', vendasPeriodoQtd],
            ['Vendas no Período (valor)', vendasPeriodoValor],
            ['Clientes Cadastrados', totalClientes],
        ];

        doc.setFontSize(10);
        metrics.forEach(([label, value]) => {
            doc.setTextColor(70, 70, 70);
            doc.text(label, 14, y);
            doc.setTextColor(13, 27, 62);
            doc.setFont(undefined, 'bold');
            doc.text(String(value), 120, y);
            doc.setFont(undefined, 'normal');
            y += 7;
        });

        y += 8;
        doc.setFontSize(12);
        doc.setTextColor(13, 27, 62);
        doc.text('Produtos Mais Vendidos no Período', 14, y);
        y += 4;

        const linhas = Array.from(document.querySelectorAll('#dven-tbody-vendidos tr')).map(tr =>
            Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())
        );

        if(doc.autoTable) {
            doc.autoTable({
                startY: y,
                head: [['Produto', 'Qtd Vendida', 'Total Vendido']],
                body: linhas.length ? linhas : [['Nenhuma venda no período', '', '']],
                theme: 'striped',
                headStyles: { fillColor: [13, 27, 62] },
                styles: { fontSize: 9 }
            });
        } else {
            linhas.forEach(([nome, qtd, total]) => {
                doc.setFontSize(9);
                doc.setTextColor(70,70,70);
                doc.text(nome || '', 14, y);
                doc.text(qtd || '', 120, y);
                doc.text(total || '', 150, y);
                y += 6;
            });
        }

        doc.save(`dashboard-vendas-${hojeISO()}.pdf`);
        showToast('PDF exportado com sucesso! ✨');
    } catch(e) {
        console.log(e);
        showToast('Erro ao exportar PDF', 'error');
    }
}

// ============================================================
// EXPORTAÇÃO DE LISTAGENS PARA PDF (genérico)
// ============================================================

// Gera um PDF a partir de uma tabela HTML visível na tela
function exportarTabelaPDF({ titulo, tbodyId, colunas, nomeArquivo }) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const dataGeracao = new Date().toLocaleString('pt-BR');

        doc.setFontSize(18);
        doc.setTextColor(13, 27, 62);
        doc.text(titulo, 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(`Gerado em: ${dataGeracao}`, 14, 27);

        doc.setDrawColor(220, 220, 220);
        doc.line(14, 31, 196, 31);

        // Só linhas visíveis (respeita filtro de busca aplicado na tela)
        const linhas = Array.from(document.querySelectorAll(`#${tbodyId} tr`))
            .filter(tr => tr.style.display !== 'none')
            .map(tr => {
                const tds = Array.from(tr.querySelectorAll('td'));
                // Remove a última coluna (Ações) se ela contiver botões
                const semAcoes = tds.filter(td => !td.classList.contains('acoes'));
                return semAcoes.map(td => td.textContent.trim());
            });

        doc.autoTable({
            startY: 36,
            head: [colunas],
            body: linhas.length ? linhas : [colunas.map(() => '—')],
            theme: 'striped',
            headStyles: { fillColor: [13, 27, 62] },
            styles: { fontSize: 9 }
        });

        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`Total de registros: ${linhas.length}`, 14, doc.lastAutoTable.finalY + 8);

        doc.save(`${nomeArquivo}-${hojeISO()}.pdf`);
        showToast('PDF exportado com sucesso! ✨');
    } catch(e) {
        console.log(e);
        showToast('Erro ao exportar PDF', 'error');
    }
}

// ============================================================
// EXPORTAR CARDS DO DASHBOARD VENDAS — PDFs específicos por card
// ============================================================

async function exportarVendasDiaPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const dataGeracao = new Date().toLocaleString('pt-BR');
        const hoje = hojeISO();
        const fmtData = iso => iso ? iso.split('-').reverse().join('/') : '';

        doc.setFontSize(18);
        doc.setTextColor(13, 27, 62);
        doc.text('Vendas do Dia', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(`Data: ${fmtData(hoje)}  |  Gerado em: ${dataGeracao}`, 14, 28);

        doc.setDrawColor(220, 220, 220);
        doc.line(14, 32, 196, 32);

        // Busca os pedidos do dia via API
        const pedidos = await GET('/pedidos');
        const pedidosHoje = pedidos.filter(p => {
            if (!p.data_pedido) return false;
            return p.data_pedido.split('T')[0] === hoje;
        });

        const linhas = pedidosHoje.map(p => [
            String(p.id),
            p.cliente || '—',
            p.forma_pagamento || '—',
            p.total != null ? `R$ ${Number(p.total).toFixed(2)}` : '—',
            p.status || '—'
        ]);

        doc.autoTable({
            startY: 38,
            head: [['#', 'Cliente', 'Forma Pgto', 'Total', 'Status']],
            body: linhas.length ? linhas : [['', 'Nenhuma venda hoje', '', '', '']],
            theme: 'striped',
            headStyles: { fillColor: [13, 27, 62] },
            styles: { fontSize: 9 }
        });

        const totalValor = pedidosHoje.reduce((s, p) => s + Number(p.total || 0), 0);
        doc.setFontSize(10);
        doc.setTextColor(13, 27, 62);
        doc.setFont(undefined, 'bold');
        doc.text(`Total de pedidos: ${pedidosHoje.length}   |   Valor total: R$ ${totalValor.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 9);
        doc.setFont(undefined, 'normal');

        doc.save(`vendas-dia-${hoje}.pdf`);
        showToast('PDF de Vendas do Dia exportado! ✨');
    } catch(e) {
        console.log(e);
        showToast('Erro ao exportar PDF', 'error');
    }
}

async function exportarVendasPeriodoPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const dataGeracao = new Date().toLocaleString('pt-BR');

        const inicio = document.getElementById('dven-inicio').value;
        const fim    = document.getElementById('dven-fim').value;
        const fmtData = iso => iso ? iso.split('-').reverse().join('/') : '';

        doc.setFontSize(18);
        doc.setTextColor(13, 27, 62);
        doc.text('Vendas no Período', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(`Período: ${fmtData(inicio)} até ${fmtData(fim)}  |  Gerado em: ${dataGeracao}`, 14, 28);

        doc.setDrawColor(220, 220, 220);
        doc.line(14, 32, 196, 32);

        // Busca pedidos e filtra pelo período selecionado
        const pedidos = await GET('/pedidos');
        const pedidosPeriodo = pedidos.filter(p => {
            if (!p.data_pedido) return false;
            const data = p.data_pedido.split('T')[0];
            return (!inicio || data >= inicio) && (!fim || data <= fim);
        });

        const linhas = pedidosPeriodo.map(p => [
            String(p.id),
            p.data_pedido ? p.data_pedido.split('T')[0].split('-').reverse().join('/') : '—',
            p.cliente || '—',
            p.forma_pagamento || '—',
            p.total != null ? `R$ ${Number(p.total).toFixed(2)}` : '—',
            p.status || '—'
        ]);

        doc.autoTable({
            startY: 38,
            head: [['#', 'Data', 'Cliente', 'Forma Pgto', 'Total', 'Status']],
            body: linhas.length ? linhas : [['', '', 'Nenhuma venda no período', '', '', '']],
            theme: 'striped',
            headStyles: { fillColor: [13, 27, 62] },
            styles: { fontSize: 9 }
        });

        const totalValor = pedidosPeriodo.reduce((s, p) => s + Number(p.total || 0), 0);
        doc.setFontSize(10);
        doc.setTextColor(13, 27, 62);
        doc.setFont(undefined, 'bold');
        doc.text(`Total de pedidos: ${pedidosPeriodo.length}   |   Valor total: R$ ${totalValor.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 9);
        doc.setFont(undefined, 'normal');

        doc.save(`vendas-periodo-${fmtData(inicio)}-a-${fmtData(fim)}.pdf`);
        showToast('PDF de Vendas no Período exportado! ✨');
    } catch(e) {
        console.log(e);
        showToast('Erro ao exportar PDF', 'error');
    }
}

async function exportarClientesDashboardPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const dataGeracao = new Date().toLocaleString('pt-BR');

        doc.setFontSize(18);
        doc.setTextColor(13, 27, 62);
        doc.text('Lista de Clientes Cadastrados', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(`Gerado em: ${dataGeracao}`, 14, 28);

        doc.setDrawColor(220, 220, 220);
        doc.line(14, 32, 196, 32);

        const clientes = await GET('/clientes');

        const linhas = clientes.map(c => [
            String(c.id),
            c.nome || '—',
            c.email || '—',
            c.telefone || '—',
            c.cidade || '—',
            c.cpf || '—'
        ]);

        doc.autoTable({
            startY: 38,
            head: [['#', 'Nome', 'E-mail', 'Telefone', 'Cidade', 'CPF']],
            body: linhas.length ? linhas : [['', 'Nenhum cliente cadastrado', '', '', '', '']],
            theme: 'striped',
            headStyles: { fillColor: [13, 27, 62] },
            styles: { fontSize: 9 }
        });

        doc.setFontSize(10);
        doc.setTextColor(13, 27, 62);
        doc.setFont(undefined, 'bold');
        doc.text(`Total de clientes: ${clientes.length}`, 14, doc.lastAutoTable.finalY + 9);
        doc.setFont(undefined, 'normal');

        doc.save(`clientes-cadastrados-${hojeISO()}.pdf`);
        showToast('PDF de Clientes exportado! ✨');
    } catch(e) {
        console.log(e);
        showToast('Erro ao exportar PDF', 'error');
    }
}
