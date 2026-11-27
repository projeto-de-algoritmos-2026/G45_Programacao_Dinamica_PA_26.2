import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agendar, calcularTabela, prepararTarefas, reconstruir } from '../src/agendador.js';
import { geradorAleatorio, nomes, semSobreposicao, soma, t } from './apoio.js';

test('exemplo da issue 3 com valores: escolhe A e C', () => {
  const r = agendar([t('C', '10:00', '12:00', 4), t('B', '09:00', '11:00', 7), t('A', '08:00', '10:00', 5)]);
  assert.deepEqual(nomes(r.escolhidas), ['A', 'C']);
  assert.deepEqual(r.indicesEscolhidos, [1, 3]);
  assert.deepEqual(r.passos, [
    { j: 3, escolhe: true },
    { j: 1, escolhe: true },
  ]);
});

test('exemplo maior conferido à mão: escolhe T1, T4 e T7 (2 + 7 + 3 = 12)', () => {
  const dados = [[1, 4, 2], [3, 5, 4], [0, 6, 4], [4, 7, 7], [3, 9, 2], [5, 10, 1], [8, 11, 3]];
  const r = agendar(dados.map(([i, f, v], k) => t(`T${k + 1}`, i, f, v)));
  assert.deepEqual(nomes(r.escolhidas), ['T1', 'T4', 'T7']);
  assert.equal(soma(r.escolhidas), r.valorMaximo);
  // j = 7 entra, p(7) = 4 entra, p(4) = 1 entra, p(1) = 0 para.
  assert.deepEqual(r.passos.map((s) => s.j), [7, 4, 1]);
});

test('o caminho registra as tarefas puladas', () => {
  const r = agendar([t('Grande', '08:00', '12:00', 20), t('1', '08:00', '10:00', 6), t('2', '10:00', '12:00', 6)]);
  assert.deepEqual(nomes(r.escolhidas), ['Grande']);
  // Ordenadas por fim: 1 (10:00), Grande (12:00), 2 (12:00). j = 3 é pulada, j = 2 entra e p(2) = 0.
  assert.deepEqual(r.passos, [
    { j: 3, escolhe: false },
    { j: 2, escolhe: true },
  ]);
});

test('várias tarefas pequenas: escolhe as quatro em ordem cronológica', () => {
  const r = agendar([
    t('4', '11:00', '12:00', 3),
    t('Live longa', '08:00', '12:00', 10),
    t('2', '09:00', '10:00', 3),
    t('1', '08:00', '09:00', 3),
    t('3', '10:00', '11:00', 3),
  ]);
  assert.deepEqual(nomes(r.escolhidas), ['1', '2', '3', '4']);
});

test('em empate entre pegar e pular, pega a tarefa (regra >=)', () => {
  // A e B valem o mesmo e se sobrepõem: o traceback começa em B (último término) e fica com ela.
  const r = agendar([t('A', '08:00', '10:00', 5), t('B', '09:00', '11:00', 5)]);
  assert.deepEqual(nomes(r.escolhidas), ['B']);
});

test('tarefas de valor zero não atrapalham a soma', () => {
  const r = agendar([t('A', '08:00', '09:00', 0), t('B', '09:00', '10:00', 4), t('C', '09:30', '10:30', 0)]);
  assert.equal(soma(r.escolhidas), 4);
  assert.ok(semSobreposicao(r.escolhidas));
});

test('lista vazia não escolhe nada', () => {
  assert.deepEqual(reconstruir([], [0], [0]), { indices: [], passos: [] });
});

test('reconstruir só lê a tabela, sem alterá-la', () => {
  const { tarefas: ordenadas, p } = prepararTarefas([t('A', '08:00', '10:00', 5), t('B', '09:00', '11:00', 7)]);
  const M = calcularTabela(ordenadas, p);
  const copia = [...M];
  reconstruir(ordenadas, p, M);
  assert.deepEqual(M, copia);
});

test('em listas aleatórias, a agenda não tem sobreposição e soma exatamente M[n]', () => {
  const sortear = geradorAleatorio(4242);
  for (let rodada = 0; rodada < 300; rodada++) {
    const tarefas = Array.from({ length: sortear(60) }, (_, k) => {
      const inicio = sortear(96) * 15;
      return t(`T${k}`, inicio, Math.min(1440, inicio + 15 * (1 + sortear(12))), sortear(50));
    });
    const r = agendar(tarefas);
    assert.ok(semSobreposicao(r.escolhidas), `rodada ${rodada}: sobreposição`);
    assert.equal(soma(r.escolhidas), r.valorMaximo, `rodada ${rodada}: soma`);
    for (let i = 1; i < r.escolhidas.length; i++) {
      assert.ok(r.escolhidas[i - 1].fim <= r.escolhidas[i].inicio, `rodada ${rodada}: fora de ordem`);
    }
  }
});

test('com valores decimais, a soma bate com M[n] (até o arredondamento)', () => {
  const sortear = geradorAleatorio(31);
  for (let rodada = 0; rodada < 100; rodada++) {
    const tarefas = Array.from({ length: 1 + sortear(30) }, (_, k) => {
      const inicio = sortear(1000);
      return t(`T${k}`, inicio, inicio + 1 + sortear(200), sortear(1000) / 100);
    });
    const r = agendar(tarefas);
    assert.ok(Math.abs(soma(r.escolhidas) - r.valorMaximo) < 1e-9, `rodada ${rodada}`);
    assert.ok(semSobreposicao(r.escolhidas));
  }
});
