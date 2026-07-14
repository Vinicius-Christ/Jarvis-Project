---
keywords: [financeiro, finanças, transações, receitas, despesas, saldo, gráficos, recharts, timezone, data, fuso horário, saldo guardado, metas, kpi]
---

# Arquitetura do Módulo Financeiro

Este arquivo descreve as regras de negócio, layouts e funcionamento técnico do sistema financeiro da Dashboard do Jarvis.

## Cálculos e Estado de Transações
- **Banco de Dados**: Os dados financeiros são persistidos localmente na tabela SQL `Finance` via ORM Prisma.
- **Tipos de Lançamento**: Permite entradas classificadas como `"Receita"` ou `"Despesa"`.
- **Saldo Global Guardado**: Calculado dinamicamente somando todas as transações de receitas e subtraindo a soma de todas as despesas.
- **Visualização**: Dashboards e progressão histórica utilizam a biblioteca de gráficos e gráficos de linha do `Recharts`.

## Regras de Negócio do Dashboard
- **Janela Contínua**: O gráfico de evolução histórica deve obrigatoriamente preencher os últimos 6 meses (do mês vigente retrospectivamente). Caso não existam lançamentos em determinado mês, preencher o montante com valor `0` para que a linha visual do gráfico permaneça contínua e sem quebras.
- **Tratamento de Fusos Horários (Timezones)**: Datas de lançamentos são processadas de forma isolada extraindo diretamente a tripla `[YYYY, MM, DD]` da string (como `2024-06-15T00:00:00Z`). Use `new Date(year, month-1, day)` para instanciar o objeto sem sofrer com desvios locais de fusos horários de rede que possam retroceder o lançamento em um dia anterior.
- **KPIs do Cabeçalho**: O painel exibe no topo o Total de Receitas, Total de Despesas e o Saldo Consolidado.
- **Ordenação**: Linhas exibidas na tabela histórica seguem ordenação cronologicamente decrescente (do lançamento mais recente para o mais antigo).
