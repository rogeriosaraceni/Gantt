import { estado } from "/data/estado.js";
import {
    escaparHtml,
    analisarData,
    paraISO,
    formatarDataBR,
    adicionarDias,
    inicioDaSemana,
    inicioDoMes,
    inicioDoAno,
    diferencaDias,
    obterSemanaISO
} from "./ganttUtils.js";
import { verificarAtraso } from "./ganttTaskServices.js";

function intervaloParaEscala(escalaAtual) {
    let dataMin = new Date(2026, 0, 1);
    let dataMax = new Date(2027, 1, 28);

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

function configuracaoUnidade(escalaAtual) {
    if (escalaAtual === "week") return { unitDays: 7, width: 90 };
    if (escalaAtual === "year") return { unitDays: 365, width: 220 };
    return { unitDays: 30, width: 110 };
}

function periodos(escalaAtual) {
    const { min: dataMin, max: dataMax } = intervaloParaEscala(escalaAtual);
    const configuracao = configuracaoUnidade(escalaAtual);
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

function posicaoParaData(textoData, escalaAtual) {
    const dados = periodos(escalaAtual);
    const d = analisarData(textoData);
    if (!d) return 0;
    const dias = diferencaDias(dados.min, d);
    return (dias / dados.cfg.unitDays) * dados.cfg.width;
}

function larguraParaIntervalo(textoIni, textoFim, escalaAtual) {
    if (!textoIni || !textoFim) return 0;
    const dIni = analisarData(textoIni);
    const dFim = analisarData(textoFim);
    if (!dIni || !dFim) return 0;

    const cfg = configuracaoUnidade(escalaAtual);
    const dias = diferencaDias(dIni, dFim) + 1;
    return Math.max(6, (dias / cfg.unitDays) * cfg.width);
}

export function renderizarDireita(escalaAtual, compararLinhaBase) {
    const p = periodos(escalaAtual);
    const totalWidth = p.arr.length * p.cfg.width;

    let headerHtml = `<div class="timeline-header d-flex" style="width:${totalWidth}px;">`;
    p.arr.forEach((per) => {
        headerHtml += `<div class="period-label" style="width:${p.cfg.width}px; flex: 0 0 ${p.cfg.width}px;">${per.label}</div>`;
    });
    headerHtml += `</div>`;
    $("#timelineHeader").html(headerHtml);

    const $body =$("#timelineBody").empty().css("width", `${totalWidth}px`);

    estado.tasks.forEach((tarefa) => {
        const $row =$(`<div class="timeline-row ${tarefa.group ? "group" : ""}" style="width:${totalWidth}px;"></div>`);

        const posHoje = posicaoParaData(paraISO(new Date()), escalaAtual);
        if (posHoje > 0 && posHoje < totalWidth) {
            $row.append(`<div class="today-line" style="left:${posHoje}px;"></div>`);
        }

        const baselineDates = compararLinhaBase ? (tarefa.baseline || tarefa.planned) : tarefa.planned;
        if (baselineDates && baselineDates[0] && baselineDates[1]) {
            const leftBase = posicaoParaData(baselineDates[0], escalaAtual);
            const widthBase = larguraParaIntervalo(baselineDates[0], baselineDates[1], escalaAtual);
            const dtInicioBR = formatarDataBR(baselineDates[0]);
            const dtFimBR = formatarDataBR(baselineDates[1]);

            $row.append(`
                <div class="bar baseline-bar" style="left:${leftBase}px; width:${widthBase}px;" data-bs-toggle="tooltip" data-bs-title="Linha de Base: ${dtInicioBR} a ${dtFimBR}"></div>
            `);
        }

        const usaReal = Boolean(tarefa.real && tarefa.real[0]);
        const dataInicioBarra = usaReal ? tarefa.real[0] : tarefa.planned?.[0];

        let dataFimBarra = usaReal ? tarefa.real[1] : tarefa.planned?.[1];
        if (usaReal && !dataFimBarra) {
            dataFimBarra = paraISO(new Date());
        }

        if (dataInicioBarra && dataFimBarra) {
            const left = posicaoParaData(dataInicioBarra, escalaAtual);
            const width = larguraParaIntervalo(dataInicioBarra, dataFimBarra, escalaAtual);
            const emAtraso = verificarAtraso(tarefa);

            let barClass = "bar task-bar";
            if (tarefa.group) barClass = "bar group-bar";
            if (emAtraso) barClass += " overdue";
            else if (tarefa.critical) barClass += " critical";

            const pct = Math.min(100, Math.max(0, tarefa.progress ?? 0));
            const fillHtml = !tarefa.group ? `<div class="progress-fill" style="width:${pct}%;"></div>` : "";

            const dtInicioBR = formatarDataBR(dataInicioBarra);
            const dtFimBR = formatarDataBR(dataFimBarra);

            $row.append(`
                <div class="${barClass}" style="left:${left}px; width:${width}px;" data-bs-toggle="tooltip" data-bs-title="${escaparHtml(tarefa.name)} (${pct}%) - ${dtInicioBR} a ${dtFimBR}">
                    ${fillHtml}
                </div>
            `);
        }

        $body.append($row);
    });
}
