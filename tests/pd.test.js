import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agendar, calcularTabela, calcularTabelaMemo, prepararTarefas } from '../src/agendador.js';
import { Tarefa, sobrepoe } from '../src/tarefa.js';

const t = (nome, inicio, fim, valor) => new Tarefa({ nome, inicio, fim, valor });

// Força bruta: testa todos os subconjuntos sem sobreposição. Só serve para n pequeno (2^n).
function valorForcaBruta(tarefas) {
  let melhor = 0;
  for (let mascara = 0; mascara < 1 << tarefas.length; mascara++) {
    const escolhidas = tarefas.filter((_, i) => mascara & (1 << i));
    const compativel = escolhidas.every((a, i) => escolhidas.slice(i + 1).every((b) => !sobrepoe(a, b)));
    if (compativel) melhor = Math.max(melhor, escolhidas.reduce((soma, x) => soma + x.valor, 0));
  }
  return melhor;
}

function geradorAleatorio(semente) {
  return (maximo) => {
    semente = (semente * 1103515245 + 12345) % 2147483648;
    return semente % maximo;
  };
}

test('exemplo da issue 3 com valores: A 08-10 (5), B 09-11 (7), C 10-12 (4) -> 9', () => {
  const r = agendar([t('A', '08:00', '10:00', 5), t('B', '09:00', '11:00', 7), t('C', '10:00', '12:00', 4)]);
  assert.deepEqual(r.p, [0, 0, 0, 1]);
  assert.deepEqual(r.M, [0, 5, 7, 9]);
  assert.equal(r.valorMaximo, 9);
});

test('exemplo maior conferido à mão: M = 0, 2, 4, 4, 9, 9, 9, 12', () => {
  const dados = [[1, 4, 2], [3, 5, 4], [0, 6, 4], [4, 7, 7], [3, 9, 2], [5, 10, 1], [8, 11, 3]];
  const r = agendar(dados.map(([i, f, v], k) => t(`T${k + 1}`, i, f, v)));
  assert.deepEqual(r.p, [0, 0, 0, 0, 1, 0, 2, 4]);
  assert.deepEqual(r.M, [0, 2, 4, 4, 9, 9, 9, 12]);
  assert.equal(r.valorMaximo, 12);
});

test('várias tarefas pequenas valem mais que a maior delas (o guloso por valor erraria)', () => {
  const r = agendar([
    t('Live longa', '08:00', '12:00', 10),
    t('1', '08:00', '09:00', 3),
    t('2', '09:00', '10:00', 3),
    t('3', '10:00', '11:00', 3),
    t('4', '11:00', '12:00', 3),
  ]);
  assert.equal(r.valorMaximo, 12);
});

test('a tarefa mais valiosa sozinha ganha de várias compatíveis', () => {
  const r = agendar([t('Grande', '08:00', '12:00', 20), t('1', '08:00', '10:00', 6), t('2', '10:00', '12:00', 6)]);
  assert.equal(r.valorMaximo, 20);
});

test('a ordem de entrada não muda o resultado', () => {
  const tarefas = [t('A', '08:00', '10:00', 5), t('B', '09:00', '11:00', 7), t('C', '10:00', '12:00', 4)];
  assert.equal(agendar([...tarefas].reverse()).valorMaximo, agendar(tarefas).valorMaximo);
});

test('lista vazia, uma tarefa, valores zero e valores decimais', () => {
  assert.deepEqual(agendar([]), { tarefas: [], p: [0], M: [0], valorMaximo: 0 });
  assert.equal(agendar([t('A', '08:00', '09:00', 4)]).valorMaximo, 4);
  assert.equal(agendar([t('A', '08:00', '09:00', 0), t('B', '08:30', '10:00', 0)]).valorMaximo, 0);
  assert.equal(agendar([t('A', '08:00', '09:00', 1.5), t('B', '09:00', '10:00', 2.25)]).valorMaximo, 3.75);
});

test('a tabela M nunca diminui', () => {
  const sortear = geradorAleatorio(7);
  const tarefas = Array.from({ length: 50 }, (_, k) => {
    const inicio = sortear(600);
    return t(`T${k}`, inicio, inicio + 1 + sortear(120), sortear(20));
  });
  const { M } = agendar(tarefas);
  for (let j = 1; j < M.length; j++) assert.ok(M[j] >= M[j - 1]);
});

test('o valor máximo bate com a força bruta em listas aleatórias', () => {
  const sortear = geradorAleatorio(2026);
  for (let rodada = 0; rodada < 300; rodada++) {
    const n = sortear(13);
    const tarefas = Array.from({ length: n }, (_, k) => {
      const inicio = sortear(48) * 15;
      return t(`T${k}`, inicio, inicio + 15 * (1 + sortear(8)), sortear(10));
    });
    assert.equal(agendar(tarefas).valorMaximo, valorForcaBruta(tarefas), `rodada ${rodada}`);
  }
});

test('a versão com memoização chega na mesma tabela que a bottom-up', () => {
  const sortear = geradorAleatorio(99);
  for (let rodada = 0; rodada < 100; rodada++) {
    const tarefas = Array.from({ length: sortear(30) }, (_, k) => {
      const inicio = sortear(200);
      return t(`T${k}`, inicio, inicio + 1 + sortear(60), sortear(15));
    });
    const { tarefas: ordenadas, p } = prepararTarefas(tarefas);
    assert.deepEqual(calcularTabelaMemo(ordenadas, p).M, calcularTabela(ordenadas, p));
  }
});

test('a memoização faz no máximo 2n + 1 chamadas; sem ela, o número de chamadas explode', () => {
  // Cadeia de tarefas que encostam: p(j) = j - 1, então OPT(j) chama OPT(j - 1) duas vezes e,
  // sem memória, o número de chamadas dobra a cada tarefa (2^(n+1) - 1).
  const n = 20;
  const tarefas = Array.from({ length: n }, (_, k) => t(`T${k + 1}`, k * 30, (k + 1) * 30, 1));
  const { tarefas: ordenadas, p } = prepararTarefas(tarefas);

  const { chamadas } = calcularTabelaMemo(ordenadas, p);
  assert.ok(chamadas <= 2 * n + 1, `memoizada: ${chamadas} chamadas`);

  let chamadasSemMemo = 0;
  const optSemMemo = (j) => {
    chamadasSemMemo++;
    return j === 0 ? 0 : Math.max(ordenadas[j - 1].valor + optSemMemo(p[j]), optSemMemo(j - 1));
  };
  assert.equal(optSemMemo(n), calcularTabela(ordenadas, p)[n]);
  assert.equal(chamadasSemMemo, 2 ** (n + 1) - 1);
});
