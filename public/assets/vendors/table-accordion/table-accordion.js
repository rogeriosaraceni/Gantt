$(document).ready(function() {
    $('[data-open-all]').on("click", function() {
        $('[data-tr-header]').addClass("active");
        $('[data-tr-sub]').show('fast');
    });

    $('[data-close-all]').on("click", function() {
        $('[data-tr-header]').removeClass("active");
        $('[data-tr-sub]').hide('fast');
    });

    $('[data-tr-header]').on("click", function(e) {
        e.preventDefault();
        $(this).toggleClass("active");
        const item = $(this).data("tr-header");
        $(`[data-tr-sub="${item}"]`).toggle('fast');
    });
});
