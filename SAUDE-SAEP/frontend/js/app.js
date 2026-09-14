const API = ''; 

const state = {
  usuario: JSON.parse(localStorage.getItem('saep_usuario') || 'null'),
  view: 'feed',      // 'feed' | 'minhas'
  filtro: null,       // 'corrida' | 'caminhada' | 'trilha' | null
  pagina: 1,
  comentariosAbertos: new Set(),
};

const elPerfil = document.getElementById('perfil');
const elBtnLoginLogout = document.getElementById('btnLoginLogout');
const elFiltros = document.getElementById('filtros');
const elLista = document.getElementById('listaAtividades');
const elPaginacao = document.getElementById('paginacao');
const elCriarAtividade = document.getElementById('criarAtividade');
const elFormAtividade = document.getElementById('formAtividade');
const elModalLogin = document.getElementById('modalLogin');
const elFormLogin = document.getElementById('formLogin');
const elToast = document.getElementById('toast');

function mostrarToast(msg) {
  elToast.textContent = msg;
  elToast.classList.remove('oculto');
  setTimeout(() => elToast.classList.add('oculto'), 2600);
}

function formatarData(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const dd = pad(d.getDate());
  const mo = pad(d.getMonth() + 1);
  const yy = String(d.getFullYear()).slice(-2);
  return `${hh}:${mm} - ${dd}/${mo}/${yy}`;
}

function limparErros(form) {
  form.querySelectorAll('.erro-campo').forEach((e) => (e.textContent = ''));
  form.querySelectorAll('.campo-erro').forEach((e) => e.classList.remove('campo-erro'));
}

function abrirModalLogin() {
  elModalLogin.classList.remove('oculto');
}
function fecharModalLogin() {
  elModalLogin.classList.add('oculto');
  elFormLogin.reset();
  limparErros(elFormLogin);
}

async function renderPerfil() {
  if (state.usuario) {
    try {
      const resp = await fetch(`${API}/api/usuarios/${state.usuario.id}`);
      const dados = await resp.json();
      elPerfil.innerHTML = `
        <div class="perfil-topo">
          <img class="perfil-logo" src="img/${dados.foto || 'default-user.png'}" alt="${dados.nome}">
          <p class="perfil-nome">${dados.nome}</p>
        </div>
        <div class="perfil-stats">
          <div class="perfil-stat"><strong>${dados.qtd_atividades}</strong><span>Qtd. Atividades</span></div>
          <div class="perfil-stat"><strong>${dados.qtd_calorias}</strong><span>Qtd. Calorias</span></div>
        </div>
        <button class="btn-atividade ${state.view === 'minhas' ? 'ativo' : ''}" id="btnAtividade">Atividade</button>
        <div class="perfil-rodape">
          ${rodapeHtml()}
        </div>`;
      document.getElementById('btnAtividade').addEventListener('click', () => {
        state.view = state.view === 'minhas' ? 'feed' : 'minhas';
        state.pagina = 1;
        renderPerfil();
        renderMain();
      });
    } catch (e) {
      console.error(e);
    }
  } else {
    try {
      const resp = await fetch(`${API}/api/empresa`);
      const dados = await resp.json();
      elPerfil.innerHTML = `
        <div class="perfil-topo">
          <img class="perfil-logo" src="img/${dados.logo || 'SAEPSaude.png'}" alt="${dados.nome}">
          <p class="perfil-nome">${dados.nome}</p>
        </div>
        <div class="perfil-stats">
          <div class="perfil-stat"><strong>${dados.qtd_atividades}</strong><span>Qtd. Atividades</span></div>
          <div class="perfil-stat"><strong>${dados.qtd_calorias}</strong><span>Qtd. Calorias</span></div>
        </div>
        <button class="btn-atividade" id="btnAtividade" disabled>Atividade</button>
        <div class="perfil-rodape">
          ${rodapeHtml()}
        </div>`;
      // Regra 3 do item 1.1: botão Atividades desabilitado para não logados
      document.getElementById('btnAtividade').addEventListener('click', abrirModalLogin);
    } catch (e) {
      console.error(e);
    }
  }
}

function rodapeHtml() {
  return `
    <p>SAEPSaúde</p>
    <div class="redes">
      <a href="#"><img src="img/instagram.svg" alt="Instagram"></a>
      <a href="#"><img src="img/twitter.svg" alt="Twitter"></a>
      <a href="#"><img src="img/tiktok.svg" alt="TikTok"></a>
    </div>
    <small>Copyright - 2025/2026</small>`;
}

function renderHeaderBotao() {
  elBtnLoginLogout.textContent = state.usuario ? 'Logout' : 'Login';
}

function fazerLogout() {
  state.usuario = null;
  state.view = 'feed';
  state.pagina = 1;
  localStorage.removeItem('saep_usuario');
  renderHeaderBotao();
  renderPerfil();
  renderMain();
}

function renderFiltros() {
  elFiltros.querySelectorAll('.filtro').forEach((btn) => {
    btn.classList.toggle('selecionado', state.filtro === btn.dataset.tipo);
    btn.disabled = !state.usuario; // Regra 8 do item 1.1
  });
}

elFiltros.addEventListener('click', (ev) => {
  const btn = ev.target.closest('.filtro');
  if (!btn) return;
  if (!state.usuario) {
    abrirModalLogin(); 
    return;
  }
  const tipo = btn.dataset.tipo;
  state.filtro = state.filtro === tipo ? null : tipo;
  state.pagina = 1;
  renderFiltros();
  carregarAtividades();
});

function renderMain() {
  renderFiltros();
  if (state.view === 'minhas' && state.usuario) {
    elCriarAtividade.classList.remove('oculto');
  } else {
    elCriarAtividade.classList.add('oculto');
  }
  carregarAtividades();
}

async function carregarAtividades() {
  const params = new URLSearchParams();
  params.set('page', state.pagina);
  if (state.view === 'minhas' && state.usuario) {
    params.set('usuario_id', state.usuario.id);
  } else if (state.filtro) {
    params.set('tipo', state.filtro);
  }
  if (state.usuario) params.set('usuarioLogadoId', state.usuario.id);

  try {
    const resp = await fetch(`${API}/api/atividades?${params.toString()}`);
    const dados = await resp.json();
    renderListaAtividades(dados.atividades);
    renderPaginacao(dados.pagina, dados.totalPaginas);
  } catch (e) {
    console.error(e);
    elLista.innerHTML = '<p class="lista-vazia">Não foi possível carregar as atividades.</p>';
  }
}

function renderListaAtividades(atividades) {
  if (!atividades || atividades.length === 0) {
    elLista.innerHTML = '<p class="lista-vazia">Nenhuma atividade encontrada.</p>';
    return;
  }

  elLista.innerHTML = atividades.map((a) => cardAtividadeHtml(a)).join('');

  // Eventos de like
  elLista.querySelectorAll('.btn-like').forEach((btn) => {
    btn.addEventListener('click', () => curtir(btn.dataset.id));
  });

  // Eventos de abrir/fechar comentários
  elLista.querySelectorAll('.btn-comentar').forEach((btn) => {
    btn.addEventListener('click', () => alternarComentarios(btn.dataset.id));
  });

  // Formulários de comentário (para atividades já com a caixa aberta)
  elLista.querySelectorAll('.form-comentario').forEach((form) => {
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      enviarComentario(form.dataset.id, form.querySelector('input'));
    });
  });
}

function cardAtividadeHtml(a) {
  const coracaoClass = a.curtido_por_mim ? 'icone-vermelho' : '';
  const comentariosAberto = state.comentariosAbertos.has(String(a.id));

  return `
    <article class="atividade-card" data-id="${a.id}">
      <div class="atividade-topo">
        <img class="foto-usuario" src="img/${a.usuario_foto || 'default-user.png'}" alt="${a.usuario_nome}">
        <div class="atividade-titulo">${a.tipo}</div>
        <div class="atividade-data">${formatarData(a.criado_em)}</div>
      </div>
      <div class="atividade-usuario">${a.usuario_nome}</div>
      <div class="atividade-metricas">
        <div><b>${a.distancia_km} km</b>Distância</div>
        <div><b>${a.duracao_minutos} min</b>Duração</div>
        <div><b>${a.calorias}</b>Calorias</div>
      </div>
      <div class="atividade-interacoes">
        <button class="btn-interacao btn-like" data-id="${a.id}">
          <img src="img/coracao.svg" class="${coracaoClass}" alt="Curtir"> ${a.qtd_likes}
        </button>
        <button class="btn-interacao btn-comentar" data-id="${a.id}">
          <img src="img/chat.svg" alt="Comentar"> ${a.qtd_comentarios}
        </button>
      </div>
      <div class="caixa-comentarios ${comentariosAberto ? '' : 'oculto'}" data-caixa="${a.id}">
        <div class="lista-comentarios" data-lista-comentarios="${a.id}"></div>
        <form class="form-comentario" data-id="${a.id}">
          <input type="text" placeholder="Escrever comentário...">
          <button type="submit"><img src="img/send.svg" alt="Enviar"></button>
        </form>
        <div class="aviso-comentario" data-aviso="${a.id}"></div>
      </div>
    </article>`;
}

async function curtir(atividadeId) {
  if (!state.usuario) {
    abrirModalLogin(); // Regra 8 do item 1.1
    return;
  }
  try {
    const resp = await fetch(`${API}/api/atividades/${atividadeId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: state.usuario.id }),
    });
    const dados = await resp.json();
    if (!resp.ok) return mostrarToast(dados.mensagem || 'Erro ao curtir');

    const btn = elLista.querySelector(`.btn-like[data-id="${atividadeId}"]`);
    const img = btn.querySelector('img');
    img.classList.toggle('icone-vermelho', dados.curtido);
    btn.lastChild.textContent = ` ${dados.qtd_likes}`;
  } catch (e) {
    console.error(e);
  }
}

async function alternarComentarios(atividadeId) {
  if (!state.usuario) {
    abrirModalLogin(); // Regra 8 do item 1.1
    return;
  }
  const caixa = elLista.querySelector(`[data-caixa="${atividadeId}"]`);
  const abrindo = caixa.classList.contains('oculto');
  caixa.classList.toggle('oculto');

  if (abrindo) {
    state.comentariosAbertos.add(String(atividadeId));
    await carregarComentarios(atividadeId);
  } else {
    state.comentariosAbertos.delete(String(atividadeId));
  }
}

async function carregarComentarios(atividadeId) {
  const listaEl = elLista.querySelector(`[data-lista-comentarios="${atividadeId}"]`);
  try {
    const resp = await fetch(`${API}/api/atividades/${atividadeId}/comentarios`);
    const comentarios = await resp.json();
    listaEl.innerHTML = comentarios
      .map((c) => `<p class="comentario-item"><strong>${c.usuario_nome}:</strong>${c.texto}</p>`)
      .join('') || '<p class="comentario-item" style="color:#999">Nenhum comentário ainda.</p>';
  } catch (e) {
    console.error(e);
  }
}

async function enviarComentario(atividadeId, inputEl) {
  const avisoEl = elLista.querySelector(`[data-aviso="${atividadeId}"]`);
  avisoEl.textContent = '';
  const texto = inputEl.value;

  try {
    const resp = await fetch(`${API}/api/atividades/${atividadeId}/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: state.usuario.id, texto }),
    });
    const dados = await resp.json();

    if (!resp.ok) {
      // Regras 4.2/4.3 do item 1.4
      avisoEl.textContent = dados.mensagem;
      return;
    }

    inputEl.value = '';
    await carregarComentarios(atividadeId);
    const btnComentar = elLista.querySelector(`.btn-comentar[data-id="${atividadeId}"]`);
    btnComentar.lastChild.textContent = ` ${dados.qtd_comentarios}`; // Regra 4.5
  } catch (e) {
    console.error(e);
  }
}

function renderPaginacao(paginaAtual, totalPaginas) {
  const botoes = [];
  botoes.push(`<button data-pagina="${paginaAtual - 1}" ${paginaAtual <= 1 ? 'disabled' : ''}>Anterior</button>`);
  for (let p = 1; p <= totalPaginas; p += 1) {
    botoes.push(`<button data-pagina="${p}" class="${p === paginaAtual ? 'ativa' : ''}">${p}</button>`);
  }
  botoes.push(`<button data-pagina="${paginaAtual + 1}" ${paginaAtual >= totalPaginas ? 'disabled' : ''}>Próximo</button>`);
  elPaginacao.innerHTML = botoes.join('');

  elPaginacao.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.view !== 'minhas' && !state.usuario) {
        // Regra 8 do item 1.1: paginação exige login no feed público
        abrirModalLogin();
        return;
      }
      state.pagina = Number(btn.dataset.pagina);
      carregarAtividades();
    });
  });
}

elBtnLoginLogout.addEventListener('click', () => {
  if (state.usuario) {
    fazerLogout();
  } else {
    abrirModalLogin();
  }
});

document.getElementById('btnFecharModal').addEventListener('click', fecharModalLogin);
document.getElementById('btnCancelarLogin').addEventListener('click', fecharModalLogin);

elFormLogin.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  limparErros(elFormLogin);

  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value;

  if (!email || !senha) {
    if (!email) marcarCampoErro('loginEmail', 'email', 'email ou senha obrigatório');
    if (!senha) marcarCampoErro('loginSenha', 'senha', 'email ou senha obrigatório');
    return;
  }

  try {
    const resp = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const dados = await resp.json();

    if (!resp.ok) {
      // Regra 5 do item 1.2: credenciais incorretas
      marcarCampoErro('loginEmail', 'email', dados.mensagem);
      marcarCampoErro('loginSenha', 'senha', dados.mensagem);
      return;
    }

    state.usuario = dados;
    localStorage.setItem('saep_usuario', JSON.stringify(dados));
    fecharModalLogin();
    renderHeaderBotao();
    await renderPerfil();
    renderMain();
    mostrarToast(`Bem-vindo(a), ${dados.nome}!`);
  } catch (e) {
    console.error(e);
    mostrarToast('Erro ao tentar fazer login.');
  }
});

function marcarCampoErro(inputId, erroKey, mensagem) {
  document.getElementById(inputId).classList.add('campo-erro');
  const erroEl = elFormLogin.querySelector(`[data-erro="${erroKey}"]`);
  if (erroEl) erroEl.textContent = mensagem;
}

// -------------------- criar atividade --------------------
elFormAtividade.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  limparErrosAtividade();

  const tipo = document.getElementById('campoTipo').value;
  const distancia = document.getElementById('campoDistancia').value;
  const duracao = document.getElementById('campoDuracao').value;
  const calorias = document.getElementById('campoCalorias').value;

  let temErro = false;
  if (!tipo) { marcarErroAtividade('campoTipo', 'tipo', 'Campo obrigatório'); temErro = true; }
  if (distancia === '') { marcarErroAtividade('campoDistancia', 'distancia', 'Campo obrigatório'); temErro = true; }
  if (duracao === '') { marcarErroAtividade('campoDuracao', 'duracao', 'Campo obrigatório'); temErro = true; }
  if (calorias === '') { marcarErroAtividade('campoCalorias', 'calorias', 'Campo obrigatório'); temErro = true; }
  if (temErro) return; // Regra 5.1 do item 1.5

  try {
    const resp = await fetch(`${API}/api/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: state.usuario.id,
        tipo,
        distancia_metros: Number(distancia),
        duracao_minutos: Number(duracao),
        calorias: Number(calorias),
      }),
    });
    const dados = await resp.json();
    if (!resp.ok) return mostrarToast(dados.mensagem || 'Erro ao criar atividade');

    elFormAtividade.reset();
    state.pagina = 1;
    await carregarAtividades(); 
    await renderPerfil();      
    mostrarToast('Atividade criada com sucesso!');
  } catch (e) {
    console.error(e);
  }
});

function limparErrosAtividade() {
  elFormAtividade.querySelectorAll('.erro-campo').forEach((e) => (e.textContent = ''));
  elFormAtividade.querySelectorAll('.campo-erro').forEach((e) => e.classList.remove('campo-erro'));
}
function marcarErroAtividade(inputId, erroKey, mensagem) {
  document.getElementById(inputId).classList.add('campo-erro');
  const erroEl = elFormAtividade.querySelector(`[data-erro="${erroKey}"]`);
  if (erroEl) erroEl.textContent = mensagem;
}

(async function init() {
  renderHeaderBotao();
  await renderPerfil();
  renderMain();
})();