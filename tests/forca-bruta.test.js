import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agendar } from '../src/agendador.js';
import { LIMITE_FORCA_BRUTA, forcaBruta, gulosoPorValor } from '../src/comparacao.js';
import { geradorAleatorio, semSobreposicao, soma, t, tarefasAleatorias } from './apoio.js';

test('força bruta devolve uma agenda válida em ordem cronológica', () => {
  const r = forcaBruta([t('C', '10:00', '12:00', 4), t('B', '09:00', '11:00', 7), t('A', '08:00', '10:00', 5)]);
  assert.equal(r.valor, 9);
  assert.deepEqual(r.escolhidas.map((x) => x.nome), ['A', 'C']);
});

test(`força bruta recusa mais de ${LIMITE_FORCA_BRUTA} tarefas`, () => {
  const muitas = Array.from({ length: LIMITE_FORCA_BRUTA + 1 }, (_, k) => t(`T${k}`, k, k + 1));
  assert.throws(() => forcaBruta(muitas), RangeError);
});

// Cada cenário muda a densidade: passos grandes geram muitos encostos e horários idênticos;
// durações longas geram muita sobreposição; valores pequenos geram muitos empates.
const cenarios = [
  { nome: 'espalhadas', opcoes: { passo: 15, duracaoMaxima: 8, valorMaximo: 10 } },
  { nome: 'muitos encostos e horários idênticos', opcoes: { passo: 120, duracaoMaxima: 2, valorMaximo: 10 } },
  { nome: 'muita sobreposição', opcoes: { passo: 30, duracaoMaxima: 30, valorMaximo: 20 } },
  { nome: 'muitos empates de valor', opcoes: { passo: 60, duracaoMaxima: 4, valorMaximo: 3 } },
];

for (const [k, { nome, opcoes }] of cenarios.entries()) {
  test(`PD × força bruta em 200 entradas aleatórias de até 15 tarefas (${nome})`, () => {
    const sortear = geradorAleatorio(1000 + k);
    for (let rodada = 0; rodada < 200; rodada++) {
      const tarefas = tarefasAleatorias(sortear, sortear(16), opcoes);
      const pd = agendar(tarefas);
      const bruta = forcaBruta(tarefas);
      assert.equal(pd.valorMaximo, bruta.valor, `rodada ${rodada}`);
      assert.equal(soma(pd.escolhidas), bruta.valor, `rodada ${rodada}`);
      assert.ok(semSobreposicao(pd.escolhidas), `rodada ${rodada}`);
      assert.ok(semSobreposicao(bruta.escolhidas), `rodada ${rodada}`);
    }
  });
}

test('o guloso nunca passa da PD e, em entradas aleatórias, erra várias vezes', () => {
  const sortear = geradorAleatorio(77);
  let erros = 0;
  for (let rodada = 0; rodada < 300; rodada++) {
    const tarefas = tarefasAleatorias(sortear, 1 + sortear(15), { passo: 30, duracaoMaxima: 10, valorMaximo: 20 });
    const guloso = gulosoPorValor(tarefas);
    const pd = agendar(tarefas);
    assert.ok(semSobreposicao(guloso.escolhidas));
    assert.ok(guloso.valor <= pd.valorMaximo, `rodada ${rodada}`);
    if (guloso.valor < pd.valorMaximo) erros++;
  }
  assert.ok(erros > 0, 'o guloso deveria errar em pelo menos uma entrada');
});
