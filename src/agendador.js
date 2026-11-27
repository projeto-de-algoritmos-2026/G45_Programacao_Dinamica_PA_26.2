// Algoritmo do agendador (Weighted Interval Scheduling).
// Não usa nada do navegador: roda igual no browser e nos testes do Node.
// PD: issue #4 · reconstrução: issue #5

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
