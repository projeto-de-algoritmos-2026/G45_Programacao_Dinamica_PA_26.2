// Modelo de tarefa/live: horários em minutos, validação e regra de sobreposição.
// Não usa nada do navegador: roda igual no browser e nos testes do Node.

const MINUTOS_NO_DIA = 24 * 60;

export class ErroDeValidacao extends Error {
  constructor(erros) {
    super(erros.join('\n'));
    this.name = 'ErroDeValidacao';
    this.erros = erros;
  }
}

// "14:30" -> 870. Aceita de 00:00 a 24:00 (24:00 permite uma live que termina à meia-noite).
// Devolve NaN se o texto não for um horário válido.
export function horarioParaMinutos(texto) {
  const partes = /^(\d{1,2}):(\d{2})$/.exec(String(texto).trim());
  if (!partes) return NaN;
  const minutos = Number(partes[1]) * 60 + Number(partes[2]);
  return Number(partes[2]) < 60 && minutos <= MINUTOS_NO_DIA ? minutos : NaN;
}

// 870 -> "14:30"
export function minutosParaHorario(minutos) {
  const hh = String(Math.floor(minutos / 60)).padStart(2, '0');
  const mm = String(minutos % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function paraMinutos(valor, campo, erros) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    erros.push(`"${campo}" é obrigatório.`);
    return NaN;
  }
  const minutos = typeof valor === 'number' ? valor : horarioParaMinutos(valor);
  if (!Number.isInteger(minutos) || minutos < 0 || minutos > MINUTOS_NO_DIA) {
    erros.push(`"${campo}" inválido (${JSON.stringify(valor)}): use o formato HH:MM, entre 00:00 e 24:00.`);
    return NaN;
  }
  return minutos;
}

function paraValor(valor, erros) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    erros.push('"valor" é obrigatório.');
    return NaN;
  }
  const numero = typeof valor === 'number' ? valor : Number(String(valor).trim().replace(',', '.'));
  if (!Number.isFinite(numero)) {
    erros.push(`"valor" inválido (${JSON.stringify(valor)}): informe um número.`);
    return NaN;
  }
  if (numero < 0) {
    erros.push(`"valor" não pode ser negativo (recebido ${numero}).`);
    return NaN;
  }
  return numero;
}

export class Tarefa {
  // dados: { nome, inicio, fim, valor }. inicio e fim aceitam "HH:MM" ou minutos desde 00:00.
  // Lança ErroDeValidacao se algum campo estiver errado.
  constructor(dados) {
    const { tarefa, erros } = Tarefa.validar(dados);
    if (erros.length > 0) throw new ErroDeValidacao(erros);
    Object.assign(this, tarefa);
    Object.freeze(this);
  }

  // Devolve { tarefa, erros } sem lançar exceção; `erros` traz todos os problemas de uma vez.
  static validar(dados) {
    const erros = [];
    if (dados === null || typeof dados !== 'object' || Array.isArray(dados)) {
      return { tarefa: null, erros: ['A tarefa deve ser um objeto com nome, inicio, fim e valor.'] };
    }
    const nome = typeof dados.nome === 'string' ? dados.nome.trim() : '';
    if (nome === '') erros.push('"nome" é obrigatório.');
    const inicio = paraMinutos(dados.inicio, 'inicio', erros);
    const fim = paraMinutos(dados.fim, 'fim', erros);
    const valor = paraValor(dados.valor, erros);
    if (!Number.isNaN(inicio) && !Number.isNaN(fim) && fim <= inicio) {
      erros.push(`"fim" (${minutosParaHorario(fim)}) deve ser depois de "inicio" (${minutosParaHorario(inicio)}).`);
    }
    return { tarefa: erros.length === 0 ? { nome, inicio, fim, valor } : null, erros };
  }

  get inicioTexto() {
    return minutosParaHorario(this.inicio);
  }

  get fimTexto() {
    return minutosParaHorario(this.fim);
  }
}

// Duas tarefas se sobrepõem só se uma começa antes de a outra terminar.
// Tarefas que encostam (uma termina às 15:00 e a outra começa às 15:00) NÃO se sobrepõem.
export function sobrepoe(a, b) {
  return a.inicio < b.fim && b.inicio < a.fim;
}

// Converte uma lista de objetos em Tarefas. Se alguma for inválida, lança um único
// ErroDeValidacao com os erros de todas, cada um indicando a posição (e o nome) da tarefa.
export function carregarTarefas(lista) {
  if (!Array.isArray(lista)) throw new ErroDeValidacao(['As tarefas devem vir em uma lista.']);
  const tarefas = [];
  const erros = [];
  lista.forEach((dados, i) => {
    const resultado = Tarefa.validar(dados);
    if (resultado.erros.length > 0) {
      const nome = typeof dados?.nome === 'string' && dados.nome.trim() !== '' ? ` (${dados.nome.trim()})` : '';
      for (const erro of resultado.erros) erros.push(`Tarefa ${i + 1}${nome}: ${erro}`);
    } else {
      tarefas.push(new Tarefa(resultado.tarefa));
    }
  });
  if (erros.length > 0) throw new ErroDeValidacao(erros);
  return tarefas;
}
