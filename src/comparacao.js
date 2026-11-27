// Algoritmos de comparação com a PD: força bruta (sempre certa, mas exponencial) e
// guloso por valor (rápido, mas pode errar). Servem para testar a PD e para mostrar na interface
// por que a programação dinâmica é necessária.
import { ordenarPorTermino } from './agendador.js';
import { sobrepoe } from './tarefa.js';

export const LIMITE_FORCA_BRUTA = 20;

// Testa todos os 2^n subconjuntos e fica com o compatível de maior valor. O(2^n · n).
// Com as tarefas ordenadas por término, um subconjunto é compatível se cada tarefa escolhida
// não se sobrepõe à escolhida anterior. Recusa listas maiores que LIMITE_FORCA_BRUTA.
// Devolve { valor, escolhidas } com as escolhidas em ordem cronológica.
export function forcaBruta(tarefas) {
  if (tarefas.length > LIMITE_FORCA_BRUTA) {
    throw new RangeError(`A força bruta só aceita até ${LIMITE_FORCA_BRUTA} tarefas (recebeu ${tarefas.length}).`);
  }
  const ordenadas = ordenarPorTermino(tarefas);
  let melhorValor = 0;
  let melhorMascara = 0;
  for (let mascara = 0; mascara < 1 << ordenadas.length; mascara++) {
    let valor = 0;
    let anterior = null;
    let compativel = true;
    for (let i = 0; i < ordenadas.length && compativel; i++) {
      if (!(mascara & (1 << i))) continue;
      if (anterior && sobrepoe(anterior, ordenadas[i])) compativel = false;
      valor += ordenadas[i].valor;
      anterior = ordenadas[i];
    }
    if (compativel && valor > melhorValor) {
      melhorValor = valor;
      melhorMascara = mascara;
    }
  }
  return { valor: melhorValor, escolhidas: ordenadas.filter((_, i) => melhorMascara & (1 << i)) };
}

// Guloso: pega a tarefa de maior valor primeiro e vai acrescentando as que não se sobrepõem
// às já escolhidas. O(n²) nesta versão simples. Não é ótimo: uma tarefa valiosa pode bloquear
// várias menores que juntas valem mais.
// Devolve { valor, escolhidas } com as escolhidas em ordem cronológica.
export function gulosoPorValor(tarefas) {
  const porValor = [...tarefas].sort((a, b) => b.valor - a.valor);
  const escolhidas = [];
  for (const tarefa of porValor) {
    if (escolhidas.every((outra) => !sobrepoe(outra, tarefa))) escolhidas.push(tarefa);
  }
  const cronologica = ordenarPorTermino(escolhidas);
  return { valor: cronologica.reduce((soma, x) => soma + x.valor, 0), escolhidas: cronologica };
}
