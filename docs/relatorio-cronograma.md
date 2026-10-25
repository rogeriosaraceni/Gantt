# Relatório de Atendimento — Módulo de Cronograma (Gantt)
**Data:** 25/10/2026
**Projeto:** Terral — Sistema de Gestão de Cronograma

---

## Resumo Executivo

Foram analisados e tratados 9 itens levantados na reunião de alinhamento. Dos 9 itens, **7 foram corrigidos ou implementados** nesta sprint. Os 2 itens restantes foram revisados, confirmados como já implementados e documentados para validação em ambiente de homologação.

| # | Demanda | Status |
|---|---------|--------|
| 1 | Remover mensagem durante criação do cronograma | ✅ Corrigido |
| 2 | Ajuste automático de data ao selecionar predecessora | ✅ Corrigido |
| 3 | Validar numeração/código ao alterar ordem | ✅ Corrigido |
| 4 | Corrigir alteração da data planejada | ✅ Corrigido |
| 5 | Revisar atualização automática do planejamento | ✅ Validado — já implementado |
| 6 | Indicação visual de caminho crítico | ✅ Implementado |
| 7 | Padronizar cores do cronograma | ✅ Implementado |
| 8 | Regra do caminho crítico com predecessoras e folga | ✅ Implementado |
| 9 | Revisar nomenclatura "Real" / "Atrasado" | ✅ Corrigido |

---

## Detalhamento por Item

---

### ✅ Demanda 1 — Remover mensagem durante criação inicial do cronograma

**Problema relatado:**
Ao construir o cronograma pela primeira vez, aparecia uma mensagem de impacto no prazo final, mesmo sem haver uma linha de base consolidada para comparação.

**Causa identificada:**
A lógica de verificação de atraso (`verificarAtraso`) era acionada mesmo quando a tarefa ainda não possuía dados reais ou linha de base salva. Qualquer tarefa criada com data de fim no passado ativava o alerta indevidamente.

**Correção aplicada:**
A função foi refatorada para avaliar duas condições distintas e mutuamente exclusivas:
- **Caso 1:** A data de fim real registrada é posterior à data de fim planejada.
- **Caso 2:** A data de fim planejada já passou, o progresso ainda não é 100% e não há data de fim real registrada.

Com isso, tarefas em criação, sem dados reais ou sem linha de base, não ativam mais o alerta.

---

### ✅ Demanda 2 — Ajuste automático de data ao selecionar predecessora

**Problema relatado:**
Ao vincular uma predecessora a uma atividade, a data de início da atividade sucessora não era recalculada automaticamente com base no término da predecessora.

**Causa identificada:**
O replanejamento automático não era disparado imediatamente após a seleção de uma predecessora no campo de múltipla seleção. A lógica de propagação existia, mas não era acionada no evento correto.

**Correção aplicada:**
O evento de alteração do campo de predecessoras (`pred-select`) foi ajustado para acionar imediatamente o replanejamento automático (`reagendar`). Agora, ao selecionar ou remover uma predecessora, a data de início da atividade sucessora é recalculada automaticamente com base no término da predecessora selecionada.

---

### ✅ Demanda 3 — Validar numeração/código ao alterar ordem

**Problema relatado:**
Ao reorganizar atividades (indentar/desindentar), o código/numeração das atividades era alterado de forma indevida e podia afetar o relacionamento entre predecessoras.

**Causa identificada — dois bugs distintos:**

**Bug A:** Ao indentar ou desindentar uma atividade, o sistema reordenava todas as tarefas por data de início logo em seguida (`ordenarTarefasPorData`), desfazendo visualmente a hierarquia que o usuário acabava de definir.

**Bug B:** A função `removerPredecessorasInvalidas` eliminava vínculos de predecessora sempre que a data de início da predecessora era posterior à data de início da tarefa dependente — o que pode ocorrer temporariamente durante a edição do cronograma. Isso apagava silenciosamente relacionamentos válidos.

**Correção aplicada:**

- **Bug A:** Ao executar indentar/desindentar, o `renderizar` agora é chamado com o parâmetro `preservarOrdem: true`, mantendo a ordem hierárquica definida pelo usuário.
- **Bug B:** A função `removerPredecessorasInvalidas` foi reescrita para remover **apenas** vínculos que apontam para tarefas excluídas ou que formariam **ciclos** (ex.: A depende de B e B depende de A). Relações com inversão temporal temporária são preservadas.

> **Nota:** A numeração (`1`, `1.1`, `1.1.1`, etc.) é puramente visual e recalculada a cada renderização. Os relacionamentos de predecessoras são armazenados por **ID interno estável**, garantindo que nenhuma renumeração afeta os vínculos.

---

### ✅ Demanda 4 — Corrigir alteração da data planejada

**Problema relatado:**
Ao alterar uma data do planejamento e confirmar a mensagem de ajuste, a nova data não era aplicada. No teste relatado, uma linha com data `16/10/2026` permanecia sem alteração mesmo após a confirmação.

**Causa identificada:**
Na função `aplicarAjuste`, após o usuário confirmar a nova data, a função de replanejamento automático (`reagendar`) era chamada e sobrescrevia o valor que o usuário acabava de confirmar, devolvendo o campo ao estado anterior.

**Correção aplicada:**
A data confirmada pelo usuário é agora gravada explicitamente no estado interno da tarefa **antes** de o replanejamento ser executado. Dessa forma, `reagendar` parte do novo valor confirmado, em vez de sobrescrevê-lo.

---

### ✅ Demanda 5 — Revisar atualização automática do planejamento

**Status:** Validado como já implementado.

**O que foi verificado:**
A lógica de replanejamento automático (`reagendar`) percorre a cadeia de sucessoras de cada tarefa e propaga datas de início e fim sempre que uma predecessora é alterada. Isso inclui cenários em que dados realizados afetam o planejamento.

A função opera em dois ciclos:
1. Propaga para atividades sem data de início que dependem de uma predecessora.
2. Propaga para atividades cujo início planejado ficou anterior ao fim da predecessora.

**Recomendação:** Validar em homologação com combinações de atividades com e sem data real, para garantir estabilidade em todos os cenários.

---

### ✅ Demanda 6 — Indicação visual de caminho crítico

**Status:** Implementado.

**O que foi implementado:**
As atividades pertencentes ao caminho crítico são destacadas visualmente na barra do cronograma (lado direito/timeline). Não há ícone adicional na tabela da esquerda — apenas a mudança de cor na barra, conforme alinhado na reunião.

A identificação é feita pelo algoritmo CPM (*Critical Path Method*), com passagem para frente (*Forward Pass*) e passagem para trás (*Backward Pass*), calculando a folga total de cada atividade.

---

### ✅ Demanda 7 — Padronizar cores do cronograma

**Status:** Implementado.

**Paleta definida e aplicada:**

| Tipo de barra | Cor |
|---|---|
| Planejado (linha de base) | Azul |
| Real (execução em andamento) | Azul |
| Caminho crítico | 🟠 Laranja (`#fd7e14`) |
| Atrasado | Vermelho |
| Impedimento | Indicador específico |
| Risco | Indicador específico |

> A barra de planejado (linha de base) permanece azul mesmo quando a atividade está no caminho crítico. Apenas a barra de execução real assume a cor laranja para atividades críticas, conforme definição do protótipo Terral.

---

### ✅ Demanda 8 — Regra do caminho crítico com predecessoras e folga

**Status:** Implementado.

**O que foi implementado:**
O cálculo segue o método CPM padrão:

1. **Forward Pass:** calcula o início mais cedo (ES) e o fim mais cedo (EF) de cada atividade, respeitando o encadeamento de predecessoras.
2. **Backward Pass:** calcula o início mais tarde (LS) e o fim mais tarde (LF) sem atrasar o projeto.
3. **Folga Total:** `LS − ES`. Atividades com folga zero (ou negativa) pertencem ao caminho crítico.

Atividades com folga positiva **não** são marcadas como críticas, mesmo que estejam atrasadas — elas têm margem para absorver o atraso sem impactar o prazo final do projeto.

---

### ✅ Demanda 9 — Revisar nomenclatura "Real" / "Atrasado"

**Problema relatado:**
A indicação "Real" em determinados contextos não deixava claro que a atividade já havia ultrapassado sua data prevista sem ser concluída.

**Correção aplicada:**
A legenda e os indicadores visuais foram revisados. Atividades que ultrapassaram a data planejada sem conclusão são exibidas com o indicador **"Atrasado"** (em vermelho). A categoria **"Real"** permanece para registros de execução que ainda estão dentro do prazo. A legenda do painel foi ajustada para refletir essa distinção: `Linha de base | Real | Atrasado | Caminho Crítico | Impedimento | Risco | Hoje`.

---

## Próximos Passos Recomendados

1. **Homologação completa** de todas as demandas em ambiente de teste com dados reais do cliente.
2. **Validação de Demanda 5** com cenários variados (atividades sem data, com data real anterior/posterior ao planejado, encadeamentos de 3+ níveis).
3. **Teste de regressão** do caminho crítico com projetos de diferentes portes para verificar performance do algoritmo CPM.
4. **Alinhamento final de UX** sobre a nomenclatura "Real" vs. "Atrasado" com as partes interessadas antes de publicar em produção.

---

*Relatório gerado em 25/10/2026 — Equipe de Desenvolvimento Terral*
