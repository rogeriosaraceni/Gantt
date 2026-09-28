import { estado } from "/data/estado.js";
import { escaparHtml } from "./ganttUtils.js";
import {
    reordenarNumeracao,
    salvarValorNoEstado,
    adicionarAtividade,
    adicionarSubtarefa,
    excluirTarefa
} from "./ganttTaskServices.js";
import { renderizarEsquerda, atualizarVisibilidadeColunas } from "./ganttLeft.js";
import { renderizarDireita } from "./ganttRight.js";

$(function () {
    let escalaAtual = "month";
    let compararLinhaBase = false;
    let idParaExcluir = null;

    function renderizar() {
        $('[data-bs-toggle="tooltip"]').tooltip("dispose");

        reordenarNumeracao();
        renderizarEsquerda();
        renderizarDireita(escalaAtual, compararLinhaBase);

        if (typeof inicializarTooltips === "function") {
            inicializarTooltips();
        } else {
            $('[data-bs-toggle="tooltip"]').tooltip();
        }
    }

    // EVENTOS DE INPUT / EDIÇÃO
    $(document).on("input", ".activity-input, .progress-input, .date-input", function () {
        salvarValorNoEstado(this);
    });

    $(document).on("change", ".owner-select, .pred-select", function () {
        salvarValorNoEstado(this);
        renderizar();
    });

    $(document).on("change", ".date-input", function () {
        const res = salvarValorNoEstado(this);
        if (!res) return;

        if (!res.val) {
            renderizar();
            return;
        }

        const partes = res.val.split("-");
        if (partes.length === 3 && partes[0].length === 4) {
            renderizar();
        }
    });

    // TROCA DE ESCALA (SEMANA / MÊS / ANO)
    $(".view-switch button").on("click", function () {
        $(".view-switch button").removeClass("active");
        $(this).addClass("active");
        escalaAtual = $(this).data("scale");
        renderizar();
    });

    // LINHA DE BASE / COMPARATIVO
    if (!estado.baselines) estado.baselines = [];

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
        if (!estado.baselines || estado.baselines.length === 0) {
            alert("Nenhuma linha de base foi salva ainda.");
            return;
        }

        window.dadosComparacaoGantt = {
            titulo: estado.titulo || "Sua Estrutura Analítica do Projeto (EAP)",
            baselines: estado.baselines,
            tasksAtuais: JSON.parse(JSON.stringify(estado.tasks))
        };

        $.magnificPopup.open({
            items: { src: '/popups/compara-linha-base' },
            type: 'iframe',
            iframe: {
                markup: '<div class="mfp-iframe-scaler" style="padding-top: 80vh;">' +
                        '<div class="mfp-close"></div>' +
                        '<iframe class="mfp-iframe" frameborder="0" allowfullscreen></iframe>' +
                        '</div>'
            }
        });
    });

    // EXIBIÇÃO DE COLUNAS E NAVEGAÇÃO LATERAL
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

    // INCLUSÃO E EXCLUSÃO DE TAREFAS
    $(document).on("click", '[data-gantt-btn="addAtividade"]', function () {
        const novoId = adicionarAtividade();
        renderizar();

        const $novoInput =$(`input[data-id="${novoId}"][data-field="name"]`);
        if ($novoInput.length) {$novoInput[0].scrollIntoView({ behavior: "smooth", block: "center" });
            setTimeout(() => {
                $novoInput.trigger("focus").select();
            }, 150);
        }
    });

    $(document).on("click", '[data-btn="addSubTarefa"]', function () {
        const id = Number($(this).data("id"));
        adicionarSubtarefa(id);
        renderizar();
    });

    $(document).on("click", '[data-btn="delSubTarefa"]', function () {
        const id = Number($(this).data("id"));
        const task = estado.tasks.find((t) => t.id === id);
        if (!task) return;

        idParaExcluir = id;
        $("#deleteActivityName").text(task.name);

        if (task.group) {
            $("#deleteActivityModalLabel").text("Excluir grupo");
            $("#deleteActivityModal .delete-modal-icon").html('<i class="bi bi-exclamation-triangle-fill text-danger fs-1"></i>');
            $("#deleteActivityModal .text-secondary").removeClass("text-secondary").addClass("text-danger fw-semibold").text("Atenção: Ao excluir este grupo, TODAS as subtarefas vinculadas a ele também serão excluídas!");
        } else {
            $("#deleteActivityModalLabel").text("Excluir atividade");
            $("#deleteActivityModal .delete-modal-icon").html('<i class="bi bi-trash3 fs-1"></i>');
            $("#deleteActivityModal .text-secondary").removeClass("text-danger fw-semibold").addClass("text-secondary").text("Tem certeza que deseja excluir esta atividade?");
        }

        bootstrap.Modal.getOrCreateInstance(document.getElementById("deleteActivityModal")).show();
    });

    $("#btnConfirmDelete").on("click", function () {
        if (!idParaExcluir) return;

        excluirTarefa(idParaExcluir);

        const modalInstance = bootstrap.Modal.getInstance(document.getElementById("deleteActivityModal"));
        if (modalInstance) modalInstance.hide();

        idParaExcluir = null;
        renderizar();
    });

    // SCROLL SINCRONIZADO
    $("#leftScroll").on("scroll", function () {
        $("#rightScroll").scrollTop($(this).scrollTop());
    });

    $("#rightScroll").on("scroll", function () {
        $("#leftScroll").scrollTop($(this).scrollTop());
        $("#rightHeaderScroll").scrollLeft($(this).scrollLeft());
    });

    // INICIALIZAÇÃO
    renderizar();
});
