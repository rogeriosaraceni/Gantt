/** --------------------------------------------------------------------
 * multipleSelect
--------------------------------------------------------------------- */
$(document).ready(function () {
    $.fn.multipleSelect.defaults = $.extend($.fn.multipleSelect.defaults, {
        filter: true,                      // Ativa busca em todos
        selectAll: true,                   // Ativa "Selecionar Todos"
        width: '100%',                     // Sempre 100% da largura
        //placeholder: "Selecione...",     // Texto padrão
        minimumCountSelected: 3,           // Mostra contador se selecionar mais de 3
        container: 'body',                 // Evita corte pelo overflow-x do .table-responsive

        // Traduções para Português (Opcional, mas recomendado)
        formatSelectAll: function () { return '[Selecionar todos]'; },
        formatAllSelected: function () { return 'Todos selecionados'; },
        formatCountSelected: function (count, total) { return count + ' de ' + total + ' selecionados'; },
        formatNoMatchesFound: function () { return 'Nenhum resultado encontrado'; }
    });

    $('[data-select="multipleSelect"]').multipleSelect();
    $('[data-select="multipleSelectRadio"]').multipleSelect({
        singleRadio: true,
    });

    // Fecha os multiple-select abertos ao rolar a tabela responsiva,
    // já que o dropdown fica "flutuando" fora do wrapper (container: 'body')
    $('.table-responsive').on('scroll', function () {
        $(this).find('[data-select="multipleSelect"], [data-select="multipleSelectRadio"]').multipleSelect('close');
    });
})

// https://github.com/wenzhixin/multiple-select/tree/develop/dist/locale
