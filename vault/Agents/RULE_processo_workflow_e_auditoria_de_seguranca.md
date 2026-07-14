---
keywords: [segurança, auditoria, segredos, chaves api, credenciais, workflow, processo, dataview, fluxo, ciclo, feedback]
---

# Diretrizes de Processo, Workflow de IA e Auditoria de Segurança

Este documento consolida as melhores práticas descritas para o fluxo de inteligência, segurança e monitoramento contínuo dos Agentes do Jarvis.

## 🔄 1. Ciclo de Workflow Integrado
Para manter o cérebro cognitivo do Jarvis enriquecido e evoluindo, siga o seguinte ciclo de três etapas a cada novo caso complexo:

1.  **Exploração (Obsidian)**: Desafios arquiteturais complexos devem ser desenhados e documentados primeiro em arquivos de design de solução (na pasta `/Codebase` ou `/Concepts`) vinculados via links bidirecionais (`[[link]]`).
2.  **Codificação (Projeto)**: O desenvolvedor / agente escreve o código no sistema físico e atualiza/integra as regras técnicas nas skills isoladas dentro da pasta do projeto (`.agents/skills/`).
3.  **Refinamento (Feedback Loop)**: Ao concluir uma tarefa, crie ou atualize um arquivo `refinamento.md` dentro de cada respectiva pasta de skill, anotando o que foi eficaz e o que não funcionou. O Jarvis deve ler esses feedbacks no início de tarefas correlatas futuras para evitar regressões.

---

## 🔒 2. Diretrizes de Segurança (Vault Secreto & Auditoria)

### Vault Secreto
- **Proibido Salvar Credenciais no Obsidian**: Nenhuma nota de Markdown do Obsidian deve conter chaves de API cruas, segredos, senhas ou tokens de autenticação privados (como chaves Groq, tokens Home Assistant, etc.).
- **Local de Armazenamento**: Todos os segredos devem ser isolados em variáveis de ambiente dentro do arquivo `.env` do projeto (carregado silenciadamente via Docker / Node.js) ou gerenciados utilizando serviços robustos de encriptação (Keys/Secrets Vaults).

### Agente Auditor
- **Auditoria de Conformidade**: Como o Jarvis contém lógica direcionada a hacking ético (ex: scripts em `.agents/skills/`), deve existir um agente auditor executando rotinas períodicas para ler as notas de segurança (ex: padrões de segurança como "Prevenção a Injeção SQL" ou "Broken Authentication") e realizar a varredura (linter cognitiva) no código real do backend para checar se ele obedece às notas de comportamento descritas.

---

## 📊 3. Sincronização & Dataview (Obsidian)
Você pode utilizar o seguinte snippet do plugin **Dataview** no Obsidian para listar seus agentes e acompanhar suas tarefas:

```dataview
TABLE owner, status
FROM "Agents/Skills"
WHERE status = "in-development"
```
Isso fornecerá um dashboard de monitoramento de status diretamente dentro de suas anotações visuais.
