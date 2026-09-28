window.inicializarTooltips = function (container = document) {
    // 1. Seleciona os elementos com tooltip que têm título
    const tooltipTriggerList = container.querySelectorAll(
        '[data-bs-toggle="tooltip"][title]:not([title=""]), [data-bs-toggle="tooltip"][data-bs-title]:not([data-bs-title=""])'
    );

    tooltipTriggerList.forEach((el) => {
        // 2. Destrói a instância existente se houver (evita duplicidade/memory leak)
        const instanciaExistente = bootstrap.Tooltip.getInstance(el);
        if (instanciaExistente) {
            instanciaExistente.dispose();
        }

        // 3. Cria a nova instância
        const tooltip = new bootstrap.Tooltip(el);

        // 4. Esconde ao clicar
        el.addEventListener('click', () => {
            tooltip.hide();
        }, { once: true }); // { once: true } garante que o evento seja escutado apenas 1 vez por instância
    });
};

// Executa na carga inicial da página
$(function () {
    inicializarTooltips();

    // Esconde todos os tooltips quando qualquer offcanvas abrir
    document.addEventListener('show.bs.offcanvas', () => {
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
            const instance = bootstrap.Tooltip.getInstance(el);
            if (instance) instance.hide();
        });
    });
});
