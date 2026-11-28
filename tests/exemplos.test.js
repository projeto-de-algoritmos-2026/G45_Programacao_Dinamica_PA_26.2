import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { agendar } from '../src/agendador.js';
import { forcaBruta, gulosoPorValor } from '../src/comparacao.js';
import { lerJSON } from '../src/entrada.js';
import { gerarTarefas, montarArquivo } from '../scripts/gerar-exemplo-grande.js';
import { nomes, semSobreposicao, soma } from './apoio.js';

const pasta = new URL('../exemplos/', import.meta.url);
const ler = (arquivo) => readFileSync(new URL(arquivo, pasta), 'utf8');
const carregar = (arquivo) => lerJSON(ler(arquivo));
const indice = JSON.parse(ler('indice.json'));

test('o índice lista todos os exemplos da pasta, e cada um carrega sem erro', () => {
  const arquivos = readdirSync(pasta).filter((f) => f.endsWith('.json') && f !== 'indice.json');
  assert.deepEqual(indice.map((e) => e.arquivo).sort(), arquivos.sort());
  for (const { arquivo, nome } of indice) {
    const dados = JSON.parse(ler(arquivo));
    assert.equal(dados.nome, nome, `${arquivo}: nome diferente do índice`);
    assert.ok(dados.descricao, `${arquivo}: sem descrição`);
    assert.ok(carregar(arquivo).length > 0, `${arquivo}: sem tarefas`);
  }
});

test('em todos os exemplos pequenos a PD bate com a força bruta e a agenda é válida', () => {
  for (const { arquivo } of indice) {
    const tarefas = carregar(arquivo);
    if (tarefas.length > 15) continue;
    const r = agendar(tarefas);
    assert.equal(r.valorMaximo, forcaBruta(tarefas).valor, arquivo);
    assert.ok(semSobreposicao(r.escolhidas), arquivo);
    assert.equal(soma(r.escolhidas), r.valorMaximo, arquivo);
  }
});

test('lives do streamer: PD 33, guloso 29', () => {
  const tarefas = carregar('lives-streamer.json');
  assert.equal(agendar(tarefas).valorMaximo, 33);
  assert.equal(gulosoPorValor(tarefas).valor, 29);
});

test('freelancer: PD R$ 1.100, guloso R$ 1.060', () => {
  const tarefas = carregar('freelancer.json');
  const r = agendar(tarefas);
  assert.equal(r.valorMaximo, 1100);
  assert.deepEqual(nomes(r.escolhidas), [
    'Logo para padaria',
    'Site institucional',
    'Correção de bug urgente',
    'Consultoria',
    'Relatório mensal',
    'Mentoria',
  ]);
  assert.equal(gulosoPorValor(tarefas).valor, 1060);
});

test('pequeno, para calcular à mão: tabela inteira conferida', () => {
  const r = agendar(carregar('pequeno-a-mao.json'));
  assert.deepEqual(nomes(r.tarefas), ['A', 'C', 'B', 'D', 'E', 'F']);
  assert.deepEqual(r.p, [0, 0, 1, 0, 2, 3, 4]);
  assert.deepEqual(r.M, [0, 4, 7, 7, 12, 12, 15]);
  assert.deepEqual(nomes(r.escolhidas), ['A', 'C', 'D', 'F']);
  assert.equal(gulosoPorValor(r.tarefas).valor, 10);
});

test('o guloso falha: guloso 10, PD 12', () => {
  const tarefas = carregar('guloso-falha.json');
  assert.equal(gulosoPorValor(tarefas).valor, 10);
  assert.deepEqual(nomes(agendar(tarefas).escolhidas), ['Curta 1', 'Curta 2', 'Curta 3', 'Curta 4']);
});

test('grande: o arquivo versionado é exatamente o que o gerador produz', () => {
  assert.equal(ler('grande-1000.json'), montarArquivo(gerarTarefas()));
});

test('grande: 1000 tarefas válidas, agenda sem sobreposição e cálculo rápido', () => {
  const tarefas = carregar('grande-1000.json');
  assert.equal(tarefas.length, 1000);
  const inicio = performance.now();
  const r = agendar(tarefas);
  const ms = performance.now() - inicio;
  assert.ok(semSobreposicao(r.escolhidas));
  assert.equal(soma(r.escolhidas), r.valorMaximo);
  assert.ok(r.valorMaximo > gulosoPorValor(tarefas).valor);
  assert.ok(ms < 500, `levou ${ms.toFixed(1)} ms`);
});
