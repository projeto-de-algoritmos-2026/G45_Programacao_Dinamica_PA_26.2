// Desenho da parte didática: linha do tempo, tabela da PD e comparação com o guloso.
// `etapa` é uma etapa do roteiro (src/explicacao.js) ou null para mostrar o resultado completo.
import { escalaDoDia, formatarValor } from './explicacao.js';
import { minutosParaHorario } from './tarefa.js';

function criar(tag, texto, classe) {
  const el = document.createElement(tag);
  if (texto !== undefined) el.textContent = texto;
  if (classe) el.className = classe;
  return el;
}

const horarioDe = (tarefa) => `${minutosParaHorario(tarefa.inicio)}–${minutosParaHorario(tarefa.fim)}`;

// Passos da reconstrução que já aconteceram na etapa (todos, se a etapa é o fim ou o resultado completo).
function passosFeitos(resultado, etapa) {
  if (!etapa || etapa.fase === 'fim') return resultado.passos;
  if (etapa.fase === 'reconstrucao') return resultado.passos.slice(0, etapa.ate + 1);
  return [];
}

// Como a barra da tarefa j aparece na linha do tempo nesta etapa.
function classeDaBarra(j, resultado, etapa) {
  if (!etapa || etapa.fase === 'fim') return resultado.indicesEscolhidos.includes(j) ? 'escolhida' : 'fora';
  if (j === etapa.j) return 'atual';
  if (j === etapa.referencia) return 'referencia';
  if (etapa.fase === 'preenchimento') return j > etapa.j ? 'pendente' : '';
  return passosFeitos(resultado, etapa).some((s) => s.j === j && s.escolhe) ? 'escolhida' : '';
}

export function desenharLinhaDoTempo(container, resultado, etapa) {
  const escala = escalaDoDia(resultado.tarefas);
  const largura = escala.fim - escala.inicio;
  const porcentagem = (minutos) => `${((minutos - escala.inicio) / largura) * 100}%`;

  const marcas = () =>
    escala.marcas.map((m) => {
      const marca = criar('div', undefined, 'marca');
      marca.style.left = porcentagem(m);
      return marca;
    });

  const eixo = criar('div', undefined, 'faixa eixo');
  const trilhoEixo = criar('div', undefined, 'trilho');
  trilhoEixo.append(
    ...marcas().map((marca, i) => {
      marca.append(criar('span', minutosParaHorario(escala.marcas[i])));
      // Em telas estreitas, só as marcas pares mostram o horário (as outras ficam só como linha).
      if (i % 2 === 1) marca.classList.add('secundaria');
      return marca;
    }),
  );
  eixo.append(criar('span', 'j · tarefa', 'rotulo'), trilhoEixo);

  const faixas = resultado.tarefas.map((tarefa, i) => {
    const j = i + 1;
    const classe = classeDaBarra(j, resultado, etapa);
    const faixa = criar('div', undefined, 'faixa');
    if (classe === 'atual' || classe === 'referencia') faixa.classList.add('em-foco');
    const trilho = criar('div', undefined, 'trilho');
    const barra = criar('div', formatarValor(tarefa.valor), `bloco ${classe}`.trim());
    barra.style.left = porcentagem(tarefa.inicio);
    barra.style.width = `${((tarefa.fim - tarefa.inicio) / largura) * 100}%`;
    barra.title = `${j} · ${tarefa.nome} · ${horarioDe(tarefa)} · valor ${formatarValor(tarefa.valor)}`;
    trilho.append(...marcas(), barra);
    const rotulo = criar('span', `${j} · ${tarefa.nome}`, 'rotulo');
    rotulo.title = tarefa.nome;
    faixa.append(rotulo, trilho);
    return faixa;
  });

  container.replaceChildren(eixo, ...faixas);
}

function celula(texto, classe) {
  return criar('td', texto, classe);
}

export function desenharTabelaPD(corpo, linhas, resultado, etapa) {
  const preenchendo = etapa?.fase === 'preenchimento';
  const feitos = passosFeitos(resultado, etapa);
  const visitados = new Map(feitos.map((s) => [s.j, s.escolhe]));
  const v = formatarValor;

  const linhaZero = document.createElement('tr');
  if (etapa && etapa.j === 0) linhaZero.className = 'atual';
  else if (etapa && etapa.referencia === 0) linhaZero.className = 'referencia';
  linhaZero.append(
    celula('0', 'numero'),
    celula('(nenhuma)', 'pula'),
    celula(''),
    celula(''),
    celula(''),
    celula(''),
    celula(''),
    celula('0', 'numero'),
    celula(''),
  );

  const trs = linhas.map((linha) => {
    const tr = document.createElement('tr');
    const { j } = linha;
    if (etapa && j === etapa.j) tr.className = 'atual';
    else if (etapa && j === etapa.referencia) tr.className = 'referencia';
    else if (visitados.has(j)) tr.className = 'caminho';

    const futura = preenchendo && j > etapa.j;
    const desconhecido = () => celula('?', 'numero vazio-celula');
    const pegar = celula(v(linha.pegar), 'numero');
    const pular = celula(v(linha.pular), 'numero');
    if (linha.decisaoNaPD !== 'pula') pegar.classList.add('vencedor');
    if (linha.decisaoNaPD !== 'pega') pular.classList.add('vencedor');

    let naAgenda;
    if (visitados.has(j)) naAgenda = visitados.get(j) ? celula('✓ entra', 'entra') : celula('pula', 'pula');
    else naAgenda = celula(etapa && etapa.fase !== 'fim' ? '' : '—', 'pula');

    const nome = celula(linha.tarefa.nome, 'nome-tarefa');
    nome.title = linha.tarefa.nome;
    tr.append(
      celula(String(j), 'numero'),
      nome,
      celula(horarioDe(linha.tarefa)),
      celula(v(linha.tarefa.valor), 'numero'),
      celula(String(linha.p), 'numero'),
      futura ? desconhecido() : pegar,
      futura ? desconhecido() : pular,
      futura ? desconhecido() : celula(v(linha.M), 'numero'),
      preenchendo ? celula('') : naAgenda,
    );
    return tr;
  });

  corpo.replaceChildren(linhaZero, ...trs);
}

function cartao(elemento, titulo, solucao, vencedor) {
  const lista = criar('ol');
  lista.append(
    ...solucao.escolhidas.map((tarefa) =>
      criar('li', `${horarioDe(tarefa)} ${tarefa.nome} (valor ${formatarValor(tarefa.valor)})`),
    ),
  );
  elemento.className = vencedor ? 'cartao vencedor' : 'cartao';
  elemento.replaceChildren(
    criar('h3', titulo),
    criar('p', `Valor total: ${formatarValor(solucao.valor)}`, 'valor-cartao'),
    lista,
  );
}

export function desenharComparacao({ cartaoPD, cartaoGuloso, veredito }, resultado, guloso) {
  const pd = { valor: resultado.valorMaximo, escolhidas: resultado.escolhidas };
  const diferenca = pd.valor - guloso.valor;
  cartao(cartaoPD, 'Programação dinâmica', pd, diferenca > 0);
  cartao(cartaoGuloso, 'Guloso (maior valor primeiro)', guloso, false);
  veredito.textContent =
    diferenca > 0
      ? `O guloso ficou ${formatarValor(diferenca)} abaixo da PD: ao pegar primeiro as tarefas de maior valor, ` +
        'ele bloqueou uma combinação que rende mais.'
      : 'Aqui o guloso chegou ao mesmo valor da PD. Nem sempre é assim: no exemplo pronto, ele perde.';
}
