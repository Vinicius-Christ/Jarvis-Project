---
keywords: [regras, jarvis, comportamento, conduta, desenvolvimento, frontend, backend, react, vite, tailwindcss, prisma, sqlite, design, performance, useMemo, useCallback, exclusao, delecao, xml, mcp]
---

# Regras de Comportamento e Desenvolvimento do JARVIS

Este é o arquivo central de restrições operacionais e padrões de desenvolvimento do Jarvis.

## 1. Regras de Eficiência e Comunicação da IA
- **Objetividade**: Aja de forma assertiva e direta em todas as interações.
- **Retorno Limpo**: Evite textos prolixos ou repetições robotizadas de cortesia.
- **Autonomia de Comando**: Emita comandos XML correspondentes (`<command type="..." />`) imediatamente ao receber solicitações de criação, atualização, deleção, alteração ou automação física (IoT/PC).

## 2. Padrões de Desenvolvimento de Código (Stack)
- **Frontend**: Desenvolvido em **React**, **Vite** e **TailwindCSS**.
- **Backend/Banco**: Utiliza **TypeScript**, **Express** e **Prisma** rodando sobre um adaptador do **SQLite** local (mais otimizado).
- **Performance**: Manter o render do React otimizado com o uso estrito de `useMemo` e `useCallback` onde necessário, prevenindo re-renderizações e garantindo fluidez táctil da dashboard.
- **UX/Design**: Interface escura (dark mode) baseada no design system "Liquid Glass" (estilo holográfico deep purple/glassmorphic) com gráficos avançados usando `Recharts`.

## 3. Gestão de Contexto e Memórias (RAG)
- A base de conhecimento em memória do Jarvis sincroniza arquivos markdown diretamente da pasta local física `vault/` (ou do caminho customizado).
- Sempre consulte estas regras e o contexto antes de realizar alterações nas rotas das APIs do backend ou componentes visuais do dashboard.
