import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agendar } from '../src/agendador.js';
import { escalaDoDia, formatarValor, linhasDaTabela, roteiro } from '../src/explicacao.js';
import { t } from './apoio.js';

// Exemplo da issue 3 com valores: A 08-10 (5), B 09-11 (7), C 10-12 (4). M = 0, 5, 7, 9; escolhe A e C.
const exemplo = () => agendar([t('A', '08:00', '10:00', 5), t('B', '09:00', '11:00', 7), t('C', '10:00', '12:00', 4)]);

test('linhasDaTabela traz p(j), pegar, pular, M[j] e as decisões', () => {
  const linhas = linhasDaTabela(exemplo());
  assert.deepEqual(
    linhas.map(({ j, p, pegar, pular, M, decisaoNaPD, naAgenda }) => [j, p, pegar, pular, M, decisaoNaPD, naAgenda]),
    [
      [1, 0, 5, 0, 5, 'pega', true],
      [2, 0, 7, 5, 7, 'pega', false], // B vence o max da linha, mas não entra na agenda final
      [3, 1, 9, 7, 9, 'pega', true],
    ],
  );
});

test('linhasDaTabela marca empate quando pegar e pular valem o mesmo', () => {
  const r = agendar([t('A', '08:00', '10:00', 5), t('B', '09:00', '11:00', 5)]);
  assert.equal(linhasDaTabela(r)[1].decisaoNaPD, 'empate');
});

test('linhasDaTabela também marca quando pular vence', () => {
  const r = agendar([t('A', '08:00', '10:00', 9), t('B', '09:00', '11:00', 2)]);
  assert.equal(linhasDaTabela(r)[1].decisaoNaPD, 'pula');
});

test('roteiro: M[0], uma etapa por j, uma por passo da volta e o resumo', () => {
  const r = exemplo();
  const etapas = roteiro(r);
  assert.equal(etapas.length, 1 + 3 + r.passos.length + 1);
  assert.deepEqual(
    etapas.map((e) => [e.fase, e.j, e.referencia]),
    [
      ['preenchimento', 0, null],
      ['preenchimento', 1, 0],
      ['preenchimento', 2, 0],
      ['preenchimento', 3, 1],
      ['reconstrucao', 3, 1],
      ['reconstrucao', 1, 0],
      ['fim', null, null],
    ],
  );
});

test('roteiro explica a conta de cada M[j]', () => {
  const etapas = roteiro(exemplo());
  assert.equal(
    etapas[3].texto,
    'j = 3: "C" (10:00–12:00, valor 4). A última tarefa que termina até 10:00 é "A", então p(3) = 1. ' +
      'Pegar: 4 + M[1] = 4 + 5 = 9. Pular: M[2] = 7. M[3] = max(9, 7) = 9: pegar vale mais.',
  );
  assert.match(etapas[1].texto, /Nenhuma tarefa termina até 08:00, então p\(1\) = 0\./);
});

test('roteiro explica a volta e o resumo final', () => {
  const etapas = roteiro(exemplo());
  assert.equal(
    etapas[4].texto,
    'Volta em j = 3 ("C"): 4 + M[1] = 9 ≥ M[2] = 7, então a tarefa entra na agenda e a volta continua em p(3) = 1.',
  );
  assert.equal(etapas.at(-1).texto, 'Chegou em j = 0. Agenda: "A", "C". Soma = 9 = M[3].');
});

test('roteiro explica quando a tarefa fica de fora na volta', () => {
  const r = agendar([t('Grande', '08:00', '12:00', 20), t('1', '08:00', '10:00', 6), t('2', '10:00', '12:00', 6)]);
  const etapa = roteiro(r).find((e) => e.fase === 'reconstrucao' && e.j === 3);
  assert.match(etapa.texto, /fica de fora e a volta continua em j - 1 = 2\./);
  assert.equal(etapa.referencia, 2);
});

test('roteiro de uma lista vazia', () => {
  const etapas = roteiro(agendar([]));
  assert.deepEqual(etapas.map((e) => e.fase), ['preenchimento', 'fim']);
  assert.equal(etapas[1].texto, 'Sem tarefas, a agenda fica vazia.');
});

test('formatarValor usa vírgula decimal', () => {
  assert.equal(formatarValor(7.5), '7,5');
  assert.equal(formatarValor(1 / 3), '0,33');
  assert.equal(formatarValor(12), '12');
});

test('escalaDoDia arredonda para horas cheias e escolhe o espaçamento das marcas', () => {
  assert.deepEqual(escalaDoDia([t('A', '08:30', '10:15'), t('B', '11:00', '12:00')]), {
    inicio: 480,
    fim: 720,
    marcas: [480, 540, 600, 660, 720],
  });
  const diaTodo = escalaDoDia([t('A', '00:00', '24:00')]);
  assert.equal(diaTodo.inicio, 0);
  assert.equal(diaTodo.fim, 1440);
  assert.equal(diaTodo.marcas.length, 9); // de 3 em 3 horas
  const meio = escalaDoDia([t('A', '08:00', '19:00')]);
  assert.deepEqual(meio.marcas.map((m) => m / 60), [8, 10, 12, 14, 16, 18, 20]);
});

test('escalaDoDia sem tarefas', () => {
  assert.deepEqual(escalaDoDia([]), { inicio: 0, fim: 60, marcas: [0, 60] });
});
