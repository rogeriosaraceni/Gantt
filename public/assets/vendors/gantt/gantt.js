$(function () {

    // ---------------------------------------------------------------
    // ESTADO E VARIÁVEIS
    // ---------------------------------------------------------------

    const estado = {
        tasks: [],
        baselines: []
    };

    const responsaveis = [
        "Ana Paula Silva",
        "Ricardo Alves",
        "Juliana Martins",
        "Thiago Souza",
        "Camila Ferreira",
        "Carlos Mendes",
        "Eduardo Santos",
        "Lanna Souza",
        "Marcos Lima",
        "Beatriz Nunes",
        "Rafael Costa",
        "Patrícia Gomes",
    ];

    let escalaAtual = "month";
    let compararLinhaBase = false;
    let proximoId = 100;
    let idParaExcluir = null;
    let periodosCache = null;
    let predAberto = null;

    // ---------------------------------------------------------------
    // UTILITÁRIOS GERAIS
    // ---------------------------------------------------------------

    function escaparHtml(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    // ---------------------------------------------------------------
    // UTILITÁRIOS DE DATA
    // ---------------------------------------------------------------

    function analisarData(texto) {
        if (!texto) return null;
        const [ano, mes, dia] = texto.split("-").map(Number);
        return new Date(ano, mes - 1, dia);
    }

    function paraISO(objetoData) {
        if (!objetoData) return "";
        const ano = objetoData.getFullYear();
        const mes = String(objetoData.getMonth() + 1).padStart(2, "0");
        const dia = String(objetoData.getDate()).padStart(2, "0");
        return `${ano}-${mes}-${dia}`;
    }

    function formatarDataBR(textoISO) {
        if (!textoISO) return "";
        const [ano, mes, dia] = textoISO.split("-");
        if (!ano || !mes || !dia) return textoISO;
        return `${dia}/${mes}/${ano}`;
    }

    function adicionarDias(dataInicial, dias) {
        const res = new Date(dataInicial);
        res.setDate(res.getDate() + dias);
        return res;
    }

    function inicioDaSemana(data) {
        const dataSegunda = new Date(data);
        const diaDaSemana = dataSegunda.getDay();
        const diasAteSegunda = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;
        dataSegunda.setDate(dataSegunda.getDate() + diasAteSegunda);
        dataSegunda.setHours(0, 0, 0, 0);
        return dataSegunda;
    }

    function inicioDoMes(data) {
        return new Date(data.getFullYear(), data.getMonth(), 1);
    }

    function inicioDoAno(data) {
        return new Date(data.getFullYear(), 0, 1);
    }

    function diferencaDias(dataInicial, dataFinal) {
        const msPorDia = 86400000;
        return Math.round((dataFinal - dataInicial) / msPorDia);
    }

    function obterSemanaISO(data) {
        const dataUtc = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
        const diaDaSemana = dataUtc.getUTCDay() || 7;
        dataUtc.setUTCDate(dataUtc.getUTCDate() + 4 - diaDaSemana);
        const dataInicioAno = new Date(Date.UTC(dataUtc.getUTCFullYear(), 0, 1));
        return Math.ceil(((dataUtc - dataInicioAno) / 86400000 + 1) / 7);
    }

    const textoIntervalo = ([ini, fim], aberto = false) =>
        ini ? `${formatarDataBR(ini)} — ${fim && !aberto ? formatarDataBR(fim) : "…"}` : "—";

    // ---------------------------------------------------------------
    // TAREFAS, GRUPOS E NUMERAÇÃO
    // ---------------------------------------------------------------

    const buscarTarefa = (id) => estado.tasks.find((t) => t.id === id);

    function filhasDoGrupo(grupo) {
        const filhas = [];
        for (let i = estado.tasks.indexOf(grupo) + 1; i < estado.tasks.length && !estado.tasks[i].group; i++) {
            filhas.push(estado.tasks[i]);
        }
        return filhas;
    }

    function recalcularNumeracao() {
        let contadorGrupo = 0;
        let contadorFilha = 0;

        estado.tasks.forEach((tarefa) => {
            if (tarefa.group) {
                contadorGrupo++;
                contadorFilha = 0;
                tarefa.no = `${contadorGrupo}.0`;
            } else {
                if (contadorGrupo === 0) contadorGrupo = 1;
                contadorFilha++;
                tarefa.no = `${contadorGrupo}.${contadorFilha}`;
            }
        });
    }

    function reordenarNumeracao() {
        let grupoAtual = 0;
        let subItemAtual = 0;

        estado.tasks.forEach((t) => {
            if (t.group) {
                grupoAtual++;
                subItemAtual = 0;
                t.no = `${grupoAtual}`;
            } else {
                subItemAtual++;
                t.no = `${grupoAtual}.${subItemAtual}`;
            }
        });
    }

    function resumoGrupo(grupo) {
        const filhas = filhasDoGrupo(grupo);
        const hoje = paraISO(new Date());

        const faixa = (campo, fimPadrao = "") => {
            const comInicio = filhas.filter((t) => t[campo]?.[0]);
            return [
                comInicio.map((t) => t[campo][0]).sort()[0] || "",
                comInicio.map((t) => t[campo][1] || fimPadrao).filter(Boolean).sort().pop() || ""
            ];
        };

        const pesos = filhas.map((t) => {
            const [ini, fim] = t.planned || [];
            return ini && fim ? diferencaDias(analisarData(ini), analisarData(fim)) + 1 : 1;
        });
        const total = pesos.reduce((a, b) => a + b, 0);

        return {
            planned: faixa("planned"),
            baseline: faixa("baseline"),
            real: faixa("real", hoje),
            realAberto: filhas.some((t) => t.real?.[0] && !t.real?.[1]),
            progress: total ? Math.round(filhas.reduce((soma, t, i) => soma + (t.progress ?? 0) * pesos[i], 0) / total) : 0
        };
    }

    // --- REQUISITO 2: VERIFICAÇÃO DE ATRASO CORRIGIDA ---
    function verificarAtraso(tarefa) {
        if (tarefa.group) return filhasDoGrupo(tarefa).some(verificarAtraso);

        const dataFimPlan = analisarData(tarefa.planned?.[1]);
        if (!dataFimPlan) return false;

        const dataFimReal = analisarData(tarefa.real?.[1]);
        const progresso = Number(tarefa.progress) || 0;

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // Caso 2: Concluída com data final real posterior à planejada
        if (dataFimReal && dataFimReal > dataFimPlan) {
            return true;
        }

        // Caso 1: Data final planejada já venceu e a tarefa NÃO foi concluída
        // (Só é não concluída se NÃO tiver data real E o progresso for < 100%)
        const naoConcluida = progresso < 100 && !dataFimReal;
        if (hoje > dataFimPlan && naoConcluida) {
            return true;
        }

        return false;
    }

    // ---------------------------------------------------------------
    // CÁLCULO DO CAMINHO CRÍTICO (CPM - Critical Path Method)
    // ---------------------------------------------------------------
    function calcularCaminhoCritico() {
        estado.tasks.forEach((t) => (t.critical = false));

        const tarefasValidas = estado.tasks.filter(
            (t) => !t.group && t.planned?.[0] && t.planned?.[1] && analisarData(t.planned[0]) && analisarData(t.planned[1])
        );

        if (!tarefasValidas.length) return;

        const mapa = new Map();
        tarefasValidas.forEach((t) => {
            const dIni = analisarData(t.planned[0]);
            const dFim = analisarData(t.planned[1]);
            const duracao = Math.max(1, diferencaDias(dIni, dFim) + 1);

            mapa.set(t.id, {
                task: t,
                dIni: dIni,
                dFim: dFim,
                duracao: duracao,
                es: new Date(dIni),
                ef: new Date(dFim),
                ls: null,
                lf: null,
                pred: (t.pred || []).filter((pid) => tarefasValidas.some((v) => v.id === pid)),
                succ: []
            });
        });

        mapa.forEach((item, id) => {
            item.pred.forEach((pid) => {
                if (mapa.has(pid)) {
                    mapa.get(pid).succ.push(id);
                }
            });
        });

        for (let passo = 0; passo < tarefasValidas.length; passo++) {
            let mudou = false;
            mapa.forEach((item) => {
                let maxPredEF = null;
                item.pred.forEach((pid) => {
                    const predItem = mapa.get(pid);
                    if (predItem && predItem.ef) {
                        if (!maxPredEF || predItem.ef > maxPredEF) {
                            maxPredEF = predItem.ef;
                        }
                    }
                });

                if (maxPredEF) {
                    const esMinimo = adicionarDias(maxPredEF, 1);
                    const novoES = esMinimo > item.dIni ? esMinimo : item.dIni;
                    const novoEF = adicionarDias(novoES, item.duracao - 1);
                    if (novoES.getTime() !== item.es.getTime() || novoEF.getTime() !== item.ef.getTime()) {
                        item.es = novoES;
                        item.ef = novoEF;
                        mudou = true;
                    }
                }
            });
            if (!mudou) break;
        }

        let maxProjectEF = null;
        mapa.forEach((item) => {
            if (!maxProjectEF || item.ef > maxProjectEF) {
                maxProjectEF = new Date(item.ef);
            }
        });

        if (!maxProjectEF) return;

        mapa.forEach((item) => {
            if (item.succ.length === 0) {
                item.lf = new Date(maxProjectEF);
                item.ls = adicionarDias(item.lf, -(item.duracao - 1));
            }
        });

        for (let passo = 0; passo < tarefasValidas.length; passo++) {
            let mudou = false;
            mapa.forEach((item) => {
                if (item.succ.length > 0) {
                    let minSuccLS = null;
                    item.succ.forEach((sid) => {
                        const succItem = mapa.get(sid);
                        if (succItem && succItem.ls) {
                            if (!minSuccLS || succItem.ls < minSuccLS) {
                                minSuccLS = succItem.ls;
                            }
                        }
                    });

                    if (minSuccLS) {
                        const novoLF = adicionarDias(minSuccLS, -1);
                        const novoLS = adicionarDias(novoLF, -(item.duracao - 1));
                        if (!item.lf || novoLF.getTime() !== item.lf.getTime() || novoLS.getTime() !== item.ls.getTime()) {
                            item.lf = novoLF;
                            item.ls = novoLS;
                            mudou = true;
                        }
                    }
                }
            });
            if (!mudou) break;
        }

        mapa.forEach((item) => {
            if (item.lf && item.ef) {
                const folgaTotal = diferencaDias(item.ef, item.lf);
                if (folgaTotal <= 0) {
                    item.task.critical = true;
                }
            }
        });

        estado.tasks.forEach((t) => {
            if (t.group) {
                t.critical = filhasDoGrupo(t).some((f) => f.critical);
            }
        });
    }

    // ---------------------------------------------------------------
    // DEPENDÊNCIAS E REAGENDAMENTO AUTOMÁTICO (REQUISITO 3)
    // ---------------------------------------------------------------

    function dependeDe(idA, idB, vistos = new Set()) {
        if (vistos.has(idA)) return false;
        vistos.add(idA);
        return (buscarTarefa(idA)?.pred || []).some((p) => p === idB || dependeDe(p, idB, vistos));
    }

    function sucessorasSemInicio(id) {
        return estado.tasks
            .filter((s) => s.pred?.includes(id) && !s.planned?.[0])
            .map((s) => s.id);
    }

    // Retorna a data final efetiva/projetada da tarefa predecessora
    function obterFimEfetivo(tarefa) {
        if (!tarefa) return "";

        const [iniPlan, fimPlan] = tarefa.planned || [];
        const [iniReal, fimReal] = tarefa.real || [];

        // 1. Se possui término real informado, essa é a data de conclusão efetiva
        if (fimReal) return fimReal;

        // 2. Se iniciou no real, projeta o término mantendo a duração planejada original
        if (iniReal && iniPlan && fimPlan) {
            const duracao = diferencaDias(analisarData(iniPlan), analisarData(fimPlan));
            const fimProjetado = paraISO(adicionarDias(analisarData(iniReal), duracao));
            if (fimProjetado > fimPlan) return fimProjetado;
        }

        // 3. Se a data planejada já venceu e a tarefa não foi concluída, projeta o término a partir de HOJE
        const hoje = paraISO(new Date());
        if (fimPlan && hoje > fimPlan && (tarefa.progress ?? 0) < 100) {
            return hoje;
        }

        // 4. Caso padrão: data final planejada
        return fimPlan || "";
    }

    // Reagendamento automático considerando atrasos reais e mantendo duração prevista
    function reagendar(ids = []) {
        const forcar = new Set(ids);
        let moveu = false;
        estado.tasks.forEach((t) => (t.reagendada = false));

        for (let passo = 0; passo < estado.tasks.length; passo++) {
            let mudou = false;

            estado.tasks.forEach((t) => {
                if (t.group || !t.pred?.length) return;

                // Obtém a data de término efetiva (maior entre planejada e real/projetada) das predecessoras
                const fimPredecessora = t.pred
                    .map((id) => obterFimEfetivo(buscarTarefa(id)))
                    .filter(Boolean)
                    .sort()
                    .pop();
                if (!fimPredecessora) return;

                const [ini, fim] = t.planned || [];
                const novoInicio = paraISO(adicionarDias(analisarData(fimPredecessora), 1));
                const deveMover = forcar.has(t.id) || !ini || ini < novoInicio;
                if (!deveMover) return;

                // Mantém a duração original prevista da atividade
                let novoFim = novoInicio;
                if (ini && fim) {
                    const duracao = Math.max(0, diferencaDias(analisarData(ini), analisarData(fim)));
                    novoFim = paraISO(adicionarDias(analisarData(novoInicio), duracao));
                } else if (fim && fim >= novoInicio) {
                    novoFim = fim;
                }

                t.planned = [novoInicio, novoFim];
                t.reagendada = mudou = moveu = true;

                // Dispara em cadeia para quem depende desta tarefa
                forcar.add(t.id);
                sucessorasSemInicio(t.id).forEach((id) => forcar.add(id));
            });

            if (!mudou) break;
        }

        return moveu;
    }

    // Persiste o valor do input no objeto de estado
    function salvarValorNoEstado(inputEl) {
        const $input = $(inputEl);
        const $row = $input.closest("tr");
        const id = Number($row.data("id"));
        const task = buscarTarefa(id);
        if (!task) return null;

        const field = $input.data("field");
        const val = $input.val();

        if (field === "planned" || field === "real") {
            const index = Number($input.data("index"));
            if (!task[field]) task[field] = ["", ""];
            task[field][index] = val;

            // REGRA: Ao preencher a data de Fim Real (index 1), define o progresso para 100% automaticamente
            if (field === "real" && index === 1 && val.trim() !== "") {
                task.progress = 100;
            }
        } else if (field === "progress") {
            task.progress = Math.min(100, Math.max(0, Number(val) || 0));
        } else if (field === "pred") {
            task.pred = (val || []).map(Number).filter((pid) => pid !== task.id && !dependeDe(pid, task.id));
        } else {
            task[field] = val;
        }

        return { task, val };
    }

    // ---------------------------------------------------------------
    // TIMELINE: ESCALA, PERÍODOS E POSIÇÕES
    // ---------------------------------------------------------------

    function intervaloParaEscala() {
        const hoje = new Date();
        let dataMin = new Date(hoje.getFullYear(), hoje.getMonth() - 6, 1);
        let dataMax = new Date(hoje.getFullYear(), hoje.getMonth() + 7, 0);

        estado.tasks.forEach((tarefa) => {
            const todasDatas = [
                ...(tarefa.planned || []),
                ...(tarefa.baseline || []),
                ...(tarefa.real || [])
            ];
            todasDatas.forEach((textoData) => {
                const d = analisarData(textoData);
                if (!d) return;
                if (d < dataMin) dataMin = new Date(d);
                if (d > dataMax) dataMax = new Date(d);
            });
        });

        if (escalaAtual === "week") {
            dataMin = inicioDaSemana(adicionarDias(dataMin, -14));
            dataMax = inicioDaSemana(adicionarDias(dataMax, 14));
            dataMax = adicionarDias(dataMax, 6);
        } else if (escalaAtual === "month") {
            dataMin = inicioDoMes(adicionarDias(dataMin, -20));
            dataMax = new Date(dataMax.getFullYear(), dataMax.getMonth() + 2, 0);
        } else {
            dataMin = inicioDoAno(adicionarDias(dataMin, -60));
            dataMax = new Date(dataMax.getFullYear() + 1, 11, 31);
        }

        return { min: dataMin, max: dataMax };
    }

    function configuracaoUnidade() {
        if (escalaAtual === "week") return { unitDays: 7, width: 90 };
        if (escalaAtual === "year") return { unitDays: 365, width: 220 };
        return { unitDays: 30, width: 110 };
    }

    function calcularPeriodos() {
        const { min: dataMin, max: dataMax } = intervaloParaEscala();
        const configuracao = configuracaoUnidade();
        const listaPeriodos = [];

        if (escalaAtual === "week") {
            let dataAtual = inicioDaSemana(dataMin);
            while (dataAtual <= dataMax) {
                listaPeriodos.push({
                    start: new Date(dataAtual),
                    end: adicionarDias(dataAtual, 6),
                    label: `Sem. ${obterSemanaISO(dataAtual)} / ${String(dataAtual.getFullYear()).slice(-2)}`,
                });
                dataAtual = adicionarDias(dataAtual, 7);
            }
        } else if (escalaAtual === "month") {
            let dataAtual = inicioDoMes(dataMin);
            while (dataAtual <= dataMax) {
                listaPeriodos.push({
                    start: new Date(dataAtual),
                    end: new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0),
                    label: dataAtual.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", ""),
                });
                dataAtual = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 1);
            }
        } else {
            let dataAtual = inicioDoAno(dataMin);
            while (dataAtual <= dataMax) {
                listaPeriodos.push({
                    start: new Date(dataAtual),
                    end: new Date(dataAtual.getFullYear(), 11, 31),
                    label: `${dataAtual.getFullYear()}`,
                });
                dataAtual = new Date(dataAtual.getFullYear() + 1, 0, 1);
            }
        }

        return { arr: listaPeriodos, min: dataMin, max: dataMax, cfg: configuracao };
    }

    function periodos() {
        return periodosCache || (periodosCache = calcularPeriodos());
    }

    function posicaoParaData(textoData) {
        const dados = periodos();
        const d = analisarData(textoData);
        if (!d) return 0;
        const dias = diferencaDias(dados.min, d);
        return (dias / dados.cfg.unitDays) * dados.cfg.width;
    }

    function larguraParaIntervalo(textoIni, textoFim) {
        if (!textoIni || !textoFim) return 0;
        const dIni = analisarData(textoIni);
        const dFim = analisarData(textoFim);
        if (!dIni || !dFim) return 0;

        const cfg = configuracaoUnidade();
        const dias = diferencaDias(dIni, dFim) + 1;
        return Math.max(6, (dias / cfg.unitDays) * cfg.width);
    }

    // ---------------------------------------------------------------
    // HTML DAS LINHAS
    // ---------------------------------------------------------------

    function opcoesResponsavel(selecionado) {
        let html = '<option value="">—</option>';
        responsaveis.forEach((resp) => {
            html += `<option value="${escaparHtml(resp)}"${resp === selecionado ? " selected" : ""}>${escaparHtml(resp)}</option>`;
        });
        return html;
    }

    function opcoesPredecessora(tarefaAtual) {
        const selecionadas = [].concat(tarefaAtual.pred || []);

        return estado.tasks
            .filter((t) => !t.group && t.id !== tarefaAtual.id && !dependeDe(t.id, tarefaAtual.id))
            .map((t) => `<option value="${t.id}"${selecionadas.includes(t.id) ? " selected" : ""}>${escaparHtml(`${t.no} —${t.name}`)}</option>`)
            .join("");
    }

    function htmlIntervaloData(tarefa, tipo) {
        const datas = tarefa[tipo] || ["", ""];
        const val0 = (datas[0] || "").trim();
        const val1 = (datas[1] || "").trim();

        return `
            <div class="date-range">
                <input
                    type="date"
                    name="${tipo}"
                    class="form-control form-control-sm date-input"
                    data-field="${tipo}"
                    data-index="0"
                    min="2000-01-01"
                    max="2099-12-31"
                    value="${val0}"
                >
                <span>—</span>
                <input
                    type="date"
                    name="${tipo}"
                    class="form-control form-control-sm date-input"
                    data-field="${tipo}"
                    data-index="1"
                    min="2000-01-01"
                    max="2099-12-31"
                    value="${val1}"
                >
            </div>
        `;
    }

    function acoesHtml(t) {
        const proxima = estado.tasks[estado.tasks.indexOf(t) + 1];
        const mostrarAdd = t.group ? !filhasDoGrupo(t).length : !proxima || proxima.group;

        const botao = (acao, icone, cor, titulo) => `
            <button
                type="button"
                class="btn btn-link ${cor} p-0 border-0"
                data-btn="${acao}"
                data-id="${t.id}"
                data-bs-toggle="tooltip"
                data-bs-container="body"
                data-bs-title="${titulo}"
                aria-label="${titulo}"
            >
                <i class="bi ${icone} fs-6"></i>
            </button>
        `;

        return `
            <div class="d-flex justify-content-center align-items-center gap-2">
                <div class="actions-icons">
                    ${botao("delSubTarefa", "bi-trash", "text-danger", t.group ? "Excluir atividade" : "Excluir tarefa")}
                </div>

                <div class="actions-icons">
                    ${mostrarAdd ? botao("addSubTarefa", "bi-plus-lg", "text-primary", "Adicionar tarefa") : ""}
                </div>
            </div>
        `;
    }

    // ---------------------------------------------------------------
    // RENDERIZAÇÃO
    // ---------------------------------------------------------------

    function atualizarVisibilidadeColunas() {
        $(".column-toggle").each(function () {
            const colName = $(this).val();
            const visible = $(this).is(":checked");
            $(`.col-${colName}`).toggle(visible);
        });
    }

    function renderizarEsquerda() {
        const $body =$("#leftBody").empty();

        estado.tasks.forEach((tarefa) => {
            const isGroup = tarefa.group;
            const classeLinha = isGroup ? "group-row" : "child";
            const emAtraso = verificarAtraso(tarefa);
            const criticoAtrasado = isGroup
                ? filhasDoGrupo(tarefa).some((f) => verificarAtraso(f) && f.critical)
                : emAtraso && tarefa.critical;
            const atrasadoNormal = emAtraso && !criticoAtrasado;
            const resumo = isGroup ? resumoGrupo(tarefa) : null;
            const somenteLeitura = (texto) => `<span class="small text-secondary">${texto}</span>`;

            $body.append(`
                <tr class="${classeLinha}" data-id="${tarefa.id}">
                    <td class="text-center" style="width: 80px;">
                        ${acoesHtml(tarefa)}
                    </td>
                    <td class="text-center text-secondary">${escaparHtml(tarefa.no)}</td>
                    <td class="activity-cell">
                        <div class="d-flex align-items-center gap-1">
                            <input type="text" name="atividade" class="activity-input" data-field="name" data-id="${tarefa.id}" value="${escaparHtml(tarefa.name)}" ${isGroup ? 'style="font-weight:600"' : ""}>
                            ${criticoAtrasado ? '<i class="bi bi-exclamation-triangle-fill status-critical" data-bs-toggle="tooltip" data-bs-title="Caminho Crítico"></i>' : ""}
                            ${atrasadoNormal ? '<i class="bi bi-fire status-overdue" data-bs-toggle="tooltip" data-bs-title="Real Atrasado"></i>' : ""}
                            ${tarefa.reagendada ? '<i class="bi bi-arrow-repeat text-info" data-bs-toggle="tooltip" data-bs-title="Data ajustada pela predecessora"></i>' : ""}
                        </div>
                    </td>
                    <td class="col-owner">
                        ${isGroup ? "<span>—</span>" : `<select name="responsavel" class="owner-select" data-field="owner">${opcoesResponsavel(tarefa.owner)}</select>`}
                    </td>
                    <td class="col-planned text-center">
                        ${isGroup ? somenteLeitura(textoIntervalo(resumo.planned)) : htmlIntervaloData(tarefa, "planned")}
                    </td>
                    <td class="col-real text-center">
                        ${isGroup ? somenteLeitura(textoIntervalo(resumo.real, resumo.realAberto)) : htmlIntervaloData(tarefa, "real")}
                    </td>
                    <td class="col-predecessors">
                        ${isGroup ? "<span>—</span>" : `<select name="predecessoras" class="pred-select" data-field="pred" multiple>${opcoesPredecessora(tarefa)}</select>`}
                    </td>
                    <td class="col-progress">
                        ${isGroup ? somenteLeitura(`${resumo.progress}%`) : `<input type="number" name="percentual" min="0" max="100" class="progress-input" data-field="progress" value="${tarefa.progress ?? 0}">`}
                    </td>
                </tr>
            `);
        });

        atualizarVisibilidadeColunas();
    }

    function desenharSetas($body, totalWidth, linhas) {
        const cor = "#6c757d";
        const caminhos = [];

        estado.tasks.forEach((t) => {
            const [iniT, fimT] = t.planned || [];
            const rowT = linhas.get(t.id);
            if (t.group || !iniT || !fimT || !rowT) return;

            (t.pred || []).forEach((pid) => {
                const [iniP, fimP] = buscarTarefa(pid)?.planned || [];
                const rowP = linhas.get(pid);
                if (!iniP || !fimP || !rowP) return;

                const x1 = posicaoParaData(iniP) + larguraParaIntervalo(iniP, fimP);
                const y1 = rowP.offsetTop + rowP.offsetHeight / 2;
                const x2 = posicaoParaData(iniT);
                const y2 = rowT.offsetTop + rowT.offsetHeight / 2;

                const yBorda = y2 > y1 ? rowT.offsetTop : rowT.offsetTop + rowT.offsetHeight;
                const d = x2 >= x1 + 12
                    ? `M${x1},${y1} H${x1 + 6} V${y2} H${x2}`
                    : `M${x1},${y1} H${x1 + 6} V${yBorda} H${x2 - 8} V${y2} H${x2}`;

                caminhos.push(`<path d="${d}"/>`);
            });
        });

        if (!caminhos.length) return;

        $body.append(`
            <svg width="${totalWidth}" height="${$body[0].scrollHeight}" style="position:absolute; top:0; left:0; pointer-events:none; overflow:visible; z-index:5;">
                <defs>
                    <marker id="seta-dep" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M0,0 L8,4 L0,8 z" fill="${cor}"/>
                    </marker>
                </defs>
                <g fill="none" stroke="${cor}" stroke-width="0.75" marker-end="url(#seta-dep)">${caminhos.join("")}</g>
            </svg>
        `);
    }

    function renderizarDireita() {
        const p = periodos();
        const totalWidth = p.arr.length * p.cfg.width;
        const linhas = new Map();

        let headerHtml = `<div class="timeline-header d-flex" style="width:${totalWidth}px;">`;
        p.arr.forEach((per) => {
            headerHtml += `<div class="period-label" style="width:${p.cfg.width}px; flex: 0 0 ${p.cfg.width}px;">${per.label}</div>`;
        });
        headerHtml += `</div>`;
        $("#timelineHeader").html(headerHtml);

        const $body =$("#timelineBody").empty().css({ width: `${totalWidth}px`, position: "relative" });
        const posHoje = posicaoParaData(paraISO(new Date()));

        estado.tasks.forEach((tarefa) => {
            const $row =$(`<div class="timeline-row ${tarefa.group ? "group" : ""}" style="width:${totalWidth}px;"></div>`);
            const resumo = tarefa.group ? resumoGrupo(tarefa) : null;

            if (posHoje > 0 && posHoje < totalWidth) {
                $row.append(`<div class="today-line" style="left:${posHoje}px;"></div>`);
            }

            const baselineDates = resumo
                ? (compararLinhaBase ? resumo.baseline : resumo.planned)
                : (compararLinhaBase ? (tarefa.baseline || tarefa.planned) : tarefa.planned);

            if (baselineDates?.[0] && baselineDates?.[1]) {
                $row.append(`
                    <div
                        class="bar baseline-bar"
                        style="left:${posicaoParaData(baselineDates[0])}px; width:${larguraParaIntervalo(baselineDates[0], baselineDates[1])}px;"
                        data-bs-toggle="tooltip"
                        data-bs-title="Linha de Base${tarefa.group ? " (consolidado)" : ""}: ${formatarDataBR(baselineDates[0])} a ${formatarDataBR(baselineDates[1])}"
                    ></div>
                `);
            }

            const datasReal = resumo ? resumo.real : (tarefa.real || []);
            const dataInicioBarra = datasReal[0];

            if (dataInicioBarra) {
                const dataFimBarra = datasReal[1] || paraISO(new Date());
                const emAtraso = verificarAtraso(tarefa);
                const criticoAtrasado = tarefa.group
                    ? filhasDoGrupo(tarefa).some((f) => verificarAtraso(f) && f.critical)
                    : emAtraso && tarefa.critical;

                let barClass = tarefa.group ? "bar group-bar" : "bar task-bar";
                if (criticoAtrasado) barClass += " critical";
                else if (emAtraso) barClass += " overdue";

                const pct = Math.min(100, Math.max(0, resumo ? resumo.progress : (tarefa.progress ?? 0)));
                const sufixo = `${tarefa.group ? " (consolidado)" : ""} (${pct}%) - ${formatarDataBR(dataInicioBarra)} a ${formatarDataBR(dataFimBarra)}`;

                $row.append(`
                    <div
                        class="${barClass}"
                        style="left:${posicaoParaData(dataInicioBarra)}px; width:${larguraParaIntervalo(dataInicioBarra, dataFimBarra)}px;"
                        data-task-id="${tarefa.id}"
                        data-suffix="${escaparHtml(sufixo)}"
                        data-bs-toggle="tooltip"
                        data-bs-title="${escaparHtml(tarefa.name + sufixo)}"
                    >
                        <div class="progress-fill" style="width:${pct}%;"></div>
                    </div>
                `);
            }

            $body.append($row);
            linhas.set(tarefa.id, $row[0]);
        });

        desenharSetas($body, totalWidth, linhas);
    }

    function iniciarPredecessoras() {
        $(".pred-select").each(function () {
            const el = this;

            $(el).multipleSelect({
                width: "100%",
                dropWidth: 320,
                maxHeight: 250,
                placeholder: "Nenhuma",
                selectAll: false,
                minimumCountSelected: 2,
                onOpen: () => (predAberto = el),
                onClose: () => {
                    predAberto = null;

                    const antes = JSON.stringify(buscarTarefa(Number($(el).closest("tr").data("id")))?.pred);
                    const res = salvarValorNoEstado(el);
                    if (!res || JSON.stringify(res.task.pred) === antes) return;

                    reagendar([res.task.id]);
                    setTimeout(renderizar);
                }
            });
        });
    }

    function renderizar() {
        periodosCache = null;
        predAberto = null;

        $('[data-bs-toggle="tooltip"]').tooltip("dispose");
        $('.tooltip').remove();$(".pred-select").multipleSelect("destroy");

        $("#leftBody").empty();
        $("#rightBody").empty();

        recalcularNumeracao();
        calcularCaminhoCritico();
        renderizarEsquerda();
        renderizarDireita();

        if (typeof tooltipsBootstrap === "function") {
            tooltipsBootstrap();
        } else {
            $('[data-bs-toggle="tooltip"]').tooltip();
        }

        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

        iniciarPredecessoras();
    }

    // ---------------------------------------------------------------
    // EVENTOS
    // ---------------------------------------------------------------

    $(document).on("input", ".activity-input, .progress-input, .date-input", function () {
        salvarValorNoEstado(this);
    });

    $(document).on("change", ".owner-select", function () {
        salvarValorNoEstado(this);
        renderizar();
    });

    // Digitação no input de progresso atualiza o estado em tempo real
    $(document).on("input", ".progress-input", function () {
        salvarValorNoEstado(this);
    });

    // Alteração final no progresso ou data dispara recálculo dos grupos e do gráfico
    $(document).on("change", ".progress-input", function () {
        salvarValorNoEstado(this);
        renderizar();
    });

    // Atualização de datas: re-renderiza e dispara o reagendamento em cadeia (tanto para planned quanto para real)
    $(document).on("change", ".date-input", function () {
        const res = salvarValorNoEstado(this);
        if (!res) return;

        const partes = res.val.split("-");
        if (res.val && !(partes.length === 3 && partes[0].length === 4)) return;

        reagendar([res.task.id]);
        renderizar(); // Atualiza os percentuais dos grupos e as barras no Gantt
    });

    $(document).on("input", ".activity-input", function () {
        const id = Number($(this).closest("tr").data("id"));
        const nome = $(this).val();

        $(`.bar[data-task-id="${id}"]`).each(function () {
            const titulo = nome + $(this).attr("data-suffix");
            $(this).attr("data-bs-title", titulo);
            bootstrap.Tooltip.getInstance(this)?.setContent?.({ ".tooltip-inner": titulo });
        });
    });

    $(document).on("change", ".activity-input", function () {
        const id = Number($(this).closest("tr").data("id"));
        const tarefa = buscarTarefa(id);
        if (!tarefa) return;

        $(`.pred-select option[value="${id}"]`).text(`${tarefa.no} — ${tarefa.name}`);
        $(".pred-select").multipleSelect("refresh");
    });

    // --- Adicionar e excluir ---

    $(document).on("click", '[data-gantt-btn="addAtividade"]', function () {
        proximoId++;
        estado.tasks.push({
            id: proximoId,
            no: "",
            name: "Nova Atividade",
            owner: "",
            planned: ["", ""],
            baseline: ["", ""],
            real: ["", ""],
            pred: [],
            progress: 0,
            group: true,
        });

        reordenarNumeracao();
        renderizar();

        const $novoInput =$(`input[data-id="${proximoId}"][data-field="name"]`);

        if ($novoInput.length) {$novoInput[0].scrollIntoView({ behavior: "smooth", block: "center" });
            setTimeout(() => $novoInput.trigger("focus").select(), 150);
        }
    });

    $(document).on("click", '[data-btn="addSubTarefa"]', function () {
        const indexOrigem = estado.tasks.findIndex((t) => t.id === Number($(this).data("id")));
        if (indexOrigem === -1) return;

        let indexInsercao = indexOrigem + 1;
        while (indexInsercao < estado.tasks.length && !estado.tasks[indexInsercao].group) {
            indexInsercao++;
        }

        proximoId++;
        estado.tasks.splice(indexInsercao, 0, {
            id: proximoId,
            no: "",
            name: "Nova tarefa",
            owner: "",
            planned: ["", ""],
            baseline: ["", ""],
            real: ["", ""],
            pred: [],
            progress: 0,
            group: false
        });

        renderizar();

        const $novoInput =$(`input[data-id="${proximoId}"][data-field="name"]`);

        if ($novoInput.length) {$novoInput[0].scrollIntoView({ behavior: "smooth", block: "center" });
            setTimeout(() => $novoInput.trigger("focus").select(), 150);
        }
    });

    $(document).on("click", '[data-btn="delSubTarefa"]', function () {
        const id = Number($(this).data("id"));
        const task = buscarTarefa(id);
        if (!task) return;

        idParaExcluir = id;

        const $modalTitle =$("#deleteActivityModalLabel");
        const $iconContainer =$("#deleteActivityModal .delete-modal-icon");
        const $msgText =$("#deleteActivityModal .modal-body p:last");

        $("#deleteActivityName").text(task.name);

        if (task.group) {
            $modalTitle.text("Excluir grupo");
            $iconContainer.html('<i class="bi bi-exclamation-triangle-fill text-danger fs-1"></i>');
            $msgText
                .removeClass("text-secondary")
                .addClass("text-danger fw-semibold")
                .text("Atenção: Ao excluir este grupo, TODAS as subtarefas vinculadas a ele também serão excluídas!");
        } else {
            $modalTitle.text("Excluir atividade");
            $iconContainer.html('<i class="bi bi-trash3 fs-1"></i>');
            $msgText
                .removeClass("text-danger fw-semibold")
                .addClass("text-secondary")
                .text("Tem certeza que deseja excluir esta atividade?");
        }

        bootstrap.Modal.getOrCreateInstance(document.getElementById("deleteActivityModal")).show();
    });

    $("#btnConfirmDelete").on("click", function () {
        if (!idParaExcluir) return;

        const index = estado.tasks.findIndex((t) => t.id === idParaExcluir);
        if (index === -1) return;

        let qtdParaRemover = 1;

        if (estado.tasks[index].group) {
            while (
                index + qtdParaRemover < estado.tasks.length &&
                !estado.tasks[index + qtdParaRemover].group
            ) {
                qtdParaRemover++;
            }
        }

        const idsRemovidos = estado.tasks.splice(index, qtdParaRemover).map((t) => t.id);

        estado.tasks.forEach((t) => {
            t.pred = (t.pred || []).filter((pid) => !idsRemovidos.includes(pid));
        });

        reordenarNumeracao();

        const modalInstance = bootstrap.Modal.getInstance(document.getElementById("deleteActivityModal"));
        if (modalInstance) modalInstance.hide();

        idParaExcluir = null;
        renderizar();
    });

    // --- Barra de ferramentas: escala, colunas e navegação ---

    $(".view-switch button").on("click", function () {
        $(".view-switch button").removeClass("active");
        $(this).addClass("active");
        escalaAtual = $(this).data("scale");
        renderizar();
    });

    $(".column-toggle").on("change", atualizarVisibilidadeColunas);

    $('[data-gantt-btn="prev"]').on("click", function () {
        const $container =$("#rightScroll");
        $container.animate({ scrollLeft:$container.scrollLeft() - 300 }, 200);
    });

    $('[data-gantt-btn="next"]').on("click", function () {
        const $container =$("#rightScroll");
        $container.animate({ scrollLeft:$container.scrollLeft() + 300 }, 200);
    });

    $("#rightScroll").on("scroll", function () {
        const $container =$(this);
        const scrollLeft = $container.scrollLeft();
        const maxScroll = $container[0].scrollWidth -$container.outerWidth();

        $('[data-gantt-btn="prev"]').prop("disabled", scrollLeft <= 0);
        $('[data-gantt-btn="next"]').prop("disabled", scrollLeft >= maxScroll - 1);
    });

    // --- Linha de base ---

    $('[data-gantt-btn="saveBeseline"]').on("click", function () {
        estado.tasks.forEach((t) => {
            t.baseline = [...(t.planned || ["", ""])];
        });

        const numeroVersao = estado.baselines.length + 1;
        const dataHoje = new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });

        estado.baselines.push({
            versao: numeroVersao,
            data: dataHoje,
            texto: `Linha de base ${numeroVersao} salva em ${dataHoje}`,
            tasks: JSON.parse(JSON.stringify(estado.tasks))
        });

        const $lista =$("#listaBaselines").empty();
        estado.baselines.forEach((b) => {
            $lista.append(`
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-bookmark-check-fill text-success me-2"></i>${escaparHtml(b.texto)}</span>
                </li>
            `);
        });

        renderizar();

        new bootstrap.Modal(document.getElementById("modalBaseline")).show();
    });

    $('[data-gantt-btn="compare"]').on("click", function () {
        if (!estado.baselines.length) {
            alert("Nenhuma linha de base foi salva ainda.");
            return;
        }

        window.dadosComparacaoGantt = {
            titulo: estado.titulo || "Sua Estrutura Analítica do Projeto (EAP)",
            baselines: estado.baselines,
            tasksAtuais: JSON.parse(JSON.stringify(estado.tasks))
        };

        if ($.magnificPopup) {
            $.magnificPopup.open({
                items: { src: "/popups/compara-linha-base" },
                type: "iframe",
                iframe: {
                    markup: '<div class="mfp-iframe-scaler" style="padding-top: 80vh;">' +
                            '<div class="mfp-close"></div>' +
                            '<iframe class="mfp-iframe" frameborder="0" allowfullscreen></iframe>' +
                            '</div>'
                }
            });
        } else {
            console.warn("Plugin Magnific Popup não está carregado.");
        }
    });

    // --- Sincronização de rolagem ---
    $("#leftScroll").on("scroll", function () {
        $("#rightScroll").scrollTop($(this).scrollTop());
        if (predAberto) $(predAberto).multipleSelect("close");
    });

    $("#rightScroll").on("scroll", function () {
        $("#leftScroll").scrollTop($(this).scrollTop());
        $("#rightHeaderScroll").scrollLeft($(this).scrollLeft());
    });

    // ---------------------------------------------------------------
    // INICIALIZAÇÃO
    // ---------------------------------------------------------------

    renderizar();
});
