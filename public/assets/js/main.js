/** --------------------------------------------------------------------
 * tooltips Bootstrap
--------------------------------------------------------------------- */
function tooltipsBootstrap() {
    // Seleciona apenas elementos que tenham o atributo title ou data-bs-title preenchidos
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"][title]:not([title=""]), [data-bs-toggle="tooltip"][data-bs-title]:not([data-bs-title=""])');

    const tooltipList = [...tooltipTriggerList].map(
        (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
    );

    tooltipList.forEach((tooltip, index) => {
        tooltipTriggerList[index].addEventListener('click', () => {
            tooltip.hide();
        });
    });

    // Esconde todos os tooltips quando qualquer offcanvas abrir
    document.addEventListener('show.bs.offcanvas', () => {
        tooltipList.forEach((tooltip) => tooltip.hide());
    });
}

/** --------------------------------------------------------------------
 * popovers Bootstrap
--------------------------------------------------------------------- */
function popoversBootstrap() {
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
    const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl))
}

/** --------------------------------------------------------------------
 * dropdowns Bootstrap (escapam de containers com overflow)
--------------------------------------------------------------------- */
function dropdownsBootstrap() {
    const config = {
        popperConfig: (def) => ({ ...def, strategy: 'fixed' })
    };

    // pointerdown/focusin disparam antes do click/keydown do Bootstrap,
    // então a instância já nasce com a config certa (funciona p/ conteúdo dinâmico)
    $(document).on('pointerdown focusin', '[data-bs-toggle="dropdown"]', function () {
        bootstrap.Dropdown.getOrCreateInstance(this, config);
    });
}

/** --------------------------------------------------------------------
 * init functions
--------------------------------------------------------------------- */
tooltipsBootstrap();
popoversBootstrap();
dropdownsBootstrap();
