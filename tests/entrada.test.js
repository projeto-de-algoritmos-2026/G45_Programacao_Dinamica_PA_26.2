import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerArquivo, lerCSV, lerJSON } from '../src/entrada.js';
import { ErroDeValidacao } from '../src/tarefa.js';

test('lerJSON aceita uma lista de tarefas', () => {
  const tarefas = lerJSON('[{"nome":"A","inicio":"08:00","fim":"10:00","valor":5}]');
  assert.equal(tarefas.length, 1);
  assert.equal(tarefas[0].inicio, 480);
});

test('lerJSON aceita o formato { "tarefas": [...] }', () => {
  const tarefas = lerJSON('{"tarefas":[{"nome":"A","inicio":"08:00","fim":"10:00","valor":5}]}');
  assert.equal(tarefas.length, 1);
});

test('lerJSON rejeita JSON quebrado, lista vazia e tarefa inválida', () => {
  assert.throws(() => lerJSON('{oi'), /JSON inválido/);
  assert.throws(() => lerJSON('[]'), /nenhuma tarefa/);
  assert.throws(() => lerJSON('{"x":1}'), /em uma lista/);
  assert.throws(() => lerJSON('[{"nome":"A","inicio":"10:00","fim":"09:00","valor":1}]'), /Tarefa 1 \(A\)/);
});

test('lerCSV lê cabeçalho e linhas com vírgula', () => {
  const tarefas = lerCSV('nome,inicio,fim,valor\nA,08:00,10:00,5\nB,10:00,12:00,2.5\n');
  assert.deepEqual(tarefas.map((t) => [t.nome, t.inicio, t.fim, t.valor]), [
    ['A', 480, 600, 5],
    ['B', 600, 720, 2.5],
  ]);
});

test('lerCSV aceita ponto e vírgula, valor com vírgula decimal, BOM e CRLF', () => {
  const tarefas = lerCSV('﻿nome;inicio;fim;valor\r\nA;08:00;10:00;7,5\r\n');
  assert.equal(tarefas[0].valor, 7.5);
});

test('lerCSV aceita colunas em outra ordem e campos entre aspas', () => {
  const tarefas = lerCSV('valor,nome,fim,inicio\n3,"Live, parte 1",11:00,10:00\n');
  assert.equal(tarefas[0].nome, 'Live, parte 1');
  assert.equal(tarefas[0].valor, 3);
});

test('lerCSV reclama de colunas faltando, arquivo vazio e linha inválida', () => {
  assert.throws(() => lerCSV('nome,inicio,fim\nA,08:00,10:00'), /Faltando: valor/);
  assert.throws(() => lerCSV(''), /vazio/);
  assert.throws(() => lerCSV('nome,inicio,fim,valor\n'), /nenhuma tarefa/);
  assert.throws(() => lerCSV('nome,inicio,fim,valor\nA,08:00,10:00'), /Tarefa 1 \(A\): "valor" é obrigatório/);
});

test('lerArquivo escolhe o leitor pela extensão', () => {
  assert.equal(lerArquivo('agenda.CSV', 'nome,inicio,fim,valor\nA,08:00,10:00,1').length, 1);
  assert.equal(lerArquivo('agenda.json', '[{"nome":"A","inicio":"08:00","fim":"10:00","valor":1}]').length, 1);
  assert.throws(() => lerArquivo('agenda.txt', ''), (e) => e instanceof ErroDeValidacao && /Formato não suportado/.test(e.message));
});
