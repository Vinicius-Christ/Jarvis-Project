filters:
  and:
    - file.hasTag("finance")
    - file.hasTag("meta")

formulas:
  days_active: '(now() - file.ctime).days'
  status_icon: 'if(status == "em andamento", "🟡", if(status == "concluído", "🟢", "🔴"))'

properties:
  formula.status_icon:
    displayName: Status
  formula.days_active:
    displayName: "Dias Ativos"

views:
  - type: table
    name: "Visão Geral de Metas"
    order:
      - file.name
      - formula.status_icon
      - formula.days_active
      - date