// Algoritmo do agendador (Weighted Interval Scheduling).
// Não usa nada do navegador: roda igual no browser e nos testes do Node.

// Devolve uma cópia das tarefas ordenada pelo horário de término (crescente).
// A ordenação é estável: tarefas que terminam juntas mantêm a ordem em que foram dadas.
export function ordenarPorTermino(tarefas) {
  return [...tarefas].sort((a, b) => a.fim - b.fim);
}

// p(j): índice (1-based) da última tarefa que termina antes, ou exatamente quando, a tarefa j começa,
// ou seja, a última tarefa compatível com j. Vale 0 se não existe.
// Recebe as tarefas já ordenadas por término e devolve um vetor `p` com tarefas.length + 1 posições,
// em que p[j] corresponde à j-ésima tarefa (p[0] = 0 é só para os índices baterem com os da PD).
// Cada p(j) sai de uma busca binária sobre os términos: O(n log n) no total.
export function calcularP(ordenadas) {
  const p = new Array(ordenadas.length + 1).fill(0);
  for (let j = 1; j <= ordenadas.length; j++) {
    const inicio = ordenadas[j - 1].inicio;
    // Entre as j-1 tarefas anteriores (ordenadas por fim), as que terminam até o início de j formam um prefixo.
    // A busca binária acha o tamanho desse prefixo, que é exatamente o índice (1-based) da última compatível.
    let baixo = 0;
    let alto = j - 1;
    while (baixo < alto) {
      const meio = (baixo + alto) >> 1;
      if (ordenadas[meio].fim <= inicio) baixo = meio + 1;
      else alto = meio;
    }
    p[j] = baixo;
  }
  return p;
}

// Ordena por término e calcula p(j): é tudo o que a PD precisa receber.
export function prepararTarefas(tarefas) {
  const ordenadas = ordenarPorTermino(tarefas);
  return { tarefas: ordenadas, p: calcularP(ordenadas) };
}

// PD bottom-up. M[j] = maior valor total usando só as j primeiras tarefas (ordenadas por término):
//   M[0] = 0
//   M[j] = max( valor(j) + M[p(j)],   pega a tarefa j
//               M[j-1] )              pula a tarefa j
// Cada M[j] só depende de posições menores, então basta preencher de 1 a n: O(n) de tempo e de espaço.
export function calcularTabela(ordenadas, p) {
  const M = new Array(ordenadas.length + 1).fill(0);
  for (let j = 1; j <= ordenadas.length; j++) {
    M[j] = Math.max(ordenadas[j - 1].valor + M[p[j]], M[j - 1]);
  }
  return M;
}

// Mesma recorrência, top-down: recursão com memoização (versão didática, para comparar com a bottom-up).
// Cada OPT(j) é calculado uma vez só, então também é O(n), mas a recursão chega a n níveis de profundidade
// e estoura a pilha para listas muito grandes; por isso o agendador usa a versão bottom-up.
// Devolve a tabela preenchida e quantas vezes OPT foi chamado (para mostrar o efeito da memoização).
export function calcularTabelaMemo(ordenadas, p) {
  const M = new Array(ordenadas.length + 1).fill(undefined);
  M[0] = 0;
  let chamadas = 0;
  const opt = (j) => {
    chamadas++;
    if (M[j] === undefined) M[j] = Math.max(ordenadas[j - 1].valor + opt(p[j]), opt(j - 1));
    return M[j];
  };
  opt(ordenadas.length);
  return { M, chamadas };
}

// Reconstrói quais tarefas formam o ótimo, só lendo a tabela M (sem recalcular a PD).
// Anda de j = n para trás: se pegar j é pelo menos tão bom quanto pular, j entra e o próximo é p(j);
// senão, pula para j - 1. Cada passo diminui j, então é O(n).
// Devolve os índices (1-based) escolhidos em ordem crescente, que é a ordem cronológica, e os passos
// do caminho (j visitado e se a tarefa foi escolhida), para a visualização destacar o traceback.
export function reconstruir(ordenadas, p, M) {
  const indices = [];
  const passos = [];
  let j = ordenadas.length;
  while (j > 0) {
    const escolhe = ordenadas[j - 1].valor + M[p[j]] >= M[j - 1];
    passos.push({ j, escolhe });
    if (escolhe) {
      indices.push(j);
      j = p[j];
    } else {
      j = j - 1;
    }
  }
  return { indices: indices.reverse(), passos };
}

// Weighted Interval Scheduling completo: recebe as tarefas em qualquer ordem e devolve
// as tarefas ordenadas, p, a tabela M, o valor máximo (M[n]), as tarefas escolhidas em ordem
// cronológica (com seus índices) e os passos da reconstrução.
// Complexidade: O(n log n), por causa da ordenação e das n buscas binárias do p(j); a PD e a reconstrução são O(n).
export function agendar(tarefas) {
  const { tarefas: ordenadas, p } = prepararTarefas(tarefas);
  const M = calcularTabela(ordenadas, p);
  const { indices, passos } = reconstruir(ordenadas, p, M);
  return {
    tarefas: ordenadas,
    p,
    M,
    valorMaximo: M[ordenadas.length],
    escolhidas: indices.map((j) => ordenadas[j - 1]),
    indicesEscolhidos: indices,
    passos,
  };
}
