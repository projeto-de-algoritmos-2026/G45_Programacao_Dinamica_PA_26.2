// Dados e textos da parte didática: linhas da tabela da PD, roteiro do passo a passo e escala da linha do tempo.
// Não usa nada do navegador: a interface só desenha o que sai daqui, e os testes conferem os textos no Node.
import { minutosParaHorario } from './tarefa.js';

export const formatarValor = (valor) => valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

const horarioDe = (tarefa) => `${minutosParaHorario(tarefa.inicio)}–${minutosParaHorario(tarefa.fim)}`;

// Uma linha por tarefa j (1..n), na ordem por término:
// pegar = valor(j) + M[p(j)], pular = M[j-1], decisaoNaPD = qual lado do max venceu,
// naAgenda = se a tarefa entrou na resposta final (definido pela reconstrução, não pelo max da linha).
export function linhasDaTabela(resultado) {
  const { tarefas, p, M, indicesEscolhidos } = resultado;
  const escolhidos = new Set(indicesEscolhidos);
  return tarefas.map((tarefa, i) => {
    const j = i + 1;
    const pegar = tarefa.valor + M[p[j]];
    const pular = M[j - 1];
    return {
      j,
      tarefa,
      p: p[j],
      pegar,
      pular,
      M: M[j],
      decisaoNaPD: pegar > pular ? 'pega' : pegar < pular ? 'pula' : 'empate',
      naAgenda: escolhidos.has(j),
    };
  });
}

function textoPreenchimento(linha, resultado) {
  const { j, tarefa, p, pegar, pular, M } = linha;
  const v = formatarValor;
  const inicio = minutosParaHorario(tarefa.inicio);
  const compativel =
    p === 0
      ? `Nenhuma tarefa termina até ${inicio}, então p(${j}) = 0.`
      : `A última tarefa que termina até ${inicio} é "${resultado.tarefas[p - 1].nome}", então p(${j}) = ${p}.`;
  const conclusao =
    linha.decisaoNaPD === 'pega'
      ? 'pegar vale mais.'
      : linha.decisaoNaPD === 'pula'
        ? 'pular vale mais.'
        : 'empate: os dois lados dão o mesmo valor.';
  return (
    `j = ${j}: "${tarefa.nome}" (${horarioDe(tarefa)}, valor ${v(tarefa.valor)}). ${compativel} ` +
    `Pegar: ${v(tarefa.valor)} + M[${p}] = ${v(tarefa.valor)} + ${v(resultado.M[p])} = ${v(pegar)}. ` +
    `Pular: M[${j - 1}] = ${v(pular)}. ` +
    `M[${j}] = max(${v(pegar)}, ${v(pular)}) = ${v(M)}: ${conclusao}`
  );
}

function textoReconstrucao(passo, linha) {
  const { j, escolhe } = passo;
  const v = formatarValor;
  const conta = `${v(linha.tarefa.valor)} + M[${linha.p}] = ${v(linha.pegar)}`;
  return escolhe
    ? `Volta em j = ${j} ("${linha.tarefa.nome}"): ${conta} ≥ M[${j - 1}] = ${v(linha.pular)}, ` +
        `então a tarefa entra na agenda e a volta continua em p(${j}) = ${linha.p}.`
    : `Volta em j = ${j} ("${linha.tarefa.nome}"): ${conta} < M[${j - 1}] = ${v(linha.pular)}, ` +
        `então a tarefa fica de fora e a volta continua em j - 1 = ${j - 1}.`;
}

// Roteiro do passo a passo: primeiro M[0], depois uma etapa por j preenchendo a tabela,
// depois uma etapa por passo da reconstrução (de j = n para trás) e, por fim, o resumo.
// Cada etapa traz a fase, o j em destaque, o j de referência (p(j) no preenchimento) e o texto.
export function roteiro(resultado) {
  const linhas = linhasDaTabela(resultado);
  const n = linhas.length;
  const etapas = [
    {
      fase: 'preenchimento',
      j: 0,
      referencia: null,
      texto: 'M[0] = 0: sem nenhuma tarefa, o melhor valor possível é zero. As tarefas estão ordenadas por término.',
    },
  ];
  for (const linha of linhas) {
    etapas.push({ fase: 'preenchimento', j: linha.j, referencia: linha.p, texto: textoPreenchimento(linha, resultado) });
  }
  resultado.passos.forEach((passo, k) => {
    etapas.push({
      fase: 'reconstrucao',
      j: passo.j,
      referencia: passo.escolhe ? linhas[passo.j - 1].p : passo.j - 1,
      ate: k, // quantos passos da reconstrução já aconteceram, incluindo este (índice)
      texto: textoReconstrucao(passo, linhas[passo.j - 1]),
    });
  });
  const nomes = resultado.escolhidas.map((t) => `"${t.nome}"`).join(', ');
  etapas.push({
    fase: 'fim',
    j: null,
    referencia: null,
    texto:
      n === 0
        ? 'Sem tarefas, a agenda fica vazia.'
        : `Chegou em j = 0. Agenda: ${nomes}. Soma = ${formatarValor(resultado.valorMaximo)} = M[${n}].`,
  });
  return etapas;
}

// Janela de horário da linha do tempo, arredondada para horas cheias, e as marcas do eixo.
export function escalaDoDia(tarefas) {
  if (tarefas.length === 0) return { inicio: 0, fim: 60, marcas: [0, 60] };
  const inicio = Math.floor(Math.min(...tarefas.map((t) => t.inicio)) / 60) * 60;
  const ultimoFim = Math.max(...tarefas.map((t) => t.fim));
  const horas = Math.max(1, Math.ceil((ultimoFim - inicio) / 60));
  const passo = horas <= 8 ? 60 : horas <= 16 ? 120 : 180;
  // O fim da janela cai numa marca, para o eixo terminar alinhado.
  const fim = inicio + Math.ceil((ultimoFim - inicio) / passo) * passo || inicio + passo;
  const marcas = [];
  for (let m = inicio; m <= fim; m += passo) marcas.push(m);
  return { inicio, fim, marcas };
}
