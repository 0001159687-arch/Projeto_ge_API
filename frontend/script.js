// ============================================================
// SISTEMA DE VENDAS — SCRIPT.JS
// ============================================================

const API = 'http://localhost:3000';

// ============================================================
// HELPERS HTTP
// ============================================================
async function GET(rota) {
    const res = await fetch(API + rota);
    if (!res.ok) throw new Error('Erro ao buscar ' + rota);
    return res.json();
}
async function POST(rota, dados) {
    const res = await fetch(API + rota, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Erro ao salvar');
    return json;
}
async function PUT(rota, dados) {
    const res = await fetch(API + rota, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Erro ao atualizar');
    return json;
}
async function DELETE(rota) {
    const res = await fetch(API + rota, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir');
    return res.json();
}

function showToast(msg, tipo = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    document.getElementById('toast-icon').textContent = icons[tipo] || '✅';
    document.getElementById('toast-msg').textContent  = msg;
    toast.className = `show toast-${tipo}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.className = '', 3500);
}

function fmtData(isoStr) {
    if (!isoStr) return '';
    return isoStr.split('T')[0].split('-').reverse().join('/');
}

function fmtMoeda(val) {
    return `R$ ${Number(val || 0).toFixed(2)}`;
}

// ============================================================
// MODAIS
// ============================================================
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
});

function openModal(id)  { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('active'); clearAllErrors(id); }
}

function limparCampos(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.querySelectorAll('input:not([readonly]):not([disabled]), select, textarea').forEach(el => el.value = '');
    modal.querySelectorAll('input[type="hidden"]').forEach(el => el.value = '');

    if (modalId === 'modal-pedido') {
        pedidoItens = [];
        document.getElementById('ped-parcelamento').innerHTML = '';
        document.getElementById('ped-total-line').innerHTML = 'Total: R$ 0,00';
        document.getElementById('ped-juros-badge').style.display = 'none';
        document.getElementById('ped-data').valueAsDate = new Date();
        document.getElementById('modal-pedido-title').textContent = 'Novo Pedido';
        renderItensPedido();
    }
}

function filterTable(tableId, value) {
    const filtro = value.toLowerCase();
    document.querySelectorAll(`#${tableId} tbody tr`).forEach(tr => {
        tr.style.display = tr.innerText.toLowerCase().includes(filtro) ? '' : 'none';
    });
}

// ============================================================
// VALIDAÇÃO
// ============================================================
function setFieldError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.borderColor = 'var(--red)';
    el.style.boxShadow   = '0 0 0 3px rgba(232,64,64,.15)';
    let tip = el.parentElement.querySelector('.field-error');
    if (!tip) { tip = document.createElement('span'); tip.className = 'field-error'; el.parentElement.appendChild(tip); }
    tip.textContent = msg;
}

function clearFieldError(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.borderColor = '';
    el.style.boxShadow   = '';
    el.parentElement.querySelector('.field-error')?.remove();
}

function clearAllErrors(modalId) {
    document.querySelectorAll(`#${modalId} .field-error`).forEach(e => e.remove());
    document.querySelectorAll(`#${modalId} input, #${modalId} select, #${modalId} textarea`).forEach(el => {
        el.style.borderColor = '';
        el.style.boxShadow   = '';
    });
}

function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
    let r = (soma * 10) % 11; if (r === 10 || r === 11) r = 0;
    if (r !== parseInt(cpf[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
    r = (soma * 10) % 11; if (r === 10 || r === 11) r = 0;
    return r === parseInt(cpf[10]);
}

function validarCNPJ(cnpj) {
    cnpj = cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
    let tam = cnpj.length - 2, nums = cnpj.substring(0, tam), digs = cnpj.substring(tam);
    let soma = 0, pos = tam - 7;
    for (let i = tam; i >= 1; i--) { soma += parseInt(nums.charAt(tam - i)) * pos--; if (pos < 2) pos = 9; }
    let res = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (res !== parseInt(digs.charAt(0))) return false;
    tam += 1; nums = cnpj.substring(0, tam); soma = 0; pos = tam - 7;
    for (let i = tam; i >= 1; i--) { soma += parseInt(nums.charAt(tam - i)) * pos--; if (pos < 2) pos = 9; }
    res = soma % 11 < 2 ? 0 : 11 - soma % 11;
    return res === parseInt(digs.charAt(1));
}

// ── Máscaras ─────────────────────────────────────────────────
function mascaraTel(el, errId) {
    el?.addEventListener('input', () => {
        let v = el.value.replace(/\D/g, '').slice(0, 11);
        if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
        else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
        else if (v.length) v = `(${v}`;
        el.value = v;
        if (errId) clearFieldError(errId);
    });
}
function mascaraCPF(el) {
    el?.addEventListener('input', () => {
        let v = el.value.replace(/\D/g, '').slice(0, 11);
        if (v.length > 9) v = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
        else if (v.length > 6) v = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
        else if (v.length > 3) v = `${v.slice(0,3)}.${v.slice(3)}`;
        el.value = v;
        clearFieldError('c-cpf');
    });
}
function mascaraCNPJ(el) {
    el?.addEventListener('input', () => {
        let v = el.value.replace(/\D/g, '').slice(0, 14);
        if (v.length > 12) v = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12)}`;
        else if (v.length > 8) v = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8)}`;
        else if (v.length > 5) v = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5)}`;
        else if (v.length > 2) v = `${v.slice(0,2)}.${v.slice(2)}`;
        el.value = v;
        clearFieldError('f-cnpj');
    });
}
function mascaraCEP(el, errId) {
    el?.addEventListener('input', () => {
        let v = el.value.replace(/\D/g, '').slice(0, 8);
        if (v.length > 5) v = `${v.slice(0,5)}-${v.slice(5)}`;
        el.value = v;
        if (errId) clearFieldError(errId);
    });
}

// ── Listeners globais de validação ───────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Máscaras
    mascaraTel(document.getElementById('c-tel'), 'c-tel');
    mascaraCPF(document.getElementById('c-cpf'));
    mascaraCEP(document.getElementById('c-cep'), 'c-cep');
    mascaraTel(document.getElementById('f-tel'), 'f-tel');
    mascaraCNPJ(document.getElementById('f-cnpj'));
    mascaraCEP(document.getElementById('f-cep'), 'f-cep');

    // UF sempre maiúscula
    document.getElementById('cid-uf')?.addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); });

    // Limpar erros ao digitar
    ['c-nome','c-end','c-num','c-email','c-bairro','c-cidade'].forEach(id => {
        document.getElementById(id)?.addEventListener('input',  () => clearFieldError(id));
        document.getElementById(id)?.addEventListener('change', () => clearFieldError(id));
    });
    ['p-nome','p-preco'].forEach(id => document.getElementById(id)?.addEventListener('input', () => clearFieldError(id)));
    ['cid-nome','cid-uf'].forEach(id => document.getElementById(id)?.addEventListener('input', () => clearFieldError(id)));
    ['fp-nome','fp-tipo'].forEach(id => {
        document.getElementById(id)?.addEventListener('input',  () => clearFieldError(id));
        document.getElementById(id)?.addEventListener('change', () => clearFieldError(id));
    });
    ['cp-nome','cp-parcelas','cp-juros'].forEach(id => document.getElementById(id)?.addEventListener('input', () => clearFieldError(id)));
    ['f-nome','f-end','f-num','f-email','f-bairro'].forEach(id => document.getElementById(id)?.addEventListener('input', () => clearFieldError(id)));
    document.getElementById('f-cidade')?.addEventListener('change', () => clearFieldError('f-cidade'));

    // Pedido: ao mudar condição, atualiza badge e recalcula total
    document.getElementById('ped-condicao')?.addEventListener('change', function () {
        const opt    = this.options[this.selectedIndex];
        const juros  = Number(opt?.dataset.juros || 0);
        const parcelas = Number(opt?.dataset.parcelas || 1);
        const badge  = document.getElementById('ped-juros-badge');
        if (badge) {
            if (juros > 0 && parcelas >= 3) {
                badge.textContent = `+${juros.toFixed(2)}% a partir de 3x`;
                badge.style.display = '';
            } else {
                badge.style.display = 'none';
            }
        }
        renderItensPedido();
    });
    ['ped-cliente','ped-forma','ped-data','ped-prazo'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => clearFieldError(id));
        document.getElementById(id)?.addEventListener('input',  () => clearFieldError(id));
    });

    // Compra: ao mudar condição, atualiza badge e recalcula total
    document.getElementById('cmp-condicao')?.addEventListener('change', function () {
        const opt    = this.options[this.selectedIndex];
        const juros  = Number(opt?.dataset.juros || 0);
        const parcelas = Number(opt?.dataset.parcelas || 1);
        const badge  = document.getElementById('cmp-juros-badge');
        if (badge) {
            if (juros > 0 && parcelas >= 3) {
                badge.textContent = `+${juros.toFixed(2)}% a partir de 3x`;
                badge.style.display = '';
            } else {
                badge.style.display = 'none';
            }
        }
        renderItensCompra();
    });
    ['cmp-fornecedor','cmp-forma','cmp-data','cmp-previsao'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => clearFieldError(id));
        document.getElementById(id)?.addEventListener('input',  () => clearFieldError(id));
    });

    // Compra: ao selecionar fornecedor, carrega catálogo dele
    document.getElementById('cmp-fornecedor')?.addEventListener('change', async function () {
        clearFieldError('cmp-fornecedor');
        const fornId = this.value;
        const tbody  = document.getElementById('tbody-picker-compra');
        if (!fornId) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--gray-400);font-size:13px">Selecione um fornecedor para ver o catálogo</td></tr>`;
            return;
        }
        tbody.innerHTML = `<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--gray-400)">⏳ Carregando catálogo...</td></tr>`;
        try {
            const itens = await GET(`/catalogo/fornecedor/${fornId}`);
            if (itens.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--gray-400);font-size:13px">Este fornecedor não possui produtos no catálogo.<br>Acesse <b>Fornecedores → Catálogo</b> para adicionar.</td></tr>`;
                return;
            }
            tbody.innerHTML = itens.map(i => `
                <tr>
                    <td style="padding:10px 12px"><span style="font-weight:600;color:var(--navy)">${i.produto_nome}</span></td>
                    <td style="padding:10px 8px;color:var(--blue);font-weight:700">${i.estoque}</td>
                    <td style="padding:6px 8px">
                        <input type="number" min="0.01" step="0.01" id="custo-compra-${i.produto_id}" class="compra-custo-input" value="${Number(i.preco_custo).toFixed(2)}">
                    </td>
                    <td style="padding:6px 8px">
                        <input type="number" min="1" value="1" id="qtd-compra-${i.produto_id}" class="compra-qtd-input">
                    </td>
                    <td style="padding:6px 8px">
                        <button class="btn-add-compra" onclick="addProdutoAoCompraCatalogo('${i.produto_id}','${i.produto_nome}',${i.estoque})">+</button>
                    </td>
                </tr>`).join('');
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--red)">Erro ao carregar catálogo</td></tr>`;
        }
    });
});

// ============================================================
// SELECTS — popular condições e formas de pagamento
// ============================================================
async function popularSelectsPedido() {
    async function load(rota, selectId, chave) {
        try {
            const data = await GET(rota);
            const sel  = document.getElementById(selectId);
            if (!sel) return;
            const atual = sel.value;
            sel.innerHTML = `<option value="">Selecione...</option>`;
            data.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.id;
                opt.textContent = item[chave];
                if (item.juros    != null) opt.dataset.juros    = item.juros;
                if (item.parcelas != null) opt.dataset.parcelas = item.parcelas;
                sel.appendChild(opt);
            });
            if (atual) sel.value = atual;
        } catch (e) { console.log(e); }
    }
    await load('/cidades',   'c-cidade',    'nome');
    await load('/clientes',  'ped-cliente', 'nome');
    await load('/condicoes', 'ped-condicao','nome');
    await load('/formas',    'ped-forma',   'nome');
}

async function popularSelectsCompra() {
    async function load(rota, selectId, chave) {
        try {
            const data = await GET(rota);
            const sel  = document.getElementById(selectId);
            if (!sel) return;
            sel.innerHTML = `<option value="">Selecione...</option>`;
            data.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.id;
                opt.textContent = item[chave];
                if (item.juros    != null) opt.dataset.juros    = item.juros;
                if (item.parcelas != null) opt.dataset.parcelas = item.parcelas;
                sel.appendChild(opt);
            });
        } catch (e) { console.log(e); }
    }
    await load('/condicoes',    'cmp-condicao',   'nome');
    await load('/formas',       'cmp-forma',      'nome');
    await load('/fornecedores', 'cmp-fornecedor', 'nome');
}

async function popularSelectsFornecedor() {
    try {
        const cidades = await GET('/cidades');
        const sel = document.getElementById('f-cidade');
        sel.innerHTML = '<option value="">Selecione a Cidade</option>';
        cidades.forEach(c => sel.innerHTML += `<option value="${c.id}">${c.nome}</option>`);
    } catch (e) { console.log(e); }
}

// ============================================================
// NAVEGAÇÃO
// ============================================================
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;

        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
        document.getElementById(`page-${page}`)?.classList.add('active');

        const loaders = {
            clientes:    carregarClientes,
            fornecedores:carregarFornecedores,
            produtos:    carregarProdutos,
            pedidos:     carregarPedidos,
            compras:     carregarCompras,
            cidades:     carregarCidades,
            formas:      carregarFormas,
            condicoes:   carregarCondicoes,
        };
        loaders[page]?.();
    });
});

document.querySelectorAll('.btn-new').forEach(btn => {
    btn.addEventListener('click', async () => {
        const section = btn.closest('.page-section');
        if (!section) return;
        const pageId = section.id;

        if (pageId === 'page-clientes') {
            limparCampos('modal-cliente');
            await popularSelectsPedido(); // carrega c-cidade
            document.getElementById('modal-cliente-title').textContent = 'Cadastro de Cliente';
            openModal('modal-cliente');

        } else if (pageId === 'page-fornecedores') {
            limparCampos('modal-fornecedor');
            await popularSelectsFornecedor();
            document.getElementById('tab-catalogo').disabled = true;
            document.getElementById('modal-fornecedor-title').textContent = 'Cadastro de Fornecedor';
            trocarAbaForn('dados');
            openModal('modal-fornecedor');

        } else if (pageId === 'page-produtos') {
            limparCampos('modal-produto');
            document.getElementById('modal-produto-title').textContent = 'Cadastro de Produto';
            openModal('modal-produto');

        } else if (pageId === 'page-pedidos') {
            limparCampos('modal-pedido');
            await popularSelectsPedido();
            openModal('modal-pedido');

        } else if (pageId === 'page-cidades') {
            limparCampos('modal-cidade');
            document.getElementById('modal-cidade-title').textContent = 'Cadastrar Cidade';
            openModal('modal-cidade');

        } else if (pageId === 'page-formas') {
            limparCampos('modal-forma');
            document.getElementById('modal-forma-title').textContent = 'Nova Forma de Pagamento';
            openModal('modal-forma');

        } else if (pageId === 'page-condicoes') {
            limparCampos('modal-condicao');
            document.getElementById('modal-condicao-title').textContent = 'Nova Condição de Pagamento';
            openModal('modal-condicao');

        } else if (pageId === 'page-compras') {
            // Reset completo da compra
            compraItens = [];
            document.getElementById('cmp-id').value       = '';
            document.getElementById('cmp-status').value   = 'Pendente';
            document.getElementById('cmp-data').valueAsDate = new Date();
            document.getElementById('cmp-previsao').value = '';
            document.getElementById('cmp-parcelamento').innerHTML = '';
            document.getElementById('cmp-total-line').innerHTML = 'Total: R$ 0,00';
            document.getElementById('cmp-juros-badge').style.display = 'none';
            document.getElementById('modal-compra-title').textContent = 'Nova Compra';
            document.getElementById('tbody-picker-compra').innerHTML =
                `<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--gray-400);font-size:13px">Selecione um fornecedor para ver o catálogo</td></tr>`;
            clearAllErrors('modal-compra');
            renderItensCompra();
            await popularSelectsCompra();
            openModal('modal-compra');
        }
    });
});

// ============================================================
// SIDEBAR MOBILE
// ============================================================
(function () {
    const toggle  = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!toggle) return;
    const open  = () => { sidebar.classList.add('open'); overlay.classList.add('open'); };
    const close = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); };
    toggle.addEventListener('click', () => sidebar.classList.contains('open') ? close() : open());
    overlay.addEventListener('click', close);
    document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => { if (window.innerWidth <= 768) close(); }));
})();

// ============================================================
// CLIENTES
// ============================================================
async function carregarClientes() {
    try {
        const clientes = await GET('/clientes');
        document.getElementById('tbody-clientes').innerHTML = clientes.map(c => `
            <tr>
                <td>${c.id}</td>
                <td>${c.nome || ''}</td>
                <td>${c.endereco || ''} ${c.numero ? ', ' + c.numero : ''}</td>
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
    } catch (e) { console.log(e); }
}

async function saveCliente() {
    const id = document.getElementById('c-id').value;
    clearAllErrors('modal-cliente');
    const nome     = document.getElementById('c-nome').value.trim();
    const telefone = document.getElementById('c-tel').value.trim();
    const endereco = document.getElementById('c-end').value.trim();
    const numero   = document.getElementById('c-num').value.trim();
    const email    = document.getElementById('c-email').value.trim();
    const cpf      = document.getElementById('c-cpf').value.trim();
    const cep      = document.getElementById('c-cep').value.trim();
    const bairro   = document.getElementById('c-bairro').value.trim();
    const selCid   = document.getElementById('c-cidade');
    const cidade   = selCid.options[selCid.selectedIndex]?.text || '';

    let ok = true;
    if (!nome)                                                { setFieldError('c-nome', 'Nome é obrigatório'); ok = false; }
    else if (nome.length < 3)                                 { setFieldError('c-nome', 'Nome muito curto'); ok = false; }
    if (!telefone)                                            { setFieldError('c-tel', 'Telefone é obrigatório'); ok = false; }
    else if (telefone.replace(/\D/g,'').length < 10)          { setFieldError('c-tel', 'Telefone inválido'); ok = false; }
    if (!endereco)                                            { setFieldError('c-end', 'Endereço é obrigatório'); ok = false; }
    if (!numero)                                              { setFieldError('c-num', 'Número é obrigatório'); ok = false; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))  { setFieldError('c-email', 'E-mail inválido'); ok = false; }
    if (cpf && !validarCPF(cpf))                              { setFieldError('c-cpf', 'CPF inválido'); ok = false; }
    if (cep && cep.replace(/\D/g,'').length !== 8)            { setFieldError('c-cep', 'CEP inválido'); ok = false; }
    if (!bairro)                                              { setFieldError('c-bairro', 'Bairro é obrigatório'); ok = false; }
    if (!selCid.value)                                        { setFieldError('c-cidade', 'Selecione uma cidade'); ok = false; }
    if (!ok) return;

    try {
        if (id) await PUT(`/clientes/${id}`, { nome, telefone, endereco, numero, email, cpf, cep, bairro, cidade });
        else    await POST('/clientes',       { nome, telefone, endereco, numero, email, cpf, cep, bairro, cidade });
        closeModal('modal-cliente');
        carregarClientes();
        showToast(id ? 'Cliente atualizado!' : 'Cliente cadastrado!');
    } catch (e) { showToast('Erro ao salvar cliente', 'error'); }
}

async function editarCliente(id) {
    try {
        const c = await GET(`/clientes/${id}`);
        await popularSelectsPedido();
        document.getElementById('c-id').value     = c.id       || '';
        document.getElementById('c-nome').value   = c.nome     || '';
        document.getElementById('c-tel').value    = c.telefone || '';
        document.getElementById('c-end').value    = c.endereco || '';
        document.getElementById('c-num').value    = c.numero   || '';
        document.getElementById('c-email').value  = c.email    || '';
        document.getElementById('c-cpf').value    = c.cpf      || '';
        document.getElementById('c-cep').value    = c.cep      || '';
        document.getElementById('c-bairro').value = c.bairro   || '';
        const selCid = document.getElementById('c-cidade');
        Array.from(selCid.options).forEach(o => { if (o.text === c.cidade) selCid.value = o.value; });
        document.getElementById('modal-cliente-title').textContent = 'Editar Cliente';
        openModal('modal-cliente');
    } catch (e) { showToast('Erro ao carregar cliente', 'error'); }
}

async function deletarCliente(id) {
    if (!confirm('Excluir este cliente?')) return;
    try { await DELETE(`/clientes/${id}`); carregarClientes(); showToast('Cliente excluído!', 'info'); }
    catch (e) { showToast('Erro ao excluir cliente', 'error'); }
}

// ============================================================
// PRODUTOS
// ============================================================
async function carregarProdutos() {
    try {
        const produtos = await GET('/produtos');
        document.getElementById('tbody-produtos').innerHTML = produtos.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.nome || ''}</td>
                <td>${fmtMoeda(p.preco)}</td>
                <td style="font-weight:700;color:${Number(p.estoque) > 0 ? 'var(--green)' : 'var(--red)'}">${p.estoque || 0}</td>
                <td style="color:var(--gray-500);font-size:12px">${p.descricao || ''}</td>
                <td class="acoes">
                    <button onclick="editarProduto('${p.id}')">✏️</button>
                    <button onclick="deletarProduto('${p.id}')">🗑️</button>
                </td>
            </tr>`).join('');
        document.getElementById('total-produtos').textContent = `${produtos.length} produto(s) cadastrado(s)`;
    } catch (e) { console.log(e); }
}

async function saveProduto() {
    const id = document.getElementById('p-id').value;
    clearAllErrors('modal-produto');
    const nome  = document.getElementById('p-nome').value.trim();
    const preco = document.getElementById('p-preco').value;
    const desc  = document.getElementById('p-desc').value.trim();

    let ok = true;
    if (!nome)                         { setFieldError('p-nome', 'Nome é obrigatório'); ok = false; }
    else if (nome.length < 2)          { setFieldError('p-nome', 'Nome muito curto'); ok = false; }
    if (preco === '' || preco === null) { setFieldError('p-preco', 'Preço é obrigatório'); ok = false; }
    else if (Number(preco) < 0)        { setFieldError('p-preco', 'Preço não pode ser negativo'); ok = false; }
    if (!ok) return;

    try {
        const dados = { nome, preco: Number(preco), descricao: desc };
        if (id) await PUT(`/produtos/${id}`, dados); else await POST('/produtos', dados);
        closeModal('modal-produto');
        carregarProdutos();
        showToast(id ? 'Produto atualizado!' : 'Produto cadastrado!');
    } catch (e) { showToast('Erro ao salvar produto', 'error'); }
}

async function editarProduto(id) {
    try {
        const p = await GET(`/produtos/${id}`);
        document.getElementById('p-id').value      = p.id        || '';
        document.getElementById('p-nome').value    = p.nome      || '';
        document.getElementById('p-preco').value   = p.preco     || '';
        document.getElementById('p-estoque').value = p.estoque   || 0;
        document.getElementById('p-desc').value    = p.descricao || '';
        document.getElementById('modal-produto-title').textContent = 'Editar Produto';
        openModal('modal-produto');
    } catch (e) { showToast('Erro ao carregar produto', 'error'); }
}

async function deletarProduto(id) {
    if (!confirm('Excluir este produto?')) return;
    try { await DELETE(`/produtos/${id}`); carregarProdutos(); showToast('Produto excluído!', 'info'); }
    catch (e) { showToast('Erro ao excluir produto', 'error'); }
}

// ============================================================
// CIDADES
// ============================================================
const UFS_VALIDAS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

async function carregarCidades() {
    try {
        const cidades = await GET('/cidades');
        document.getElementById('tbody-cidades').innerHTML = cidades.map(c => `
            <tr>
                <td>${c.id}</td><td>${c.nome || ''}</td><td style="text-transform:uppercase">${c.uf || ''}</td>
                <td class="acoes">
                    <button onclick="editarCidade('${c.id}')">✏️</button>
                    <button onclick="deletarCidade('${c.id}')">🗑️</button>
                </td>
            </tr>`).join('');
    } catch (e) { console.log(e); }
}

async function saveCidade() {
    const id   = document.getElementById('cid-id').value;
    const nome = document.getElementById('cid-nome').value.trim();
    const uf   = document.getElementById('cid-uf').value.trim().toUpperCase();
    clearAllErrors('modal-cidade');
    let ok = true;
    if (!nome || nome.length < 3)           { setFieldError('cid-nome', 'Nome inválido'); ok = false; }
    if (!uf || !UFS_VALIDAS.includes(uf))   { setFieldError('cid-uf', 'UF inválida'); ok = false; }
    if (!ok) return;
    try {
        if (id) await PUT(`/cidades/${id}`, { nome, uf }); else await POST('/cidades', { nome, uf });
        closeModal('modal-cidade'); carregarCidades(); showToast('Cidade salva!');
    } catch (e) { showToast('Erro ao salvar cidade', 'error'); }
}

async function editarCidade(id) {
    try {
        const c = await GET(`/cidades/${id}`);
        document.getElementById('cid-id').value   = c.id   || '';
        document.getElementById('cid-nome').value = c.nome || '';
        document.getElementById('cid-uf').value   = c.uf   || '';
        document.getElementById('modal-cidade-title').textContent = 'Editar Cidade';
        openModal('modal-cidade');
    } catch (e) { console.log(e); }
}

async function deletarCidade(id) {
    if (!confirm('Excluir esta cidade?')) return;
    try { await DELETE(`/cidades/${id}`); carregarCidades(); showToast('Cidade excluída!', 'info'); }
    catch (e) { showToast('Erro ao excluir cidade', 'error'); }
}

// ============================================================
// FORMAS DE PAGAMENTO
// ============================================================
async function carregarFormas() {
    try {
        const formas = await GET('/formas');
        document.getElementById('tbody-formas').innerHTML = formas.map(f => `
            <tr>
                <td>${f.id}</td><td>${f.nome || ''}</td><td>${f.tipo || ''}</td>
                <td class="acoes">
                    <button onclick="editarForma('${f.id}')">✏️</button>
                    <button onclick="deletarForma('${f.id}')">🗑️</button>
                </td>
            </tr>`).join('');
    } catch (e) { console.log(e); }
}

async function saveForma() {
    const id   = document.getElementById('fp-id').value;
    const nome = document.getElementById('fp-nome').value.trim();
    const tipo = document.getElementById('fp-tipo').value;
    clearAllErrors('modal-forma');
    let ok = true;
    if (!nome || nome.length < 3) { setFieldError('fp-nome', 'Nome inválido'); ok = false; }
    if (!tipo)                    { setFieldError('fp-tipo', 'Selecione um tipo'); ok = false; }
    if (!ok) return;
    try {
        if (id) await PUT(`/formas/${id}`, { nome, tipo }); else await POST('/formas', { nome, tipo });
        closeModal('modal-forma'); carregarFormas(); showToast('Forma de pagamento salva!');
    } catch (e) { showToast('Erro ao salvar', 'error'); }
}

async function editarForma(id) {
    try {
        const f = await GET(`/formas/${id}`);
        document.getElementById('fp-id').value   = f.id   || '';
        document.getElementById('fp-nome').value = f.nome || '';
        document.getElementById('fp-tipo').value = f.tipo || '';
        document.getElementById('modal-forma-title').textContent = 'Editar Forma de Pagamento';
        openModal('modal-forma');
    } catch (e) { console.log(e); }
}

async function deletarForma(id) {
    if (!confirm('Excluir esta forma de pagamento?')) return;
    try { await DELETE(`/formas/${id}`); carregarFormas(); showToast('Excluído!', 'info'); }
    catch (e) { showToast('Erro ao excluir', 'error'); }
}

// ============================================================
// CONDIÇÕES DE PAGAMENTO
// ============================================================
async function carregarCondicoes() {
    try {
        const conds = await GET('/condicoes');
        document.getElementById('tbody-condicoes').innerHTML = conds.map(c => `
            <tr>
                <td>${c.id}</td>
                <td>${c.nome || ''}</td>
                <td>${c.parcelas || ''}x</td>
                <td>${Number(c.juros || 0).toFixed(2)}%</td>
                <td class="acoes">
                    <button onclick="editarCondicao('${c.id}')">✏️</button>
                    <button onclick="deletarCondicao('${c.id}')">🗑️</button>
                </td>
            </tr>`).join('');
    } catch (e) { console.log(e); }
}

async function saveCondicao() {
    const id       = document.getElementById('cp-id').value;
    const nome     = document.getElementById('cp-nome').value.trim();
    const parcelas = document.getElementById('cp-parcelas').value;
    const juros    = document.getElementById('cp-juros').value;
    clearAllErrors('modal-condicao');
    let ok = true;
    if (!nome || nome.length < 2)             { setFieldError('cp-nome', 'Nome inválido'); ok = false; }
    if (!parcelas || Number(parcelas) < 1)    { setFieldError('cp-parcelas', 'Mínimo 1 parcela'); ok = false; }
    if (Number(parcelas) > 120)               { setFieldError('cp-parcelas', 'Máximo 120 parcelas'); ok = false; }
    if (juros !== '' && Number(juros) < 0)    { setFieldError('cp-juros', 'Juros não pode ser negativo'); ok = false; }
    if (!ok) return;
    try {
        const dados = { nome, parcelas: Number(parcelas), juros: Number(juros) || 0 };
        if (id) await PUT(`/condicoes/${id}`, dados); else await POST('/condicoes', dados);
        closeModal('modal-condicao'); carregarCondicoes(); showToast('Condição salva!');
    } catch (e) { showToast('Erro ao salvar condição', 'error'); }
}

async function editarCondicao(id) {
    try {
        const c = await GET(`/condicoes/${id}`);
        document.getElementById('cp-id').value       = c.id       || '';
        document.getElementById('cp-nome').value     = c.nome     || '';
        document.getElementById('cp-parcelas').value = c.parcelas || '';
        document.getElementById('cp-juros').value    = Number(c.juros || 0).toFixed(2);
        document.getElementById('modal-condicao-title').textContent = 'Editar Condição de Pagamento';
        openModal('modal-condicao');
    } catch (e) { console.log(e); }
}

async function deletarCondicao(id) {
    if (!confirm('Excluir esta condição de pagamento?')) return;
    try { await DELETE(`/condicoes/${id}`); carregarCondicoes(); showToast('Excluído!', 'info'); }
    catch (e) { showToast('Erro ao excluir', 'error'); }
}

// ============================================================
// PEDIDOS
// ============================================================
let pedidoItens = [];

function statusBadge(status) {
    const map = { 'Aberto': 'status-aberto', 'Em andamento': 'status-andamento', 'Concluído': 'status-concluido', 'Cancelado': 'status-cancelado' };
    return `<span class="status-badge ${map[status] || 'status-aberto'}">${status || 'Aberto'}</span>`;
}

async function carregarPedidos() {
    try {
        const pedidos = await GET('/pedidos');
        document.getElementById('tbody-pedidos').innerHTML = pedidos.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${fmtData(p.data_pedido)}</td>
                <td>${p.cliente || ''}</td>
                <td>${p.condicao_pagamento || ''}</td>
                <td>${p.forma_pagamento || ''}</td>
                <td>${fmtData(p.prazo_entrega)}</td>
                <td style="font-weight:700;color:var(--navy)">${p.total != null ? fmtMoeda(p.total) : '—'}</td>
                <td>${statusBadge(p.status)}</td>
                <td class="acoes">
                    <button onclick="editarPedido('${p.id}')">✏️</button>
                    <button onclick="deletarPedido('${p.id}')">🗑️</button>
                </td>
            </tr>`).join('');
    } catch (e) { console.log(e); }
}

// ── Cálculo de juros ─────────────────────────────────────────
// Regra: 1x e 2x sempre sem juros. 3x em diante aplica o % da condição.
function calcularTotalPedido() {
    const sel      = document.getElementById('ped-condicao');
    const opt      = sel?.options[sel.selectedIndex];
    const juros    = Number(opt?.dataset.juros    || 0);
    const parcelas = Number(opt?.dataset.parcelas || 1);
    const subtotal = pedidoItens.reduce((s, i) => s + i.preco * i.qtd, 0);
    const jurosAplicado = parcelas >= 3 ? juros : 0;
    const total    = subtotal * (1 + jurosAplicado / 100);
    return { subtotal, juros, parcelas, jurosAplicado, total };
}

function renderItensPedido() {
    const tbody = document.getElementById('tbody-itens-pedido');
    if (!tbody) return;

    let subtotal = 0;
    tbody.innerHTML = pedidoItens.map((item, i) => {
        const sub = item.preco * item.qtd;
        subtotal += sub;
        return `
            <tr>
                <td>${item.nome}</td>
                <td>${item.qtd} un</td>
                <td>${fmtMoeda(item.preco)}</td>
                <td>${fmtMoeda(sub)}</td>
                <td class="acoes"><button style="width:28px;height:28px" onclick="removerItemPedido(${i})">✕</button></td>
            </tr>`;
    }).join('');

    const { juros, parcelas, jurosAplicado, total } = calcularTotalPedido();
    renderParcelamento('ped-parcelamento', subtotal, juros, parcelas, 'navy');
    document.getElementById('ped-total-line').innerHTML =
        `<span>Total: <strong style="color:var(--navy);font-size:20px">${fmtMoeda(total)}</strong></span>`;
}

function addProdutoAoPedido(id, nome, preco, estoque) {
    const exist = pedidoItens.find(i => i.id === id);
    const qtdAtual = exist ? exist.qtd : 0;
    if (qtdAtual + 1 > Number(estoque)) { showToast(`Estoque insuficiente! Disponível: ${estoque}`, 'error'); return; }
    if (exist) exist.qtd += 1;
    else pedidoItens.push({ id, nome, preco: Number(preco), qtd: 1, estoque: Number(estoque) });
    renderItensPedido();
    closeModal('modal-prod-picker');
    showToast(`${nome} adicionado!`);
}

function removerItemPedido(index) {
    pedidoItens.splice(index, 1);
    renderItensPedido();
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
                <td>${fmtMoeda(p.preco)}</td>
                <td style="font-weight:700;color:${semEstoque ? 'var(--red)' : 'var(--green)'}">${semEstoque ? '⚠️ Sem estoque' : p.estoque}</td>
                <td class="acoes">
                    <button class="btn btn-primary" style="width:auto;padding:5px 12px;font-size:12px"
                        ${semEstoque ? 'disabled style="opacity:.4;cursor:not-allowed;background:var(--gray-400)"' : ''}
                        onclick="${semEstoque ? '' : `addProdutoAoPedido('${p.id}','${p.nome}',${p.preco || 0},${p.estoque || 0})`}">
                        ${semEstoque ? 'Indisponível' : '+ Adicionar'}
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { console.log(e); }
}

async function editarPedido(id) {
    try {
        const ped = await GET(`/pedidos/${id}`);
        await popularSelectsPedido();
        document.getElementById('ped-id').value     = ped.id || '';
        document.getElementById('ped-data').value   = ped.data_pedido   ? ped.data_pedido.split('T')[0]   : '';
        document.getElementById('ped-prazo').value  = ped.prazo_entrega ? ped.prazo_entrega.split('T')[0] : '';
        document.getElementById('ped-status').value = ped.status || 'Aberto';
        const selCli  = document.getElementById('ped-cliente');
        const selCond = document.getElementById('ped-condicao');
        const selForma= document.getElementById('ped-forma');
        Array.from(selCli.options).forEach(o  => { if (o.text === ped.cliente)             selCli.value  = o.value; });
        Array.from(selForma.options).forEach(o => { if (o.text === ped.forma_pagamento)    selForma.value = o.value; });
        // Carregar itens ANTES do dispatchEvent para que o render já ache os itens
        pedidoItens = (ped.itens || []).map(i => ({
            id: String(i.produto_id), nome: i.produto_nome || '', preco: Number(i.preco), qtd: i.qtd
        }));
        // Selecionar condição e disparar change para atualizar badge e parcelamento
        Array.from(selCond.options).forEach(o => { if (o.text === ped.condicao_pagamento) selCond.value = o.value; });
        selCond.dispatchEvent(new Event('change'));
        document.getElementById('modal-pedido-title').textContent = `Editar Pedido #${id}`;
        openModal('modal-pedido');
    } catch (e) { showToast('Erro ao carregar pedido', 'error'); console.log(e); }
}

async function savePedido() {
    const id       = document.getElementById('ped-id').value;
    const elCli    = document.getElementById('ped-cliente');
    const elCond   = document.getElementById('ped-condicao');
    const elForma  = document.getElementById('ped-forma');
    const data     = document.getElementById('ped-data').value;
    const prazo    = document.getElementById('ped-prazo').value;
    clearAllErrors('modal-pedido');
    let ok = true;
    if (!elCli.value)   { setFieldError('ped-cliente',  'Selecione um cliente'); ok = false; }
    if (!elCond.value)  { setFieldError('ped-condicao', 'Selecione uma condição'); ok = false; }
    if (!elForma.value) { setFieldError('ped-forma',    'Selecione uma forma de pagamento'); ok = false; }
    if (!data)          { setFieldError('ped-data',     'Data é obrigatória'); ok = false; }
    if (prazo && data && prazo < data) { setFieldError('ped-prazo', 'Prazo não pode ser anterior à data do pedido'); ok = false; }
    if (pedidoItens.length === 0) { showToast('Adicione pelo menos um produto ao pedido!', 'error'); ok = false; }
    if (!ok) return;

    const { jurosAplicado, total } = calcularTotalPedido();

    const pedido = {
        cliente:  elCli.options[elCli.selectedIndex].text,
        condicao: elCond.options[elCond.selectedIndex]?.text || '',
        forma:    elForma.options[elForma.selectedIndex]?.text || '',
        data, prazo,
        status:   document.getElementById('ped-status').value || 'Aberto',
        total,
        itens:    pedidoItens.map(i => ({ produto_id: i.id, qtd: i.qtd, preco: i.preco }))
    };

    try {
        if (id) await PUT(`/pedidos/${id}`, pedido); else await POST('/pedidos', pedido);
        closeModal('modal-pedido');
        pedidoItens = [];
        carregarPedidos();
        carregarProdutos();
        showToast(id ? 'Pedido atualizado!' : 'Pedido criado!');
    } catch (e) {
        const msg = e.message || '';
        showToast(msg.includes('Estoque') ? msg : 'Erro ao salvar pedido', 'error');
    }
}

async function deletarPedido(id) {
    if (!confirm('Excluir este pedido? O estoque será restaurado.')) return;
    try { await DELETE(`/pedidos/${id}`); carregarPedidos(); carregarProdutos(); showToast('Pedido excluído!', 'info'); }
    catch (e) { showToast('Erro ao excluir pedido', 'error'); }
}

// ============================================================
// COMPRAS
// ============================================================
let compraItens = [];

async function carregarCompras() {
    try {
        const compras = await GET('/compras');
        const statusMap = { 'Pendente': 'status-andamento', 'Confirmada': 'status-aberto', 'Recebida': 'status-concluido', 'Cancelada': 'status-cancelado' };
        document.getElementById('tbody-compras').innerHTML = compras.map(c => `
            <tr>
                <td>${c.id}</td>
                <td>${fmtData(c.data_compra)}</td>
                <td>${c.fornecedor || ''}</td>
                <td>${c.condicao_pagamento || ''}</td>
                <td>${c.forma_pagamento || ''}</td>
                <td>${fmtData(c.previsao_entrega)}</td>
                <td style="font-weight:700;color:var(--green)">${c.total != null ? fmtMoeda(c.total) : '—'}</td>
                <td><span class="status-badge ${statusMap[c.status] || 'status-aberto'}">${c.status || ''}</span></td>
                <td class="acoes">
                    <button onclick="editarCompra('${c.id}')">✏️</button>
                    <button onclick="deletarCompra('${c.id}')">🗑️</button>
                </td>
            </tr>`).join('');
    } catch (e) { console.log(e); }
}

function calcularTotalCompra() {
    const sel      = document.getElementById('cmp-condicao');
    const opt      = sel?.options[sel.selectedIndex];
    const juros    = Number(opt?.dataset.juros    || 0);
    const parcelas = Number(opt?.dataset.parcelas || 1);
    const subtotal = compraItens.reduce((s, i) => s + i.preco_custo * i.qtd, 0);
    const jurosAplicado = parcelas >= 3 ? juros : 0;
    const total    = subtotal * (1 + jurosAplicado / 100);
    return { subtotal, juros, parcelas, jurosAplicado, total };
}

function renderItensCompra() {
    const tbody = document.getElementById('tbody-itens-compra');
    if (!tbody) return;

    let subtotal = 0;
    tbody.innerHTML = compraItens.map((item, i) => {
        const sub = item.preco_custo * item.qtd;
        subtotal += sub;
        return `
            <tr>
                <td>${item.nome}</td>
                <td><input type="number" min="1" value="${item.qtd}" style="width:65px;padding:4px 6px;border:1px solid var(--gray-200);border-radius:6px;font-size:13px" onchange="atualizarQtdCompra(${i}, this.value)"></td>
                <td>${fmtMoeda(item.preco_custo)}</td>
                <td style="font-weight:700">${fmtMoeda(sub)}</td>
                <td class="acoes"><button style="width:28px;height:28px" onclick="removerItemCompra(${i})">✕</button></td>
            </tr>`;
    }).join('');

    const { juros, parcelas, total } = calcularTotalCompra();
    renderParcelamento('cmp-parcelamento', subtotal, juros, parcelas, 'blue');
    document.getElementById('cmp-total-line').innerHTML =
        `<span>Total: <strong style="color:var(--blue);font-size:20px">${fmtMoeda(total)}</strong></span>`;
}

function addProdutoAoCompraCatalogo(id, nome, estoqueAtual) {
    const custoEl = document.getElementById(`custo-compra-${id}`);
    const preco   = Number(custoEl?.value || 0);
    if (!preco || preco <= 0) { showToast('Informe o custo do produto!', 'error'); custoEl?.focus(); return; }
    const qtdEl = document.getElementById(`qtd-compra-${id}`);
    const qtd   = Math.max(1, Number(qtdEl?.value || 1));
    const exist = compraItens.find(i => i.id === String(id));
    if (exist) exist.qtd += qtd;
    else compraItens.push({ id: String(id), nome, preco_custo: preco, qtd });
    renderItensCompra();
    const row = qtdEl?.closest('tr');
    if (row) { row.style.background = '#d1fae5'; setTimeout(() => row.style.background = '', 700); }
    showToast(`${nome} adicionado!`);
}

function atualizarQtdCompra(index, val) {
    const qtd = parseInt(val);
    if (qtd > 0) { compraItens[index].qtd = qtd; renderItensCompra(); }
}

function removerItemCompra(index) {
    compraItens.splice(index, 1);
    renderItensCompra();
}

async function saveCompra() {
    clearAllErrors('modal-compra');
    const id       = document.getElementById('cmp-id').value;
    const elForn   = document.getElementById('cmp-fornecedor');
    const elCond   = document.getElementById('cmp-condicao');
    const elForma  = document.getElementById('cmp-forma');
    const data     = document.getElementById('cmp-data').value;
    const previsao = document.getElementById('cmp-previsao').value;
    let ok = true;
    if (!elForn.value)  { setFieldError('cmp-fornecedor', 'Selecione um fornecedor'); ok = false; }
    if (!elCond.value)  { setFieldError('cmp-condicao',   'Selecione uma condição'); ok = false; }
    if (!elForma.value) { setFieldError('cmp-forma',      'Selecione uma forma de pagamento'); ok = false; }
    if (!data)          { setFieldError('cmp-data',       'Data é obrigatória'); ok = false; }
    if (previsao && data && previsao < data) { setFieldError('cmp-previsao', 'Previsão não pode ser anterior à data da compra'); ok = false; }
    if (compraItens.length === 0) { showToast('Adicione pelo menos um produto à compra!', 'error'); ok = false; }
    if (!ok) return;

    const { total } = calcularTotalCompra();

    const compra = {
        fornecedor: elForn.options[elForn.selectedIndex]?.text || '',
        condicao:   elCond.options[elCond.selectedIndex]?.text || '',
        forma:      elForma.options[elForma.selectedIndex]?.text || '',
        data, previsao,
        status: document.getElementById('cmp-status').value || 'Pendente',
        total,
        itens: compraItens.map(i => ({ produto_id: i.id, qtd: i.qtd, preco_custo: i.preco_custo }))
    };

    try {
        if (id) await PUT(`/compras/${id}`, compra); else await POST('/compras', compra);
        closeModal('modal-compra');
        compraItens = [];
        carregarCompras();
        carregarProdutos();
        showToast(id ? 'Compra atualizada!' : 'Compra registrada! Estoque atualizado ✅');
    } catch (e) { showToast('Erro ao registrar compra', 'error'); }
}

async function editarCompra(id) {
    try {
        const c = await GET(`/compras/${id}`);
        await popularSelectsCompra();
        document.getElementById('cmp-id').value       = c.id || '';
        document.getElementById('cmp-data').value     = c.data_compra      ? c.data_compra.split('T')[0]      : '';
        document.getElementById('cmp-previsao').value = c.previsao_entrega ? c.previsao_entrega.split('T')[0] : '';
        document.getElementById('cmp-status').value   = c.status || 'Pendente';
        const selForn = document.getElementById('cmp-fornecedor');
        const selCond = document.getElementById('cmp-condicao');
        const selForma= document.getElementById('cmp-forma');
        Array.from(selForn.options).forEach(o  => { if (o.text === c.fornecedor)          selForn.value  = o.value; });
        Array.from(selForma.options).forEach(o => { if (o.text === c.forma_pagamento)     selForma.value = o.value; });
        // Carregar itens ANTES do dispatchEvent
        compraItens = (c.itens || []).map(i => ({
            id: String(i.produto_id), nome: i.produto_nome || '', preco_custo: Number(i.preco_custo), qtd: i.qtd
        }));
        Array.from(selCond.options).forEach(o => { if (o.text === c.condicao_pagamento) selCond.value = o.value; });
        selCond.dispatchEvent(new Event('change'));
        // Carrega catálogo do fornecedor
        selForn.dispatchEvent(new Event('change'));
        document.getElementById('modal-compra-title').textContent = `Editar Compra #${id}`;
        openModal('modal-compra');
    } catch (e) { showToast('Erro ao carregar compra', 'error'); console.log(e); }
}

async function deletarCompra(id) {
    if (!confirm('Excluir esta compra? O estoque adicionado será revertido.')) return;
    try {
        await DELETE(`/compras/${id}`);
        carregarCompras(); carregarProdutos();
        showToast('Compra excluída! Estoque revertido.', 'info');
    } catch (e) { showToast('Erro ao excluir compra', 'error'); }
}

// ============================================================
// PAINEL DE PARCELAMENTO (estilo Shopee)
// Regra: 1x e 2x sempre sem juros. 3x+ aplica o % da condição.
// ============================================================
function renderParcelamento(containerId, subtotal, juros, parcelas, accentColor) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (subtotal === 0 || parcelas === 0) { el.innerHTML = ''; return; }

    const isNavy      = accentColor === 'navy';
    const corVal      = isNavy ? '#4f46e5' : '#2563eb';
    const bgDestaque  = isNavy ? '#eef2ff' : '#e8f4fd';
    const bdDestaque  = isNavy ? '#6366f1' : '#3b82f6';

    const rows = [];
    for (let p = 1; p <= parcelas; p++) {
        const semJuros     = p < 3 || juros === 0;
        const totalParcela = semJuros ? subtotal : subtotal * (1 + juros / 100);
        const valorParcela = totalParcela / p;
        const destaque     = p === parcelas;

        rows.push(`
            <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border-radius:8px;margin-bottom:4px;background:${destaque ? bgDestaque : 'var(--gray-50,#f8f9fa)'};border:1.5px solid ${destaque ? bdDestaque : 'var(--gray-200,#e5e7eb)'}">
                <span style="font-size:13px;font-weight:600;color:var(--gray-700,#374151)">
                    ${p}x <span style="font-weight:400;color:var(--gray-500,#6b7280)">@ ${semJuros ? '0,0' : juros.toFixed(1).replace('.',',')}%</span>
                </span>
                <span style="display:flex;align-items:center;gap:10px">
                    <span style="font-size:14px;font-weight:700;color:${corVal}">${fmtMoeda(valorParcela)}<span style="font-size:11px;font-weight:400;color:var(--gray-500)">/parcela</span></span>
                    ${semJuros
                        ? `<span style="font-size:10px;background:#d1fae5;color:#065f46;border-radius:10px;padding:2px 7px;font-weight:700">Sem juros</span>`
                        : `<span style="font-size:11px;color:var(--gray-500)">Total: ${fmtMoeda(totalParcela)}</span>`
                    }
                </span>
            </div>`);
    }

    const temJuros = juros > 0 && parcelas >= 3;
    const totalMax = subtotal * (1 + juros / 100);

    el.innerHTML = `
        <div style="margin:12px 0 4px;border:1.5px solid var(--gray-200,#e5e7eb);border-radius:10px;padding:12px;background:#fff">
            <p style="font-size:11px;font-weight:700;color:var(--gray-500);margin-bottom:8px;letter-spacing:.5px;text-transform:uppercase">💳 Opções de parcelamento</p>
            <div style="max-height:190px;overflow-y:auto;padding-right:2px">${rows.join('')}</div>
            ${temJuros ? `
            <div style="margin-top:8px;font-size:11px;color:var(--gray-500);border-top:1px solid var(--gray-100);padding-top:6px">
                ⚠️ Juros de <strong>${juros.toFixed(2)}%</strong> a partir de 3 parcelas &nbsp;|&nbsp;
                Subtotal: ${fmtMoeda(subtotal)} → c/ juros: <span style="color:var(--red);font-weight:600">${fmtMoeda(totalMax)}</span>
            </div>` : ''}
        </div>`;
}

// ============================================================
// FORNECEDORES
// ============================================================
async function carregarFornecedores() {
    try {
        const forn = await GET('/fornecedores');
        document.getElementById('tbody-fornecedores').innerHTML = forn.map(f => `
            <tr>
                <td>${f.id}</td>
                <td>${f.nome || ''}</td>
                <td>${f.endereco || ''} ${f.numero ? ', ' + f.numero : ''}</td>
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
    } catch (e) { console.log(e); }
}

async function saveFornecedor() {
    const id = document.getElementById('f-id').value;
    clearAllErrors('modal-fornecedor');
    const nome     = document.getElementById('f-nome').value.trim();
    const telefone = document.getElementById('f-tel').value.trim();
    const endereco = document.getElementById('f-end').value.trim();
    const numero   = document.getElementById('f-num').value.trim();
    const email    = document.getElementById('f-email').value.trim();
    const cnpj     = document.getElementById('f-cnpj').value.trim();
    const cep      = document.getElementById('f-cep').value.trim();
    const bairro   = document.getElementById('f-bairro').value.trim();
    const selCid   = document.getElementById('f-cidade');
    const cidade   = selCid.options[selCid.selectedIndex]?.text || '';

    let ok = true;
    if (!nome || nome.length < 3)                            { setFieldError('f-nome', 'Nome inválido'); ok = false; }
    if (!telefone || telefone.replace(/\D/g,'').length < 10) { setFieldError('f-tel', 'Telefone inválido'); ok = false; }
    if (!endereco)                                           { setFieldError('f-end', 'Endereço é obrigatório'); ok = false; }
    if (!numero)                                             { setFieldError('f-num', 'Número é obrigatório'); ok = false; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError('f-email', 'E-mail inválido'); ok = false; }
    if (cnpj && !validarCNPJ(cnpj))                          { setFieldError('f-cnpj', 'CNPJ inválido'); ok = false; }
    if (cep && cep.replace(/\D/g,'').length !== 8)           { setFieldError('f-cep', 'CEP inválido'); ok = false; }
    if (!bairro)                                             { setFieldError('f-bairro', 'Bairro é obrigatório'); ok = false; }
    if (!selCid.value)                                       { setFieldError('f-cidade', 'Selecione uma cidade'); ok = false; }
    if (!ok) return;

    const dados = { nome, telefone, endereco, numero, email, cnpj, cep, bairro, cidade };
    try {
        let fornId = id;
        if (id) {
            await PUT(`/fornecedores/${id}`, dados);
            showToast('Fornecedor atualizado!');
        } else {
            const res = await POST('/fornecedores', dados);
            fornId = res.id;
            document.getElementById('f-id').value = fornId;
            showToast('Fornecedor salvo! Agora adicione produtos ao catálogo 📦');
        }
        carregarFornecedores();
        catalogoFornecedorAtual = fornId;
        document.getElementById('tab-catalogo').disabled = false;
        trocarAbaForn('catalogo');
        await Promise.all([carregarCatalogoAtual(fornId), carregarProdutosDisponiveis(fornId)]);
    } catch (e) { showToast(e.message || 'Erro ao salvar fornecedor', 'error'); }
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
        Array.from(selCid.options).forEach(o => { if (o.text === f.cidade) selCid.value = o.value; });
        catalogoFornecedorAtual = id;
        document.getElementById('tab-catalogo').disabled = false;
        document.getElementById('modal-fornecedor-title').textContent = 'Editar Fornecedor';
        trocarAbaForn('dados');
        openModal('modal-fornecedor');
    } catch (e) { showToast('Erro ao carregar fornecedor', 'error'); }
}

async function deletarFornecedor(id) {
    if (!confirm('Excluir este fornecedor?')) return;
    try { await DELETE(`/fornecedores/${id}`); carregarFornecedores(); showToast('Fornecedor excluído!', 'info'); }
    catch (e) { showToast('Erro ao excluir fornecedor', 'error'); }
}

// ============================================================
// CATÁLOGO DO FORNECEDOR
// ============================================================
let catalogoFornecedorAtual = null;

async function carregarCatalogoAtual(fornId) {
    try {
        const itens = await GET(`/catalogo/fornecedor/${fornId}`);
        const tbody = document.getElementById('tbody-catalogo');
        const vazio = document.getElementById('catalogo-vazio');
        if (itens.length === 0) { tbody.innerHTML = ''; vazio.style.display = 'block'; return; }
        vazio.style.display = 'none';
        tbody.innerHTML = itens.map(i => `
            <tr style="border-bottom:1px solid var(--gray-100)">
                <td style="padding:10px 12px;font-weight:600;color:var(--navy);font-size:13px">${i.produto_nome}</td>
                <td style="padding:10px 8px;font-weight:700;color:var(--green);font-size:13px">${fmtMoeda(i.preco_custo)}</td>
                <td style="padding:10px 8px;font-size:13px;color:var(--blue);font-weight:600">${i.estoque}</td>
                <td style="padding:8px">
                    <button onclick="removerDoCatalogo('${i.id}','${i.produto_nome}')"
                        style="background:var(--red);color:white;border:none;border-radius:6px;width:28px;height:28px;cursor:pointer">🗑️</button>
                </td>
            </tr>`).join('');
    } catch (e) { console.log(e); }
}

async function carregarProdutosDisponiveis(fornId) {
    try {
        const produtos = await GET(`/catalogo/fornecedor/${fornId}/disponiveis`);
        const tbody = document.getElementById('tbody-disp');
        if (produtos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="padding:20px;text-align:center;color:var(--gray-400);font-size:13px">Todos os produtos já estão no catálogo</td></tr>`;
            return;
        }
        tbody.innerHTML = produtos.map(p => `
            <tr style="border-bottom:1px solid var(--gray-100)">
                <td style="padding:10px 12px;font-weight:600;font-size:13px">${p.nome}</td>
                <td style="padding:6px 8px">
                    <input type="number" min="0.01" step="0.01" id="preco-disp-${p.id}" placeholder="0.00"
                        value="${Number(p.preco || 0).toFixed(2)}"
                        style="width:90px;padding:5px 7px;border:1px solid var(--gray-200);border-radius:6px;font-size:13px">
                </td>
                <td style="padding:6px 8px">
                    <button onclick="adicionarAoCatalogo('${p.id}','${p.nome}')"
                        style="background:var(--blue);color:white;border:none;border-radius:8px;padding:5px 12px;cursor:pointer;font-size:13px;font-weight:700">+ Add</button>
                </td>
            </tr>`).join('');
    } catch (e) { console.log(e); }
}

async function adicionarAoCatalogo(produtoId, produtoNome) {
    const precoEl = document.getElementById(`preco-disp-${produtoId}`);
    const preco   = Number(precoEl?.value);
    if (!preco || preco <= 0) { showToast('Informe o preço de custo!', 'error'); precoEl?.focus(); return; }
    try {
        await POST('/catalogo', { fornecedor_id: catalogoFornecedorAtual, produto_id: produtoId, preco_custo: preco });
        showToast(`${produtoNome} adicionado ao catálogo!`);
        await Promise.all([carregarCatalogoAtual(catalogoFornecedorAtual), carregarProdutosDisponiveis(catalogoFornecedorAtual)]);
    } catch (e) { showToast(e.message || 'Erro ao adicionar', 'error'); }
}

async function removerDoCatalogo(id, nome) {
    if (!confirm(`Remover "${nome}" do catálogo?`)) return;
    try {
        await DELETE(`/catalogo/${id}`);
        showToast(`${nome} removido do catálogo`, 'info');
        await Promise.all([carregarCatalogoAtual(catalogoFornecedorAtual), carregarProdutosDisponiveis(catalogoFornecedorAtual)]);
    } catch (e) { showToast('Erro ao remover', 'error'); }
}

// ============================================================
// ABAS DO MODAL FORNECEDOR
// ============================================================
function trocarAbaForn(aba) {
    const dados    = document.getElementById('forn-aba-dados');
    const catalogo = document.getElementById('forn-aba-catalogo');
    const fDados   = document.getElementById('forn-footer-dados');
    const fCat     = document.getElementById('forn-footer-catalogo');
    const tDados   = document.getElementById('tab-dados');
    const tCat     = document.getElementById('tab-catalogo');

    if (aba === 'dados') {
        dados.style.display    = '';    catalogo.style.display = 'none';
        fDados.style.display   = '';    fCat.style.display     = 'none';
        tDados.classList.add('active'); tCat.classList.remove('active');
    } else {
        dados.style.display    = 'none'; catalogo.style.display = 'flex';
        fDados.style.display   = 'none'; fCat.style.display     = '';
        tDados.classList.remove('active'); tCat.classList.add('active');
        if (catalogoFornecedorAtual) {
            carregarCatalogoAtual(catalogoFornecedorAtual);
            carregarProdutosDisponiveis(catalogoFornecedorAtual);
        }
    }
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
carregarClientes();
