import { estado } from "/data/estado.js";
import { analisarData, paraISO, adicionarDias } from "./ganttUtils.js";

let proximoId = 100;

export function reordenarNumeracao() {
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

export function verificarAtraso(tarefa) {
    const dataFimPlan = analisarData(tarefa.planned?.[1]);
    const dataFimReal = analisarData(tarefa.real?.[1]);
    const hoje = new Date();

    if (!dataFimPlan) return false;
    if (dataFimReal && dataFimReal > dataFimPlan) return true;
    if (!dataFimReal && tarefa.real?.[0] && hoje > dataFimPlan && (tarefa.progress ?? 0) < 100) return true;

    return false;
}

export function salvarValorNoEstado(inputEl) {
    const $input =$(inputEl);
    const $row =$input.closest("tr");
    const id = Number($row.data("id"));
    const task = estado.tasks.find((t) => t.id === id);
    if (!task) return null;

    const field = $input.data("field");
    const val = $input.val();

    if (field === "planned" || field === "real") {
        const index = Number($input.data("index"));
        if (!task[field]) task[field] = ["", ""];
        task[field][index] = val;
    } else if (field === "progress") {
        task.progress = Number(val);
    } else {
        task[field] = val;
    }

    return { task, val };
}

export function adicionarAtividade() {
    proximoId++;
    const novaTarefa = {
        id: proximoId,
        no: "",
        name: "Nova Atividade",
        owner: "",
        planned: [paraISO(new Date()), paraISO(adicionarDias(new Date(), 15))],
        baseline: [paraISO(new Date()), paraISO(adicionarDias(new Date(), 15))],
        real: ["", ""],
        pred: "",
        progress: 0,
        group: true,
    };

    estado.tasks.push(novaTarefa);
    reordenarNumeracao();
    return proximoId;
}

export function adicionarSubtarefa(idPai) {
    const indexPai = estado.tasks.findIndex((t) => t.id === idPai);
    if (indexPai === -1) return;

    let indexInsercao = indexPai + 1;
    while (indexInsercao < estado.tasks.length && !estado.tasks[indexInsercao].group) {
        indexInsercao++;
    }

    proximoId++;
    const novaSubtarefa = {
        id: proximoId,
        no: "",
        name: "Nova Subtarefa",
        owner: "",
        planned: [paraISO(new Date()), paraISO(adicionarDias(new Date(), 15))],
        baseline: [paraISO(new Date()), paraISO(adicionarDias(new Date(), 15))],
        real: ["", ""],
        pred: "",
        progress: 0,
        group: false
    };

    estado.tasks.splice(indexInsercao, 0, novaSubtarefa);
    reordenarNumeracao();
}

export function excluirTarefa(id) {
    const index = estado.tasks.findIndex((t) => t.id === id);
    if (index === -1) return;

    const task = estado.tasks[index];

    if (task.group) {
        let qtdParaRemover = 1;
        while (
            index + qtdParaRemover < estado.tasks.length &&
            !estado.tasks[index + qtdParaRemover].group
        ) {
            qtdParaRemover++;
        }
        estado.tasks.splice(index, qtdParaRemover);
    } else {
        estado.tasks.splice(index, 1);
    }

    reordenarNumeracao();
}
