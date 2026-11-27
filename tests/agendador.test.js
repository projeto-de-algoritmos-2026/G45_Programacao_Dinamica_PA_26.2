import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularP, ordenarPorTermino, prepararTarefas } from '../src/agendador.js';
import { Tarefa, sobrepoe } from '../src/tarefa.js';

// Atalho: tarefa com horários em minutos (ou HH:MM) e valor 1.
const t = (nome, inicio, fim) => new Tarefa({ nome, inicio, fim, valor: 1 });

// Referência ingênua O(n²): maior i < j que não se sobrepõe a j (a lista já está ordenada por término).
function pIngenuo(ordenadas) {
  return [0, ...ordenadas.map((tj, j) => {
    for (let i = j - 1; i >= 0; i--) if (!sobrepoe(ordenadas[i], tj)) return i + 1;
    return 0;
  })];
}

test('ordenarPorTermino ordena pelo fim e não altera a lista original', () => {
  const entrada = [t('C', '10:00', '12:00'), t('A', '08:00', '10:00'), t('B', '09:00', '11:00')];
  const ordenadas = ordenarPorTermino(entrada);
  assert.deepEqual(ordenadas.map((x) => x.nome), ['A', 'B', 'C']);
  assert.deepEqual(entrada.map((x) => x.nome), ['C', 'A', 'B']);
});

test('ordenarPorTermino é estável quando os términos empatam', () => {
  const ordenadas = ordenarPorTermino([t('X', '10:00', '12:00'), t('Y', '09:00', '12:00'), t('Z', '08:00', '09:00')]);
  assert.deepEqual(ordenadas.map((x) => x.nome), ['Z', 'X', 'Y']);
});

test('p(j) do exemplo da issue: A 08-10, B 09-11, C 10-12 -> 0, 0, 1', () => {
  const { tarefas, p } = prepararTarefas([t('A', '08:00', '10:00'), t('B', '09:00', '11:00'), t('C', '10:00', '12:00')]);
  assert.deepEqual(tarefas.map((x) => x.nome), ['A', 'B', 'C']);
  assert.deepEqual(p, [0, 0, 0, 1]);
});

test('p(j) de tarefas que só encostam forma uma cadeia: 0, 1, 2', () => {
  const p = calcularP(ordenarPorTermino([t('A', '08:00', '09:00'), t('B', '09:00', '10:00'), t('C', '10:00', '11:00')]));
  assert.deepEqual(p, [0, 0, 1, 2]);
});

test('p(j) é 0 para todas quando tudo se sobrepõe', () => {
  const p = calcularP(ordenarPorTermino([t('A', '10:00', '12:00'), t('B', '10:00', '12:00'), t('C', '11:00', '12:00')]));
  assert.deepEqual(p, [0, 0, 0, 0]);
});

test('p(j) de um exemplo maior, conferido à mão', () => {
  // (inicio, fim) já ordenados por término: (1,4) (3,5) (0,6) (4,7) (3,9) (5,10) (8,11)
  const pares = [[1, 4], [3, 5], [0, 6], [4, 7], [3, 9], [5, 10], [8, 11]];
  const ordenadas = pares.map(([i, f], k) => t(`T${k + 1}`, i, f));
  assert.deepEqual(calcularP(ordenadas), [0, 0, 0, 0, 1, 0, 2, 4]);
});

test('p(j) escolhe a última compatível quando há várias, mesmo com términos empatados', () => {
  // A e B terminam às 10:00; C começa às 10:00 e é compatível com as duas: p(C) é o índice da última (B).
  const ordenadas = ordenarPorTermino([t('A', '08:00', '10:00'), t('B', '09:00', '10:00'), t('C', '10:00', '11:00')]);
  assert.deepEqual(calcularP(ordenadas), [0, 0, 0, 2]);
});

test('lista vazia e lista com uma tarefa', () => {
  assert.deepEqual(prepararTarefas([]), { tarefas: [], p: [0] });
  assert.deepEqual(calcularP([t('A', '08:00', '09:00')]), [0, 0]);
});

test('p(j) bate com a busca ingênua em listas aleatórias', () => {
  let semente = 12345;
  const aleatorio = (maximo) => {
    semente = (semente * 1103515245 + 12345) % 2147483648;
    return semente % maximo;
  };
  for (let rodada = 0; rodada < 200; rodada++) {
    const n = 1 + aleatorio(40);
    const tarefas = Array.from({ length: n }, (_, k) => {
      const inicio = aleatorio(100);
      return t(`T${k}`, inicio, inicio + 1 + aleatorio(30));
    });
    const ordenadas = ordenarPorTermino(tarefas);
    assert.deepEqual(calcularP(ordenadas), pIngenuo(ordenadas), `rodada ${rodada}`);
  }
});
