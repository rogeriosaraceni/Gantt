import { estado } from "/data/estado.js";
import { responsaveis } from "/data/responsaveis.js";
import { escaparHtml } from "./ganttUtils.js";
import { verificarAtraso } from "./ganttTaskServices.js";

function opcoesResponsavel(selecionado) {
    let html = '<option value="">—</option>';
    responsaveis.forEach((resp) => {
        html += `<option value="${escaparHtml(resp)}"${resp === selecionado ? " selected" : ""}>${escaparHtml(resp)}</option>`;
    });
    return html;
}

function opcoesPredecessora(numeroSelecionado) {
    let html = '<option value="">Nenhuma</option>';
    estado.tasks
        .filter((t) => !t.group)
        .forEach((t) => {
            html += `<option value="${escaparHtml(t.no)}"${t.no === numeroSelecionado ? " selected" : ""}>${escaparHtml(t.no + " — " + t.name)}</option>`;
        });
    return html;
}

function htmlIntervaloData(tarefa, tipo) {
    const datas = tarefa[tipo] || ["", ""];
    const val0 = (datas[0] || "").trim();
    const val1 = (datas[1] || "").trim();

    return `
        <div class="date-range">
            <input type="date" name="${tipo}" class="form-control form-control-sm date-input" data-field="${tipo}" data-index="0" min="2000-01-01" max="2099-12-31" value="${val0}">
            <span>—</span>
            <input type="date" name="${tipo}" class="form-control form-control-sm date-input" data-field="${tipo}" data-index="1" min="2000-01-01" max="2099-12-31" value="${val1}">
        </div>
    `;
}

function acoesHtml(t) {
    const btnAddHtml = t.group ? `
        <li>
            <button type="button" class="dropdown-item" data-btn="addSubTarefa" data-id="${t.id}">
                <small class="d-flex align-items-center gap-2">
                    <i class="bi bi-plus-lg text-primary"></i> Adicionar subtarefa
                </small>
            </button>
        </li>
    ` : "";

    return `
        <div class="dropdown text-center">
            <button class="btn btn-link text-secondary p-0 border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-title="Ações" data-bs-toggle-tooltip="tooltip">
                <i class="bi bi-three-dots-vertical fs-6"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-start shadow-sm p-0 overflow-hidden">
                ${btnAddHtml}
                <li>
                    <button type="button" class="dropdown-item text-danger" data-btn="delSubTarefa" data-id="${t.id}">
                        <small class="d-flex align-items-center gap-2">
                            <i class="bi bi-trash"></i> Excluir
                        </small>
                    </button>
                </li>
            </ul>
        </div>
    `;
}

export function atualizarVisibilidadeColunas() {
    $(".column-toggle").each(function () {
        const colName = $(this).val();
        const visible = $(this).is(":checked");
        $(`.col-${colName}`).toggle(visible);
    });
}

export function renderizarEsquerda() {
    const $body =$("#leftBody").empty();

    estado.tasks.forEach((tarefa) => {
        const isGroup = tarefa.group;
        const classeLinha = isGroup ? "group-row" : "child";
        const emAtraso = verificarAtraso(tarefa);

        $body.append(`
            <tr class="${classeLinha}" data-id="${tarefa.id}">
                <td class="text-center align-middle" style="width: 60px;">${acoesHtml(tarefa)}</td>
                <td class="text-center text-secondary align-middle">${escaparHtml(tarefa.no)}</td>
                <td class="activity-cell align-middle">
                    <div class="d-flex align-items-center gap-1">
                        <input type="text" name="atividade" class="activity-input" data-field="name" data-id="${tarefa.id}" value="${escaparHtml(tarefa.name)}" ${isGroup ? 'style="font-weight:600"' : ""}>
                        ${tarefa.critical ? '<i class="bi bi-exclamation-triangle-fill status-critical" data-bs-toggle="tooltip" data-bs-title="Crítico"></i>' : ""}
                        ${emAtraso ? '<i class="bi bi-fire status-overdue" data-bs-toggle="tooltip" data-bs-title="Atrasado"></i>' : ""}
                    </div>
                </td>
                <td class="col-owner align-middle">
                    ${isGroup ? "<span>—</span>" : `<select name="responsavel" class="owner-select" data-field="owner">${opcoesResponsavel(tarefa.owner)}</select>`}
                </td>
                <td class="col-planned align-middle">
                    ${isGroup ? "<span>—</span>" : htmlIntervaloData(tarefa, "planned")}
                </td>
                <td class="col-real align-middle">
                    ${isGroup ? "<span>—</span>" : htmlIntervaloData(tarefa, "real")}
                </td>
                <td class="col-predecessors align-middle">
                    ${isGroup ? "<span>—</span>" : `<select name="predecessoras" class="pred-select" data-field="pred">${opcoesPredecessora(tarefa.pred)}</select>`}
                </td>
                <td class="col-progress align-middle">
                    ${isGroup ? "<span>—</span>" : `<input type="number" name="percentual" min="0" max="100" class="progress-input" data-field="progress" value="${tarefa.progress ?? 0}">`}
                </td>
            </tr>
        `);
    });

    atualizarVisibilidadeColunas();
}
