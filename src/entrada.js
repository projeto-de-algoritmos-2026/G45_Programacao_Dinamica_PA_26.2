// Leitura de tarefas a partir de arquivos JSON ou CSV (texto já lido; quem lê o arquivo é a interface).
import { ErroDeValidacao, carregarTarefas } from './tarefa.js';

const COLUNAS = ['nome', 'inicio', 'fim', 'valor'];

// JSON: uma lista [{ "nome": "...", "inicio": "14:00", "fim": "15:30", "valor": 10 }, ...]
// ou um objeto { "tarefas": [ ... ] }.
export function lerJSON(texto) {
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch (e) {
    throw new ErroDeValidacao([`JSON inválido: ${e.message}`]);
  }
  const lista = Array.isArray(dados?.tarefas) ? dados.tarefas : dados;
  if (Array.isArray(lista) && lista.length === 0) {
    throw new ErroDeValidacao(['O arquivo não tem nenhuma tarefa.']);
  }
  return carregarTarefas(lista);
}

// Divide uma linha de CSV respeitando campos entre aspas ("Live, parte 1").
function dividirLinha(linha, separador) {
  const campos = [];
  let atual = '';
  let entreAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (entreAspas) {
      if (c === '"' && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else if (c === '"') {
        entreAspas = false;
      } else {
        atual += c;
      }
    } else if (c === '"') {
      entreAspas = true;
    } else if (c === separador) {
      campos.push(atual);
      atual = '';
    } else {
      atual += c;
    }
  }
  campos.push(atual);
  return campos.map((campo) => campo.trim());
}

// CSV com cabeçalho nome,inicio,fim,valor (as colunas podem vir em qualquer ordem).
// O separador pode ser vírgula ou ponto e vírgula (o Excel em português usa ;).
export function lerCSV(texto) {
  const linhas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((linha) => linha.trim() !== '');
  if (linhas.length === 0) throw new ErroDeValidacao(['O arquivo CSV está vazio.']);

  const separador = linhas[0].split(';').length > linhas[0].split(',').length ? ';' : ',';
  const cabecalho = dividirLinha(linhas[0], separador).map((c) => c.toLowerCase());
  const faltando = COLUNAS.filter((coluna) => !cabecalho.includes(coluna));
  if (faltando.length > 0) {
    throw new ErroDeValidacao([
      `O cabeçalho do CSV precisa ter as colunas ${COLUNAS.join(', ')}. Faltando: ${faltando.join(', ')}.`,
    ]);
  }
  if (linhas.length === 1) throw new ErroDeValidacao(['O arquivo não tem nenhuma tarefa.']);

  const lista = linhas.slice(1).map((linha) => {
    const campos = dividirLinha(linha, separador);
    return Object.fromEntries(cabecalho.map((coluna, i) => [coluna, campos[i] ?? '']));
  });
  return carregarTarefas(lista);
}

// Escolhe o leitor pela extensão do nome do arquivo (.json ou .csv).
export function lerArquivo(nome, texto) {
  const extensao = nome.toLowerCase().split('.').pop();
  if (extensao === 'json') return lerJSON(texto);
  if (extensao === 'csv') return lerCSV(texto);
  throw new ErroDeValidacao([`Formato não suportado (".${extensao}"): use um arquivo .json ou .csv.`]);
}
