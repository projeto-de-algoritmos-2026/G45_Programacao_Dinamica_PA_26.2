// Funções de apoio compartilhadas pelos testes (este arquivo não é um teste: o node --test não o executa).
import { Tarefa, sobrepoe } from '../src/tarefa.js';

export const t = (nome, inicio, fim, valor = 1) => new Tarefa({ nome, inicio, fim, valor });
export const nomes = (tarefas) => tarefas.map((x) => x.nome);
export const soma = (tarefas) => tarefas.reduce((total, x) => total + x.valor, 0);

export function semSobreposicao(tarefas) {
  return tarefas.every((a, i) => tarefas.slice(i + 1).every((b) => !sobrepoe(a, b)));
}

// Gerador pseudoaleatório com semente fixa (congruencial linear): os testes "aleatórios" dão sempre o mesmo resultado.
export function geradorAleatorio(semente) {
  return (maximo) => {
    semente = (semente * 1103515245 + 12345) % 2147483648;
    return semente % maximo;
  };
}

// n tarefas com início em múltiplos de `passo` minutos ao longo do dia, duração de 1 a `duracaoMaxima` passos
// e valor inteiro de 0 a valorMaximo - 1. Passos grandes geram muitos encostos e horários idênticos.
export function tarefasAleatorias(sortear, n, { passo = 15, duracaoMaxima = 8, valorMaximo = 10 } = {}) {
  const posicoes = Math.floor(1440 / passo);
  return Array.from({ length: n }, (_, k) => {
    const inicio = sortear(posicoes) * passo;
    const fim = Math.min(1440, inicio + passo * (1 + sortear(duracaoMaxima)));
    return t(`T${k + 1}`, inicio, fim, sortear(valorMaximo));
  });
}
