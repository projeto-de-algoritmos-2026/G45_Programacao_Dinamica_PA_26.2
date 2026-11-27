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

## Como usar

1. Cadastre as tarefas no formulário (nome, início, fim e valor) ou use **Carregar exemplo** / **Importar arquivo** (`.json` ou `.csv`, formato abaixo). Cada tarefa da lista pode ser editada ou removida.
2. Clique em **Otimizar agenda**.
3. A tela mostra o valor total, as tarefas escolhidas em ordem cronológica e as que ficaram de fora. Se a lista mudar depois disso, o resultado fica marcado como desatualizado até otimizar de novo.

Entradas inválidas (fim antes do início, valor negativo, campo vazio, arquivo com erro) aparecem como mensagens logo abaixo do formulário ou dos botões de arquivo, sem apagar o que já estava na lista.

## Testes

```bash
npm test
```

Roda todos os testes de `tests/` com o `node --test`, sem instalar nada. Eles cobrem:

- validação da entrada e leitura de JSON/CSV;
- ordenação e `p(j)`, comparados com uma busca ingênua;
- a PD e a reconstrução, com exemplos conferidos à mão;
- casos de borda: lista vazia, uma tarefa, nenhuma sobreposição, tudo sobreposto, tarefas que encostam, empates de valor e horários idênticos;
- um caso em que o guloso (pegar a de maior valor primeiro) erra e a PD acerta;
- PD × força bruta (todos os subconjuntos, `src/comparacao.js`) em 800 entradas aleatórias de até 15 tarefas.

## Estrutura

```
index.html            página principal
src/tarefa.js         modelo da tarefa, conversão de horários, validação e regra de sobreposição
src/entrada.js        leitura de tarefas de arquivos JSON e CSV
src/agendador.js      algoritmo (PD), sem nada de interface — testável sozinho
src/comparacao.js     força bruta e guloso por valor, para comparar com a PD
src/app.js            interface: lê as tarefas da tela e mostra o resultado
src/estilo.css        estilos
exemplos/             agendas prontas para carregar na interface
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

4. Reconstrói a agenda lendo `M` de trás para frente, sem recalcular a PD: a partir de `j = n`, se `valor(j) + M[p(j)] >= M[j-1]`, a tarefa `j` entra e o próximo é `p(j)`; senão, passa para `j - 1`. As escolhidas saem em ordem cronológica.

O valor máximo é `M[n]`. A ordenação e as buscas binárias custam O(n log n); a PD e a reconstrução são O(n). Há também uma versão recursiva com memoização (`calcularTabelaMemo`), só para comparação.

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
