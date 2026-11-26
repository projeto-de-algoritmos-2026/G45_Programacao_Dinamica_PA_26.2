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
src/agendador.js      algoritmo (PD), sem nada de interface — testável sozinho
src/app.js            interface: lê as tarefas da tela e mostra o resultado
src/estilo.css        estilos
tests/                testes automatizados (node --test)
scripts/servidor.js   servidor local para o `npm start`
```
