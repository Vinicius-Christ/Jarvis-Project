# Arquitetura do Módulo Financeiro

## Cálculos e Estado
- Os dados financeiros são armazenados no banco SQLite via Prisma (tabela `Finance`).
- Os tipos de transações são "Receita" ou "Despesa".
- O cálculo do saldo guarda-chuva (`guardado`) é feito iterando todas as receitas e subtraindo todas as despesas.
- Gráficos usam a biblioteca `recharts`.

## Regras de Negócio do Dashboard
- **Janela Contínua:** O gráfico de evolução deve *sempre* mostrar uma janela de 6 meses (do mês atual para trás), preenchendo meses vazios com 0, para garantir que a linha do gráfico seja contínua.
- **Fusos Horários:** Datas são processadas extraindo `[YYYY, MM, DD]` diretamente da string (ex: `2024-06-15T00:00:00Z`) e usando `new Date(year, month-1, day)` para evitar que o fuso horário local jogue o lançamento para o dia anterior.
- **KPIs Topo:** O dashboard mostra de forma rápida o Total de Receitas, Total de Despesas e o Saldo Atual.
- **Ordenação:** A tabela lista do lançamento mais recente para o mais antigo.
