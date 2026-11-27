import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agendar } from '../src/agendador.js';
import { forcaBruta, gulosoPorValor } from '../src/comparacao.js';
import { nomes, semSobreposicao, soma, t } from './apoio.js';

// Confere a resposta da PD e, de quebra, que ela é válida e bate com a força bruta.
function conferir(tarefas, valorEsperado, nomesEsperados) {
  const r = agendar(tarefas);
  assert.equal(r.valorMaximo, valorEsperado);
  assert.equal(soma(r.escolhidas), valorEsperado);
  assert.ok(semSobreposicao(r.escolhidas));
  assert.equal(forcaBruta(tarefas).valor, valorEsperado);
  if (nomesEsperados) assert.deepEqual(nomes(r.escolhidas), nomesEsperados);
  return r;
}

test('lista vazia: valor 0 e nenhuma tarefa', () => {
  conferir([], 0, []);
  assert.deepEqual(forcaBruta([]), { valor: 0, escolhidas: [] });
  assert.deepEqual(gulosoPorValor([]), { valor: 0, escolhidas: [] });
});

test('uma tarefa só: ela é escolhida', () => {
  conferir([t('Única', '14:00', '15:30', 8)], 8, ['Única']);
});

test('uma tarefa só de valor 0: o valor total é 0', () => {
  conferir([t('Grátis', '14:00', '15:00', 0)], 0);
});

test('nenhuma sobreposição: escolhe todas', () => {
  const tarefas = [
    t('Manhã', '08:00', '09:00', 2),
    t('Almoço', '12:00', '13:00', 1),
    t('Tarde', '15:00', '16:30', 4),
    t('Noite', '20:00', '22:00', 3),
  ];
  conferir([...tarefas].reverse(), 10, ['Manhã', 'Almoço', 'Tarde', 'Noite']);
});

test('todas se sobrepõem: escolhe só a de maior valor', () => {
  const tarefas = [
    t('A', '10:00', '12:00', 4),
    t('B', '10:30', '11:30', 9),
    t('C', '11:00', '13:00', 6),
    t('D', '09:00', '11:15', 2),
  ];
  conferir(tarefas, 9, ['B']);
});

test('tarefas que encostam podem ser escolhidas juntas', () => {
  conferir([t('A', '14:00', '15:00', 3), t('B', '15:00', '16:00', 3), t('C', '16:00', '17:00', 3)], 9, ['A', 'B', 'C']);
});

test('um minuto de sobreposição já impede escolher as duas', () => {
  conferir([t('A', '14:00', '15:01', 3), t('B', '15:00', '16:00', 4)], 4, ['B']);
});

test('o guloso por valor erra e a PD acerta: uma live longa bloqueia quatro curtas', () => {
  const tarefas = [
    t('Live longa', '08:00', '12:00', 10),
    t('1', '08:00', '09:00', 3),
    t('2', '09:00', '10:00', 3),
    t('3', '10:00', '11:00', 3),
    t('4', '11:00', '12:00', 3),
  ];
  const guloso = gulosoPorValor(tarefas);
  assert.equal(guloso.valor, 10);
  assert.deepEqual(nomes(guloso.escolhidas), ['Live longa']);
  conferir(tarefas, 12, ['1', '2', '3', '4']);
});

test('o guloso por valor erra mesmo quando a diferença é pequena', () => {
  // B (6) bloqueia A e C (4 + 4 = 8).
  const tarefas = [t('A', '08:00', '10:00', 4), t('B', '09:00', '11:00', 6), t('C', '10:00', '12:00', 4)];
  assert.equal(gulosoPorValor(tarefas).valor, 6);
  conferir(tarefas, 8, ['A', 'C']);
});

test('empate de valor: em uma cadeia A-B-C de mesmo valor, fica com A e C', () => {
  conferir([t('A', '08:00', '10:00', 5), t('B', '09:00', '11:00', 5), t('C', '10:00', '12:00', 5)], 10, ['A', 'C']);
});

test('horários idênticos e mesmo valor: escolhe exatamente uma', () => {
  const r = conferir([t('X', '10:00', '11:00', 5), t('Y', '10:00', '11:00', 5), t('Z', '10:00', '11:00', 5)], 5);
  assert.equal(r.escolhidas.length, 1);
});

test('horários idênticos e valores diferentes: escolhe a de maior valor', () => {
  conferir([t('X', '10:00', '11:00', 2), t('Y', '10:00', '11:00', 7), t('Z', '10:00', '11:00', 4)], 7, ['Y']);
});

test('horários idênticos junto de tarefas compatíveis', () => {
  const tarefas = [
    t('Antes', '08:00', '10:00', 3),
    t('X', '10:00', '11:00', 5),
    t('Y', '10:00', '11:00', 6),
    t('Depois', '11:00', '12:00', 2),
  ];
  conferir(tarefas, 11, ['Antes', 'Y', 'Depois']);
});

test('dia inteiro: uma tarefa de 00:00 a 24:00 contra várias menores', () => {
  conferir([t('Maratona', '00:00', '24:00', 30), t('A', '00:00', '12:00', 14), t('B', '12:00', '24:00', 15)], 30, ['Maratona']);
  conferir([t('Maratona', '00:00', '24:00', 28), t('A', '00:00', '12:00', 14), t('B', '12:00', '24:00', 15)], 29, ['A', 'B']);
});
