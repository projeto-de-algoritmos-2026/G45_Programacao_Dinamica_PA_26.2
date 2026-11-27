// Gera exemplos/grande-1000.json: 1000 tarefas aleatórias, sempre as mesmas (semente fixa).
// Uso: npm run gerar-exemplo-grande
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { minutosParaHorario } from '../src/tarefa.js';

export const QUANTIDADE = 1000;
export const SEMENTE = 2026;

// Gerador congruencial linear: a mesma semente produz sempre a mesma lista.
function geradorAleatorio(semente) {
  return (maximo) => {
    semente = (semente * 1103515245 + 12345) % 2147483648;
    return semente % maximo;
  };
}

// Início em múltiplos de 5 minutos ao longo do dia, duração de 15 min a 3 h e valor de 1 a 100.
export function gerarTarefas(quantidade = QUANTIDADE, semente = SEMENTE) {
  const sortear = geradorAleatorio(semente);
  const largura = String(quantidade).length;
  return Array.from({ length: quantidade }, (_, k) => {
    const inicio = sortear(285) * 5; // 00:00 a 23:40
    const fim = Math.min(1440, inicio + 15 + sortear(166)); // 15 a 180 minutos depois
    return {
      nome: `Tarefa ${String(k + 1).padStart(largura, '0')}`,
      inicio: minutosParaHorario(inicio),
      fim: minutosParaHorario(fim),
      valor: 1 + sortear(100),
    };
  });
}

// Uma tarefa por linha, para o arquivo ficar legível e o diff pequeno.
export function montarArquivo(tarefas) {
  const linhas = tarefas.map((t) => `    ${JSON.stringify(t)}`).join(',\n');
  return (
    '{\n' +
    `  "nome": "Grande: ${tarefas.length} tarefas aleatórias",\n` +
    `  "descricao": "Gerado por scripts/gerar-exemplo-grande.js (semente ${SEMENTE}). Serve para mostrar que a PD roda rápido: ordenação e p(j) em O(n log n), tabela e reconstrução em O(n).",\n` +
    '  "tarefas": [\n' +
    `${linhas}\n` +
    '  ]\n' +
    '}\n'
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const destino = fileURLToPath(new URL('../exemplos/grande-1000.json', import.meta.url));
  writeFileSync(destino, montarArquivo(gerarTarefas()));
  console.log(`Gerado ${destino}`);
}
