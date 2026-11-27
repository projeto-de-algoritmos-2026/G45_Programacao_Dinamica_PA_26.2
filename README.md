# Agendador de Lives — Weighted Interval Scheduling

**Disciplina:** Projeto de Algoritmos 2026.2
**Grupo:** G45
**Assunto:** Programação Dinâmica

## Integrantes

| Nome | Matrícula |
|---|---|
| Matheus Lemes Amaral | 241031852 |
| Marcos | _a preencher_ |

## Sobre

Cada live (ou tarefa) tem um horário de início, um horário de fim e um valor (audiência, cachê, prioridade). Não dá para fazer duas ao mesmo tempo. O agendador usa Programação Dinâmica para escolher o conjunto de lives **sem sobreposição** que rende o **maior valor total**.

## Stack

- HTML + CSS + JavaScript puro (módulos ES), sem dependências e sem build
- [Node.js](https://nodejs.org/) 20 ou mais novo, só para servir a página e rodar os testes

## Como rodar

```bash
npm start
```

Abra http://localhost:8000 no navegador. (Para usar outra porta: `PORT=3000 npm start`.)

## Testes

```bash
npm test
```

## Estrutura

```
index.html            página principal
src/tarefa.js         modelo da tarefa, conversão de horários, validação e regra de sobreposição
src/entrada.js        leitura de tarefas de arquivos JSON e CSV
src/agendador.js      algoritmo (PD), sem nada de interface — testável sozinho
src/app.js            interface: lê as tarefas da tela e mostra o resultado
src/estilo.css        estilos
tests/                testes automatizados (node --test)
scripts/servidor.js   servidor local para o `npm start`
```

## Algoritmo

1. Ordena as tarefas pelo horário de término.
2. Calcula `p(j)`, a última tarefa que termina até o início da tarefa `j` (0 se não existe), com busca binária.
3. Preenche a tabela `M` de baixo para cima:

```
M[0] = 0
M[j] = max( valor(j) + M[p(j)],   pega a tarefa j
            M[j-1] )              pula a tarefa j
```

O valor máximo é `M[n]`. A ordenação e as buscas binárias custam O(n log n); a PD em si é O(n). Há também uma versão recursiva com memoização (`calcularTabelaMemo`), só para comparação.

## Formato das tarefas

Cada tarefa tem `nome`, `inicio`, `fim` (`HH:MM`, de `00:00` a `24:00`) e `valor` (número maior ou igual a zero). Tarefas que encostam (uma termina às 15:00 e a outra começa às 15:00) **não** se sobrepõem.

JSON (`.json`): lista de tarefas ou `{ "tarefas": [...] }`.

```json
[{ "nome": "Live de lançamento", "inicio": "14:00", "fim": "15:30", "valor": 10 }]
```

CSV (`.csv`): cabeçalho `nome,inicio,fim,valor`, separador vírgula ou ponto e vírgula.

```csv
nome,inicio,fim,valor
Live de lançamento,14:00,15:30,10
```

Entradas inválidas geram mensagens indicando a tarefa e o campo com problema.
