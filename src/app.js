// Interface: lê as tarefas da tela, chama o agendador e mostra o resultado.
import { agendar } from './agendador.js';
import { gulosoPorValor } from './comparacao.js';
import { lerArquivo, lerJSON } from './entrada.js';
import { formatarValor, linhasDaTabela, roteiro } from './explicacao.js';
import { ErroDeValidacao, Tarefa, minutosParaHorario } from './tarefa.js';
import { desenharComparacao, desenharLinhaDoTempo, desenharTabelaPD } from './visualizacao.js';

const EXEMPLO = 'exemplos/exemplo-pequeno.json';
// Acima disso, a linha do tempo e a tabela ficariam enormes; o resultado e a comparação continuam aparecendo.
const LIMITE_VISUALIZACAO = 60;
const INTERVALO_REPRODUCAO = 1600; // ms entre etapas no modo "Reproduzir"

const estado = {
  tarefas: [],
  editando: null, // índice da tarefa em edição, ou null
  resultado: null,
  desatualizado: false,
  linhas: [], // linhas da tabela da PD do último resultado
  roteiro: [], // etapas do passo a passo do último resultado
  guloso: null, // resultado do guloso para as mesmas tarefas
  etapa: null, // índice da etapa do passo a passo, ou null para mostrar tudo
  reproducao: null, // id do setInterval do modo "Reproduzir"
};

const $ = (seletor) => document.querySelector(seletor);
const form = $('#form-tarefa');
const corpoTabela = $('#tabela-tarefas tbody');

const horario = (minutos) => minutosParaHorario(minutos);

function criar(tag, texto, classe) {
  const el = document.createElement(tag);
  if (texto !== undefined) el.textContent = texto;
  if (classe) el.className = classe;
  return el;
}

function mostrarErros(lista, erros) {
  lista.replaceChildren(...erros.map((erro) => criar('li', erro)));
  lista.hidden = erros.length === 0;
}

// As mensagens do modelo citam os campos pelo nome interno ("inicio"); na tela, usa os rótulos do formulário.
const ROTULOS = { '"nome"': 'Nome', '"inicio"': 'Início', '"fim"': 'Fim', '"valor"': 'Valor' };

function mensagensDe(erro) {
  const mensagens = erro instanceof ErroDeValidacao ? erro.erros : [erro.message];
  return mensagens.map((mensagem) => mensagem.replace(/"(nome|inicio|fim|valor)"/g, (campo) => ROTULOS[campo]));
}

// O campo de horário não aceita 24:00; no fim, 00:00 é lido como meia-noite do mesmo dia.
function lerFormulario() {
  const dados = Object.fromEntries(new FormData(form));
  if (dados.fim === '00:00') dados.fim = '24:00';
  return dados;
}

function preencherFormulario(tarefa) {
  form.nome.value = tarefa.nome;
  form.inicio.value = horario(tarefa.inicio);
  form.fim.value = tarefa.fim === 1440 ? '00:00' : horario(tarefa.fim);
  form.valor.value = tarefa.valor;
}

function sairDaEdicao() {
  estado.editando = null;
  form.reset();
  $('#botao-salvar').textContent = 'Adicionar tarefa';
  $('#botao-cancelar').hidden = true;
  mostrarErros($('#erros-form'), []);
}

// Qualquer mudança na lista invalida o resultado mostrado.
function tarefasMudaram() {
  pararReproducao();
  if (estado.resultado) estado.desatualizado = true;
  renderizar();
}

function substituirTarefas(tarefas) {
  pararReproducao();
  sairDaEdicao();
  estado.tarefas = tarefas;
  estado.resultado = null;
  estado.desatualizado = false;
  renderizar();
}

function renderizarTabela() {
  const linhas = estado.tarefas.map((tarefa, i) => {
    const tr = document.createElement('tr');
    if (i === estado.editando) tr.className = 'em-edicao';
    tr.append(
      criar('td', tarefa.nome),
      criar('td', horario(tarefa.inicio)),
      criar('td', horario(tarefa.fim)),
      criar('td', formatarValor(tarefa.valor), 'numero'),
    );
    const acoes = criar('td', undefined, 'acoes-linha');
    const editar = criar('button', 'Editar');
    editar.type = 'button';
    editar.addEventListener('click', () => {
      estado.editando = i;
      preencherFormulario(tarefa);
      $('#botao-salvar').textContent = 'Salvar alterações';
      $('#botao-cancelar').hidden = false;
      mostrarErros($('#erros-form'), []);
      renderizar();
      form.nome.focus();
    });
    const remover = criar('button', 'Remover', 'perigo');
    remover.type = 'button';
    remover.addEventListener('click', () => {
      estado.tarefas.splice(i, 1);
      if (estado.editando === i) sairDaEdicao();
      else if (estado.editando !== null && estado.editando > i) estado.editando--;
      tarefasMudaram();
    });
    acoes.append(editar, remover);
    tr.append(acoes);
    return tr;
  });
  corpoTabela.replaceChildren(...linhas);
  $('#tabela-tarefas').hidden = estado.tarefas.length === 0;
  $('#sem-tarefas').hidden = estado.tarefas.length > 0;
}

function itemTarefa(tarefa) {
  const li = document.createElement('li');
  li.append(
    criar('span', `${horario(tarefa.inicio)}–${horario(tarefa.fim)}`, 'horario'),
    criar('span', tarefa.nome, 'nome'),
    criar('span', formatarValor(tarefa.valor), 'valor'),
  );
  return li;
}

function renderizarResultado() {
  const r = estado.resultado;
  $('#botao-otimizar').disabled = estado.tarefas.length === 0;
  $('#aviso-desatualizado').hidden = !estado.desatualizado;
  $('#resultado').hidden = !r;
  $('#resultado').classList.toggle('desatualizado', estado.desatualizado);
  if (!r) return;

  const escolhidas = new Set(r.escolhidas);
  const descartadas = r.tarefas.filter((tarefa) => !escolhidas.has(tarefa));
  $('#valor-total').textContent = formatarValor(r.valorMaximo);
  $('#resumo').textContent =
    `${r.escolhidas.length} de ${r.tarefas.length} tarefa(s) escolhida(s). ` +
    'Nenhuma outra combinação sem sobreposição soma mais.';
  $('#lista-escolhidas').replaceChildren(...r.escolhidas.map(itemTarefa));
  $('#lista-descartadas').replaceChildren(
    ...(descartadas.length > 0 ? descartadas.map(itemTarefa) : [criar('li', 'Nenhuma: todas couberam na agenda.', 'vazio')]),
  );
}

function pararReproducao() {
  clearInterval(estado.reproducao);
  estado.reproducao = null;
}

function irParaEtapa(indice) {
  estado.etapa = indice === null ? null : Math.max(0, Math.min(indice, estado.roteiro.length - 1));
  renderizarVisualizacao();
}

function renderizarVisualizacao() {
  const r = estado.resultado;
  $('#painel-explicacao').hidden = !r;
  $('#painel-guloso').hidden = !r;
  $('#painel-explicacao').classList.toggle('desatualizado', estado.desatualizado);
  $('#painel-guloso').classList.toggle('desatualizado', estado.desatualizado);
  if (!r) return;

  desenharComparacao(
    { cartaoPD: $('#cartao-pd'), cartaoGuloso: $('#cartao-guloso'), veredito: $('#veredito') },
    r,
    estado.guloso,
  );

  const grande = r.tarefas.length > LIMITE_VISUALIZACAO;
  $('#aviso-limite').hidden = !grande;
  $('#aviso-limite').textContent = grande
    ? `A linha do tempo e a tabela da PD aparecem só com até ${LIMITE_VISUALIZACAO} tarefas ` +
      `(esta agenda tem ${r.tarefas.length}). O resultado acima e a comparação com o guloso continuam completos.`
    : '';
  $('#conteudo-explicacao').hidden = grande;
  if (grande) return;

  const etapa = estado.etapa === null ? null : estado.roteiro[estado.etapa];
  desenharLinhaDoTempo($('#linha-do-tempo'), r, etapa);
  desenharTabelaPD($('#tabela-pd tbody'), estado.linhas, r, etapa);

  const ultima = estado.roteiro.length - 1;
  $('#texto-passo').textContent = etapa
    ? etapa.texto
    : 'Resultado completo: a tabela mostra M[j] de cada tarefa, o lado do max que venceu (em destaque) e quais ' +
      'tarefas a volta de j = n até 0 colocou na agenda. Use "Do início" ou "Próximo" para ver passo a passo.';
  $('#contador-passo').textContent = etapa ? `Etapa ${estado.etapa + 1} de ${ultima + 1}` : '';
  $('#passo-anterior').disabled = estado.etapa === null || estado.etapa === 0;
  $('#passo-proximo').disabled = estado.etapa === ultima;
  $('#passo-tudo').disabled = estado.etapa === null;
  $('#passo-play').textContent = estado.reproducao ? '❚❚ Pausar' : '▶ Reproduzir';
}

function renderizar() {
  renderizarTabela();
  renderizarResultado();
  renderizarVisualizacao();
}

form.addEventListener('submit', (evento) => {
  evento.preventDefault();
  let tarefa;
  try {
    tarefa = new Tarefa(lerFormulario());
  } catch (erro) {
    mostrarErros($('#erros-form'), mensagensDe(erro));
    return;
  }
  if (estado.editando === null) estado.tarefas.push(tarefa);
  else estado.tarefas[estado.editando] = tarefa;
  sairDaEdicao();
  tarefasMudaram();
  form.nome.focus();
});

$('#botao-cancelar').addEventListener('click', () => {
  sairDaEdicao();
  renderizar();
});

$('#botao-exemplo').addEventListener('click', async () => {
  mostrarErros($('#erros-arquivo'), []);
  try {
    const resposta = await fetch(EXEMPLO);
    if (!resposta.ok) throw new Error(`Não foi possível carregar o exemplo (${resposta.status}).`);
    substituirTarefas(lerJSON(await resposta.text()));
  } catch (erro) {
    mostrarErros($('#erros-arquivo'), mensagensDe(erro));
  }
});

$('#arquivo').addEventListener('change', async (evento) => {
  const arquivo = evento.target.files[0];
  evento.target.value = ''; // permite importar o mesmo arquivo de novo
  if (!arquivo) return;
  mostrarErros($('#erros-arquivo'), []);
  try {
    substituirTarefas(lerArquivo(arquivo.name, await arquivo.text()));
  } catch (erro) {
    mostrarErros($('#erros-arquivo'), [`Erro ao importar "${arquivo.name}":`, ...mensagensDe(erro)]);
  }
});

$('#botao-limpar').addEventListener('click', () => {
  mostrarErros($('#erros-arquivo'), []);
  substituirTarefas([]);
});

$('#botao-otimizar').addEventListener('click', () => {
  pararReproducao();
  estado.resultado = agendar(estado.tarefas);
  estado.linhas = linhasDaTabela(estado.resultado);
  estado.roteiro = roteiro(estado.resultado);
  estado.guloso = gulosoPorValor(estado.tarefas);
  estado.etapa = null;
  estado.desatualizado = false;
  renderizar();
});

// Passo a passo: começa no M[0], anda uma etapa por vez e "Ver tudo" volta ao resultado completo.
$('#passo-inicio').addEventListener('click', () => {
  pararReproducao();
  irParaEtapa(0);
});

$('#passo-anterior').addEventListener('click', () => {
  pararReproducao();
  irParaEtapa(estado.etapa - 1);
});

$('#passo-proximo').addEventListener('click', () => {
  pararReproducao();
  irParaEtapa(estado.etapa === null ? 0 : estado.etapa + 1);
});

$('#passo-tudo').addEventListener('click', () => {
  pararReproducao();
  irParaEtapa(null);
});

$('#passo-play').addEventListener('click', () => {
  if (estado.reproducao) {
    pararReproducao();
    renderizarVisualizacao();
    return;
  }
  const ultima = estado.roteiro.length - 1;
  if (estado.etapa === null || estado.etapa === ultima) estado.etapa = 0;
  estado.reproducao = setInterval(() => {
    if (estado.etapa >= ultima) {
      pararReproducao();
      renderizarVisualizacao();
    } else {
      irParaEtapa(estado.etapa + 1);
    }
  }, INTERVALO_REPRODUCAO);
  renderizarVisualizacao();
});

renderizar();
