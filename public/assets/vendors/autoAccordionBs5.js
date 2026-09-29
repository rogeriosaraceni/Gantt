function autoAccordionBs5(containerId) {
    const $container = $(containerId);

    $container.on('click', '.accordion-button', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const $btn = $(this);
        const $item = $btn.closest('.accordion-item');
        const $collapse = $item.find('.accordion-collapse');

        $btn.toggleClass('collapsed');
        $collapse.stop().slideToggle('fast', function() {
            $(this).toggleClass('show');
        });

        const isExpanded = $btn.attr('aria-expanded') === 'true';
        $btn.attr('aria-expanded', !isExpanded);
    });

    $(document).on('click', `[data-autoAccordion-target="${containerId}"] [data-autoAccordion]`, function(e) {
        e.preventDefault();

        const action = $(this).attr('data-autoAccordion'); // 'openAll' ou 'closeAll'
        const $allButtons = $container.find('.accordion-button');
        const $allCollapses = $container.find('.accordion-collapse');

        if (action === 'openAll') {
            $allButtons.removeClass('collapsed').attr('aria-expanded', 'true');
            $allCollapses.stop().slideDown('fast').addClass('show');
        } else {
            $allButtons.addClass('collapsed').attr('aria-expanded', 'false');
            $allCollapses.stop().slideUp('fast').removeClass('show');
        }
    });
}
