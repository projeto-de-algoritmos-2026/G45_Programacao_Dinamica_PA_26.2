import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ErroDeValidacao,
  Tarefa,
  carregarTarefas,
  horarioParaMinutos,
  minutosParaHorario,
  sobrepoe,
} from '../src/tarefa.js';

const live = { nome: 'Live de lançamento', inicio: '14:00', fim: '15:30', valor: 10 };

test('horarioParaMinutos converte HH:MM em minutos desde 00:00', () => {
  assert.equal(horarioParaMinutos('00:00'), 0);
  assert.equal(horarioParaMinutos('14:30'), 870);
  assert.equal(horarioParaMinutos('9:05'), 545);
  assert.equal(horarioParaMinutos('24:00'), 1440);
});

test('horarioParaMinutos devolve NaN para horário inválido', () => {
  for (const ruim of ['25:00', '24:01', '12:60', '12', 'abc', '', '12:5', '-1:00']) {
    assert.ok(Number.isNaN(horarioParaMinutos(ruim)), `deveria rejeitar "${ruim}"`);
  }
});

test('minutosParaHorario faz o caminho de volta', () => {
  assert.equal(minutosParaHorario(870), '14:30');
  assert.equal(minutosParaHorario(0), '00:00');
  assert.equal(minutosParaHorario(545), '09:05');
});

test('Tarefa guarda nome, horários em minutos e valor', () => {
  const t = new Tarefa(live);
  assert.equal(t.nome, 'Live de lançamento');
  assert.equal(t.inicio, 840);
  assert.equal(t.fim, 930);
  assert.equal(t.valor, 10);
  assert.equal(t.inicioTexto, '14:00');
  assert.equal(t.fimTexto, '15:30');
});

test('Tarefa aceita horários já em minutos e valor decimal com vírgula', () => {
  const t = new Tarefa({ nome: ' A ', inicio: 60, fim: 120, valor: '7,5' });
  assert.equal(t.nome, 'A');
  assert.equal(t.inicio, 60);
  assert.equal(t.valor, 7.5);
});

test('Tarefa aceita valor 0', () => {
  assert.equal(new Tarefa({ ...live, valor: 0 }).valor, 0);
});

test('Tarefa é imutável', () => {
  const t = new Tarefa(live);
  assert.throws(() => {
    t.valor = 99;
  }, TypeError);
});

test('fim igual ou antes do início é rejeitado', () => {
  assert.throws(() => new Tarefa({ ...live, fim: '14:00' }), /deve ser depois/);
  assert.throws(() => new Tarefa({ ...live, fim: '13:00' }), /deve ser depois/);
});

test('valor negativo, não numérico ou vazio é rejeitado', () => {
  assert.throws(() => new Tarefa({ ...live, valor: -1 }), /não pode ser negativo/);
  assert.throws(() => new Tarefa({ ...live, valor: 'muito' }), /informe um número/);
  assert.throws(() => new Tarefa({ ...live, valor: '' }), /"valor" é obrigatório/);
  assert.throws(() => new Tarefa({ ...live, valor: Infinity }), /informe um número/);
});

test('campos obrigatórios ausentes são rejeitados', () => {
  assert.throws(() => new Tarefa({}), (e) => {
    assert.ok(e instanceof ErroDeValidacao);
    assert.equal(e.erros.length, 4);
    return true;
  });
  assert.throws(() => new Tarefa({ ...live, nome: '   ' }), /"nome" é obrigatório/);
});

test('horário em formato errado gera mensagem com o valor recebido', () => {
  assert.throws(() => new Tarefa({ ...live, inicio: '25:00' }), /"inicio" inválido \("25:00"\)/);
  assert.throws(() => new Tarefa({ ...live, fim: 1.5 }), /"fim" inválido/);
});

test('Tarefa.validar não lança e junta todos os erros', () => {
  const { tarefa, erros } = Tarefa.validar({ nome: '', inicio: 'x', fim: '10:00', valor: -3 });
  assert.equal(tarefa, null);
  assert.equal(erros.length, 3);
  assert.deepEqual(Tarefa.validar(null).tarefa, null);
});

test('encostar não é sobrepor', () => {
  const a = new Tarefa({ nome: 'A', inicio: '14:00', fim: '15:00', valor: 1 });
  const b = new Tarefa({ nome: 'B', inicio: '15:00', fim: '16:00', valor: 1 });
  assert.equal(sobrepoe(a, b), false);
  assert.equal(sobrepoe(b, a), false);
});

test('sobreposição parcial, total e por contenção', () => {
  const base = new Tarefa({ nome: 'base', inicio: '10:00', fim: '12:00', valor: 1 });
  const parcial = new Tarefa({ nome: 'p', inicio: '11:00', fim: '13:00', valor: 1 });
  const dentro = new Tarefa({ nome: 'd', inicio: '10:30', fim: '11:30', valor: 1 });
  const igual = new Tarefa({ nome: 'i', inicio: '10:00', fim: '12:00', valor: 1 });
  const longe = new Tarefa({ nome: 'l', inicio: '13:00', fim: '14:00', valor: 1 });
  for (const outra of [parcial, dentro, igual]) {
    assert.equal(sobrepoe(base, outra), true);
    assert.equal(sobrepoe(outra, base), true);
  }
  assert.equal(sobrepoe(base, longe), false);
});

test('carregarTarefas devolve a lista de Tarefas', () => {
  const tarefas = carregarTarefas([live, { nome: 'B', inicio: '16:00', fim: '17:00', valor: 3 }]);
  assert.equal(tarefas.length, 2);
  assert.ok(tarefas.every((t) => t instanceof Tarefa));
});

test('carregarTarefas indica qual tarefa tem erro', () => {
  assert.throws(
    () => carregarTarefas([live, { ...live, nome: 'Ruim', valor: -5 }, { nome: '', inicio: '1:00', fim: '2:00' }]),
    (e) => {
      assert.ok(e instanceof ErroDeValidacao);
      assert.ok(e.erros.some((m) => m.startsWith('Tarefa 2 (Ruim): ')));
      assert.ok(e.erros.some((m) => m.startsWith('Tarefa 3: "nome"')));
      assert.ok(e.erros.some((m) => m.startsWith('Tarefa 3: "valor"')));
      return true;
    },
  );
});

test('carregarTarefas rejeita quem não é lista', () => {
  assert.throws(() => carregarTarefas({}), /em uma lista/);
  assert.throws(() => carregarTarefas([null]), /deve ser um objeto/);
});
